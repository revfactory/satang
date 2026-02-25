import { redirect } from "next/navigation";
import { getUser, getUserProfile } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotebookClient } from "./notebook-client";
import type { Notebook } from "@/lib/supabase/types";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: notebook, error }, profile] = await Promise.all([
    supabase.from("notebooks").select("*").eq("id", id).single(),
    getUserProfile(),
  ]);

  if (error || !notebook) {
    redirect("/home");
  }

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

  return (
    <NotebookClient
      notebook={notebook as Notebook}
      user={userInfo}
    />
  );
}
