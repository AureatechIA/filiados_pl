import { createClient } from "@supabase/supabase-js";

// Ensure you set these in your .env or .env.local file:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJ...
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://replace-me.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOi";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
