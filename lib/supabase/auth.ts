import { createClient } from "./server";

export async function authenticatedAgent() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const { data, error } = await (await createClient()).auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}
