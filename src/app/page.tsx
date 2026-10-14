import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.roles.includes("ADMIN")) {
    redirect("/admin/dashboard");
  } else if (session.roles.includes("GURU_PIKET")) {
    redirect("/piket/dashboard");
  } else if (session.roles.includes("WALI_KELAS")) {
    redirect("/wali-kelas/dashboard");
  } else if (session.roles.includes("WALI_MURID")) {
    redirect("/wali-murid/dashboard");
  } else {
    redirect("/login");
  }
}
