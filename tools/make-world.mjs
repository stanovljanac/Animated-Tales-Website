#!/usr/bin/env node
// Jednokratni generator geometrije za mapu priča: pravi public/map-world.js.
//
// Sajt nema build korak i nema node_modules, pa se zavisnosti za ovaj alat instaliraju u
// privremeni folder van repoa, a putanja do njega se daje preko AT_GEO_DEPS:
//
//   mkdir /tmp/geo && cd /tmp/geo && npm init -y
//   npm i d3-geo@3.1.1 topojson-client@3.1.0 topojson-simplify@3.0.3 world-atlas@2.0.2
//   AT_GEO_DEPS=/tmp/geo node tools/make-world.mjs
//
// Izlaz je običan <script> (window.AT_WORLD), a ne .svg + fetch, da `file://` pregled radi.
// Geometrija je Natural Earth (land-10m), projekcija Natural Earth 1 rotirana tako da je
// centar mape na 50°E: Mediteran je levo od sredine, a ceo Pacifik (Fidži, Tonga, Tahiti,
// Havaji) ostaje u komadu na desnoj strani. Antarktik je odsečen.
//
// Pojednostavljenje je Visvalingam sa težinom po zonama: Egej i ostrva Pacifika ostaju fini,
// ostatak sveta je grub. Tako ceo svet staje u nekoliko desetina KB, a zum u Grčku i dalje
// pokazuje Antikiteru kao ostrvo.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DEPS = process.env.AT_GEO_DEPS;
if (!DEPS) {
  console.error('Postavi AT_GEO_DEPS na folder u kome su instalirani d3-geo, topojson-client, topojson-simplify i world-atlas (vidi zaglavlje).');
  process.exit(1);
}
const imp = (p) => import(pathToFileURL(path.join(DEPS, 'node_modules', p)).href);
const { geoNaturalEarth1, geoPath, geoContains } = await imp('d3-geo/src/index.js');
const { feature } = await imp('topojson-client/src/index.js');
const { presimplify, simplify } = await imp('topojson-simplify/src/index.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, '..', 'public');

// ---- parametri ------------------------------------------------------------
const ROT = -50;              // d3 rotate([-50, 0]) => centar mape je 50°E
const W = 1000;               // širina koordinatnog prostora mape
const LAT_N = 84, LAT_S = -56;  // odsečeni opseg geografskih širina
const BLEED = 15;             // kopno se seče 15 jedinica izvan okvira, da se ivica reza ne vidi

// Zone detalja: [lonW, latS, lonE, latN, množilac]. Težina tačke se množi, pa je prag
// efektivno manji u zoni. Prvi pogodak pobeđuje, pa idu od najfinijih ka grubljim.
const ZONES = [
  { box: [18, 33, 30, 42.5], m: 700, name: 'aegean' },
  { box: [164, -32, 180, -4], m: 700, name: 'pacific-west' },
  { box: [-180, -32, -138, -4], m: 700, name: 'pacific-east' },
  { box: [-12, 26, 52, 73], m: 36, name: 'europe-near-east' },
  { box: [55, 30, 90, 52], m: 6, name: 'central-asia' },
];
const BASE_THRESHOLD = 0.24;  // deg² u grubim zonama (~0.4° detalj)
const MIN_AREA_COARSE = 0.5;  // jedinice² ispod kojih se ostrvce u grubim zonama izbacuje
const MIN_AREA_FINE = 0.012;

// ---- učitavanje i pojednostavljenje --------------------------------------
const topo = JSON.parse(fs.readFileSync(path.join(DEPS, 'node_modules/world-atlas/land-10m.json'), 'utf8'));
const zoneOf = (lon, lat) => ZONES.find((z) => lon >= z.box[0] && lon <= z.box[2] && lat >= z.box[1] && lat <= z.box[3]);
const weighted = presimplify(topo, (t) => {
  const [a, b, c] = t;
  const area = Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1])) / 2;
  const z = zoneOf(b[0], b[1]);
  return area * (z ? z.m : 1);
});
const simplified = simplify(weighted, BASE_THRESHOLD);
// feature() za GeometryCollection vraća FeatureCollection: skupi sve poligone u jedan MultiPolygon
const asMulti = (fc) => {
  const feats = fc.features || [fc];
  const coordinates = [];
  for (const f of feats) {
    const g = f.geometry;
    if (g.type === 'Polygon') coordinates.push(g.coordinates);
    else if (g.type === 'MultiPolygon') coordinates.push(...g.coordinates);
  }
  return { type: 'MultiPolygon', coordinates };
};
const land = asMulti(feature(simplified, simplified.objects.land));
const full = asMulti(feature(topo, topo.objects.land)); // izvorni 10m, samo za proveru pinova

// ---- projekcija -----------------------------------------------------------
const unit = geoNaturalEarth1().scale(1).translate([0, 0]);
const xr = unit([180 - 1e-9, 0])[0];
const yN = unit([0, LAT_N])[1];
const yS = unit([0, LAT_S])[1];
const K = (W / 2) / xr;
const TX = W / 2;
const TY = -K * yN;
const H = K * (yS - yN);
const proj = geoNaturalEarth1().rotate([ROT, 0]).scale(K).translate([TX, TY]).precision(0.1)
  .clipExtent([[-BLEED, -BLEED], [W + BLEED, H + BLEED]]);

// ---- čišćenje poligona ----------------------------------------------------
const ringArea = (ring) => {
  let s = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const p = proj(ring[i]), q = proj(ring[i + 1]);
    if (!p || !q) return Infinity; // preseca ivicu projekcije: ne diraj
    s += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(s) / 2;
};
const polys = [];
for (const poly of land.coordinates) {
  const maxLat = Math.max(...poly[0].map((p) => p[1]));
  if (maxLat < -55) continue; // Antarktik
  const c = poly[0][0];
  const z = zoneOf(c[0], c[1]);
  const min = z ? MIN_AREA_FINE : MIN_AREA_COARSE;
  if (ringArea(poly[0]) < min) continue;
  polys.push(poly.filter((ring, i) => i === 0 || ringArea(ring) >= min * 4));
}
const geo = { type: 'MultiPolygon', coordinates: polys };
const d = geoPath(proj).digits(2)(geo);

// ---- provera: projekcija koja se isporučuje == d3 ----------------------------
const fn = `function (lon, lat) {
    var l = lon + (${ROT});
    l = ((l + 540) % 360) - 180;
    l *= Math.PI / 180;
    var p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
    var x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    var y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [${TX} + ${K.toFixed(6)} * x, ${TY.toFixed(4)} - ${K.toFixed(6)} * y];
  }`;
const shipped = vm.runInNewContext('(' + fn + ')');
const samples = [[23.31, 35.87], [12.5, 41.9], [32.6, 25.7], [-151.4, -16.8], [178, -18], [-155.5, 19.6], [172, -41], [8.5, 61.5], [71.8, 40.4], [-120, 37]];
const noClip = geoNaturalEarth1().rotate([ROT, 0]).scale(K).translate([TX, TY]);
for (const s of samples) {
  const a = shipped(s[0], s[1]), b = noClip(s);
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-3) {
    console.error('Projekcija se ne poklapa sa d3 za', s, a, b);
    process.exit(2);
  }
}

// ---- provera pinova na kopnu ---------------------------------------------------
const dataSrc = path.join(PUBLIC, 'data.js');
if (fs.existsSync(dataSrc)) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(dataSrc, 'utf8'), ctx);
  const events = (ctx.window.AT_DATA || {}).EVENTS || [];
  const nearest = (lon, lat) => {
    let best = Infinity;
    for (const poly of full.coordinates) {
      for (const p of poly[0]) {
        const dx = (p[0] - lon) * Math.cos(lat * Math.PI / 180), dy = p[1] - lat;
        const dd = Math.hypot(dx, dy);
        if (dd < best) best = dd;
      }
    }
    return best * 111; // km, grubo
  };
  for (const e of events) {
    const on = geoContains(full, [e.lon, e.lat]);
    const km = on ? 0 : nearest(e.lon, e.lat);
    console.log(`${on ? 'kopno ' : 'MORE  '} ${e.id.padEnd(20)} ${on ? '' : '~' + km.toFixed(1) + ' km do obale'}`);
  }
}

// ---- izlaz ------------------------------------------------------------------------
const out = `/* GENERISANO: tools/make-world.mjs. Ne menjati rukom.
   Natural Earth 1, rotirana na 50°E, kopno iz Natural Earth land-10m (javno dobro). */
window.AT_WORLD = {
  w: ${W},
  h: ${H.toFixed(2)},
  // lon/lat -> koordinate mape; ista formula kao d3.geoNaturalEarth1().rotate([${ROT}, 0])
  project: ${fn},
  land: "${d}"
};
`;
fs.writeFileSync(path.join(PUBLIC, 'map-world.js'), out);
console.log(`map-world.js: ${(out.length / 1024).toFixed(1)} KB, ${polys.length} poligona, ${W}x${H.toFixed(1)} (odnos ${(W / H).toFixed(2)})`);
