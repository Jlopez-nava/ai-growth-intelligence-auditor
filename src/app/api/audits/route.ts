import { runWebsiteAudit } from "@/lib/audit/run-website-audit";
import { UnsafeUrlError } from "@/lib/audit/url-safety";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  return Response.json({ audits: [] });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body containing a URL." }, { status: 400 });
  }

  const url =
    typeof body === "object" && body !== null && "url" in body && typeof body.url === "string"
      ? body.url
      : null;
  if (!url) return Response.json({ error: "Enter a company URL." }, { status: 400 });

  try {
    return Response.json(await runWebsiteAudit(url), { status: 201 });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Website audit failed", error);
    const message = error instanceof Error ? error.message : "The audit could not be completed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
