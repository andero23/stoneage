# Kiviaeg — jääda või liikuda

Mängitav prototüüp disainidokumentide järgi (`../Kiviaeg-mangudisain.md`, `../Kiviaeg-susteemid-v1.md`, `../Kiviaeg-balanss-v1.md`).

Hoiad väikest kütt-korilaste rühma elus läbi aastaaegade ja otsustad, millal jätta maha koht,
mille sa ise üles ehitasid. Ülaltvaade, pixel-art, eesti keeles, brauseris.

## Käivitamine

```bash
cd game && python3 -m http.server 8124
```

Ava http://localhost:8124. (Iga staatiline server sobib; ES-mooduleid pole, failid on tavalised skriptid.)

Mäng salvestub automaatselt localStorage'i (kord 30 s tagant ja lehe sulgemisel); "Jätka mängu" jätkab.

## Juhtimine

- **Tühik** — paus. **1/2/3** — kiirus 1×/2×/4×. Talv läheb ise 4× peale.
- **Rahvas** — ametid (korilane/kalur/kütt/sõdalane/meister/skaut), korilase režiimid
  (marjad/seened/juured/materjal/kuivatab), "kaugemale" (ring +1: vähem saaki, rohkem kogemust ja ohtu).
- **Küla** — ehitised, ratsioonid, talveriided, lahkumise hind.
- **Teod** — pidu, rituaalid, suurjaht, kaugretk (16+ inimest, 3 sõdalast + 3 kütti), reliikviad.
- **Kaart** — skaudi retked, ended, kolimine (aken: kevad + sügise 15 esimest päeva), naabrid ja veretasu.

## Arhitektuur

Simulatsioon on graafikast täielikult lahutatud — graafika saab hiljem välja vahetada ilma
mängu loogikat puutumata.

| Fail | Roll | DOM? |
|---|---|---|
| `js/util.js` | RNG (seemnega), abifunktsioonid, nimed | ei |
| `js/data.js` | **kõik balansinumbrid** (allikas: balansidokument) | ei |
| `js/world.js` | piirkond, laagripaigad, ammendumine, taastumine | ei |
| `js/person.js` | inimese mudel, oskused (XP 400/tase, max 3) | ei |
| `js/sim.js` | päevatsükkel: töö, toit, tervis, mõõdikud, kolimine, retked | ei |
| `js/events.js` | sündmused, naabrid, haarangud, veretasu | ei |
| `js/combat.js` | käigupõhine väikelahing (loogika + autolahendus) | ei |
| `js/sprites.js` | protseduuriline pixel-art | jah |
| `js/render.js` | laagri ülaltvaade, teekonnavaade | jah |
| `js/ui.js` | paneelid, modaalid, lahingu-UI, kaart | jah |
| `js/main.js` | tsükkel: sim setInterval'il, render rAF-il | jah |

Sim räägib UI-ga ainult `Bridge`'i kaudu (sim.js alguses). Headless-režiimis (Node) lahendab
Bridge sündmused automaatselt vaikevalikuga ja lahingud autolahendusega.

## Testiring: server, telemeetria, raport

Mäng on staatiline leht, aga testiringiks on kaasas väike Node-server, mis serveerib mängu
JA kogub anonüümset telemeetriat (`server.js`, ilma sõltuvusteta):

```bash
node server.js 8124        # serveerib mängu + võtab vastu /api/t sündmusi -> data/*.jsonl
node server.js report      # kokkuvõte: lehter, tegevuste kasutus, valikud, surmad, tagasiside
```

Mida kogutakse (anonüümne mängija-ID, mingeid isikuandmeid ei ole):
mängu algus/lõpp (skoor, aastad), iga hooaja seis (rahvaarv, toit, nähtavus, raamid…),
iga sündmuse-modaali VALIK, iga tegevuse kasutus, abi avamine, lahkumishetk (kus mängus
käega löödi — parim "millest aru ei saanud" signaal) ning surmaekraani vabatekst-tagasiside
(💬 nupp ülaribal töötab igal ajal). Kui serverit pole (nt file://), telemeetria lihtsalt vaikib.

Raport vastab otse testiküsimustele: mitu mängijat ehitas kuivatusraami enne esimest talve,
milliseid tegevusi ei kasutatud kordagi, kus mängus lahkuti, mida kirjutati tagasisidesse.
Veebis: `GET /api/report?key=...` (env `ADMIN_KEY`).

Juurutus: kaasas on `Dockerfile` (port 8125, volume `/app/data`) — sobib otse Coolify'sse
vm konteineriplatvormile. `data/` kataloogi ei tohi kaotada — seal on telemeetria.

## Balansipaneel (admin)

Ava mängus **F2** või ⚙ nupp üleval paremal. Kolm osa:

1. **Muutujad** — kõik olulisemad `DATA` väärtused gruppide kaupa (saagikus, hooajad,
   ammendumine/taastumine, talv, mürgitus, rahvas, retked, lahing). Muudetud väärtused on
   kollased, jäävad meelde (localStorage võti `kiviaeg-admin`, mängusalvestusest eraldi) ja
   mõjuvad jooksvas mängus kohe. Ekspordi/impordi nupud jagavad seadistust JSON-ina.
2. **Balansilabor** — bot mängib täismänge praeguste väärtustega otse brauseris ja näitab
   ellujäämist, keskmist rahvaarvu ja surmapõhjuseid kummagi strateegia kohta. See on ainus
   aus vastus küsimusele "kui raske mäng praegu on" — liugur üksi ei ütle midagi.
   Jooksev mäng pannakse labori ajaks kõrvale ja taastatakse puutumata.
3. **Olukord** — ressursside andmine, sündmuste käivitamine (haarang, lõhenemine, hundid…)
   ja varjatud seisundi vaade (sh millised rituaalid selles maailmas päriselt mõjuvad).

Sama bot (`js/bot.js`) jookseb nii laboris kui Node'i testides, seega numbrid on võrreldavad.

## Testid

```bash
node test/headless.js 8 16 randav    # 8 aastat, 16 seemet, rändav strateegia
node test/headless.js 8 16 paikne    # sama, aga rühm jääb paigale ja elab kaugretkedest
node test/trace.js 7932 130 randav   # ühe seemne päevahaaval jälg (toit, ametid, tervis)
```

Bot on tahtlikult keskpärane mängija: jälgib toidubilanssi, ehitab raame, kolib kui koht
ammendub — aga ei kasuta reliikviaid, õpipaare ega peenemaid nippe.

Neli profiili mõõdetuna 16 seemnel, 8 aastat (nii kontrollitakse, et **kõik mängustiilid on
läbitavad ja eri stiilidega saab kõrgeid skoore** — disaini põhinõue). Käivitus:
`node test/headless.js 8 16 <profiil>`, profiilid: `randav | paikne | raidiv-randav | raidiv-paikne`.

| Profiil | Elab üle | Skoor kesk / tipp | Iseloom |
|---|---|---|---|
| **Rändav** | ~12/16 | ~950 / ~1500 | turvaline, aga kolimine kurnab ja vara ei kogune |
| **Paikne** | ~11/16 | ~980 / ~1650 | vajab läbimurdmist surmaorust kaugretkeni; hädakolimine päästab |
| **Raidiv-rändav** | ~9/16 | ~740 / ~1300 | liikuv röövel: nähtamatu, aga retked nõuavad verd |
| **Raidiv-paikne** | ~5/16 | ~640 / **~1700** | klaaskahur: sureb tihti, tipp on kõrgeim |

Orientiirid: rahumeelsed profiilid 10–13/16, agressiivsed 5–9/16; tipp-skoorid samas
suurusjärgus (±30%). Kui mõni profiil domineerib nii ellujäämises KUI skooris, on tasakaal katki.

## Häälestusnupud (kõik `js/data.js`-is)

- `YIELD`, `SEASON_MOD` — saagikused (otse balansidokumendist)
- `RING_MOD`, `RING_RISK`, `RING_XP` — ringide loogika ("mugav elu ei õpeta")
- `TU_PER_POINT`, `RING_SHARE` — ammendumise kiirus
- `POISON` — seeneriski tabel
- `RACK_CAP`, `RACK_RATE`, `DRYER_RATE` — kuivatamise pudelikael
- `KAUGRETK`, `SUURJAHT` — retkede tasakaal (balansidoc: kaugretke tasakaal on kõige riskantsem koht)
- `SEC_REQ_PER_POP`, `LEAVE_THRESHOLD` — turvatunde nõue ja lahkumise lävi
- `LOCAL_KNOWLEDGE_MAX` — paiksuse tasu (`World.regenerate` kõrval kõige tundlikum nupp)

**Kaks kohta, mis hoiavad "jääda või liikuda" tasakaalus** — neid muutes muutub kogu mäng
(mõlemad on nüüd `data.js`-is ja balansipaneelis grupi "Ammendumine ja taastumine" all):

1. `REGEN_GROW` / `REGEN_ABANDONED_MIN` — maa taastub kasvuperioodil ka seal, kus elatakse.
   Kiirem taastumine teeb paiksuse alati õigeks (pinge kaob); aeglasem sunnib igavesse rändu.
2. `RING_KNEE` — ammendumine on sujuv libisemine, mitte sein. Kui see teha binaarseks,
   muutub ammendumine kas olematuks või järsuks katastroofiks.

## Plaan v2 (vt `../Kiviaeg-plaan-v2.md`) — tehtud osad

- **Algus:** 4 täiskasvanut + 1 laps; väike rühm (≤7) õpib 1,5× kiiremini ja liitujaid tuleb kergemini.
- **Koha omadused:** varjatus (haarangurisk↓) ja kaitstavus (turvatunne + lahingukaardi künkad:
  laskuril +1 ulatus, +5% tabamine). Skaudiraport ja kohakaardid näitavad mõlemat.
- **Isikuomadused:** igal inimesel varjatud anne (õpib 1,3×), nõrkus (0,75×) ja tempo (0,9–1,1×);
  avalduvad läbi mängu logiteate ja märgiga (✦/▿), numbreid ei näidata.
- **Erikohad:** 2 peidetud "koske", mille leiab ainult (kaug)luure; elades kahaneb varjatus kiiresti.
- **Lahing:** 5 võitleja lagi; loot skaleerub kaitsja kohalolekuga (paljas küla kaotab 55% + reliikvia);
  põgenemise järel võidakse sind jälitada (kolimine raputab jälitaja 50% maha).
- **Nähtavus:** mõõdik ülaribal; haarangud sihivad AINULT nähtavuse järgi (rahvaarv, varad,
  ehitised, peod − koha varjatus); ründaja genereeritakse kohtumishetkel sinu suuruse järgi.
- **Raidimine:** Teod → "Otsi raiditavaid külasid" — skaut otsib (6–12 p), leid annab
  kohe-või-mitte-kunagi pakkumise; sihtküla genereeritakse leidmise hetkel; loot langenutelt,
  paljas küla annab palju + vahel reliikvia; kaotuse järel võidakse sind koju jälitada.

## Mis on teadlikult veel tegemata (v2 kandidaadid)

- Graafika on ajutine ("hiljem keskendume muule graafikale") — sprites.js/render.js on selleks eraldatud.
- Tabud sündmustest, loomasuhted ("solvatud" liigid), potlatš-mehaanika, orjuse hilismäng.
- Naabrite oma trajektoorid (praegu 2 staatilist rühma suhtumise, kaubanduse, haarangu ja veretasuga).
- Heli.
