import { redirect } from "next/navigation";

import { getBootstrapStatus } from "@/core/auth/server-session";

export default async function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { needs_setup } = await getBootstrapStatus();
  if (needs_setup) {
    redirect("/setup");
  }
  return <>{children}</>;
}
