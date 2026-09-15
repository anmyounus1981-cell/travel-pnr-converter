"use client";
import { useState } from "react";

export default function PasswordForm() {
  const [password, setPassword] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/update-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Password update failed.");
      window.location.assign("/");
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900">
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded border bg-white p-6">
      <h1 className="text-2xl font-bold">Set your password</h1>
      <label className="block">New password<input type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded border p-2" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {message && <p role="status" className="rounded bg-slate-100 p-2 text-sm">{message}</p>}
      <button disabled={busy} className="w-full rounded bg-blue-700 p-2 text-white disabled:opacity-50">{busy ? "Saving..." : "Set password"}</button>
    </form>
  </main>;
}
