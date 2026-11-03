/* The story map: the hero plate as a small game board.
   Reads window.AT_DATA (data.js), window.AT_WORLD (map-world.js) and window.AT (main.js).

   Two levels. The world view shows one seal per region with a count; a click flies the camera
   into the region, where every tale is its own pin. An era filter recolours the pins and
   re-skins the map. A pin opens a panel with the videos for that event.

   Layering, bottom to top: sea (CSS colour + animated waves) / svg land / HTML pins and seals
   / panel. The sea is not part of the svg on purpose: it is the only part that moves
   continuously, and a moving CSS layer is far cheaper than repainting a 120 KB path. */
(function () {
  "use strict";

  var D = window.AT_DATA, WORLD = window.AT_WORLD, AT = window.AT;
  var mount = document.getElementById("tale-map");
  if (!mount || !D || !WORLD || !AT) return;

  try { init(); } catch (err) {
    if (window.console) console.error("Story map failed to start", err);
    fallback();
  }

  // If anything goes wrong the plate falls back to the channel banner, as before the map existed.
  function fallback() {
    mount.className = "tm-fallback";
    mount.innerHTML = '<img class="hero-img" src="img/banner.jpg" width="1920" height="1072" alt="The Animated Tales banner: a hand-drawn ancient world of temples, a winding road and caravans, a storm and a sailing ship.">';
    var r = document.getElementById("tm-regions");
    if (r) r.hidden = true;
  }

  function init() {
    var SVGNS = "http://www.w3.org/2000/svg";
    var YT = AT.YT, esc = AT.esc, ext = AT.ext;
    var W = WORLD.w, H = WORLD.h;
    var ERAS = D.ERAS, REGIONS = D.REGIONS, EVENTS = D.EVENTS;
    var SUB = YT + "@AnimatedTales-r4r?sub_confirmation=1";
    var STORE_KEY = "at-tales-found";
    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Label side per region seal, so neighbouring names in the Mediterranean do not collide.
    var SIDE = { greece: "b", italy: "l", "near-east": "r", north: "t", asia: "b", pacific: "b" };

    // Pin glyphs: one per era, so the era reads without relying on colour alone.
    var GLYPH = {
      myth: '<path fill="currentColor" d="M13.5 2 5 14h6l-1.5 8L19 10h-6z"/>',
      ancient: '<ellipse cx="12" cy="7" rx="3.6" ry="4.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11.6V22M7 15h10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      classical: '<path fill="currentColor" d="M4 18c0-6.5 3-12 8-12s8 5.5 8 12v3h-4.5v-4.5h-7V21H4z"/><path d="M8.5 6.5C10 3 16 3 18 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      medieval: '<path fill="currentColor" fill-rule="evenodd" d="M4.5 21V8h3.5v2.5h2.5V8h3v2.5H16V8h3.5v13zM10 21v-5h4v5z"/>',
      modern: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M12 5.5l3 6.5-3 6.5L9 12z"/>'
    };
    function glyph(era) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (GLYPH[era] || "") + "</svg>";
    }

    // ------------------------------------------------------------------ data
    var EV = {}, RG = {}, ERA = {};
    function boxOf(fit) {
      var w = fit[0], s = fit[1], e = fit[2] < fit[0] ? fit[2] + 360 : fit[2], n = fit[3];
      var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
      for (var i = 0; i <= 4; i++) {
        for (var j = 0; j <= 4; j++) {
          var p = WORLD.project(w + (e - w) * i / 4, s + (n - s) * j / 4);
          b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]);
          b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]);
        }
      }
      return b;
    }
    ERAS.forEach(function (e) { ERA[e.id] = e; });
    EVENTS.forEach(function (e, i) {
      var p = WORLD.project(e.lon, e.lat);
      e.era = D.eraOf(e); e.order = i; e.mx = p[0]; e.my = p[1];
      EV[e.id] = e;
    });
    REGIONS.forEach(function (r) {
      var p = WORLD.project(r.seal[0], r.seal[1]);
      r.mx = p[0]; r.my = p[1]; r.box = boxOf(r.fit);
      RG[r.id] = r;
    });
    var WORLD_BOX = { x0: 0, y0: 0, x1: W, y1: H };
    // Chronological order: undated myth first, then by year.
    var CHRONO = EVENTS.slice().sort(function (a, b) {
      return (a.myth ? -1e6 : a.year) - (b.myth ? -1e6 : b.year) || a.order - b.order;
    });

    var found = {};
    try { (JSON.parse(localStorage.getItem(STORE_KEY)) || []).forEach(function (id) { if (EV[id]) found[id] = true; }); } catch (e) { /* storage off: the counter just starts at 0 */ }
    function saveFound() { try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.keys(found))); } catch (e) { /* ignore */ } }

    // ----------------------------------------------------------------- state
    var state = { era: "all", region: "world", tale: null };
    function inEra(e, era) { return era === "all" || e.era === era; }
    function scope() { return CHRONO.filter(function (e) { return inEra(e, state.era); }); }
    function count(region, era) {
      return EVENTS.filter(function (e) { return (!region || e.region === region) && inEra(e, era); }).length;
    }

    // ------------------------------------------------------------------- DOM
    // The banner cover (#tm-cover) is already in the page; the map is built underneath it.
    var cover = document.getElementById("tm-cover");
    mount.classList.add("tm", "is-world");
    mount.setAttribute("data-era", "all");
    var mapHTML =
      '<div class="tm-stagewrap">' +
        '<div class="tm-stage" id="tm-stage">' +
          '<svg class="tm-waves" aria-hidden="true" focusable="false"><defs><pattern id="tm-wave-pat" width="34" height="17" patternUnits="userSpaceOnUse"><path d="M2 6q4-4 8 0t8 0M19 14q4-4 8 0t8 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></pattern></defs><rect width="100%" height="100%" fill="url(#tm-wave-pat)"/></svg>' +
          '<svg class="tm-svg" aria-hidden="true" focusable="false" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice">' +
            '<defs><path id="tm-land" d="' + WORLD.land + '"/><path id="tm-land-lo" d="' + WORLD.landLo + '"/></defs>' +
            '<g class="tm-halo"><use href="#tm-land" class="halo h2"/><use href="#tm-land" class="halo h1"/></g>' +
            '<use href="#tm-land" class="land"/>' +
            '<g class="tm-grid"></g>' +
            '<g class="tm-worlddeco"></g>' +
          "</svg>" +
          '<div class="tm-fx hero-fx" aria-hidden="true">' +
            '<svg class="cloud cloud-a" viewBox="0 0 220 90"><path d="M20 70c-14 0-18-20-2-24 0-16 22-24 34-12 6-22 40-26 50-6 14-16 44-8 44 12 22-4 36 18 22 30z"/></svg>' +
            '<svg class="cloud cloud-b" viewBox="0 0 220 90"><path d="M24 72c-16-2-14-22 2-24 2-14 22-18 30-8 10-18 38-18 46 0 12-10 34-4 34 12 18 0 26 18 12 20z"/></svg>' +
            '<div class="gulls">' +
              '<svg class="gull g1" viewBox="0 0 40 16"><path d="M2 10 Q11 1 20 9 Q29 1 38 10"/></svg>' +
              '<svg class="gull g2" viewBox="0 0 40 16"><path d="M2 10 Q11 1 20 9 Q29 1 38 10"/></svg>' +
              '<svg class="gull g3" viewBox="0 0 40 16"><path d="M2 10 Q11 1 20 9 Q29 1 38 10"/></svg>' +
            "</div>" +
          "</div>" +
          '<div class="tm-corners" aria-hidden="true"></div>' +
          '<svg class="tm-leaders" aria-hidden="true" focusable="false"></svg>' +
          '<div class="tm-items"></div>' +
          '<div class="tm-fog" hidden>' +
            '<div class="tm-fog-card">' +
              '<p class="tm-fog-title">No tales from here yet</p>' +
              '<p class="tm-fog-text"></p>' +
              '<a class="btn btn-gold btn-small" href="' + SUB + '" target="_blank" rel="noopener">Subscribe to the channel</a>' +
            "</div>" +
          "</div>" +
          '<div class="tm-cartouche" aria-hidden="true"><b>Animated Tales</b><span>Stories worth remembering</span></div>' +
          '<div class="tm-hud">' +
            '<p class="tm-found"><span class="tm-found-label">Tales found</span> <b id="tm-found-n">0</b> / ' + EVENTS.length + "</p>" +
          "</div>" +
          '<div class="tm-wipe" aria-hidden="true"></div>' +
        "</div>" +
        '<aside class="tm-panel" id="tm-panel" role="region" aria-label="Tale details">' +
          '<button type="button" class="tm-close" data-act="close" aria-label="Close this tale">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>' +
          "</button>" +
          '<div class="tm-panel-body"></div>' +
        "</aside>" +
      "</div>" +
      '<div class="tm-ages" role="radiogroup" aria-label="Show tales from one age"></div>' +
      '<p class="sr-only" id="tm-live" aria-live="polite"></p>';
    mount.insertAdjacentHTML("afterbegin", mapHTML);
    mount.classList.add("is-built");

    var stage = mount.querySelector("#tm-stage");
    var svg = mount.querySelector(".tm-svg");
    var itemsEl = mount.querySelector(".tm-items");
    var leadersEl = mount.querySelector(".tm-leaders");
    var panel = mount.querySelector("#tm-panel");
    var panelBody = mount.querySelector(".tm-panel-body");
    var agesEl = mount.querySelector(".tm-ages");
    var fogEl = mount.querySelector(".tm-fog");
    var wipe = mount.querySelector(".tm-wipe");
    var live = mount.querySelector("#tm-live");
    var foundN = mount.querySelector("#tm-found-n");
    var cornersEl = mount.querySelector(".tm-corners");
    var regionsEl = document.getElementById("tm-regions-chips");
    var halo1 = svg.querySelector(".halo.h1"), halo2 = svg.querySelector(".halo.h2");
    var landUse = svg.querySelector(".land");

    // ------------------------------------------------- map furniture (static)
    // World-space decoration is drawn once and shown only on the world view; at region zoom
    // it would be scaled up to absurd sizes, so there only the screen-space corners remain.
    var worldDeco = svg.querySelector(".tm-worlddeco");
    function el(name, attrs, parent) {
      var n = document.createElementNS(SVGNS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }
    function polyline(points, cls, parent) {
      var d = points.map(function (p, i) { var q = WORLD.project(p[0], p[1]); return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("");
      return el("path", { d: d, "class": cls }, parent);
    }
    function dots(points, cls, r, parent) {
      points.forEach(function (p) { var q = WORLD.project(p[0], p[1]); el("circle", { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: r, "class": cls }, parent); });
    }
    function ornAt(name, lon, lat, w, ratio, parent) {
      var q = WORLD.project(lon, lat);
      var g = el("g", {}, parent);
      g.innerHTML = AT.ORN[name]();
      var s = g.firstChild;
      s.setAttribute("x", (q[0] - w / 2).toFixed(1)); s.setAttribute("y", (q[1] - w * ratio / 2).toFixed(1));
      s.setAttribute("width", w); s.setAttribute("height", (w * ratio).toFixed(1));
      s.style.overflow = "visible";
      return g;
    }

    // Graticule: meridians every 30 degrees, parallels every 15. Parallels are broken where
    // they cross the antimeridian of the rotated map, or they would be joined by a long line.
    var grid = svg.querySelector(".tm-grid");
    (function () {
      var d = "", lon, lat, i, p, prevX;
      for (lon = -180; lon < 180; lon += 30) {
        for (i = 0; i <= 28; i++) {
          p = WORLD.project(lon + 0.01, -56 + i * 5);
          d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        }
      }
      for (lat = -45; lat <= 75; lat += 15) {
        prevX = null;
        for (i = 0; i <= 72; i++) {
          p = WORLD.project(-129.9 + i * 5, lat);
          var jump = prevX !== null && Math.abs(p[0] - prevX) > 400;
          d += (i && !jump ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
          prevX = p[0];
        }
      }
      el("path", { d: d, "class": "grid-line" }, grid);
    })();

    // Myth: constellations over the open sea.
    var gMyth = el("g", { "class": "wd wd-myth" }, worldDeco);
    [[[-55, 30], [-47, 36], [-38, 34], [-31, 40], [-24, 38]],
     [[62, -12], [70, -6], [78, -9], [84, -18], [76, -24], [68, -20]],
     [[-165, 15], [-158, 22], [-148, 20], [-140, 28]]].forEach(function (c) {
      polyline(c, "const-line", gMyth); dots(c, "const-star", 1.6, gMyth);
    });
    // Classical: a ship west of Gibraltar (the Mediterranean itself is full of seals).
    var gClassical = el("g", { "class": "wd wd-classical" }, worldDeco);
    ornAt("ship", -17, 33, 34, 100 / 140, gClassical);
    // Middle Ages: a sea serpent in the Atlantic.
    var gMedieval = el("g", { "class": "wd wd-medieval" }, worldDeco);
    (function () {
      var q = WORLD.project(-42, -14);
      var g = el("g", { transform: "translate(" + q[0].toFixed(1) + " " + q[1].toFixed(1) + ")" }, gMedieval);
      el("path", { "class": "serpent", d: "M0 0c6-14 16-14 22 0s16 14 22 0 16-14 22 0 16 14 22 0M88 0c3-7 9-10 14-6l-5 3 6 3-7 2c-3 3-7 3-8-2z" }, g);
      el("path", { "class": "serpent thin", d: "M6-9l2-5 3 4M28-9l2-5 3 4M50-9l2-5 3 4M72-9l2-5 3 4" }, g);
    })();
    // Modern era: rhumb lines from two compass roses, and a galleon.
    var gModern = el("g", { "class": "wd wd-modern" }, worldDeco);
    [[-38, 12], [78, -18]].forEach(function (c) {
      var q = WORLD.project(c[0], c[1]), d = "";
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * Math.PI * 2;
        d += "M" + q[0].toFixed(1) + " " + q[1].toFixed(1) + "l" + (Math.cos(a) * 520).toFixed(1) + " " + (Math.sin(a) * 520).toFixed(1);
      }
      el("path", { d: d, "class": "rhumb" }, gModern);
      el("circle", { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: 5, "class": "rose-dot" }, gModern);
    });
    ornAt("ship", -30, -34, 30, 100 / 140, gModern);

    // Screen-space corner furniture, one group per era; CSS shows the one that matches.
    (function () {
      function stars() {
        var s = "", i, seed = 7;
        for (i = 0; i < 34; i++) {
          seed = (seed * 9301 + 49297) % 233280;
          var x = seed / 233280 * 100;
          seed = (seed * 9301 + 49297) % 233280;
          var y = seed / 233280 * 100;
          s += '<i style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + "%;--d:" + ((i % 7) * 0.7).toFixed(1) + 's"></i>';
        }
        return s;
      }
      function wind(cls) {
        return '<svg class="wind ' + cls + '" viewBox="0 0 76 70"><circle cx="30" cy="34" r="18" class="w-face"/><circle cx="22" cy="42" r="7.5" class="w-face"/><circle cx="38" cy="42" r="7.5" class="w-face"/>' +
          '<ellipse cx="30" cy="46" rx="3" ry="3.6" class="w-ink"/><circle cx="24" cy="29" r="1.7" class="w-ink"/><circle cx="36" cy="29" r="1.7" class="w-ink"/>' +
          '<path d="M20 24l6 2M40 24l-6 2" class="w-line"/><path d="M52 40c7-3 12-2 18 2M52 47c7 0 12 3 17 8M50 34c6-5 11-6 17-4" class="w-line"/></svg>';
      }
      var rays = "";
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * Math.PI * 2;
        rays += "M" + (40 + 21 * Math.cos(a)).toFixed(1) + " " + (40 + 21 * Math.sin(a)).toFixed(1) + "L" + (40 + 34 * Math.cos(a)).toFixed(1) + " " + (40 + 34 * Math.sin(a)).toFixed(1);
      }
      cornersEl.innerHTML =
        '<div class="cn cn-myth"><div class="starfield">' + stars() + '</div><svg class="moon" viewBox="0 0 60 60"><path d="M38 6a25 25 0 1 0 14 38A21 21 0 0 1 38 6z"/></svg></div>' +
        '<div class="cn cn-ancient"><div class="fibres"></div><svg class="sun" viewBox="0 0 80 80"><circle cx="40" cy="40" r="15"/><path d="' + rays + '"/></svg></div>' +
        '<div class="cn cn-classical"><div class="meander-strip top"></div><div class="meander-strip bottom"></div></div>' +
        '<div class="cn cn-medieval">' + wind("tc") + wind("tr") + wind("bl") + wind("br") + "</div>" +
        '<div class="cn cn-modern"><span class="rose" data-orn="compass"></span></div>';
      var rose = cornersEl.querySelector(".rose");
      if (rose) AT.drawOrnament(rose);
    })();

    // --------------------------------------------------------- items (pins)
    var sealEls = {}, pinEls = {}, items = [];
    function makeLeader() {
      return { line: el("line", { "class": "leader" }, leadersEl), dot: el("circle", { r: 2.4, "class": "leader-dot" }, leadersEl) };
    }
    REGIONS.forEach(function (r) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "tm-item tm-seal-btn side-" + (SIDE[r.id] || "b");
      b.setAttribute("data-region", r.id);
      b.innerHTML = '<span class="tm-medal"><b class="tm-count"></b></span><span class="tm-tag">' + esc(r.short || r.chip) + "</span>";
      itemsEl.appendChild(b);
      sealEls[r.id] = b;
      items.push({ kind: "region", id: r.id, el: b, mx: r.mx, my: r.my, leader: makeLeader(), shown: false });
    });
    CHRONO.forEach(function (e) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "tm-item tm-pin"; b.setAttribute("data-era-pin", e.era);
      b.setAttribute("data-tale", e.id);
      b.setAttribute("aria-controls", "tm-panel"); b.setAttribute("aria-expanded", "false");
      b.setAttribute("aria-label", e.name + ", " + D.whenOf(e) + ". " + ERA[e.era].name + ".");
      b.innerHTML = '<span class="tm-medal">' + glyph(e.era) + '<i class="tm-tick"></i></span><span class="tm-tag">' + esc(e.name) + "<small>" + esc(D.whenOf(e)) + "</small></span>";
      itemsEl.appendChild(b);
      pinEls[e.id] = b;
      items.push({ kind: "tale", id: e.id, el: b, mx: e.mx, my: e.my, leader: makeLeader(), shown: false });
    });

    // ----------------------------------------------------------- era bar
    ERAS.forEach(function (e, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "tm-age"; b.setAttribute("role", "radio");
      b.setAttribute("data-era", e.id); b.setAttribute("aria-checked", "false"); b.tabIndex = -1;
      b.title = e.range;
      b.innerHTML = '<span class="tm-age-dot" data-era-pin="' + (e.id === "all" ? "all" : e.id) + '">' + (e.id === "all" ? "" : glyph(e.id)) + "</span>" +
        '<span class="tm-age-text"><span class="tm-age-name">' + esc(e.name) + '</span><span class="tm-age-range">' + esc(e.range) + "</span></span>" +
        '<span class="count"></span>';
      agesEl.appendChild(b);
    });

    // ------------------------------------------------------------- camera
    var cam = { cx: W / 2, cy: H / 2, w: W };
    var anim = 0;
    function sizeNow() { return { w: stage.clientWidth, h: stage.clientHeight }; }
    // Below this the plate switches to the phone layout: a 3:2 stage and a bottom sheet.
    function isPhone() { return stage.clientWidth < 860; }
    function targetFrame() {
      var s = sizeNow();
      // With the side panel open, the camera frames the region in what is left of the stage.
      var padR = (state.tale && !isPhone()) ? panel.offsetWidth + 20 : 0;
      var box = state.region === "world" ? WORLD_BOX : RG[state.region].box;
      var air = state.region === "world" ? 1.02 : 1.2;
      var freeW = s.w - padR;
      var k = Math.max((box.x1 - box.x0) * air / freeW, (box.y1 - box.y0) * air / s.h);
      return { cx: (box.x0 + box.x1) / 2 + (padR / 2) * k, cy: (box.y0 + box.y1) / 2, w: s.w * k };
    }
    // While the camera flies, every frame is drawn again, so the cheap coast stands in for the fine
    // one (and the halo and graticule are left out in CSS). The fine coast returns on landing.
    function setFlying(on) {
      mount.classList.toggle("is-flying", on);
      landUse.setAttribute("href", on ? "#tm-land-lo" : "#tm-land");
    }
    function flyTo(t, instant) {
      if (anim) { cancelAnimationFrame(anim); anim = 0; }
      if (instant || reduce) { cam.cx = t.cx; cam.cy = t.cy; cam.w = t.w; setFlying(false); paint(); return; }
      setFlying(true);
      var from = { cx: cam.cx, cy: cam.cy, w: cam.w }, t0 = null, dur = 780;
      function step(now) {
        if (t0 === null) t0 = now;
        var p = Math.min(1, (now - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        cam.w = Math.exp(Math.log(from.w) + (Math.log(t.w) - Math.log(from.w)) * e);
        cam.cx = from.cx + (t.cx - from.cx) * e;
        cam.cy = from.cy + (t.cy - from.cy) * e;
        paint();
        if (p < 1) anim = requestAnimationFrame(step);
        else { anim = 0; setFlying(false); }
      }
      anim = requestAnimationFrame(step);
    }

    // Pins are separated in screen pixels so that Marathon and Athens, 25 km apart, do not
    // sit on top of each other; a thin leader line keeps the true spot visible.
    function separate(list, d) {
      for (var pass = 0; pass < 10; pass++) {
        var moved = false;
        for (var i = 0; i < list.length; i++) {
          for (var j = i + 1; j < list.length; j++) {
            var a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= d) continue;
            if (dist < 0.01) { dx = Math.cos(i * 2.4 + j); dy = Math.sin(i * 2.4 + j); dist = 1; }
            var push = (d - dist) / 2, ux = dx / dist, uy = dy / dist;
            a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
            moved = true;
          }
        }
        if (!moved) break;
      }
    }

    function paint() {
      var s = sizeNow();
      if (!s.w) return;
      var ch = cam.w * s.h / s.w, x = cam.cx - cam.w / 2, y = cam.cy - ch / 2, k = cam.w / s.w;
      svg.setAttribute("viewBox", x.toFixed(2) + " " + y.toFixed(2) + " " + cam.w.toFixed(2) + " " + ch.toFixed(2));
      // Strokes keep their pixel width at every zoom (no vector-effect: dash intro needs plain strokes).
      halo2.setAttribute("stroke-width", (26 * k).toFixed(3));
      halo1.setAttribute("stroke-width", (11 * k).toFixed(3));
      landUse.setAttribute("stroke-width", (1.3 * k).toFixed(3));
      grid.style.strokeWidth = (0.8 * k).toFixed(3);

      var list = [], off = 28;
      items.forEach(function (it) {
        if (!it.shown) return;
        it.ax = (it.mx - x) / cam.w * s.w; it.ay = (it.my - y) / ch * s.h;
        it.x = it.ax; it.y = it.ay;
        it.off = it.ax < -off || it.ax > s.w + off || it.ay < -off || it.ay > s.h + off;
        if (!it.off) list.push(it);
        if (it.off !== it.wasOff) { it.wasOff = it.off; it.el.classList.toggle("is-off", it.off); }
      });
      // World seals are bigger and sit in a crowd (Greece, Italy and the Near East are a few
      // degrees apart), so they are pushed further apart than region pins.
      var world = state.region === "world";
      var freeW = (state.tale && !isPhone()) ? s.w - (panel.offsetWidth + 20) : s.w;
      var phone = isPhone();
      separate(list, world ? (phone ? 38 : 60) : (phone ? 44 : 40));
      list.forEach(function (it) {
        it.x = Math.max(24, Math.min(s.w - 24, it.x)); it.y = Math.max(24, Math.min(s.h - 24, it.y));
        it.el.style.transform = "translate3d(" + it.x.toFixed(1) + "px," + it.y.toFixed(1) + "px,0)";
        // A pin's name opens to the right, or to the left when the pin is near the free edge.
        if (it.kind === "tale") it.el.classList.toggle("tag-left", it.x > freeW - 220);
        var far = Math.hypot(it.x - it.ax, it.y - it.ay) > 8;
        it.leader.line.style.display = it.leader.dot.style.display = far ? "" : "none";
        if (far) {
          it.leader.line.setAttribute("x1", it.ax.toFixed(1)); it.leader.line.setAttribute("y1", it.ay.toFixed(1));
          it.leader.line.setAttribute("x2", it.x.toFixed(1)); it.leader.line.setAttribute("y2", it.y.toFixed(1));
          it.leader.dot.setAttribute("cx", it.ax.toFixed(1)); it.leader.dot.setAttribute("cy", it.ay.toFixed(1));
        }
      });
      if (world) placeTags(list, s);
      leadersEl.setAttribute("viewBox", "0 0 " + s.w + " " + s.h);
    }

    // Each seal's name goes on the first side where it touches neither another seal nor
    // another name; the preferred side in SIDE is tried first.
    function tagBox(side, x, y, w, h) {
      if (side === "r") return [x + 26, y - h / 2, w, h];
      if (side === "l") return [x - 26 - w, y - h / 2, w, h];
      if (side === "t") return [x - w / 2, y - 26 - h, w, h];
      return [x - w / 2, y + 26, w, h];
    }
    function hit(a, b) { return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]; }
    function placeTags(list, s) {
      var seals = list.filter(function (it) { return it.kind === "region"; });
      if (!seals.length) return;
      var placed = [];
      seals.forEach(function (it) { it.box = [it.x - 26, it.y - 26, 52, 52]; });
      seals.forEach(function (it) {
        var tag = it.el.querySelector(".tm-tag");
        var w = it.tagW || (it.tagW = (tag.offsetWidth || 70) + 4), h = 28;
        var pref = SIDE[it.id] || "b", tries = [pref].concat(["r", "l", "b", "t"].filter(function (x) { return x !== pref; })), chosen = null;
        for (var i = 0; i < tries.length && !chosen; i++) {
          var b = tagBox(tries[i], it.x, it.y, w, h);
          if (b[0] < 4 || b[1] < 4 || b[0] + b[2] > s.w - 4 || b[1] + b[3] > s.h - 4) continue;
          var clash = placed.some(function (p) { return hit(b, p); }) || seals.some(function (o) { return o !== it && hit(b, o.box); });
          if (!clash) chosen = { side: tries[i], box: b };
        }
        if (!chosen) chosen = { side: pref, box: tagBox(pref, it.x, it.y, w, h) };
        placed.push(chosen.box);
        if (it.side !== chosen.side) {
          it.side = chosen.side;
          it.el.className = it.el.className.replace(/\bside-\w\b/, "side-" + chosen.side);
        }
      });
    }
    // Names are measured once the web fonts are in, otherwise the fallback font's widths stick.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { items.forEach(function (it) { it.tagW = 0; }); paint(); });
    }

    // ---------------------------------------------------------------- render
    function announce(msg) { live.textContent = ""; setTimeout(function () { live.textContent = msg; }, 30); }

    function render(opts) {
      opts = opts || {};
      var world = state.region === "world";
      mount.classList.toggle("is-world", world);
      mount.setAttribute("data-era", state.era);

      // era bar: counts are within the chosen region, so the bar answers "what is here?"
      var scopeRegion = world ? null : state.region;
      Array.prototype.forEach.call(agesEl.children, function (b) {
        var id = b.getAttribute("data-era"), on = id === state.era, n = count(scopeRegion, id);
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        b.querySelector(".count").textContent = n;
        b.classList.toggle("is-empty", n === 0 && id !== "all");
      });

      // region chips outside the plate: counts follow the era
      if (regionsEl) {
        Array.prototype.forEach.call(regionsEl.children, function (b) {
          var id = b.getAttribute("data-key");
          if (!id) return; // the "Random tale" button is an action, not a region
          b.setAttribute("aria-pressed", id === state.region ? "true" : "false");
          var n = id === "world" ? count(null, state.era) : count(id, state.era);
          b.querySelector(".count").textContent = n;
          b.classList.toggle("is-empty", n === 0 && id !== "world");
        });
      }

      // seals on the world view, pins on a region view
      items.forEach(function (it) {
        var show = false;
        if (it.kind === "region") {
          show = world;
          if (show) {
            var n = count(it.id, state.era), r = RG[it.id];
            it.el.querySelector(".tm-count").textContent = n;
            it.el.classList.toggle("is-empty", n === 0);
            it.el.setAttribute("aria-label", r.name + ": " + n + (n === 1 ? " tale" : " tales") + (state.era === "all" ? "" : " in " + ERA[state.era].name) + ". Zoom in.");
          }
        } else {
          var ev = EV[it.id];
          show = !world && ev.region === state.region && inEra(ev, state.era);
          it.el.classList.toggle("is-found", !!found[it.id]);
          it.el.classList.toggle("is-current", state.tale === it.id);
          it.el.setAttribute("aria-expanded", state.tale === it.id ? "true" : "false");
        }
        it.shown = show;
        it.el.classList.toggle("is-hidden", !show);
        if (!show) { it.leader.line.style.display = it.leader.dot.style.display = "none"; it.wasOff = undefined; it.el.classList.remove("is-off"); }
        it.el.tabIndex = show ? 0 : -1;
        if (show) it.el.removeAttribute("aria-hidden"); else it.el.setAttribute("aria-hidden", "true");
      });

      // terra incognita: a region with nothing in this age
      var empty = !world && count(state.region, state.era) === 0;
      fogEl.hidden = !empty;
      mount.classList.toggle("is-fogged", empty);
      if (empty) {
        fogEl.querySelector(".tm-fog-text").textContent = RG[state.region].name + " has no tale from this age yet (" + ERA[state.era].name + "). Subscribe, and it might be the next one.";
      }

      // counter
      var nFound = Object.keys(found).length;
      foundN.textContent = nFound;
      mount.classList.toggle("all-found", nFound === EVENTS.length);

      renderPanel();
      flyTo(targetFrame(), opts.instant);
      paint();
      writeURL();

      if (opts.say) announce(opts.say);
    }

    // ------------------------------------------------------------------ panel
    function videoHTML(id) {
      var v = D.EPISODES[id], url = YT + "watch?v=" + id;
      return '<article class="tm-video">' +
        '<a class="tm-thumb" href="' + url + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">' +
          '<img src="img/thumbs/' + v.thumb + '.jpg" alt="" width="960" height="540" loading="lazy"><span class="tm-dur">' + v.dur + "</span></a>" +
        '<div class="tm-video-body"><p class="tm-label">' + esc(v.label) + "</p><h4>" + ext(url, esc(v.title)) + "</h4>" +
          ext(url, '<svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>Watch on YouTube', "btn btn-ink btn-small") +
        "</div></article>";
    }
    // Order matters in a 460px-tall panel: the video and its link come straight after the title,
    // so they are on screen without scrolling; the reading comes below them.
    function panelHTML(ev) {
      var list = scope(), i = list.indexOf(ev), c = D.CLAIMS[ev.claim];
      var shorts = ev.shorts.length
        ? '<div class="tm-shorts"><p class="tm-sub">Shorts</p><ul>' + ev.shorts.map(function (id) { return "<li>" + ext(YT + "shorts/" + id, esc(D.SHORTS[id])) + "</li>"; }).join("") + "</ul></div>" : "";
      return '<p class="tm-eyebrow"><span class="tm-eyedot" data-era-pin="' + ev.era + '"></span>' + esc(ERA[ev.era].name) + " · " + esc(RG[ev.region].chip) + "</p>" +
        '<h3 class="tm-title" tabindex="-1">' + esc(ev.name) + "</h3>" +
        '<p class="tm-meta"><b>' + esc(D.whenOf(ev)) + "</b> · " + esc(ev.place) + "</p>" +
        '<div class="tm-videos">' + ev.videos.map(videoHTML).join("") + "</div>" +
        '<p class="tm-claim" data-claim="' + ev.claim + '"><b>' + c.label + "</b> " + c.note + "</p>" +
        '<p class="tm-text">' + esc(ev.text) + "</p>" + shorts +
        '<nav class="tm-nav" aria-label="Move through the tales in time">' +
          '<button type="button" class="btn btn-line btn-small" data-act="prev"' + (i <= 0 ? " disabled" : "") + '>← Earlier</button>' +
          '<span class="tm-pos">' + (i + 1) + " of " + list.length + "</span>" +
          '<button type="button" class="btn btn-line btn-small" data-act="next"' + (i >= list.length - 1 ? " disabled" : "") + ">Later →</button>" +
        "</nav>";
    }
    var shownTale = null;
    function renderPanel() {
      var open = !!state.tale;
      panel.classList.toggle("is-open", open);
      if (open) {
        // Rebuild when the tale or the filter changes the "n of m" line.
        var key = state.tale + "|" + state.era;
        if (panel.getAttribute("data-key") !== key) {
          panelBody.innerHTML = panelHTML(EV[state.tale]);
          panelBody.scrollTop = 0;
          panel.setAttribute("data-key", key);
        }
      } else { panel.removeAttribute("data-key"); }
      if (open) panel.removeAttribute("inert"); else panel.setAttribute("inert", "");
      shownTale = state.tale;
    }

    // ---------------------------------------------------------------- go()
    var url0 = (function () { try { return new URL(location.href); } catch (e) { return null; } })();
    function writeURL() {
      if (!url0) return;
      try {
        var u = new URL(location.href), q = u.searchParams;
        [["era", state.era !== "all" ? state.era : null], ["region", state.region !== "world" ? state.region : null], ["tale", state.tale]].forEach(function (p) {
          if (p[1]) q.set(p[0], p[1]); else q.delete(p[0]);
        });
        history.replaceState(null, "", u.pathname + (q.toString() ? "?" + q.toString() : "") + u.hash);
      } catch (e) { /* file:// and sandboxed frames refuse; the map still works */ }
    }

    var wiping = false, queued = null;
    function go(patch, opts) {
      opts = opts || {};
      // During an age change the last request waits, so a stale one can never overwrite it.
      if (wiping) { queued = [patch, opts]; return; }
      var next = { era: state.era, region: state.region, tale: state.tale };
      for (var k in patch) next[k] = patch[k];
      if (next.tale && !EV[next.tale]) next.tale = null;
      if (next.tale) {
        var ev = EV[next.tale];
        next.region = ev.region;
        if (next.era !== "all" && ev.era !== next.era) { if (patch.era) next.tale = null; else next.era = "all"; }
      }
      if (next.tale && next.region !== EV[next.tale].region) next.tale = null;
      if (next.region !== "world" && !RG[next.region]) next.region = "world";

      var eraChanged = next.era !== state.era;
      var talesChanged = next.tale !== state.tale;
      function apply() {
        state.era = next.era; state.region = next.region; state.tale = next.tale;
        if (state.tale && !found[state.tale]) { found[state.tale] = true; saveFound(); }
        var say = "";
        if (state.tale) say = EV[state.tale].name + ", " + D.whenOf(EV[state.tale]) + ".";
        else if (opts.speak !== false) {
          var n = count(state.region === "world" ? null : state.region, state.era);
          say = (state.region === "world" ? "World" : RG[state.region].name) + ", " + ERA[state.era].name + ": " + n + (n === 1 ? " tale." : " tales.");
        }
        render({ instant: opts.instant, say: say });
        if (opts.focus === "panel" && state.tale) { var t = panelBody.querySelector(".tm-title"); if (t) t.focus({ preventScroll: true }); }
        if (opts.focus === "pin" && pinEls[opts.pinId]) pinEls[opts.pinId].focus({ preventScroll: true });
        if (state.tale && isPhone() && opts.scroll !== false) {
          var r = mount.getBoundingClientRect();
          if (r.top < 0 || r.top > window.innerHeight * 0.25) mount.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        }
      }
      if (eraChanged && !opts.instant && !reduce && wipe.animate) wipeTo(next.era, opts.origin, apply);
      else apply();
    }

    // The age changes under a blot of ink: it spreads from the button that was pressed, the
    // skin is swapped while the stage is covered, then the blot fades out.
    var BLOT = { all: "#2b6a60", myth: "#1d2342", ancient: "#7a5a1f", classical: "#8a3f22", medieval: "#6b1620", modern: "#17304f" };
    function wipeTo(era, origin, apply) {
      wiping = true;
      var r = stage.getBoundingClientRect();
      var ox = origin ? origin.x - r.left : r.width / 2, oy = origin ? origin.y - r.top : r.height;
      wipe.style.background = BLOT[era] || "#1f2430";
      wipe.style.display = "block";
      var a = wipe.animate([{ clipPath: "circle(0px at " + ox + "px " + oy + "px)" }, { clipPath: "circle(" + Math.hypot(r.width, r.height) + "px at " + ox + "px " + oy + "px)" }], { duration: 430, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" });
      a.onfinish = function () {
        apply();
        var b = wipe.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: "ease-out", fill: "forwards" });
        b.onfinish = function () {
          a.cancel(); b.cancel(); wipe.style.display = ""; wiping = false;
          if (queued) { var qd = queued; queued = null; go(qd[0], qd[1]); }
        };
      };
    }

    // ----------------------------------------------------------------- events
    itemsEl.addEventListener("click", function (ev) {
      var b = ev.target.closest(".tm-item");
      if (!b) return;
      if (b.hasAttribute("data-region")) { go({ region: b.getAttribute("data-region"), tale: null }); return; }
      var id = b.getAttribute("data-tale");
      if (state.tale === id) go({ tale: null }, { focus: "pin", pinId: id });
      else go({ tale: id }, { focus: "panel" });
    });
    panel.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-act]");
      if (!b || b.disabled) return;
      var act = b.getAttribute("data-act");
      if (act === "close") { var id = state.tale; go({ tale: null }, { focus: "pin", pinId: id }); return; }
      var list = scope(), i = list.indexOf(EV[state.tale]);
      var to = list[act === "prev" ? i - 1 : i + 1];
      if (to) go({ tale: to.id }, { focus: "panel", scroll: false });
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && state.tale) { var id = state.tale; go({ tale: null }, { focus: "pin", pinId: id }); }
    });
    // "Random tale" prefers a tale you have not opened yet.
    function randomTale() {
      var pool = scope().filter(function (e) { return e.id !== state.tale; });
      var fresh = pool.filter(function (e) { return !found[e.id]; });
      var from = fresh.length ? fresh : pool;
      if (from.length) go({ tale: from[Math.floor(Math.random() * from.length)].id }, { focus: "panel" });
    }
    agesEl.addEventListener("click", function (ev) {
      var b = ev.target.closest(".tm-age");
      if (b) go({ era: b.getAttribute("data-era") }, { origin: { x: ev.clientX, y: ev.clientY } });
    });
    agesEl.addEventListener("keydown", function (ev) {
      var dir = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
      if (!dir) return;
      ev.preventDefault();
      var all = Array.prototype.slice.call(agesEl.children), i = all.indexOf(document.activeElement);
      var nb = all[(i + dir + all.length) % all.length];
      nb.focus();
      var r = nb.getBoundingClientRect();
      go({ era: nb.getAttribute("data-era") }, { origin: { x: r.left + r.width / 2, y: r.top } });
    });
    if (regionsEl) {
      var regionChips = [{ id: "world", chip: "World" }].concat(REGIONS);
      regionsEl.innerHTML = regionChips.map(function (r) {
        return '<button type="button" class="chip" data-key="' + r.id + '" aria-pressed="false">' + esc(r.chip) + ' <span class="count"></span></button>';
      }).join("") +
        '<button type="button" class="chip tm-random" aria-label="Open a random tale">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/><circle cx="15" cy="15" r="1.4" fill="currentColor"/><circle cx="15" cy="9" r="1.4" fill="currentColor"/><circle cx="9" cy="15" r="1.4" fill="currentColor"/></svg>' +
          "Random tale</button>";
      regionsEl.addEventListener("click", function (ev) {
        var b = ev.target.closest(".chip");
        if (!b) return;
        if (b.classList.contains("tm-random")) randomTale();
        else go({ region: b.getAttribute("data-key"), tale: null });
      });
    }

    // A narrow stage switches to the phone layout (3:2 stage, bottom-sheet panel).
    // Toggling the class changes the stage height, which fires the observer once more; the second
    // pass finds nothing to change, so it settles.
    function relayout() {
      mount.classList.toggle("is-phone", isPhone());
      flyTo(targetFrame(), true);
    }
    if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(stage);
    else window.addEventListener("resize", relayout);

    // ------------------------------------------------------- the banner cover
    // The plate opens as the channel banner. Now and then it lifts a little from the bottom, like
    // a blind being tugged, so it reads as something to pull; a tap rolls it up and the map is
    // underneath. Until then the map is inert, so nothing under the cover can be tabbed to.
    var covered = false;
    function setCovered(on) {
      covered = on;
      mount.classList.toggle("is-covered", on);
      [mount.querySelector(".tm-stagewrap"), agesEl].forEach(function (n) {
        if (on) n.setAttribute("inert", ""); else n.removeAttribute("inert");
      });
    }
    function revealRegions() {
      var wrap = document.getElementById("tm-regions");
      if (wrap && wrap.hidden) { wrap.hidden = false; wrap.classList.add("tm-rise"); }
    }
    function dropCover() { if (cover && cover.parentNode) cover.parentNode.removeChild(cover); }
    function openMap(opts) {
      if (!covered) return;
      opts = opts || {};
      function finish() {
        dropCover(); setCovered(false); revealRegions();
        flyTo(targetFrame(), true); // the stage may have settled to a new size while covered
        if (opts.keyboard) { var on = agesEl.querySelector('[aria-checked="true"]'); if (on) on.focus({ preventScroll: true }); }
      }
      if (!cover || opts.instant || reduce || !cover.animate) { finish(); return; }
      var here = getComputedStyle(cover).transform; // wherever the peek has got to, so there is no jump
      cover.classList.remove("is-hint");
      mount.classList.add("is-opening");
      revealRegions();
      cover.animate(
        [{ transform: here === "none" ? "translateY(0)" : here }, { transform: "translateY(-104%)" }],
        { duration: 950, easing: "cubic-bezier(.6, .02, .2, 1)", fill: "forwards" }
      ).onfinish = function () { mount.classList.remove("is-opening"); finish(); };
    }
    mount.addEventListener("click", function (ev) { if (covered) openMap({ keyboard: ev.detail === 0 }); });
    if (cover) {
      // Without JavaScript the cover is just the banner; here it becomes a button.
      cover.setAttribute("role", "button");
      cover.tabIndex = 0;
      cover.setAttribute("aria-label", "Animated Tales. Open the story map.");
      cover.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); if (covered) openMap({ keyboard: true }); }
      });
    }

    // Animations that never stop are paused while the plate is off screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { mount.classList.toggle("is-offscreen", !en[0].isIntersecting); }).observe(mount);
    }

    // ------------------------------------------------------------------ start
    var q = null;
    try { q = new URLSearchParams(location.search); } catch (e) { /* old browser: no deep links */ }
    var start = { era: "all", region: "world", tale: null };
    if (q) {
      if (ERA[q.get("era")]) start.era = q.get("era");
      if (RG[q.get("region")]) start.region = q.get("region");
      if (EV[q.get("tale")]) start.tale = q.get("tale");
    }
    var deep = start.era !== "all" || start.region !== "world" || !!start.tale;
    mount.classList.toggle("is-phone", isPhone());
    cam.cx = W / 2; cam.cy = H / 2; cam.w = W;
    paint();
    var go0 = { era: start.era, region: start.region, tale: start.tale };
    state.era = "all"; state.region = "world"; state.tale = null;
    render({ instant: true });
    if (cover && !deep) {
      setCovered(true);
      if (!reduce) cover.classList.add("is-hint");
    } else {
      dropCover(); revealRegions(); // a deep link goes straight to the map
    }
    if (deep) { go(go0, { instant: true, speak: false, scroll: false }); }
  }
})();
