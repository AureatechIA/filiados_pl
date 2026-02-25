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
-- Operadores podem ler seu proprio perfil
DROP POLICY IF EXISTS "Usuário pode ler seu próprio perfil" ON public.portal_users;
CREATE POLICY "Usuário pode ler seu próprio perfil" 
ON public.portal_users FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Admin pode ler tudo (para features de painel, dashboard)
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

-- Admin: Visibilidade total, modificação vetada para evitar que "distribuam registros"
DROP POLICY IF EXISTS "Admin pode ver todos os filiados (apenas select)" ON public.filiados;
CREATE POLICY "Admin pode ver todos os filiados (apenas select)" 
ON public.filiados FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.portal_users 
    WHERE public.portal_users.id = auth.uid() 
      AND public.portal_users.role = 'admin'
  )
);

-- Operadores: Veem registros livres OU associados a si mesmos
DROP POLICY IF EXISTS "Diretorio vê registros próprios ou livres" ON public.filiados;
CREATE POLICY "Diretorio vê registros próprios ou livres" 
ON public.filiados FOR SELECT 
TO authenticated 
USING (
  portal_user_id = auth.uid() OR portal_user_id IS NULL
);

-- Operadores: Só podem atualizar seus registros se ainda não finalizados (lista_manual = false)
DROP POLICY IF EXISTS "Diretorio atualiza registros próprios abertos" ON public.filiados;
CREATE POLICY "Diretorio atualiza registros próprios abertos" 
ON public.filiados FOR UPDATE 
TO authenticated 
USING (
  portal_user_id = auth.uid() AND lista_manual = false
);

-- 5. RPCs: LÓGICA DE NEGÓCIO SERVER-SIDE

-- 5.1 CLAIM (Atomico)
-- O operador tenta pegar o registro, retorna true apenas 1 vez (o que chegar primeiro)
DROP FUNCTION IF EXISTS claim_filiado(uuid);
CREATE OR REPLACE FUNCTION claim_filiado(p_filiado_id uuid)
RETURNS boolean AS $$
DECLARE
  v_updated_count int;
BEGIN
  UPDATE public.filiados
  SET portal_user_id = auth.uid()
  WHERE id = p_filiado_id
    AND portal_user_id IS NULL
    AND lista_manual = false
    AND enviado_n8n IS NULL
    AND uf_ddd <> 'DF';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5.2 FINALIZAÇÃO (Atomica & Transacional)
-- Operador marca se obteve sucesso ou erro nas envios
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
  -- Definir os valores pro followup
  IF p_resultado = 'sucesso' THEN
    v_status := 'enviado';
    v_error_msg := NULL;
  ELSE
    v_status := 'falha';
    v_error_msg := 'Erro ' || COALESCE(p_erro_codigo::text, 'Desconhecido');
  END IF;

  -- 1. Tentar finalizar o filiado (condicionado à posse e ao status atual)
  UPDATE public.filiados
  SET lista_manual = true
  WHERE id = p_filiado_id
    AND lista_manual = false
    AND portal_user_id = auth.uid(); 
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Se o operador não for o dono ou já finalizou, aborta a transação e retorna falso
  IF v_updated_count = 0 THEN
    RETURN false;
  END IF;

  -- 2. Histórico imutável de tentativa
  INSERT INTO public.followup_envios (campanha_id, filiado_id, telefone, status, erro)
  VALUES (p_campanha_id, p_filiado_id, p_telefone, v_status, v_error_msg);
  
  -- 3. Contador agregado (update seguro na campanha)
  IF p_resultado = 'sucesso' THEN
    UPDATE public.followup_campanhas
    SET quantidade_enviada = quantidade_enviada + 1
    WHERE id = p_campanha_id;
  ELSE
    -- Se houvesse uma coluna `quantidade_com_falha` específica, poderíamos iterar:
    -- UPDATE public.followup_campanhas SET quantidade_com_falha = quantidade_com_falha + 1 WHERE id = p_campanha_id;
    NULL; -- mantendo seguro conforme schema fornecido inicialmente que tinha `quantidade_com_falha`
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
