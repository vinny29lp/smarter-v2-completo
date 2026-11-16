import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingLia } from "./OnboardingLia";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "FRANQUEADO" && role !== "FUNCIONARIO") redirect("/dashboard");
  return <OnboardingLia podeEditar={role === "FRANQUEADO"} />;
}
