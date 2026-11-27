// Javlja pretraživačima koji podržavaju IndexNow (Bing, Yandex, Seznam, Naver; Bing hrani i DuckDuckGo,
// Yahoo i Ecosia) da su se adrese iz public/sitemap.xml promenile. Google IndexNow ne koristi: za njega
// je Search Console i sitemap.
//
//   node tools/indexnow.mjs            # sve adrese iz sitemap-a
//   node tools/indexnow.mjs --dry-run  # samo ispiše šta bi poslao
//
// Pušta se POSLE objave (push na main), jer pretraživač proverava ključ na živom sajtu:
// https://animatedtales.mihailobuilds.com/<ključ>.txt. Ključ je public/<32 hex>.txt (27. 11. 2026).

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SITE, isMain } from "./make-pages.mjs";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

export function findKey(files) {
  const keys = files.filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (keys.length !== 1) throw new Error("očekivan tačno jedan public/<32 hex>.txt, nađeno: " + keys.length);
  return keys[0].slice(0, -4);
}

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

async function main() {
  const key = findKey(readdirSync(PUB));
  const urlList = sitemapUrls(readFileSync(join(PUB, "sitemap.xml"), "utf8"));
  const body = { host: new URL(SITE).host, key, keyLocation: SITE + "/" + key + ".txt", urlList };
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }
  const live = await fetch(body.keyLocation);
  if (!live.ok || (await live.text()).trim() !== key) throw new Error("ključ nije na živom sajtu (" + body.keyLocation + "): prvo objavi");
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 = primljeno, 202 = primljeno, ključ se još proverava; 422 = adrese nisu sa hosta ili ključ ne valja.
  console.log("IndexNow: HTTP " + res.status + " za " + urlList.length + " adresa");
  if (res.status !== 200 && res.status !== 202) process.exit(1);
}

if (isMain(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
