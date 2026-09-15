import { NextResponse } from "next/server";
import { authenticatedAgent } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (!await authenticatedAgent()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await (await createClient()).auth.signOut();
  return error ? NextResponse.json({ error: "Sign-out failed." }, { status: 500 }) : NextResponse.json({ ok: true });
}
