import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Custom header carrying the *Supabase* session token. Kept separate from
// the standard Authorization header, which in the Gmail sync request is
// used for the Gmail OAuth access token.
export const SUPABASE_AUTH_HEADER = "x-supabase-token";

export function getRequestAccessToken(request: Request): string | null {
  return request.headers.get(SUPABASE_AUTH_HEADER);
}

/**
 * Builds a Supabase client whose PostgREST requests carry the user's JWT,
 * so RLS policies relying on auth.uid() work correctly on the server.
 */
export function createAuthedSupabaseClient(accessToken: string | null): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Resolves the authenticated user for a server route. Returns an
 * authenticated Supabase client (usable for RLS-protected queries) plus
 * the verified user, or an error message if the token is missing/invalid.
 */
export async function requireUser(request: Request) {
  const accessToken = getRequestAccessToken(request);
  const supabase = createAuthedSupabaseClient(accessToken);

  if (!accessToken) {
    return { supabase, user: null as null, error: "Missing Supabase session token" };
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return { supabase, user: null as null, error: error?.message ?? "Invalid session" };
  }

  return { supabase, user: data.user, error: null as string | null };
}