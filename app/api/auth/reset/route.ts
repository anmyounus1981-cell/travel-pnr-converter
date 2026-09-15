import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  try {
    const { email } = await request.json();
    if (typeof email !== "string" || email.length > 254 || !email.includes("@"))
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    const origin = new URL(request.url).origin;
    await (await createClient()).auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/auth/update-password` });
    // Do not disclose whether an address belongs to an invited agent.
    return NextResponse.json({ message: "If the account exists, a password reset email has been sent." });
  } catch {
    return NextResponse.json({ error: "Password reset failed." }, { status: 400 });
  }
}
