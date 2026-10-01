import type { APIRoute } from "astro";
import { getRelease, signedAssetUrl } from "../lib/githubReleases";

// "Descargar": instalador de la última release de penke-ec para el sistema
// pedido (?os=windows|mac|deb|rpm). Sin parámetro, el de Windows.
const INSTALADORES: Record<string, (nombre: string) => boolean> = {
  windows: (n) => n.endsWith("-setup.exe"),
  mac: (n) => n.endsWith(".dmg"),
  deb: (n) => n.endsWith(".deb"),
  rpm: (n) => n.endsWith(".rpm"),
};

export const GET: APIRoute = async ({ url }) => {
  const os = url.searchParams.get("os") ?? "windows";
  const coincide = INSTALADORES[os] ?? INSTALADORES.windows;
  try {
    const release = await getRelease("latest");
    const asset = release?.assets.find((a) => coincide(a.name));
    if (!asset) return new Response("No hay instalador publicado para este sistema", { status: 404 });

    return new Response(null, {
      status: 302,
      headers: { Location: await signedAssetUrl(asset), "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Descarga de la última versión fallida", error);
    return new Response("Descarga no disponible temporalmente", { status: 502 });
  }
};
