import { redirect } from "next/navigation";
import { authenticatedAgent } from "@/lib/supabase/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await authenticatedAgent()) redirect("/");
  return <LoginForm />;
}
