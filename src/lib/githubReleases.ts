// Acceso a las Releases de penke-ec (repo privado) desde el servidor.
// GITHUB_TOKEN llega como secreto de App Hosting (ver apphosting.yaml):
// token fine-grained con permiso de solo lectura sobre Contents de penke-ec.

const REPO = "CharlieCardenasToledo/penke-ec";
const API = `https://api.github.com/repos/${REPO}`;
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
}

export interface Release {
  tag_name: string;
  /** Texto de la release: las notas de la versión tomadas del CHANGELOG. */
  body?: string | null;
  assets: ReleaseAsset[];
}

const cache = new Map<string, { at: number; release: Release | null }>();

function headers(accept = "application/vnd.github+json"): Headers {
  const h = new Headers({
    Accept: accept,
    "User-Agent": "penke-landing",
    "X-GitHub-Api-Version": "2022-11-28",
  });
  const token = process.env.GITHUB_TOKEN;
  if (token) h.set("Authorization", `Bearer ${token}`);
  return h;
}

/** "latest" o un tag como "v1.0.9". Devuelve null si la release no existe. */
export async function getRelease(tag: string): Promise<Release | null> {
  const hit = cache.get(tag);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.release;

  const url = tag === "latest" ? `${API}/releases/latest` : `${API}/releases/tags/${encodeURIComponent(tag)}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) {
    cache.set(tag, { at: Date.now(), release: null });
    return null;
  }
  if (!res.ok) throw new Error(`GitHub respondió ${res.status} al consultar la release ${tag}`);

  const release = (await res.json()) as Release;
  cache.set(tag, { at: Date.now(), release });
  return release;
}

/** Nombre de archivo → tag de su release (Penke.EC_1.0.9_x64_en-US.msi → v1.0.9). */
export function tagForAsset(filename: string): string | null {
  const match = filename.match(/[_-](\d+\.\d+\.\d+)[_-]/);
  return match ? `v${match[1]}` : null;
}

/**
 * URL firmada y temporal (unos minutos) para descargar el asset. GitHub la
 * devuelve como redirección de la API de assets; no incluye el token.
 */
export async function signedAssetUrl(asset: ReleaseAsset): Promise<string> {
  const res = await fetch(`${API}/releases/assets/${asset.id}`, {
    headers: headers("application/octet-stream"),
    redirect: "manual",
  });
  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) return location;
  throw new Error(`GitHub respondió ${res.status} al pedir el asset ${asset.name}`);
}

/** Descarga completa del asset (para archivos pequeños como latest.json). */
export async function fetchAssetText(asset: ReleaseAsset): Promise<string> {
  const res = await fetch(await signedAssetUrl(asset));
  if (!res.ok) throw new Error(`No se pudo descargar ${asset.name}: ${res.status}`);
  return res.text();
}
