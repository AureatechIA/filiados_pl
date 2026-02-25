import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Validar Token do Quem está chamando a função
        const authHeader = req.headers.get('Authorization')!

        // Client basico com a sessao de quem chamou a funcao supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Validar quem é
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // Validar se é Admin mesmo
        const { data: portalUser, error: roleError } = await supabaseClient
            .from('portal_users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (roleError || portalUser?.role !== 'admin') {
            throw new Error('Forbidden: Apenas admins podem criar novos operadores')
        }

        // 2. Coletar body
        const { nome, email, password, role } = await req.json()

        if (!nome || !email || !password) {
            throw new Error('Dados incompletos (nome, email, password obrigatorios)')
        }

        // 3. Client ADMIN (Super-poder para cirar auth.users)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 4. Criar auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: { provider: 'email' }
        })

        if (createError) throw createError

        // 5. Vincular no portal_users e setar senha_alterada false obrigatoriamente
        const newRole = role === 'admin' ? 'admin' : 'operador'
        const { error: insertError } = await supabaseAdmin
            .from('portal_users')
            .insert([
                {
                    id: newUser.user.id,
                    nome,
                    email,
                    role: newRole,
                    ativo: true,
                    senha_alterada: false
                }
            ])

        // Rollback no banco master se deu pau no vincular
        if (insertError) {
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            throw insertError
        }

        return new Response(JSON.stringify({
            success: true,
            user: { id: newUser.user.id, email: newUser.user.email }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
