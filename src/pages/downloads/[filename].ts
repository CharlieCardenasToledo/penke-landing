import type { APIRoute } from "astro";
import { getRelease, signedAssetUrl, tagForAsset } from "../../lib/githubReleases";

// Los instaladores copiados en public/downloads (p. ej. el MSI que referencia
// Microsoft Store) se sirven como estáticos y nunca llegan aquí. El resto se
// resuelve en las Releases de penke-ec y se redirige a una URL firmada temporal.
export const GET: APIRoute = async ({ params, url }) => {
  const filename = params.filename ?? "";
  const tag = url.searchParams.get("tag") ?? tagForAsset(filename);
  if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) return new Response("Not found", { status: 404 });

  try {
    const release = await getRelease(tag);
    const asset = release?.assets.find((a) => a.name === filename);
    if (!asset) return new Response("Not found", { status: 404 });

    return new Response(null, {
      status: 302,
      headers: { Location: await signedAssetUrl(asset), "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Descarga fallida", filename, error);
    return new Response("Descarga no disponible temporalmente", { status: 502 });
  }
};

export const HEAD: APIRoute = GET;
