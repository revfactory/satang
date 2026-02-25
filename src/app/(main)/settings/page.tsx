import { redirect } from "next/navigation";
import { getUser, getUserProfile } from "@/lib/supabase/auth";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();

  const userInfo = {
    display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "",
    email: user.email || "",
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    role: (profile?.role as "user" | "admin") || "user",
  };

  return <SettingsClient user={userInfo} />;
}
