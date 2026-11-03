/* Everything the page knows about episodes and the story map, in one place.
   Loaded before main.js and map.js; both read window.AT_DATA. */
(function () {
  "use strict";

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
  // Story map. One video, one pin: the pin marks what the video is MAINLY about, and a video is
  // never on the map twice. One pin can hold several videos (Greek Gods has two parts).
  //
  // To add a tale: add the episode above, then one entry in EVENTS (or add the video ID to an
  // existing event). The era is computed from `year`, so it is never typed by hand; the region
  // seals and counters follow on their own.
  //
  //   year   negative = BC. Leave it out and set `myth: true` for stories with no date.
  //   circa  true shows "c." before the year; `when` overrides the printed date entirely.
  //   claim  "record" | "tradition" | "debate", the same three kinds as the "How it's made"
  //          section. Pick what the PIN's text claims, not the whole episode.
  //   lat/lon  Real place where there is one. For myth, the region the story is set in.
  //   era    Only when the story has no single date but you know its age: it overrides `year`.
  // ---------------------------------------------------------------------------

  // Order is the order of the era bar. "all" is not an era, only the unfiltered state. The
  // boundaries live in eraOf() below.
  var ERAS = [
    { id: "all",       name: "All ages",             range: "Every tale" },
    { id: "myth",      name: "Myth & Legend",        range: "No fixed date" },
    { id: "ancient",   name: "Ancient World",        range: "Before 800 BC" },
    { id: "classical", name: "Classical Antiquity",  range: "800 BC to AD 476" },
    { id: "medieval",  name: "Middle Ages",          range: "AD 476 to 1492" },
    { id: "modern",    name: "Modern Era",           range: "1492 to today" }
  ];

  function eraOf(ev) {
    if (ev.era) return ev.era;
    if (ev.myth) return "myth";
    if (ev.year < -800) return "ancient";
    if (ev.year < 476) return "classical";
    if (ev.year < 1492) return "medieval";
    return "modern";
  }

  function whenOf(ev) {
    if (ev.myth) return "Myth and legend";
    if (ev.when) return ev.when;
    var y = ev.year, s = y < 0 ? (-y) + " BC" : (y < 1000 ? "AD " + y : String(y));
    return (ev.circa ? "c. " : "") + s;
  }

  // `chip` names the region on the buttons below the map and `short` (optional) on its seal.
  // `fit` is [lonW, latS, lonE, latN]: the camera frames this box. Keep it wide rather than tall (the
  // stage is 2.3:1, so a tall box shows far more than it names), and east of 130°W: the map is cut
  // there, and a box that crosses the cut wraps to the other side of the world. `seal` is where the region's
  // seal sits on the world view. Regions are places, not civilisations, so "Classical Antiquity"
  // and "Italy" never contradict each other.
  var REGIONS = [
    { id: "greece",    name: "Greece & the Aegean",  chip: "Greece",           fit: [19.2, 34.4, 28.0, 41.6],   seal: [22.6, 38.9] },
    { id: "italy",     name: "Italy",                chip: "Italy",            fit: [6.5, 36.3, 19.0, 47.3],    seal: [12.6, 42.8] },
    { id: "near-east", name: "Egypt & the Near East", chip: "Egypt & Near East", short: "Near East", fit: [23.0, 21.5, 41.5, 41.5], seal: [34.5, 30.6] },
    { id: "north",     name: "The North",            chip: "The North",        fit: [2.0, 55.5, 19.0, 67.5],    seal: [9.5, 62.0] },
    { id: "asia",      name: "Central & East Asia",  chip: "Asia",             fit: [44.0, 10.0, 126.0, 52.0],  seal: [72.0, 41.0] },
    { id: "pacific",   name: "The Pacific",          chip: "Pacific",          fit: [164.0, -33.0, -133.0, -1.0], seal: [-166.0, -15.0] }
  ];

  var EVENTS = [
    { id: "greek-gods", name: "Greek Gods", place: "Mount Olympus, in Greek myth",
      lat: 40.09, lon: 22.36, myth: true, region: "greece", claim: "tradition",
      text: "Three brothers draw lots for the sky, the sea and the underworld, and their sisters are left with marriage, the harvest and the hearth. The series follows the Olympian family one generation at a time.",
      videos: ["aE1EFPZLo3E", "asH-WNx94kA"], shorts: ["ya6UUlhU648", "cU085EwoFs8", "IGr4Zwxyetk", "VIWp3jvBtwo"] },

    { id: "tyr-and-fenrir", name: "Týr and Fenrir", place: "Scandinavia, in Norse myth",
      lat: 61.6, lon: 8.3, myth: true, region: "north", claim: "tradition",
      text: "The gods fear the wolf Fenrir and try to bind him. Two chains break. The third, Gleipnir, is a ribbon made of six impossible things, and Fenrir will only let it be put on if one of the gods puts a hand in his mouth. Týr does.",
      videos: ["MZ5I5s2hapA"], shorts: ["BSsP9n2tbSc"] },

    { id: "medinet-habu", name: "The harem conspiracy", place: "Thebes (Medinet Habu), Egypt",
      lat: 25.72, lon: 32.6, year: -1155, circa: true, region: "near-east", claim: "record",
      text: "A plot against the pharaoh grew inside his own palace around 1155 BC. We know it from the trial records on papyrus, which name the accused.",
      videos: ["DBGWroAot-4"], shorts: ["2vnd3hiaP2U"] },

    // Polynesia has no single place or date in the video, so none is claimed. The pin sits at the
    // Society Islands, in the heart of Polynesia; `era` is a placeholder until the period is chosen.
    { id: "polynesia", name: "Polynesian wayfinding", place: "Polynesia (pinned at the Society Islands)",
      lat: -17.65, lon: -149.45, era: "ancient", when: "Over many centuries", region: "pacific", claim: "tradition",
      text: "Polynesian navigators crossed enormous stretches of the Pacific without instruments. They found islands by reading the stars, the swells, the winds, the birds and the clouds, and accumulated knowledge made voyages that seem impossible possible.",
      videos: ["Mrai30wItZI"], shorts: [] },

    { id: "sardis", name: "The fall of Sardis", place: "Sardis, Lydia (modern Turkey)",
      lat: 38.49, lon: 28.04, year: -546, circa: true, region: "near-east", claim: "tradition",
      text: "Croesus, the last king of Lydia, asked the oracle at Delphi whether to attack Persia and was told a great empire would fall. It was his own: Cyrus of Persia took Sardis around 546 BC. The oracle story comes to us from Herodotus.",
      videos: ["hsGI3xlJ-SY"], shorts: [] },

    { id: "marathon", name: "The Battle of Marathon", place: "The plain of Marathon, Greece",
      lat: 38.12, lon: 23.98, year: -490, region: "greece", claim: "record",
      text: "In 490 BC a Persian force landed on the plain of Marathon, and the Athenians marched out to meet it. The episode tells the battle from an unexpected angle.",
      videos: ["nUQkW9Umv8M"], shorts: [] },

    { id: "allia", name: "The Gauls take Rome", place: "Rome and the river Allia, Italy",
      lat: 41.9, lon: 12.5, year: -390, circa: true, region: "italy", claim: "record",
      text: "The Gauls broke a Roman army at the river Allia and walked into Rome itself. The city came close to ending there. The date is traditionally given as 390 BC.",
      videos: ["_1h_EAjb_wk"], shorts: ["qAfoX8bUg_k"] },

    { id: "dayuan", name: "The war for the heavenly horses", place: "The Ferghana valley (Dayuan)",
      lat: 40.4, lon: 71.8, year: -103, when: "104 to 102 BC", region: "asia", claim: "record",
      text: "Dayuan would not sell its horses, so the Han emperor sent an army. It came back beaten, and he would not let it back through the Jade Gate.",
      videos: ["NHMGOOVNNk0"], shorts: ["hAbpc4Q_14Q", "u9WZwX3Iktw"] },

    { id: "antikythera", name: "The Antikythera mechanism", place: "Off the island of Antikythera, Greece",
      lat: 35.88, lon: 23.31, year: -146, when: "Built c. 205 to 87 BC", region: "greece", claim: "record",
      text: "In 1900 sponge divers sheltering from a storm found an ancient shipwreck off Antikythera. Two years later a lump of corroded bronze split open and the archaeologist Valerios Stais saw a gear wheel. The mechanism tracked the Sun and the Moon and predicted eclipses.",
      videos: ["_eKElXW9Hk4"], shorts: ["Ci5iIipPjEk"] }
  ];

  // The three kinds of claim, worded as in the "How it's made" section.
  var CLAIMS = {
    record:    { label: "Historical record", note: "Backed by records or physical evidence." },
    tradition: { label: "Tradition",         note: "A story handed down, not a documented fact." },
    debate:    { label: "Debate",            note: "Uncertain or disputed." }
  };

  window.AT_DATA = {
    EPISODES: EPISODES, SHORTS: SHORTS, FEATURED: FEATURED, PLAYLISTS: PLAYLISTS,
    ERAS: ERAS, REGIONS: REGIONS, EVENTS: EVENTS, CLAIMS: CLAIMS,
    eraOf: eraOf, whenOf: whenOf
  };
})();
