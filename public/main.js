(function () {
  "use strict";

  var YT = "https://www.youtube.com/";

  // ---------------------------------------------------------------------------
  // Data. IDs, titles, lengths and playlist membership were checked against
  // YouTube on 2026-10-29. Adding an episode is one entry here.
  // ---------------------------------------------------------------------------
  var EPISODES = {
    "_eKElXW9Hk4": { thumb: "antikythera", dur: "4:06", label: "Greece · the wreck of 1900",
      title: "Divers Found a 2,000-Year-Old Greek Computer in a Shipwreck",
      hook: "Sponge divers raise a lump of bronze. Inside it are gears that tracked the Sun and Moon and predicted eclipses." },
    "aE1EFPZLo3E": { thumb: "greek-gods-1", dur: "4:03", label: "Greek Gods · Part 1",
      title: "Zeus, Poseidon and Hades Drew Lots for the Universe",
      hook: "Three brothers divide the sky, the sea and the underworld. The place to start the series." },
    "MZ5I5s2hapA": { thumb: "tyr-and-fenrir", dur: "3:31", label: "Norse myth",
      title: "The God Who Sacrificed His Hand to Save the World",
      hook: "The gods bind the wolf Fenrir with a ribbon made of six impossible things. Týr pays the price." },
    "DBGWroAot-4": { thumb: "harem-conspiracy", dur: "4:35", label: "Egypt · c. 1155 BC",
      title: "The Harem Conspiracy That Killed Ramesses III",
      hook: "A plot against the pharaoh from inside his own palace, known from the trial records." },
    "NHMGOOVNNk0": { thumb: "heavenly-horses", dur: "4:42", label: "Han China · 104–102 BC",
      title: "A Kingdom Refused to Sell Its Horses. So China Sent an Army",
      hook: "Dayuan would not sell its horses. The emperor would not let his beaten army back through the Jade Gate." },
    "nUQkW9Umv8M": { thumb: "marathon", dur: "5:08", label: "Greece · 490 BC",
      title: "The Battle of Marathon: The Battle Won by a Dead Man's Army",
      hook: "Athens against the Persian landing at Marathon, told from an unexpected angle." },
    "asH-WNx94kA": { thumb: "greek-gods-2", dur: "4:41", label: "Greek Gods · Part 2",
      title: "Marriage, Harvest or Hearth: Which Goddess Held the Real Power?",
      hook: "Hera, Demeter and Hestia got no kingdom of their own. Each found a different kind of power." },
    "_1h_EAjb_wk": { thumb: "sack-of-rome", dur: "3:38", label: "Rome · 390 BC",
      title: "The Gallic Sack of Rome after the Battle of the Allia in 390 BC",
      hook: "The Gauls broke a Roman army at the river Allia and walked into the city itself." },
    "Mrai30wItZI": { thumb: "polynesian", dur: "3:49", label: "The Pacific",
      title: "How Humans Learned to Cross Entire Oceans Without a Compass",
      hook: "Polynesian navigators found islands by reading the stars, the swells, the birds and the clouds." },
    "hsGI3xlJ-SY": { thumb: "croesus", dur: "3:09", label: "Lydia · 546 BC",
      title: "The Last Lydian King: The Prophecy That Destroyed His Kingdom",
      hook: "Croesus asks Delphi whether to attack Persia. The answer is true, and it ruins him." }
  };

  var SHORTS = {
    "ya6UUlhU648": "Poseidon and Apollo Both Proposed. Hestia Refused Them Both",
    "cU085EwoFs8": "Zeus Promised Their Daughter to Hades Without Telling Demeter",
    "IGr4Zwxyetk": "Hera the Widow, Wife of a God Who Could Never Die",
    "VIWp3jvBtwo": "The Greek Gods Divided Universe Except One Thing",
    "BSsP9n2tbSc": "Why Were the Gods Afraid of This Wolf? Who Is Fenrir?",
    "qAfoX8bUg_k": "When Rome Was Almost Erased from History",
    "2vnd3hiaP2U": "The Plot Against Ramesses III",
    "hAbpc4Q_14Q": "He Sent an Army to War. Then Refused to Let Them Home",
    "u9WZwX3Iktw": "One of China's Biggest Military Problems Wasn't Weapons, but Horses",
    "Ci5iIipPjEk": "Divers Thought the Seabed Was Covered in Bodies"
  };

  var FEATURED = ["_eKElXW9Hk4", "aE1EFPZLo3E", "MZ5I5s2hapA", "DBGWroAot-4", "NHMGOOVNNk0", "nUQkW9Umv8M"];

  var PLAYLISTS = [
    { id: "PLCYDtXyl-EcU", chip: "Greek Mythology", name: "Greek Mythology", emblem: "bolt",
      blurb: "The Greek Gods series in order, from the lottery for the universe to the three sisters.",
      videos: ["aE1EFPZLo3E", "asH-WNx94kA"], shorts: ["ya6UUlhU648", "cU085EwoFs8", "IGr4Zwxyetk", "VIWp3jvBtwo"] },
    { id: "PLfVGPcCCcFU8", chip: "Norse Mythology", name: "Norse Mythology", emblem: "wolf",
      blurb: "Gods, giants and the wolf who could only be held by a ribbon.",
      videos: ["MZ5I5s2hapA"], shorts: ["BSsP9n2tbSc"] },
    { id: "PLBQAMHoMK26c", chip: "Greek History", name: "Greek History", emblem: "amphora",
      blurb: "Marathon, the oracle at Delphi and a machine pulled out of a shipwreck.",
      videos: ["_eKElXW9Hk4", "hsGI3xlJ-SY", "nUQkW9Umv8M"], shorts: [] },
    { id: "PLc1nD6MP3I24", chip: "Rome", name: "Rome History", emblem: "aquila",
      blurb: "The night the Gauls walked into Rome, and how close the city came to ending there.",
      videos: ["_1h_EAjb_wk"], shorts: ["qAfoX8bUg_k"] },
    { id: "PLMwghrro-9SQ", chip: "Egypt", name: "Egypt Stories", emblem: "ankh",
      blurb: "Pharaohs, palace plots and the papyrus records that survived them.",
      videos: ["DBGWroAot-4"], shorts: ["2vnd3hiaP2U"] },
    { id: "PLckjrsCMM-LY", chip: "China", name: "China History", emblem: "horse",
      blurb: "Han China and the long war for the horses of the Ferghana valley.",
      videos: ["NHMGOOVNNk0"], shorts: ["hAbpc4Q_14Q", "u9WZwX3Iktw"] },
    { id: "PLCJ0-2X4_lHM", chip: "Mysteries", name: "Ancient Mysteries & Discoveries", emblem: "compass",
      blurb: "Things that look impossible for their time, and what is actually known about them.",
      videos: ["_eKElXW9Hk4", "Mrai30wItZI"], shorts: ["Ci5iIipPjEk"] },
    { id: "PLJV7xQyHhydw", chip: "Battles", name: "History Battles", emblem: "helmet",
      blurb: "Armies, decisions and what they cost.",
      videos: ["NHMGOOVNNk0", "nUQkW9Umv8M"], shorts: ["hAbpc4Q_14Q", "u9WZwX3Iktw"] }
  ];

  // ---------------------------------------------------------------------------
  // Ornaments: small hand-inked 2D objects. ".s" = ink stroke (drawn in on
  // scroll), ".f-*" = flat fill that fades in after the line work.
  // ---------------------------------------------------------------------------
  function svg(viewBox, body) {
    return '<svg class="ink" viewBox="' + viewBox + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + body + "</svg>";
  }
  function both(d, fill, extra) {
    return '<path class="' + fill + '" d="' + d + '"/><path class="s' + (extra ? " " + extra : "") + '" d="' + d + '"/>';
  }
  function gearPath(cx, cy, r, teeth, depth) {
    var d = "", n = teeth * 4;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var rr = (i % 4 === 0 || i % 4 === 1) ? r : r - depth;
      d += (i ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(2) + " " + (cy + rr * Math.sin(a)).toFixed(2);
    }
    return d + "Z";
  }
  function star(cx, cy, points, outer, inner, rot) {
    var d = "";
    for (var i = 0; i < points * 2; i++) {
      var a = rot + (i / (points * 2)) * Math.PI * 2;
      var r = i % 2 ? inner : outer;
      d += (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(2) + " " + (cy + r * Math.sin(a)).toFixed(2);
    }
    return d + "Z";
  }
  function wreathSide(cx, cy, r, from, to, count, mirror) {
    var out = "";
    var stem = "";
    for (var i = 0; i <= count; i++) {
      var t = from + (to - from) * (i / count);
      var x = cx + r * Math.cos(t), y = cy + r * Math.sin(t);
      stem += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      if (i === 0) continue;
      var tan = (t + Math.PI / 2) * 180 / Math.PI + (mirror ? 180 : 0);
      [-1, 1].forEach(function (side) {
        var ang = tan + side * 38;
        var leaf = "M0 0 Q6 -4.2 13 0 Q6 4.2 0 0Z";
        out += '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + ang.toFixed(1) + ')">' + both(leaf, "f-gold", "thin") + "</g>";
      });
    }
    return '<path class="s" d="' + stem + '"/>' + out;
  }

  var ORN = {
    gears: function () {
      var big = gearPath(40, 42, 34, 30, 4), small = gearPath(76, 77, 16, 14, 4);
      return svg("0 0 100 100",
        '<g class="spin-cw" style="--t:48s">' + both(big, "f-teal") +
        '<circle class="f-bg" cx="40" cy="42" r="24"/><circle class="s" cx="40" cy="42" r="24"/>' +
        '<path class="s thick" d="M40 18V66M16 42H64"/><circle class="f-gold" cx="40" cy="42" r="6"/><circle class="s" cx="40" cy="42" r="6"/></g>' +
        '<g class="spin-ccw" style="--t:22.4s">' + both(small, "f-gold") +
        '<circle class="s" cx="76" cy="77" r="8"/><path class="s thin" d="M76 69V85M68 77H84"/></g>');
    },
    laurel: function () {
      return svg("0 0 120 100",
        '<g class="sway">' + wreathSide(60, 50, 38, Math.PI * 0.62, Math.PI * 1.35, 7, false) + "</g>" +
        '<g class="sway" style="animation-direction:alternate-reverse">' + wreathSide(60, 50, 38, Math.PI * 0.38, -Math.PI * 0.35, 7, true) + "</g>" +
        both("M52 86 Q60 80 68 86 L72 96 L64 90 L60 94 L56 90 L48 96Z", "f-teal"));
    },
    amphora: function () {
      var body = "M32 8h16v4h-2v14c0 4 4 6 10 10c10 7 14 18 14 30c0 18-10 32-20 40l-2 6h4v4h-24v-4h4l-2-6c-10-8-20-22-20-40c0-12 4-23 14-30c6-4 10-6 10-10v-14h-2z";
      return svg("0 0 80 120",
        both(body, "f-clay") +
        '<path class="s thick" d="M34 15C22 13 16 20 22 34M46 15C58 13 64 20 58 34"/>' +
        '<path class="f-ink" d="M15 50H65L67 58H13Z"/>' +
        '<path class="s thin" d="M16 66q4-4 8 0t8 0t8 0t8 0t8 0t8 0"/>' +
        '<path class="s thin" d="M12 78H68M17 92H63"/>' +
        '<circle class="f-paper" cx="40" cy="85" r="3"/>');
    },
    ship: function () {
      var hull = "M14 60C40 70 100 70 126 60C118 80 24 84 14 60Z";
      var shields = "";
      for (var x = 30, i = 0; x <= 110; x += 13, i++) {
        shields += '<circle class="' + (i % 2 ? "f-teal" : "f-gold") + '" cx="' + x + '" cy="64" r="5"/><circle class="s thin" cx="' + x + '" cy="64" r="5"/>';
      }
      var stripes = "";
      [[50, 58], [66, 74], [82, 90]].forEach(function (s) {
        stripes += '<path class="f-clay" d="M' + s[0] + " 20H" + s[1] + "L" + (s[1] + 2) + " 56H" + (s[0] - 1) + 'Z"/>';
      });
      return svg("0 0 140 100",
        '<g class="rock">' +
        '<path class="s" d="M70 66V12"/><path class="s thick" d="M44 19H96"/>' +
        '<path class="f-paper" d="M46 20H94L98 56H42Z"/>' + stripes + '<path class="s" d="M46 20H94L98 56H42Z"/>' +
        '<path class="s thin" d="M70 12L46 20M70 12L94 20"/>' +
        both(hull, "f-clay") +
        '<path class="s" d="M126 60C132 50 136 40 131 31C128 25 121 26 122 32C123 36 128 35 128 31"/>' +
        '<path class="s" d="M14 60C8 50 5 42 9 34C11 30 17 31 16 36"/>' +
        '<circle class="f-ink" cx="128" cy="31" r="1.4"/>' +
        shields +
        '<path class="s thin" d="M40 70L30 84M58 72L49 86M76 72L68 86M94 71L87 85"/>' +
        "</g>" +
        '<g class="waves"><path class="s gold-line" d="M2 88q9-6 18 0t18 0t18 0t18 0t18 0t18 0t18 0"/>' +
        '<path class="s thin" d="M12 95q9-5 18 0t18 0t18 0t18 0t18 0t18 0"/></g>');
    },
    wolf: function () {
      // Fenrir, front on, with the ribbon Gleipnir glinting under his jaw.
      var head = "M50 92C44 92 40 86 38 80L30 66C22 64 14 58 12 48L18 46L12 38L20 36L18 8L38 26C44 24 56 24 62 26L82 8L80 36L88 38L82 46L88 48C86 58 78 64 70 66L62 80C60 86 56 92 50 92Z";
      return svg("0 0 100 100",
        both(head, "f-storm") +
        both("M22 16L34 29L25 33Z", "f-clay", "thin") + both("M78 16L66 29L75 33Z", "f-clay", "thin") +
        both("M33 46Q40 40 46 46Q40 50 33 46Z", "f-gold", "thin") + both("M67 46Q60 40 54 46Q60 50 67 46Z", "f-gold", "thin") +
        '<circle class="f-ink" cx="40.5" cy="45.5" r="1.8"/><circle class="f-ink" cx="59.5" cy="45.5" r="1.8"/>' +
        '<path class="s thin" d="M46 52L44 72M54 52L56 72M44 86Q50 90 56 86M24 56l6 2M76 56l-6 2M22 62l7 1M78 62l-7 1"/>' +
        both("M44 76Q50 71 56 76Q50 82 44 76Z", "f-ink") +
        '<path class="s gold-line flicker" d="M28 76C40 98 60 98 72 76"/>');
    },
    horse: function () {
      var head = "M78 96C80 70 74 46 62 30L64 14L56 26C46 26 30 36 18 52C12 58 14 66 22 66C30 66 36 62 42 60C48 64 48 74 44 82L40 98Z";
      var mane = "M62 30C70 30 76 38 78 46C74 44 72 44 70 46C76 52 78 58 80 66C76 64 74 64 72 66C76 72 78 80 80 90L78 96C80 70 74 46 62 30Z";
      return svg("0 0 100 100",
        both(head, "f-gold") + both(mane, "f-ink") +
        '<circle class="f-ink" cx="40" cy="40" r="2.4"/><path class="s thin" d="M19 57q2-2 4 0"/>' +
        '<path class="s thin" d="M24 50L44 52L58 34M44 52L46 62"/>');
    },
    ankh: function () {
      var d = "M30 4C44 4 48 20 40 40L54 38L54 52L36 50L40 96L20 96L24 50L6 52L6 38L20 40C12 20 16 4 30 4ZM30 12C22 12 21 26 27 38L33 38C39 26 38 12 30 12Z";
      return svg("0 0 60 100", '<path class="f-gold" fill-rule="evenodd" d="' + d + '"/><path class="s" d="' + d + '"/>' +
        '<path class="s thin" d="M24 62H36M23 74H37"/>');
    },
    coin: function () {
      var blob = "M50 14C74 12 90 30 88 52C86 76 66 90 46 88C24 86 10 68 12 48C14 28 28 15 50 14Z";
      return svg("0 0 100 100",
        '<g class="bob">' + both(blob, "f-gold") +
        '<path class="f-clay" d="M24 38L45 36L47 60L26 62Z"/><path class="s" d="M24 38L45 36L47 60L26 62Z"/>' +
        '<path class="f-clay" d="M54 40L75 42L73 65L52 63Z"/><path class="s" d="M54 40L75 42L73 65L52 63Z"/>' +
        '<path class="s thin" d="M30 74q4 3 8 0M62 24q3 2 6 0M80 70l3 2"/></g>');
    },
    compass: function () {
      var rays = "";
      for (var i = 0; i < 32; i++) {
        var a = (i / 32) * Math.PI * 2, r1 = 15, r2 = i % 8 === 0 ? 46 : i % 2 ? 36 : 41;
        rays += "M" + (50 + r1 * Math.cos(a)).toFixed(1) + " " + (50 + r1 * Math.sin(a)).toFixed(1) + "L" + (50 + r2 * Math.cos(a)).toFixed(1) + " " + (50 + r2 * Math.sin(a)).toFixed(1);
      }
      var dots = "";
      for (var j = 0; j < 16; j++) {
        var b = ((j + 0.5) / 16) * Math.PI * 2;
        dots += '<circle class="f-gold" cx="' + (50 + 40 * Math.cos(b)).toFixed(1) + '" cy="' + (50 + 40 * Math.sin(b)).toFixed(1) + '" r="2"/>';
      }
      return svg("0 0 100 100",
        '<circle class="f-paper" cx="50" cy="50" r="46"/><circle class="s" cx="50" cy="50" r="46"/>' +
        '<g class="spin-cw" style="--t:90s"><path class="s thin" d="' + rays + '"/>' + dots + "</g>" +
        '<circle class="f-teal" cx="50" cy="50" r="13"/><circle class="s" cx="50" cy="50" r="13"/>' +
        '<g class="bob"><path class="f-clay" d="M40 52Q50 59 60 52Q50 55 40 52Z"/><path class="s thin" d="M40 52Q50 59 60 52Q50 55 40 52Z"/>' +
        '<path class="f-paper" d="M50 52L50 40L57 50Z"/><path class="s thin" d="M50 52L50 40L57 50Z"/></g>');
    },
    helmet: function () {
      var shell = "M84 80C78 72 76 62 76 50C76 28 62 16 46 18C32 20 24 32 24 48L26 74L32 74L34 60L40 60L42 86C52 88 60 86 66 82C72 84 78 84 84 80Z";
      var crest = "M36 20C34 6 70 0 92 22C86 18 80 18 76 26C68 18 56 14 46 18Z";
      return svg("0 0 100 100",
        both(crest, "f-clay") + '<path class="s thin" d="M48 12l4 6M58 9l3 7M68 9l2 8M78 13l0 8"/>' +
        both(shell, "f-gold") +
        '<path class="f-ink" d="M29 46C34 41 44 41 49 46L45 54L32 54Z"/><path class="s" d="M29 46C34 41 44 41 49 46L45 54L32 54Z"/>' +
        '<path class="s thin" d="M30 36C40 32 56 32 70 38"/>');
    },
    aquila: function () {
      var eagle = "M40 30C30 24 22 14 12 12C20 22 24 28 30 32C26 32 22 34 20 38C28 36 34 36 40 36C46 36 52 36 60 38C58 34 54 32 50 32C56 28 60 22 68 12C58 14 50 24 40 30Z";
      return svg("0 0 80 100",
        '<path class="s thick" d="M40 34V98"/>' +
        both(eagle, "f-gold") + '<circle class="f-gold" cx="40" cy="26" r="4"/><circle class="s" cx="40" cy="26" r="4"/>' +
        '<circle class="s gold-line" cx="40" cy="46" r="6"/>' +
        '<path class="s" d="M24 56H56"/>' +
        '<path class="f-clay" d="M26 58H54V74H26Z"/><path class="s" d="M26 58H54V74H26Z"/>' +
        '<text x="40" y="69.5" font-size="8.5" text-anchor="middle" letter-spacing="0.5">SPQR</text>' +
        '<path class="s thin" d="M26 74l-2 8M54 74l2 8M33 74l-1 6M47 74l1 6"/>');
    },
    bolt: function () {
      var d = "M34 4L12 54H28L20 96L50 40H34L44 4Z";
      return svg("0 0 60 100", '<g class="flicker">' + both(d, "f-gold") + "</g>" +
        '<path class="s thin" d="M6 30l-4-2M8 70l-5 3M54 64l4 3M52 18l4-3"/>');
    },
    star: function () {
      var d = star(50, 50, 8, 44, 16, -Math.PI / 2);
      return svg("0 0 100 100", '<g class="spin-cw" style="--t:60s">' + both(d, "f-gold") + "</g>" +
        '<circle class="f-paper" cx="50" cy="50" r="8"/><circle class="s" cx="50" cy="50" r="8"/>');
    },
    scroll: function () {
      return svg("0 0 100 90",
        both("M20 14H80V70H20Z", "f-paper") +
        both("M14 10H20V74H14Z", "f-clay") + both("M80 10H86V74H80Z", "f-clay") +
        '<circle class="f-gold" cx="17" cy="8" r="4"/><circle class="s" cx="17" cy="8" r="4"/><circle class="f-gold" cx="17" cy="76" r="4"/><circle class="s" cx="17" cy="76" r="4"/>' +
        '<circle class="f-gold" cx="83" cy="8" r="4"/><circle class="s" cx="83" cy="8" r="4"/><circle class="f-gold" cx="83" cy="76" r="4"/><circle class="s" cx="83" cy="76" r="4"/>' +
        '<path class="s thin" d="M28 26H72M28 34H66M28 42H70M28 50H58M28 58H64"/>');
    },
    voice: function () {
      var h = [10, 22, 34, 18, 40, 26, 44, 20, 30, 14, 8];
      var bars = "";
      h.forEach(function (v, i) {
        var x = 10 + i * 8;
        bars += '<path class="s thick" style="animation-delay:' + (-i * 0.17).toFixed(2) + 's" d="M' + x + " " + (50 - v / 2) + "V" + (50 + v / 2) + '"/>';
      });
      return svg("0 0 100 100", '<path class="s thin" d="M4 50H96" style="opacity:.5"/><g class="pulse">' + bars + "</g>");
    },
    quill: function () {
      var feather = "M84 6C58 10 34 34 24 72C42 60 66 40 84 6Z";
      return svg("0 0 100 100",
        both(feather, "f-paper") +
        '<path class="s" d="M84 6L20 86"/><path class="s thin" d="M70 22l-8-2M62 32l-10-2M54 42l-10-1M46 52l-9 0M66 26l4 8M58 36l4 9M50 46l3 9"/>' +
        both("M8 80H34L32 96H10Z", "f-ink") + '<path class="s gold-line" d="M10 86H32"/>');
    },
    film: function () {
      var holes = "";
      for (var x = 10; x < 96; x += 10) {
        holes += '<path class="f-paper" d="M' + x + ' 14h5v5h-5zM' + x + ' 81h5v5h-5z"/>';
      }
      var frame = function (x, k) {
        return '<path class="f-paper" d="M' + x + " 26H" + (x + 26) + "V74H" + x + 'Z"/>' +
          '<path class="s thin" d="M' + x + " 66L" + (x + 9) + " 52L" + (x + 15) + " 60L" + (x + 20) + " 54L" + (x + 26) + ' 64"/>' +
          '<circle class="f-gold" cx="' + (x + 18) + '" cy="' + (36 + k * 3) + '" r="4"/>';
      };
      return svg("0 0 100 100",
        both("M4 8H96V92H4Z", "f-ink") + holes +
        frame(8, 0) + frame(37, 1) + frame(66, 2));
    }
  };

  function drawOrnament(el) {
    var name = el.getAttribute("data-orn");
    if (!ORN[name]) return;
    el.innerHTML = ORN[name]();
    el.querySelectorAll(".s").forEach(function (p) { p.setAttribute("pathLength", "1"); });
  }

  // ---------------------------------------------------------------------------
  // Episodes grid + playlist chips
  // ---------------------------------------------------------------------------
  var chipsEl = document.getElementById("chips");
  var cardsEl = document.getElementById("cards");

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function ext(href, text, cls) {
    return '<a' + (cls ? ' class="' + cls + '"' : "") + ' href="' + href + '" target="_blank" rel="noopener">' + text + "</a>";
  }

  function cardHTML(id, i, animate) {
    var e = EPISODES[id];
    var url = YT + "watch?v=" + id;
    return '<article class="card' + (animate ? " enter" : "") + '" style="--i:' + i + '">' +
      '<a class="thumb" href="' + url + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">' +
        '<img src="img/thumbs/' + e.thumb + '.jpg" alt="" width="960" height="540" loading="lazy">' +
        '<span class="seal">' + svg("0 0 64 64",
          '<circle class="f-gold" cx="32" cy="32" r="28"/><circle class="s" cx="32" cy="32" r="28"/><circle class="s thin" cx="32" cy="32" r="23"/>' +
          '<path class="f-ink" d="M26 21V43L44 32Z"/>') + "</span>" +
        '<span class="dur">' + e.dur + "</span>" +
      "</a>" +
      '<div class="card-body">' +
        '<p class="card-label">' + esc(e.label) + "</p>" +
        "<h3>" + ext(url, esc(e.title)) + "</h3>" +
        '<p class="hook">' + esc(e.hook) + "</p>" +
      "</div></article>";
  }

  function plateHTML(pl) {
    var shorts = pl.shorts.map(function (s) {
      return "<li>" + ext(YT + "shorts/" + s, esc(SHORTS[s])) + "</li>";
    }).join("");
    var count = pl.videos.length + " episode" + (pl.videos.length > 1 ? "s" : "") +
      (pl.shorts.length ? " · " + pl.shorts.length + " Short" + (pl.shorts.length > 1 ? "s" : "") : "");
    return '<div class="pl-plate card enter" data-n="' + pl.videos.length + '">' +
      '<div class="pl-top"><span class="pl-emblem" data-orn="' + pl.emblem + '"></span>' +
      '<div><p class="card-label">Playlist · ' + count + "</p><h3>" + esc(pl.name) + "</h3></div></div>" +
      "<p>" + esc(pl.blurb) + "</p>" +
      (shorts ? '<ul class="pl-shorts" aria-label="Shorts in this playlist">' + shorts + "</ul>" : "") +
      "<p>" + ext(YT + "playlist?list=" + pl.id, "Open the full playlist on YouTube", "text-link") + "</p>" +
      "</div>";
  }

  function render(key, animate) {
    var html;
    if (key === "featured") {
      html = FEATURED.map(function (id, i) { return cardHTML(id, i, animate); }).join("");
    } else {
      var pl = PLAYLISTS.filter(function (p) { return p.id === key; })[0];
      html = plateHTML(pl) + pl.videos.slice(0, 6).map(function (id, i) { return cardHTML(id, i + 1, animate); }).join("");
    }
    cardsEl.innerHTML = html;
    cardsEl.querySelectorAll("[data-orn]").forEach(drawOrnament);
    chipsEl.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-key") === key ? "true" : "false");
    });
  }

  chipsEl.innerHTML =
    '<button type="button" class="chip" id="chip-featured" data-key="featured" aria-pressed="true">Featured</button>' +
    PLAYLISTS.map(function (p) {
      return '<button type="button" class="chip" id="chip-' + p.id + '" data-key="' + p.id + '" aria-pressed="false">' +
        esc(p.chip) + ' <span class="count">' + p.videos.length + "</span></button>";
    }).join("");
  chipsEl.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".chip");
    if (!btn) return;
    render(btn.getAttribute("data-key"), true);
  });
  render("featured", false);

  // Shorts tablets
  var SHORT_TOPIC = {};
  PLAYLISTS.forEach(function (p) {
    p.shorts.forEach(function (s) { if (!SHORT_TOPIC[s]) SHORT_TOPIC[s] = p; });
  });
  var shortsOrder = ["VIWp3jvBtwo", "BSsP9n2tbSc", "Ci5iIipPjEk", "2vnd3hiaP2U", "hAbpc4Q_14Q",
    "cU085EwoFs8", "qAfoX8bUg_k", "IGr4Zwxyetk", "u9WZwX3Iktw", "ya6UUlhU648"];
  document.getElementById("shorts-list").innerHTML = shortsOrder.map(function (id) {
    var p = SHORT_TOPIC[id];
    return '<li><a class="tag" href="' + YT + "shorts/" + id + '" target="_blank" rel="noopener">' +
      '<span class="tag-emblem" data-orn="' + p.emblem + '"></span>' +
      '<span class="tag-title">' + esc(SHORTS[id]) + "</span>" +
      '<span class="tag-meta">Short · ' + esc(p.chip) + "</span></a></li>";
  }).join("");

  document.getElementById("footer-playlists").innerHTML = PLAYLISTS.map(function (p) {
    return "<li>" + ext(YT + "playlist?list=" + p.id, esc(p.name)) + "</li>";
  }).join("");

  // Static ornaments in the page
  document.querySelectorAll("[data-orn]").forEach(function (el) {
    if (!el.querySelector("svg")) drawOrnament(el);
  });

  // ---------------------------------------------------------------------------
  // Motion: ink-draw on scroll and hero parallax. Skipped entirely for
  // reduced motion, so every ornament simply stays drawn.
  // ---------------------------------------------------------------------------
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    document.querySelectorAll("video[autoplay]").forEach(function (v) {
      v.removeAttribute("autoplay");
      v.pause();
      v.controls = true;
    });
    return;
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var s = en.target;
        requestAnimationFrame(function () { s.classList.remove("pending"); s.classList.add("drawn"); });
        io.unobserve(s);
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    var vh = window.innerHeight || 800;
    document.querySelectorAll("main .ink, footer .ink").forEach(function (s) {
      if (s.closest(".cards")) return; // cards re-render on filter; keep them simple
      if (s.getBoundingClientRect().top > vh * 0.9) {
        s.classList.add("pending");
        io.observe(s);
      }
    });
  }

  var stage = document.querySelector("[data-parallax-root]");
  var layers = stage ? stage.querySelectorAll("[data-depth]") : [];
  var ticking = false;
  function parallax() {
    ticking = false;
    var rect = stage.getBoundingClientRect();
    if (rect.bottom < 0) return;
    var y = Math.max(0, -rect.top);
    layers.forEach(function (l) {
      l.style.translate = "0 " + (y * parseFloat(l.getAttribute("data-depth"))).toFixed(1) + "px";
    });
  }
  if (stage) {
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
    }, { passive: true });
  }
})();
