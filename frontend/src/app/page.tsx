import { redirect } from "next/navigation";

import { getBootstrapStatus, getSession } from "@/core/auth/server-session";

export default async function LandingPage() {
  const session = await getSession();

  if (session?.session && session.user?.role === "admin") {
    if (session.user.mustChangePassword) {
      redirect("/change-password");
    }
    redirect("/admin");
  }

  if (session?.session) {
    redirect("/workspace/overview");
  }

  // Check bootstrap status before redirecting to sign-in,
  // so the user doesn't see a flash of the login page.
  const { needs_setup } = await getBootstrapStatus();
  if (needs_setup) {
    redirect("/setup");
  }

  redirect("/sign-in");
}
