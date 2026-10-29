# Animated Tales — sajt kanala

Statičan sajt za YouTube kanal *Animated Tales*: <https://animatedtales.mihailobuilds.com>.
Bez build koraka — `public/index.html`, `public/styles.css`, `public/main.js` i mediji pored njih.
Nastao je od claude.ai artifacta <https://claude.ai/artifact/KQN1oEWsnZbue8ahJUB5Hs>; od 29. 10. 2026.
izvor istine je ovaj repo, artifact se više ne ažurira.

```
public/         sve što se objavljuje (index.html, styles.css, main.js, img/, media/, robots.txt, sitemap.xml)
wrangler.jsonc  Cloudflare Workers servira public/ kao statičan sajt, bez instalacije i builda
```

U footeru su dva claude.ai artifacta, oba podeljena javno („anyone with the link“): Episode guide
<https://claude.ai/artifact/LVzUMeZakKPLHX2GDDSMkg> i artifact verzija ovog sajta (gore). Ako se
ijednom ukine javno deljenje, link na sajtu vodi na stranicu za prijavu.

## Podaci

Svi podaci o videima (ID, naslov, trajanje, članstvo u plejlistama, Shorts) žive u jednom bloku na
vrhu `public/main.js`. Nova epizoda = jedan unos u `EPISODES` i njen ID u odgovarajućim `PLAYLISTS`.
Brojevi u „ledger“ bloku (`index.html`, sekcija About) i Part 3 u sekciji Series pišu se ručno.
Stanje je provereno prema YouTube-u 29. 10. 2026.

## Lokalni pregled

```
python -m http.server 8000 -d public
```

pa <http://localhost:8000>. Direktno otvaranje `index.html` iz Explorera takođe radi.

## Objavljivanje (Cloudflare)

Repo <https://github.com/stanovljanac/Animated-Tales-Website> je povezan sa Cloudflare Workers
(Workers Builds). Deploy komanda je podrazumevana `npx wrangler deploy`, build komande nema; sve
ostalo čita iz `wrangler.jsonc`. Svaki push na `main` je nova produkcija, a rezultat builda se vidi
i na GitHub-u, kao check na commitu.

Ako se Worker u dashboardu zove drugačije, `name` u `wrangler.jsonc` mora da se promeni na to ime,
inače build pada.

Ako sajt ikad ide na drugi hosting: objavljuje se samo sadržaj `public/`.

## Slike i video

Mediji su ovde komitovani (oko 4 MB), a prave se iz epizoda u glavnom repou
`../Animated Tales/episodes/` (tamo mediji nisu u gitu, žive samo na disku).
`ffmpeg` je onaj iz `imageio_ffmpeg`, komande se puštaju iz `Animated Tales/` foldera:

```
FF=$(python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
P="../Animated Tales Website/public"
# thumbnail: 960x540, centralni crop
$FF -i episodes/marathon/thumbnail.png -vf "scale=960:540:force_original_aspect_ratio=increase,crop=960:540" -q:v 4 "$P/img/thumbs/marathon.jpg"
# kadar za galeriju: 1280x720 (iz slike, ili frejm iz klipa sa -ss pre -i)
$FF -i episodes/heavenly-horses/shot04.jpg -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v 5 "$P/img/frames/horse-archer.jpg"
$FF -ss 8 -i episodes/greek-gods-part-1/shot03.mp4 -frames:v 1 -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v 5 "$P/img/frames/kronos.jpg"
# banner i logo
$FF -i assets/banner.jpeg -vf "scale=1920:-2" -q:v 4 "$P/img/banner.jpg"
$FF -i assets/banner.jpeg -vf "scale=1200:-2" -q:v 5 "$P/img/banner-1200.jpg"
$FF -i assets/logo1.jpeg -vf "crop=1240:1240:425:292,scale=192:192" -q:v 3 "$P/img/logo.jpg"
```

Izvor svakog thumbnaila je onaj koji je stvarno na YouTube-u (upoređeno sa `i.ytimg.com`):
marathon `thumbnail.png`, sack-of-rome `night-when-rome-almost-fell/thumb.jpg`, heavenly-horses
`thumb.png`, greek-gods-1 `thumbnail.jpeg`, greek-gods-2 `thumbnail2.jpg`, antikythera
`thumbnail.png`, polynesian `Thumbnail2.jpeg`, harem-conspiracy `thumb.jpg`, croesus `thumb.png`.
Za Týr lokalne verzije nema — uzet je `i.ytimg.com/vi/MZ5I5s2hapA/maxresdefault.jpg`.

Kadrovi galerije: kronos = `greek-gods-part-1/shot03.mp4` na 8. sekundi, gleipnir =
`tyr-and-fenrir/part14begin.jpeg`, horse-archer = `heavenly-horses/shot04.jpg`.

`media/reel.mp4` su tri klipa po 3.2s sa fade prelazom od 0.6s (ukupno 8.4s), 960x540, bez zvuka:
`greek-gods-part-1/shot10.mp4` (od 1.5s), `tyr-and-fenrir/part15.mp4` (od 1.0s),
`polynesian-navigation/part5.mp4` (od 4.0s); `reel-poster.jpg` je frejm na 1.0s.

```
N="scale=960:540:force_original_aspect_ratio=increase,crop=960:540,setpts=PTS-STARTPTS,fps=24,format=yuv420p"
$FF -ss 1.5 -t 3.2 -i episodes/greek-gods-part-1/shot10.mp4 \
    -ss 1.0 -t 3.2 -i episodes/tyr-and-fenrir/part15.mp4 \
    -ss 4.0 -t 3.2 -i episodes/polynesian-navigation/part5.mp4 \
    -filter_complex "[0:v]$N[a];[1:v]$N[b];[2:v]$N[c];[a][b]xfade=transition=fade:duration=0.6:offset=2.6[ab];[ab][c]xfade=transition=fade:duration=0.6:offset=5.2,format=yuv420p[v]" \
    -map "[v]" -an -c:v libx264 -profile:v high -preset slow -crf 25 -movflags +faststart "$P/media/reel.mp4"
$FF -ss 1.0 -i "$P/media/reel.mp4" -frames:v 1 -q:v 4 "$P/media/reel-poster.jpg"
```
