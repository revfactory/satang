import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SourceType } from "@/lib/supabase/types";

function getSourceType(mimeType: string): SourceType {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "text";
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const notebookId = formData.get("notebookId") as string;

    if (!file || !notebookId) {
      return NextResponse.json(
        { error: "파일과 노트북 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 10MB를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const fileName = `${user.id}/${notebookId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("sources")
      .upload(fileName, file);

    if (uploadError) {
      return NextResponse.json(
        { error: "파일 업로드 실패: " + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("sources").getPublicUrl(fileName);

    // Create source record
    const sourceType = getSourceType(file.type);
    const { data: source, error: insertError } = await supabase
      .from("sources")
      .insert({
        notebook_id: notebookId,
        user_id: user.id,
        type: sourceType,
        title: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        processing_status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "소스 생성 실패" },
        { status: 500 }
      );
    }

    // Trigger async processing
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL ? request.url.replace("/api/sources/upload", "/api/sources/process") : "/api/sources/process"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ sourceId: source.id }),
      }
    ).catch(() => {
      // Fire and forget
    });

    return NextResponse.json(source);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
