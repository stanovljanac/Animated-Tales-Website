// Snimak javnih podataka sa YouTube watch stranica: datum objave, trajanje u sekundama i opis videa.
// Piše tools/youtube.json, koji make-pages.mjs koristi za stranice epizoda (VideoObject traži uploadDate,
// a opis i poglavlja su tekst stranice). Snimak se komituje da bi generisanje bilo deterministično i bez
// mreže; ovaj alat se pušta samo kad se doda epizoda ili se na YouTube-u promeni opis.
//
//   node tools/youtube-meta.mjs            # svi videi iz EPISODES koji nisu `soon`
//   node tools/youtube-meta.mjs <ID> ...   # samo navedeni (ostali u snimku ostaju kakvi jesu)
//
// Bez API ključa i bez prijave: `ytInitialPlayerResponse` u HTML-u watch stranice (27. 11. 2026).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadData, isMain } from "./make-pages.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "youtube.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

export function parseWatchPage(html) {
  const m = html.match(/var ytInitialPlayerResponse = (\{.*?\});(?:var|<\/script>)/s);
  if (!m) throw new Error("nema ytInitialPlayerResponse (stranica za pristanak ili promenjen HTML)");
  const p = JSON.parse(m[1]);
  const v = p.videoDetails || {};
  const mf = (p.microformat && p.microformat.playerMicroformatRenderer) || {};
  if (!v.videoId || !mf.uploadDate) throw new Error("nepotpun odgovor (nema videoId ili uploadDate)");
  return {
    title: v.title,
    uploadDate: mf.uploadDate,
    lengthSeconds: Number(v.lengthSeconds),
    description: v.shortDescription || "",
  };
}

async function fetchOne(id) {
  const res = await fetch("https://www.youtube.com/watch?v=" + id, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) throw new Error(id + ": HTTP " + res.status);
  return parseWatchPage(await res.text());
}

async function main() {
  const { EPISODES } = loadData();
  const wanted = process.argv.slice(2);
  const ids = wanted.length ? wanted : Object.keys(EPISODES).filter((id) => !EPISODES[id].soon);
  const snap = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  let failed = 0;
  for (const id of ids) {
    try {
      snap[id] = await fetchOne(id);
      console.log("ok   " + id + "  " + snap[id].uploadDate.slice(0, 10) + "  " + snap[id].lengthSeconds + "s");
    } catch (e) {
      failed++;
      console.error("PAD  " + id + "  " + e.message);
    }
  }
  // Ključevi po abecedi: isti ulaz daje isti fajl, a diff pokazuje samo stvarne promene.
  const sorted = Object.fromEntries(Object.keys(snap).sort().map((k) => [k, snap[k]]));
  writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
  console.log("upisano: tools/youtube.json (" + Object.keys(sorted).length + " videa)");
  if (failed) process.exit(1);
}

if (isMain(import.meta.url)) main();
