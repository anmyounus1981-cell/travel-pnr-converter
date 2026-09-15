import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase invitation and recovery email templates should link here with
// {{ .TokenHash }}. The token is exchanged server-side into SSR cookies.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (!token_hash || (type !== "invite" && type !== "recovery") || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return NextResponse.redirect(new URL("/auth/login?error=confirmation", url));
  const { error } = await (await createClient()).auth.verifyOtp({ token_hash, type });
  return NextResponse.redirect(new URL(error ? "/auth/login?error=confirmation" : "/auth/update-password", url));
}
