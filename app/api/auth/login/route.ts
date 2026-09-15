import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  try {
    const { email, password } = await request.json();
    if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length > 1024)
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    const { error } = await (await createClient()).auth.signInWithPassword({ email, password });
    return error ? NextResponse.json({ error: "Invalid email or password." }, { status: 401 }) : NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sign-in failed." }, { status: 400 });
  }
}
