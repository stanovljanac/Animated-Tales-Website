# Animated Tales — sajt kanala

Statičan sajt za YouTube kanal *Animated Tales*: <https://animatedtales.mihailobuilds.com>.
Bez build koraka — `public/index.html`, `public/styles.css`, `public/data.js`, `public/main.js`,
`public/map.js`, `public/map-world.js` i mediji pored njih.
Nastao je od claude.ai artifacta <https://claude.ai/artifact/KQN1oEWsnZbue8ahJUB5Hs>; od 29. 10. 2026.
izvor istine je ovaj repo, artifact se više ne ažurira.

```
public/         sve što se objavljuje (index.html, styles.css, data.js, main.js, map.js, map-world.js, img/, media/, robots.txt, sitemap.xml)
tools/          jednokratni alat koji pravi geometriju mape (make-world.mjs); ne objavljuje se
wrangler.jsonc  Cloudflare Pages objavljuje public/ kao statičan sajt, bez instalacije i builda
```

U footeru su dva claude.ai artifacta, oba podeljena javno („anyone with the link“): Episode guide
<https://claude.ai/artifact/LVzUMeZakKPLHX2GDDSMkg> i artifact verzija ovog sajta (gore). Ako se
ijednom ukine javno deljenje, link na sajtu vodi na stranicu za prijavu.

## Podaci

Svi podaci žive u `public/data.js` (`window.AT_DATA`): podaci o videima (ID, naslov, trajanje,
članstvo u plejlistama, Shorts) i podaci mape (`ERAS`, `REGIONS`, `EVENTS`). Nova epizoda = jedan
unos u `EPISODES`, njen ID u odgovarajućim `PLAYLISTS` i jedan događaj u `EVENTS` (vidi Mapa priča).
Brojevi u „ledger“ bloku (`index.html`, sekcija About) i Part 3 u sekciji Series pišu se ručno.
Stanje je provereno prema YouTube-u 29. 10. 2026.

## Mapa priča

Hero je interaktivna ručno crtana mapa sveta: pin je mesto gde se priča iz videa desila. Ploča
počinje kao baner kanala; povremeno se podigne 15 do 18% od dna, da se vidi da se povlači, a klik
ili tap ga povlači nagore i otkriva mapu (link sa `?tale=`, `?era=` ili `?region=` preskače baner).
Tek tada se pod ploču dodaje red regija i dugme „Random tale”. Svet se
vidi kao po jedan pečat po regiji sa brojem priča; klik leti kamerom u regiju, gde je svaka priča
poseban pin. Traka doba (Myth & Legend, Ancient World, Classical Antiquity, Middle Ages, Modern Era)
boji pinove i menja izgled mape; pin otvara svitak sa videima, Shorts i oznakom vrste tvrdnje
(record, tradition, debate). Link `?era=classical&region=greece&tale=marathon` otvara taj pin
direktno (preskače baner), pa link u opisu videa može da vodi na mapu. Mapa sama ne upisuje stanje
u URL, pa refresh uvek vraća baner.

Kod: `map.js` (baner, crtanje, kamera, pinovi, filteri, svitak; gradi se kad je pregledač slobodan ili čim se baner dodirne), `map-world.js` (generisano: putanje
kopna i projekcija), CSS u sekciji `Story map` u `styles.css`. Bez JavaScript-a ploča prikazuje
baner kanala; ako `map.js` pukne, vraća se baner.

**Pravilo: jedan video, jedan pin.** Pin je ono o čemu je video, i video se nikad ne pojavljuje na
mapi dvaput. Jedan pin sme da drži više videa (Greek Gods ima dva dela). Ako se u videu pominje drugo
mesto, to ide u tekst pina, ne u novi pin. Panel se otvara preko mape, sa strane suprotne od pina, i
ne pomera kameru. Promena doba menja izgled odmah, uz prsten boje doba; mapa se ne preleće i ne
prekriva.

**Dodavanje pina.** U `data.js`, u `EVENTS`, jedan unos:

```js
{ id: "marathon", name: "The Battle of Marathon", place: "The plain of Marathon, Greece",
  lat: 38.12, lon: 23.98, year: -490, region: "greece", claim: "record",
  text: "Dve-tri rečenice.", videos: ["nUQkW9Umv8M"], shorts: [] }
```

- Doba se računa iz `year` (negativno = p.n.e.), nikad se ne upisuje. Bez datuma: `myth: true`
  umesto `year`. `circa: true` piše „c.”; `when` zamenjuje ceo ispis datuma. Samo kad priča nema
  jedan datum a poznato je njeno doba, `era` ga zadaje izričito (Polinezija je za sada tako).
- `region` je jedna od `REGIONS` (nova regija = jedan unos sa `fit` okvirom i pozicijom pečata).
- Jedan video može imati više pinova (Antikitera ima olupinu i otkriće), a jedan pin više videa.
- `claim` se odnosi na tekst pina, ne na ceo video.
- Brojači, pečati regija i čipovi se ažuriraju sami.
- Mitovi nemaju pravo mesto: pin ide u regiju u kojoj je priča smeštena i to piše u `place`.

**Geometrija.** `map-world.js` je generisan i ne menja se rukom. Natural Earth kopno,
projekcija Natural Earth 1 rotirana na 50°E (Mediteran levo od sredine, ceo Pacifik u komadu na
desnoj strani), fin detalj samo u Egeju i na ostrvima Pacifika. Okviri regija i zone detalja
(`ZONES` u generatoru) moraju da se poklapaju: nova regija sa većim okvirom traži i finiju obalu tamo,
inače se na zumu vide grubi poligoni. Zavisnosti se instaliraju van repoa:

```
mkdir /tmp/geo && cd /tmp/geo && npm init -y
npm i d3-geo@3.1.1 topojson-client@3.1.0 topojson-simplify@3.0.3 world-atlas@2.0.2
cd <repo> && AT_GEO_DEPS=/tmp/geo node tools/make-world.mjs
```

Alat uz to proverava da isporučena projekcija odgovara d3, i ispisuje za svaki pin da li pada na
kopno u izvornom 10m skupu (`kopno` ili `MORE` sa udaljenošću do obale). Olupina Antikitere leži
pod vodom tik uz obalu ostrva, pa joj je pin namerno na ostrvu; ostali pinovi su na mestu događaja.

## Lokalni pregled

```
python -m http.server 8000 -d public
```

pa <http://localhost:8000>. Direktno otvaranje `index.html` iz Explorera takođe radi.

## Objavljivanje (Cloudflare Pages)

Repo <https://github.com/stanovljanac/Animated-Tales-Website> je povezan sa Cloudflare Pages
projektom `animated-tales-website`. Build komande nema; `pages_build_output_dir` iz `wrangler.jsonc`
kaže da se objavljuje `public/`. Bez toga Pages objavi ceo repo i koren sajta vraća 404. Svaki push
na `main` je nova produkcija (<https://animated-tales-website.pages.dev>), a svaki drugi branch
dobija preview URL.

Domen: DNS za `mihailobuilds.com` je na GoDaddy-ju (`domaincontrol.com`). Tamo je CNAME zapis
`animatedtales` → `animated-tales-website.pages.dev`, a u Pages → Custom domains je dodat
`animatedtales.mihailobuilds.com` (HTTPS pravi Cloudflare). Pages, a ne Worker, zato što Worker
prima custom domen samo kad je DNS celog domena na Cloudflare-u.

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
