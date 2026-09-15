import { NextResponse } from "next/server";
import { authenticatedAgent } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!await authenticatedAgent()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { password } = await request.json();
    if (typeof password !== "string" || password.length < 12 || password.length > 1024)
      return NextResponse.json({ error: "Use a password of at least 12 characters." }, { status: 400 });
    const { error } = await (await createClient()).auth.updateUser({ password });
    return error ? NextResponse.json({ error: "Password update failed." }, { status: 400 }) : NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Password update failed." }, { status: 400 });
  }
}
