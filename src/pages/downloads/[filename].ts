import type { APIRoute } from "astro";

const assets: Record<string, string> = {
  "Penke.EC_1.0.9_x64_en-US.msi":
    "https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.9/Penke.EC_1.0.9_x64_en-US.msi",
};
const sizes: Record<string, number> = {
  "Penke.EC_1.0.9_x64_en-US.msi": 108392712,
};

export const GET: APIRoute = async ({ params, request }) => {
  const upstreamUrl = params.filename ? assets[params.filename] : undefined;
  if (!upstreamUrl) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${params.filename}"`,
    "Cache-Control": "public, max-age=300",
  });
  headers.set("Content-Length", String(sizes[params.filename!]));

  if (request.method === "HEAD") return new Response(null, { status: 200, headers });

  const chunkSize = 8 * 1024 * 1024;
  const total = sizes[params.filename!];
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let start = 0; start < total; start += chunkSize) {
          const end = Math.min(start + chunkSize, total) - 1;
          const upstream = await fetch(upstreamUrl, {
            headers: {
              "User-Agent": "Penke-landing-download-proxy/1.0",
              Range: `bytes=${start}-${end}`,
            },
          });
          if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
            throw new Error(`upstream status ${upstream.status}`);
          }
          const reader = upstream.body.getReader();
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            controller.enqueue(part.value);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(body, { status: 200, headers });
};

export const HEAD: APIRoute = GET;
