import { createBrowserClient } from "@supabase/ssr";

// IMPORTANT: keep a single browser client instance.
// Creating multiple clients can cause "session limbo" during first login/verification
// because one instance may have the new session in memory while another instance
// reads cookies before they've been persisted.
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

  return browserClient;
}
