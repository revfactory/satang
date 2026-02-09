import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PDFDocument } from "pdf-lib";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrls, title } = await request.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "이미지 URL이 필요합니다." },
        { status: 400 }
      );
    }

    const pdfDoc = await PDFDocument.create();

    for (const url of imageUrls as string[]) {
      const res = await fetch(url);
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Detect image type from response headers or magic bytes
      const contentType = res.headers.get("content-type") || "";
      const isJpeg =
        contentType.includes("jpeg") ||
        contentType.includes("jpg") ||
        (bytes[0] === 0xff && bytes[1] === 0xd8);
      const isPng =
        contentType.includes("png") ||
        (bytes[0] === 0x89 && bytes[1] === 0x50);

      let image;
      try {
        if (isPng) {
          image = await pdfDoc.embedPng(bytes);
        } else if (isJpeg) {
          image = await pdfDoc.embedJpg(bytes);
        } else {
          // Try JPEG first, then PNG as fallback
          try {
            image = await pdfDoc.embedJpg(bytes);
          } catch {
            image = await pdfDoc.embedPng(bytes);
          }
        }
      } catch {
        continue; // Skip unreadable images
      }

      // Scale image to fit A4 landscape (842 x 595 points)
      const pageWidth = 842;
      const pageHeight = 595;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const imgAspect = image.width / image.height;
      const pageAspect = pageWidth / pageHeight;

      let drawWidth: number;
      let drawHeight: number;

      if (imgAspect > pageAspect) {
        drawWidth = pageWidth;
        drawHeight = pageWidth / imgAspect;
      } else {
        drawHeight = pageHeight;
        drawWidth = pageHeight * imgAspect;
      }

      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const filename = encodeURIComponent(title || "slides") + ".pdf";

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Slides PDF generation error:", error);
    return NextResponse.json(
      { error: "PDF 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
