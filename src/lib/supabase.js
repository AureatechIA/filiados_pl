import { createClient } from "@supabase/supabase-js";

// Ensure you set these in your .env or .env.local file:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJ...
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('replace-me')) {
    console.error("ATENÇÃO: Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não foram encontradas no build.");
}

export const supabase = createClient(
    supabaseUrl || "https://replace-me.supabase.co",
    supabaseAnonKey || "eyJhbGciOi"
);
