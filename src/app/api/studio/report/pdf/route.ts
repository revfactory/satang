import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { marked } from "marked";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { markdown, title } = await request.json();

    if (!markdown) {
      return NextResponse.json(
        { error: "마크다운 콘텐츠가 필요합니다." },
        { status: 400 }
      );
    }

    const htmlContent = await marked(markdown);

    const fullHtml = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
  body { font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a1a; line-height: 1.8; padding: 48px 56px; max-width: 100%; }
  h1 { font-size: 24px; font-weight: 700; border-bottom: 2px solid #e5e5e5; padding-bottom: 12px; margin: 32px 0 16px; }
  h2 { font-size: 20px; font-weight: 700; margin: 28px 0 12px; color: #111; }
  h3 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; color: #222; }
  p { margin: 8px 0; color: #333; font-size: 14px; }
  strong { color: #1a1a1a; }
  ul, ol { margin: 8px 0; padding-left: 24px; }
  li { margin: 4px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; text-align: left; padding: 10px 14px; border: 1px solid #ddd; }
  td { padding: 10px 14px; border: 1px solid #ddd; }
  tr:nth-child(even) { background: #fafafa; }
  code { background: #f5f3ff; color: #6D28D9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; color: inherit; }
  blockquote { border-left: 3px solid #6D28D9; background: #faf5ff; margin: 16px 0; padding: 12px 16px; border-radius: 0 8px 8px 0; }
  @page { margin: 15mm; }
</style>
</head><body>
${title ? `<h1 style="margin-top:0">${title}</h1>` : ""}
${htmlContent}
</body></html>`;

    let browser;
    const isServerless =
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isServerless) {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // Local development — use system Chrome
      const executablePath =
        process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : process.platform === "win32"
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : "/usr/bin/google-chrome";

      browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath,
        headless: true,
      });
    }

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    const filename = encodeURIComponent(title || "report") + ".pdf";

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "PDF 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
