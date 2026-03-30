import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as
  | string
  | undefined;

export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null;

export function getSupabaseConfigError(): string | null {
  if (!supabaseUrl) return "Falta configurar VITE_SUPABASE_URL en el cliente";
  if (!supabasePublishableKey) {
    return "Falta configurar VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY en el cliente";
  }
  return null;
}
