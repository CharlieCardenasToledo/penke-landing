import type { APIRoute } from "astro";
import { getRelease, signedAssetUrl } from "../lib/githubReleases";

// Botón "Descargar": instalador .exe de la última release de penke-ec.
export const GET: APIRoute = async () => {
  try {
    const release = await getRelease("latest");
    const asset = release?.assets.find((a) => a.name.endsWith("-setup.exe"));
    if (!asset) return new Response("No hay instalador publicado", { status: 404 });

    return new Response(null, {
      status: 302,
      headers: { Location: await signedAssetUrl(asset), "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Descarga de la última versión fallida", error);
    return new Response("Descarga no disponible temporalmente", { status: 502 });
  }
};
