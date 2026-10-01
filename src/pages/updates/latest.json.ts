import type { APIRoute } from "astro";
import { fetchAssetText, getRelease } from "../../lib/githubReleases";

// Manifiesto del actualizador de Tauri. El latest.json de la release apunta a
// URLs de GitHub que no son públicas; se reescriben a /downloads/<archivo> en
// este mismo sitio. Las firmas del manifiesto no cambian: cubren el archivo,
// no la URL.
// Detrás del proxy de App Hosting la URL de la petición es interna
// (https://localhost); los enlaces públicos se arman con el dominio del sitio.
const SITE = import.meta.env.SITE;

export const GET: APIRoute = async () => {
  try {
    const release = await getRelease("latest");
    const asset = release?.assets.find((a) => a.name === "latest.json");
    if (!asset) return new Response("Not found", { status: 404 });

    const manifest = JSON.parse(await fetchAssetText(asset));
    // Las notas se leen del texto actual de la release: corregirlo en GitHub
    // corrige lo que muestra el actualizador, sin volver a compilar.
    if (release!.body?.trim()) manifest.notes = release!.body.trim();
    for (const platform of Object.values<{ url?: string }>(manifest.platforms ?? {})) {
      if (!platform.url) continue;
      const filename = decodeURIComponent(platform.url.split("/").pop() ?? "");
      // El tag va explícito: algunos assets (p. ej. el .app.tar.gz de macOS) no llevan la versión en el nombre
      const target = new URL(`/downloads/${encodeURIComponent(filename)}`, SITE);
      target.searchParams.set("tag", release!.tag_name);
      platform.url = target.toString();
    }

    return new Response(JSON.stringify(manifest), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Manifiesto de actualización no disponible", error);
    return new Response("Manifiesto no disponible temporalmente", { status: 502 });
  }
};
