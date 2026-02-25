import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const notebookId = searchParams.get("notebookId");

  const service = await createServiceRoleClient();

  switch (action) {
    case "users": {
      const { data, error } = await service
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    case "stats": {
      const [usersRes, notebooksRes, sourcesRes] = await Promise.all([
        service.from("users").select("id", { count: "exact", head: true }),
        service.from("notebooks").select("id", { count: "exact", head: true }),
        service.from("sources").select("id", { count: "exact", head: true }),
      ]);
      return NextResponse.json({
        totalUsers: usersRes.count ?? 0,
        totalNotebooks: notebooksRes.count ?? 0,
        totalSources: sourcesRes.count ?? 0,
      });
    }

    case "notebooks": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const { data, error } = await service
        .from("notebooks")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    case "sources": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      let query = service
        .from("sources")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (notebookId) query = query.eq("notebook_id", notebookId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    case "studio_outputs": {
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      let query = service
        .from("studio_outputs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (notebookId) query = query.eq("notebook_id", notebookId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
