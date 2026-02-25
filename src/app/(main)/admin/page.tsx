import { redirect } from "next/navigation";
import { getUser, getUserProfile, isAdmin } from "@/lib/supabase/auth";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/home");
  }

  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile();

  const userInfo = {
    display_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "",
    email: user.email || "",
    avatar_url:
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null,
    role: (profile?.role as "user" | "admin") || "user",
  };

  return <AdminClient user={userInfo} />;
}
