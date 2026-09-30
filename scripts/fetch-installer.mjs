// Copia en public/downloads el MSI que referencia Microsoft Store, para
// servirlo como archivo estático con URL fija.
// penke-ec es privado: se usa GITHUB_TOKEN (secreto de App Hosting).
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const repo = "CharlieCardenasToledo/penke-ec";
const tag = "v1.0.9";
const filename = "Penke.EC_1.0.9_x64_en-US.msi";
const destination = join(process.cwd(), "public", "downloads", filename);

if (existsSync(destination)) {
  console.log(`Installer ya presente: ${destination}`);
  process.exit(0);
}

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("Falta GITHUB_TOKEN para descargar el instalador de penke-ec (repo privado)");

const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": "Penke-App-Hosting-Build/1.0",
  "X-GitHub-Api-Version": "2022-11-28",
};

const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
  headers: { ...headers, Accept: "application/vnd.github+json" },
});
if (!releaseRes.ok) throw new Error(`No se pudo leer la release ${tag}: ${releaseRes.status}`);
const asset = (await releaseRes.json()).assets?.find((a) => a.name === filename);
if (!asset) throw new Error(`La release ${tag} no tiene ${filename}`);

const response = await fetch(`https://api.github.com/repos/${repo}/releases/assets/${asset.id}`, {
  headers: { ...headers, Accept: "application/octet-stream" },
});
if (!response.ok || !response.body) throw new Error(`No se pudo descargar el instalador: ${response.status}`);

await mkdir(dirname(destination), { recursive: true });
await finished(Readable.fromWeb(response.body).pipe((await import("node:fs")).createWriteStream(destination)));
console.log(`Installer preparado: ${destination}`);
