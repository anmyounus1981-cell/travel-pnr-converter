import { redirect } from "next/navigation";
import { authenticatedAgent } from "@/lib/supabase/auth";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";
export default async function UpdatePasswordPage() {
  if (!await authenticatedAgent()) redirect("/auth/login");
  return <PasswordForm />;
}
