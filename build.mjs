import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Code builds never read Notion or modify published content.
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir("generated", { recursive: true });
const version = createHash("sha256")
  .update(await readFile("styles.css"))
  .digest("hex")
  .slice(0, 12);
await writeFile(
  "generated/assets.mjs",
  `export const assetVersion = ${JSON.stringify(version)};\n`,
);
for (const file of [
  "styles.css",
  "menu.js",
  "Resources/Brand/off-route-white-wordmark.png",
  "Resources/Placeholders/forest-dance-floor.webp",
  "Resources/Type/shrikhand.ttf",
  "Resources/Type/OFL.txt",
]) {
  await mkdir("dist/" + file.split("/").slice(0, -1).join("/"), {
    recursive: true,
  });
  await cp(file, "dist/" + file);
}
