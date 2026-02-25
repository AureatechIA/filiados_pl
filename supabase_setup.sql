-- ⚠️ SCRIPT FINAL (USO EM PRODUÇÃO - CAMPANHA PRESIDENCIAL)
-- IMPORTANTE: O comando CREATE INDEX CONCURRENTLY não pode rodar dentro de transações de migrations.
-- Rode este arquivo preferencialmente na aba SQL Editor do Supabase diretamente.

-- 1. Alteração estritamente permitida na tabela principal e users
ALTER TABLE public.filiados 
ADD COLUMN IF NOT EXISTS portal_user_id uuid REFERENCES public.portal_users(id);

-- 1.a Índice parcial para performance crítica e sem lock
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_filiados_disponiveis 
ON public.filiados(id) 
WHERE portal_user_id IS NULL 
  AND enviado_n8n IS NULL 
  AND lista_manual = false 
  AND uf_ddd <> 'DF';

-- 2. Habilitação de RLS (Garantia de segurança server-side)
ALTER TABLE public.filiados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

-- 3. Políticas da tabela portal_users
-- Todos usuários autenticados podem ler seu próprio perfil
DROP POLICY IF EXISTS "Usuário pode ler seu próprio perfil" ON public.portal_users;
CREATE POLICY "Usuário pode ler seu próprio perfil" 
ON public.portal_users FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Admin pode ler todos os perfis e criar
DROP POLICY IF EXISTS "Admin pode ler todos os perfis" ON public.portal_users;
CREATE POLICY "Admin pode ler todos os perfis" 
ON public.portal_users FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.portal_users admins 
    WHERE admins.id = auth.uid() AND admins.role = 'admin'
  )
);

-- 4. Políticas RÍGIDAS da tabela filiados

-- Admin: Visibilidade total (apenas select por segurança)
DROP POLICY IF EXISTS "Admin vê tudo" ON public.filiados;
CREATE POLICY "Admin vê tudo" 
ON public.filiados FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.portal_users 
    WHERE public.portal_users.id = auth.uid() 
      AND public.portal_users.role = 'admin'
  )
);

-- Operador: Só vê registros compatíveis com seu escopo (UF) e não pegos por outros
-- Se o UF do operador for NULL, ele vê tudo.
DROP POLICY IF EXISTS "Operador vê registros compatíveis" ON public.filiados;
CREATE POLICY "Operador vê registros compatíveis" 
ON public.filiados FOR SELECT 
TO authenticated 
USING (
  (portal_user_id = auth.uid())
  OR
  (
    portal_user_id IS NULL 
    AND lista_manual = false 
    AND (
      (SELECT uf FROM public.portal_users WHERE id = auth.uid()) IS NULL
      OR 
      uf_ddd = (SELECT uf FROM public.portal_users WHERE id = auth.uid())
    )
  )
);

-- Operador: Só pode atualizar seus registros se ainda não finalizados
DROP POLICY IF EXISTS "Operador atualiza registros próprios" ON public.filiados;
CREATE POLICY "Operador atualiza registros próprios" 
ON public.filiados FOR UPDATE 
TO authenticated 
USING (
  portal_user_id = auth.uid() AND lista_manual = false
);

-- 5. RPCs: LÓGICA DE NEGÓCIO SERVER-SIDE

-- 5.1 CLAIM (Atomico)
-- O operador tenta pegar o registro, retorna true apenas 1 vez.
DROP FUNCTION IF EXISTS claim_filiado(uuid);
CREATE OR REPLACE FUNCTION claim_filiado(p_filiado_id uuid)
RETURNS boolean AS $$
DECLARE
  v_updated_count int;
  v_user_uf text;
BEGIN
  -- Buscar UF do usuario logado
  SELECT uf INTO v_user_uf FROM public.portal_users WHERE id = auth.uid();

  UPDATE public.filiados
  SET portal_user_id = auth.uid()
  WHERE id = p_filiado_id
    AND portal_user_id IS NULL
    AND lista_manual = false
    AND enviado_n8n IS NULL
    AND (v_user_uf IS NULL OR uf_ddd = v_user_uf);  -- Escopo flexível: UF ou Global

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5.2 FINALIZAÇÃO (Atomica & Transacional)
DROP FUNCTION IF EXISTS finalizar_contato_manual(uuid, uuid, text, text, int);
CREATE OR REPLACE FUNCTION finalizar_contato_manual(
  p_filiado_id uuid,
  p_campanha_id uuid,
  p_telefone text,
  p_resultado text,
  p_erro_codigo int
)
RETURNS boolean AS $$
DECLARE
  v_updated_count int;
  v_status text;
  v_error_msg text;
BEGIN
  IF p_resultado = 'sucesso' THEN
    v_status := 'enviado';
    v_error_msg := NULL;
  ELSE
    v_status := 'falha';
    v_error_msg := 'Erro ' || COALESCE(p_erro_codigo::text, 'Desconhecido');
  END IF;

  UPDATE public.filiados
  SET lista_manual = true
  WHERE id = p_filiado_id
    AND lista_manual = false
    AND portal_user_id = auth.uid(); 
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.followup_envios (campanha_id, filiado_id, telefone, status, erro)
  VALUES (p_campanha_id, p_filiado_id, p_telefone, v_status, v_error_msg);
  
  IF p_resultado = 'sucesso' THEN
    UPDATE public.followup_campanhas
    SET quantidade_enviada = quantidade_enviada + 1
    WHERE id = p_campanha_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
