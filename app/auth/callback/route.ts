import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return NextResponse.redirect(new URL("/auth/login?error=callback", url));
  const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/login?error=callback", url));
  const next = url.searchParams.get("next");
  return NextResponse.redirect(new URL(next === "/auth/update-password" ? next : "/", url));
}
