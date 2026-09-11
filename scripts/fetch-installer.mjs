import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const url = "https://github.com/CharlieCardenasToledo/penke-ec/releases/download/v1.0.9/Penke.EC_1.0.9_x64_en-US.msi";
const destination = join(process.cwd(), "public", "downloads", "Penke.EC_1.0.9_x64_en-US.msi");

const response = await fetch(url, { headers: { "User-Agent": "Penke-App-Hosting-Build/1.0" } });
if (!response.ok || !response.body) throw new Error(`No se pudo descargar el instalador: ${response.status}`);

await mkdir(dirname(destination), { recursive: true });
await finished(Readable.fromWeb(response.body).pipe((await import("node:fs")).createWriteStream(destination)));
console.log(`Installer preparado: ${destination}`);
