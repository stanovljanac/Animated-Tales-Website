#!/usr/bin/env node
// Generator stranica za pretraživače: po jedna stranica za svaku epizodu (public/episodes/<slug>/),
// statičan spisak svih epizoda na početnoj, strukturirani podaci kanala u <head> početne,
// public/sitemap.xml i public/404.html.
//
//   node tools/make-pages.mjs           # upiše sve
//   node tools/make-pages.mjs --check   # samo proveri da je sve na disku ažurno (exit 1 ako nije)
//
// Zašto (27. 11. 2026): sajt je bio jedna stranica čiji je sadržaj o epizodama crtao JavaScript, a
// svaka nepostojeća adresa je vraćala početnu sa 200. Za upit „animated tales" se takmiče dve TV serije
// sa Wikipedijom i bar pet YouTube kanala istog imena, pa sajt mora da bude nedvosmislen entitet
// (Organization + sameAs ka kanalu) i da ima stranice koje se mogu indeksirati, svaka sa
// „| Animated Tales" u naslovu i ugrađenim videom.
//
// Ulaz: public/data.js (EPISODES, PLAYLISTS, EVENTS...) i tools/youtube.json (datum objave, trajanje i
// opis sa YouTube-a; osvežava ga tools/youtube-meta.mjs). Izlaz je determinističan: isti ulaz, isti fajlovi.
// Generisani delovi index.html su između oznaka `<!-- gen:... -->` i ne menjaju se rukom.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");

export const SITE = "https://animatedtales.mihailobuilds.com";
export const CHANNEL = "https://www.youtube.com/@AnimatedTales-r4r";
const CHANNEL_ID = "UCAd2G0YVuAuTTxGFsaYIsLw";
// Profili sa linkova kanala (YouTube → About), isti nalog. Kanal po ID-ju ide uz handle jer handle može
// da se promeni, a ID nikad.
const SAME_AS = [
  CHANNEL,
  "https://www.youtube.com/channel/" + CHANNEL_ID,
  "https://www.facebook.com/profile.php?id=61592256551814",
  "https://www.instagram.com/animatedtales1503/",
  "https://x.com/animatedtales15",
];
const ORG_DESCRIPTION =
  "Animated Tales is a YouTube channel that tells one story from history or mythology at a time, " +
  "in hand-drawn-style 2D animation: ancient battles, Greek and Norse gods, Maya myth, lost machines and palace plots.";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ---------------------------------------------------------------------------------------------
// Čisto jezgro
// ---------------------------------------------------------------------------------------------

export function loadData(file = join(PUB, "data.js")) {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(file, "utf8"), ctx, { filename: file });
  return ctx.window.AT_DATA;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// JSON u <script type="application/ld+json">: `<` se kodira da tekst nikad ne zatvori skriptu.
export function ldJson(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>";
}

export function isoDuration(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return "PT" + (h ? h + "H" : "") + (m ? m + "M" : "") + (s || (!h && !m) ? s + "S" : "");
}

export function humanDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return d + " " + MONTHS[m - 1] + " " + y;
}

export function clock(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

// Opis sa YouTube-a → pasusi i poglavlja. Odbacuje se ono što ima smisla samo na YouTube-u: hashtagovi,
// naslovi odeljaka („Chapters:", „HASHTAGS:"), rečenice sa „subscribe" i reklama kanala („Animated Tales
// brings…", „each video focuses…"); poglavlja (`0:00 Naslov`) idu u poseban spisak. Napomena o AI alatima
// je u podnožju svake stranice, pa se rečenica iz opisa ne ponavlja.
export function cleanDescription(text) {
  const chapters = [];
  const paras = [];
  for (const block of String(text).replace(/\r/g, "").split(/\n\s*\n/)) {
    const kept = [];
    for (const raw of block.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const ch = line.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)$/);
      if (ch) {
        chapters.push({ start: Number(ch[1] || 0) * 3600 + Number(ch[2]) * 60 + Number(ch[3]), label: ch[4].trim() });
        continue;
      }
      if (/^(chapters|hashtags|timestamps)\s*:?$/i.test(line)) continue;
      if (/^(#[\p{L}\p{N}_]+\s*)+$/u.test(line)) continue;
      kept.push(line);
    }
    if (!kept.length) continue;
    const para = kept.join(" ")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => !/subscribe|created with the assistance of ai/i.test(s))
      .join(" ")
      .trim();
    if (!para || /^animated tales\b|\beach video focuses\b/i.test(para)) continue;
    // Opisi pisani za YouTube ponekad imaju po jednu kratku rečenicu u redu („Tyr accepted.", „He was
    // wrong."); na stranici bi to bio niz od petnaest pasusa, pa se kratak pasus pripaja prethodnom.
    if (paras.length && para.length < 60) paras[paras.length - 1] += " " + para;
    else paras.push(para);
  }
  return { paras, chapters };
}

// Epizode koje imaju stranicu: objavljene (bez `soon`), najnovije prve. Slug je ime thumbnaila, jer je
// već jedinstven i stabilan (img/thumbs/<slug>.jpg).
export function episodeList(data, yt) {
  const list = Object.keys(data.EPISODES)
    .filter((id) => !data.EPISODES[id].soon)
    .map((id) => {
      const e = data.EPISODES[id];
      const meta = yt[id];
      if (!meta) throw new Error("tools/youtube.json nema " + id + " (" + e.title + "): pusti node tools/youtube-meta.mjs " + id);
      return {
        id, slug: e.thumb, ...e, ...cleanDescription(meta.description),
        uploadDate: meta.uploadDate, lengthSeconds: meta.lengthSeconds,
        event: data.EVENTS.find((ev) => ev.videos.indexOf(id) !== -1) || null,
        playlists: data.PLAYLISTS.filter((p) => p.videos.indexOf(id) !== -1),
      };
    });
  const slugs = new Set();
  for (const e of list) {
    if (slugs.has(e.slug)) throw new Error("dupli slug: " + e.slug);
    slugs.add(e.slug);
  }
  // Isti datum objave (ne bi trebalo) rešava ID, da redosled nikad ne zavisi od redosleda u objektu.
  return list.sort((a, b) => (a.uploadDate < b.uploadDate ? 1 : a.uploadDate > b.uploadDate ? -1 : a.id < b.id ? -1 : 1));
}

export const pageUrl = (e) => SITE + "/episodes/" + e.slug + "/";

function orgNode() {
  return {
    "@type": "Organization", "@id": SITE + "/#org", name: "Animated Tales",
    alternateName: ["Animated Tales YouTube channel", "AnimatedTales"],
    url: SITE + "/",
    logo: { "@type": "ImageObject", url: SITE + "/img/logo.jpg", width: 192, height: 192 },
    image: SITE + "/img/banner-1200.jpg",
    description: ORG_DESCRIPTION,
    slogan: "Stories worth remembering",
    sameAs: SAME_AS,
  };
}

export function homeLd() {
  return ldJson({
    "@context": "https://schema.org",
    "@graph": [
      orgNode(),
      {
        "@type": "WebSite", "@id": SITE + "/#website", name: "Animated Tales",
        alternateName: ["Animated Tales: history and myth, hand-drawn", "AnimatedTales"],
        url: SITE + "/", inLanguage: "en", publisher: { "@id": SITE + "/#org" },
      },
    ],
  });
}

export function episodeLd(e) {
  const url = pageUrl(e);
  return ldJson({
    "@context": "https://schema.org",
    "@graph": [
      orgNode(),
      {
        "@type": "VideoObject", "@id": url + "#video", name: e.title, description: e.hook,
        thumbnailUrl: [SITE + "/img/thumbs/" + e.slug + ".jpg", "https://i.ytimg.com/vi/" + e.id + "/maxresdefault.jpg"],
        uploadDate: e.uploadDate, duration: isoDuration(e.lengthSeconds),
        embedUrl: "https://www.youtube.com/embed/" + e.id,
        inLanguage: "en", isFamilyFriendly: true, mainEntityOfPage: url,
        author: { "@id": SITE + "/#org" }, publisher: { "@id": SITE + "/#org" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Animated Tales", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: e.title, item: url },
        ],
      },
    ],
  });
}

// Spisak svih epizoda (početna, stranica epizode, 404). `base` je "" na početnoj (relativne putanje,
// kao ostatak index.html) i "/" na stranicama u podfolderima.
export function indexList(list, base, currentId) {
  return '<ol class="ep-index">\n' + list.map((e) =>
    '  <li><a href="' + base + "episodes/" + e.slug + '/"' + (e.id === currentId ? ' aria-current="page"' : "") + ">" +
    '<span class="ix-label">' + esc(e.label) + "</span>" +
    '<span class="ix-title">' + esc(e.title) + "</span>" +
    '<span class="ix-dur">' + esc(e.dur) + "</span></a></li>"
  ).join("\n") + "\n</ol>";
}

const ICONS = {
  play: '<svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
};
const ext = (href, text, cls) =>
  "<a" + (cls ? ' class="' + cls + '"' : "") + ' href="' + esc(href) + '" target="_blank" rel="noopener">' + text + "</a>";

function head({ title, description, url, image, imageW, imageH, ogType, extra, robots }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots ? '<meta name="robots" content="' + robots + '">\n' : ""}${url ? '<link rel="canonical" href="' + esc(url) + '">\n' : ""}<meta name="theme-color" content="#ece1c6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#151922" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Animated Tales">
${url ? '<meta property="og:url" content="' + esc(url) + '">\n' : ""}<meta property="og:title" content="${esc(title.replace(/ \| Animated Tales$/, ""))}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="${imageW}">
<meta property="og:image:height" content="${imageH}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/logo.jpg">
<link rel="apple-touch-icon" href="/img/logo.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&family=Alegreya+SC:wght@500;700&display=swap">
<link rel="stylesheet" href="/styles.css">
${extra || ""}</head>`;
}

function nav() {
  return `<header class="nav" id="top">
  <div class="nav-inner">
    <a class="brand" href="/" aria-label="Animated Tales, home">
      <img src="/img/logo.jpg" alt="" width="40" height="40">
      <span>Animated Tales</span>
    </a>
    <nav aria-label="Sections">
      <ul class="nav-links">
        <li><a href="/#about">About</a></li>
        <li><a href="/#episodes">Episodes</a></li>
        <li><a href="/#how">How it's made</a></li>
        <li><a href="/#shorts">Shorts</a></li>
      </ul>
    </nav>
    <a class="btn btn-gold btn-small" href="${CHANNEL}?sub_confirmation=1" target="_blank" rel="noopener">Subscribe</a>
  </div>
</header>`;
}

function footer(data) {
  const pls = data.PLAYLISTS.map((p) => "<li>" + ext("https://www.youtube.com/playlist?list=" + p.id, esc(p.name)) + "</li>").join("");
  return `<footer class="footer band">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <img src="/img/logo.jpg" alt="" width="56" height="56" loading="lazy">
      <div>
        <p class="f-name">Animated Tales</p>
        <p class="f-tag">History and myth, hand-drawn.</p>
      </div>
    </div>
    <div>
      <p class="f-head">Channel</p>
      <ul class="f-links">
        <li><a href="/">Animated Tales home</a></li>
        <li><a href="${CHANNEL}" target="_blank" rel="noopener">YouTube channel</a></li>
        <li><a href="${CHANNEL}/videos" target="_blank" rel="noopener">Videos</a></li>
        <li><a href="${CHANNEL}/shorts" target="_blank" rel="noopener">Shorts</a></li>
        <li><a href="${CHANNEL}?sub_confirmation=1" target="_blank" rel="noopener">Subscribe</a></li>
      </ul>
    </div>
    <div>
      <p class="f-head">Playlists</p>
      <ul class="f-links f-playlists">${pls}</ul>
    </div>
  </div>
  <div class="wrap fine">
    <p>AI tools are used in production: research drafts, narration voice, illustration and animation. Every story is chosen and reviewed by a person.</p>
  </div>
</footer>`;
}

// Do 4 epizode za „Keep watching": prvo iz istih plejlisti (redom plejliste, pa Part 1→4 ide redom),
// zatim najnovije.
export function nextUp(e, list) {
  const byId = Object.fromEntries(list.map((x) => [x.id, x]));
  const out = [];
  const add = (id) => { if (id !== e.id && byId[id] && out.indexOf(byId[id]) === -1) out.push(byId[id]); };
  e.playlists.forEach((p) => p.videos.forEach(add));
  list.forEach((x) => add(x.id));
  return out.slice(0, 4);
}

export function episodePage(e, list, data) {
  const url = pageUrl(e);
  const watch = "https://www.youtube.com/watch?v=" + e.id;
  const ev = e.event;
  const claim = ev && data.CLAIMS[ev.claim];
  const facts = [
    ["Running time", esc(e.dur)],
    ["Published", '<time datetime="' + e.uploadDate.slice(0, 10) + '">' + humanDate(e.uploadDate) + "</time>"],
  ];
  if (ev) facts.push(["Where", esc(ev.place)], ["When", esc(data.whenOf(ev))]);

  const chapters = e.chapters.length
    ? '\n        <h3 class="ep-sub">Chapters</h3>\n        <ol class="ep-chapters">\n' + e.chapters.map((c) =>
        "          <li>" + ext(watch + "&t=" + c.start + "s", '<span class="ch-t">' + clock(c.start) + "</span> " + esc(c.label)) + "</li>"
      ).join("\n") + "\n        </ol>"
    : "";
  const pls = e.playlists.length
    ? '\n        <div class="ep-links">\n          <p class="f-head">In the playlists</p>\n          <ul class="f-links">' +
      e.playlists.map((p) => "<li>" + ext("https://www.youtube.com/playlist?list=" + p.id, esc(p.name)) + "</li>").join("") + "</ul>\n        </div>"
    : "";
  const shortIds = ev ? ev.shorts : [];
  const shorts = shortIds.length
    ? '\n        <div class="ep-links">\n          <p class="f-head">Shorts from this story</p>\n          <ul class="f-links">' +
      shortIds.map((s) => "<li>" + ext("https://www.youtube.com/shorts/" + s, esc(data.SHORTS[s])) + "</li>").join("") + "</ul>\n        </div>"
    : "";
  const pin = ev
    ? `
        <div class="ep-pin">
          <p class="eyebrow">On the story map${claim ? " · " + esc(claim.label.toLowerCase()) : ""}</p>
          <p>${esc(ev.text)}</p>
          <a class="text-link" href="/?tale=${esc(ev.id)}">See it on the story map</a>
        </div>`
    : "";
  const more = nextUp(e, list).map((x) => `      <li>
        <a class="series-item" href="/episodes/${x.slug}/">
          <img src="/img/thumbs/${x.slug}.jpg" alt="" width="960" height="540" loading="lazy">
          <span><b class="part">${esc(x.label)}</b><span class="s-title">${esc(x.title)}</span><span class="s-meta">${esc(x.dur)}</span></span>
        </a>
      </li>`).join("\n");

  return `${head({
    title: e.title + " | Animated Tales", description: e.hook, url,
    image: SITE + "/img/thumbs/" + e.slug + ".jpg", imageW: 960, imageH: 540, ogType: "video.other",
    extra: episodeLd(e) + "\n",
  })}
<body>
<!-- Generated by tools/make-pages.mjs from data.js and tools/youtube.json. Do not edit by hand. -->

<a class="skip" href="#watch">Skip to the video</a>

${nav()}

<main>

<article class="band ep" aria-labelledby="ep-title">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol><li><a href="/">Animated Tales</a></li><li><a href="/#episodes">Episodes</a></li></ol>
    </nav>
    <header class="ep-head">
      <p class="eyebrow">${esc(e.label)}</p>
      <h1 id="ep-title">${esc(e.title)}</h1>
      <p class="ep-hook">${esc(e.hook)}</p>
    </header>

    <div class="plate ep-player" id="watch">
      <iframe src="https://www.youtube-nocookie.com/embed/${e.id}?rel=0" title="${esc(e.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>

    <div class="ep-grid">
      <div class="ep-copy">
        <h2 class="ep-sub">About this episode</h2>
${e.paras.map((p) => "        <p>" + esc(p) + "</p>").join("\n")}${chapters}
      </div>
      <aside class="ep-side" aria-label="About the story">
        <dl class="ep-facts">
${facts.map(([k, v]) => "          <div><dt>" + k + "</dt><dd>" + v + "</dd></div>").join("\n")}
        </dl>${pin}
        <div class="actions">
          <a class="btn btn-ink" href="${watch}" target="_blank" rel="noopener">
            ${ICONS.play}
            Watch on YouTube
          </a>
          <a class="btn btn-gold" href="${CHANNEL}?sub_confirmation=1" target="_blank" rel="noopener">Subscribe</a>
        </div>${pls}${shorts}
      </aside>
    </div>
  </div>
</article>

<div class="meander" aria-hidden="true"></div>

<section class="band ep-more" aria-labelledby="more-title">
  <div class="wrap">
    <p class="eyebrow">Keep watching</p>
    <h2 id="more-title">More tales</h2>
    <ol class="series-list ep-next">
${more}
    </ol>
    <h3 class="ep-index-title">Every episode</h3>
${indexList(list, "/", e.id)}
  </div>
</section>

</main>

${footer(data)}
</body>
</html>
`;
}

export function notFoundPage(list, data) {
  return `${head({
    title: "Page not found | Animated Tales",
    description: "This page is not part of the tale. Every episode of Animated Tales is listed below.",
    image: SITE + "/img/banner-1200.jpg", imageW: 1200, imageH: 670, ogType: "website", robots: "noindex",
  })}
<body>
<!-- Generated by tools/make-pages.mjs. Do not edit by hand. -->

${nav()}

<main>
<section class="band ep" aria-labelledby="nf-title">
  <div class="wrap">
    <header class="ep-head">
      <p class="eyebrow">404 · page not found</p>
      <h1 id="nf-title">This page is not part of the tale</h1>
      <p class="ep-hook">The link may be old or mistyped. Every episode is listed below, or start again from the story map.</p>
    </header>
    <div class="actions"><a class="btn btn-ink" href="/">Back to the story map</a></div>
    <h2 class="ep-index-title">Every episode</h2>
${indexList(list, "/")}
  </div>
</section>
</main>

${footer(data)}
</body>
</html>
`;
}

export function sitemap(list) {
  const latest = list.reduce((m, e) => (e.uploadDate.slice(0, 10) > m ? e.uploadDate.slice(0, 10) : m), "");
  const urls = [[SITE + "/", latest]].concat(list.map((e) => [pageUrl(e), e.uploadDate.slice(0, 10)]));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(([loc, mod]) => "  <url>\n    <loc>" + esc(loc) + "</loc>\n    <lastmod>" + mod + "</lastmod>\n  </url>").join("\n") +
    "\n</urlset>\n";
}

// Zamena generisanog dela između `<!-- gen:NAME -->` i `<!-- /gen:NAME -->`; oznake ostaju.
export function replaceBlock(html, name, body) {
  const open = "<!-- gen:" + name + " -->", close = "<!-- /gen:" + name + " -->";
  const a = html.indexOf(open), b = html.indexOf(close);
  if (a === -1 || b === -1 || b < a) throw new Error("index.html nema oznake " + open + " … " + close);
  return html.slice(0, a + open.length) + "\n" + body + "\n" + html.slice(b);
}

export function homeIndexBlock(list) {
  return `<div class="ep-index-block">
  <p class="eyebrow">Every episode</p>
  <h3 class="ep-index-title">All ${list.length} tales, newest first</h3>
${indexList(list, "")}
</div>`;
}

// Svi fajlovi koje generator poseduje: { relativna putanja: sadržaj }.
export function buildAll(data, yt, indexHtml) {
  const list = episodeList(data, yt);
  const files = {};
  for (const e of list) files["episodes/" + e.slug + "/index.html"] = episodePage(e, list, data);
  files["404.html"] = notFoundPage(list, data);
  files["sitemap.xml"] = sitemap(list);
  let home = replaceBlock(indexHtml, "ld", homeLd());
  home = replaceBlock(home, "episode-index", homeIndexBlock(list));
  files["index.html"] = home;
  return { list, files };
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function main() {
  const check = process.argv.includes("--check");
  const data = loadData();
  const yt = JSON.parse(readFileSync(join(ROOT, "tools", "youtube.json"), "utf8"));
  // Git na Windows-u (core.autocrlf) vraća fajlove sa CRLF; generator radi i poredi u LF, inače bi
  // --check posle svakog checkout-a javljao da je sve zastarelo.
  const lf = (s) => s.replace(/\r\n/g, "\n");
  const { list, files } = buildAll(data, yt, lf(readFileSync(join(PUB, "index.html"), "utf8")));

  // Stranica epizode koja više nije u data.js ostala bi na sajtu kao siroče: prijavi je.
  const dir = join(PUB, "episodes");
  const orphans = existsSync(dir) ? readdirSync(dir).filter((s) => !list.some((e) => e.slug === s)) : [];

  let stale = 0;
  for (const [rel, body] of Object.entries(files)) {
    const file = join(PUB, rel);
    const same = existsSync(file) && lf(readFileSync(file, "utf8")) === body;
    if (same) continue;
    stale++;
    if (check) { console.log("zastarelo: public/" + rel); continue; }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    console.log("upisano:   public/" + rel);
  }
  orphans.forEach((s) => console.log("SIROČE:    public/episodes/" + s + "/ (nema ga u data.js; obriši folder)"));
  console.log(list.length + " epizoda, " + Object.keys(files).length + " fajlova" + (stale ? "" : ", sve ažurno"));
  if ((check && stale) || orphans.length) process.exit(1);
}

// Na Windows-u slovo diska u argv i u import.meta.url ume da se razlikuje po veličini (f: / F:).
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  const a = resolve(process.argv[1]), b = fileURLToPath(metaUrl);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

if (isMain(import.meta.url)) main();
