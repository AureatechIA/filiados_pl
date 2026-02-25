import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create client with user's token to verify permissions
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Get current user
        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized - invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if user is admin or dev using service role (bypass RLS)
        const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data: profile, error: profileError } = await adminClient
            .from('portal_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || !['admin', 'dev'].includes(profile.role)) {
            return new Response(
                JSON.stringify({ error: 'Forbidden: only admin/dev can create users. Your role: ' + (profile?.role || 'none') }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { email, password, nome, role, uf, municipio, operador_type } = await req.json();

        // Validate required fields
        if (!email || !password || !nome || !role) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: email, password, nome, role' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Standardized Role Validation: admin, operador, or dev
        const normalizedRole = role ? String(role).toLowerCase().trim() : '';
        if (!['admin', 'operador', 'dev', 'diretorio'].includes(normalizedRole)) {
            return new Response(
                JSON.stringify({ error: `Invalid role: "${role}". Must be: admin, operador, or dev` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // UF is now OPTIONAL for all roles per requirements (Global Operator support)
        // No more mandatory uf check here.

        // Validate operador_type
        const validOperadorType = operador_type && ['aurea', 'diretorio'].includes(operador_type)
            ? operador_type
            : 'aurea';

        // Check if email already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
        if (emailExists) {
            return new Response(
                JSON.stringify({ error: 'Este email ja esta cadastrado' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create the auth user
        // The role passed to auth.admin.createUser metadata should also be the updated one
        const finalRole = role === 'diretorio' ? 'operador' : role;

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                nome,
                role: finalRole,
                uf: uf || null,
                municipio: municipio || null,
                operador_type: validOperadorType
            }
        });

        if (createError) {
            if (createError.message.includes('Database error')) {
                const { data: checkUser } = await adminClient.auth.admin.listUsers();
                const partialUser = checkUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

                if (partialUser) {
                    const { error: insertError } = await adminClient
                        .from('portal_users')
                        .upsert({
                            id: partialUser.id,
                            nome,
                            email,
                            role: finalRole,
                            uf: uf || null,
                            municipio: municipio || null,
                            ativo: true,
                            operador_type: validOperadorType
                        }, { onConflict: 'id' });

                    if (insertError) {
                        return new Response(
                            JSON.stringify({ error: 'User created in auth but failed to create profile: ' + insertError.message }),
                            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }

                    return new Response(
                        JSON.stringify({
                            success: true,
                            user: {
                                id: partialUser.id,
                                email: partialUser.email,
                                nome,
                                role: finalRole,
                                uf,
                                municipio,
                                operador_type: validOperadorType
                            }
                        }),
                        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            }

            return new Response(
                JSON.stringify({ error: createError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Ensure portal_users record exists
        const { data: existingProfile } = await adminClient
            .from('portal_users')
            .select('id')
            .eq('id', newUser.user.id)
            .single();

        if (!existingProfile) {
            const { error: insertError } = await adminClient
                .from('portal_users')
                .insert({
                    id: newUser.user.id,
                    nome,
                    email,
                    role: finalRole,
                    uf: uf || null,
                    municipio: municipio || null,
                    ativo: true,
                    operador_type: validOperadorType
                });

            if (insertError) {
                return new Response(
                    JSON.stringify({ error: 'User created but profile insert failed: ' + insertError.message }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                user: {
                    id: newUser.user.id,
                    email: newUser.user.email,
                    nome,
                    role: finalRole,
                    uf,
                    municipio,
                    operador_type: validOperadorType
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Unexpected error: ' + error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
