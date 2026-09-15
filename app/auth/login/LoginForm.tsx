"use client";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [reset, setReset] = useState(false);
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(reset ? "/api/auth/reset" : "/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reset ? { email } : { email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Authentication failed.");
      if (reset) setMessage(result.message);
      else window.location.assign("/");
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900">
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded border bg-white p-6">
      <h1 className="text-2xl font-bold">{reset ? "Reset password" : "Agent sign in"}</h1>
      <p className="text-sm">Travel PNR Converter · invited agents only</p>
      <label className="block">Email<input type="email" required autoComplete="email" className="mt-1 w-full rounded border p-2" value={email} onChange={e => setEmail(e.target.value)} /></label>
      {!reset && <label className="block">Password<input type="password" required autoComplete="current-password" className="mt-1 w-full rounded border p-2" value={password} onChange={e => setPassword(e.target.value)} /></label>}
      {message && <p role="status" className="rounded bg-slate-100 p-2 text-sm">{message}</p>}
      <button disabled={busy} className="w-full rounded bg-blue-700 p-2 text-white disabled:opacity-50">{busy ? "Please wait..." : reset ? "Send reset email" : "Sign in"}</button>
      <button type="button" className="text-sm text-blue-700 underline" onClick={() => { setReset(!reset); setMessage(""); }}>{reset ? "Back to sign in" : "Forgot password?"}</button>
    </form>
  </main>;
}
