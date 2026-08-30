# Kiviaeg: plaan v2 — nähtavus, raidimine, skoor, asünkroonne võrgumäng

Koostatud 29.08.2026 arutelu põhjal. Täiendab dokumente `Kiviaeg-mangudisain.md`,
`Kiviaeg-susteemid-v1.md`, `Kiviaeg-balanss-v1.md`. Prototüüp on kaustas `game/`.

---

## 1. Visioon ühe lõiguga

Mäng muutub lõputuks ellujäämismänguks, kus vägivalla hulk on **mängustiili tagajärg,
mitte reegel**: varjatud, liikuv ja tagasihoidlik hõim näeb lahinguid harva (disainidoc'i
"3–5 kokkupõrget" jääb selle stiili loomulikuks tulemuseks); suur, rikas, paikne või ise
ründav hõim tõmbab vägivalda ligi. Kauges tulevikus täidavad teiste hõimude rolli päris
mängijad (asünkroonselt, snapshot'ide kaudu), aga arvuti mängib seda rolli algusest peale
ja jääb mängima ka siis, kui päris mängijaid on vähe.

---

## 2. Tehtud otsused

### 2.1 Raskuskõver pöördub ümber (praegu vale pidi)
- Praegu: algus liiga raske, suur treenitud hõim liiga turvaline.
- Siht: **mida väiksem, seda lihtsam ja kiirem areng; kasvades muutub edasikasvamine
  eksponentsiaalselt raskeks.**
- Algus 4–5 inimesega (mitte 3–4: üks seenemürgitus ei tohi olla kohene spiraal).
  Väiksuse boonused: madal turvanõue, kiirem õppimine, esimesed liitujad tulevad kergelt.
- Hilise mängu surve tuleb nähtavusest (2.3), haigustest ja sotsiaalsetest kriisidest,
  mitte toidumatemaatika karmistamisest.

### 2.2 Raidimine mõlemas suunas
- Mängija saab raidida teisi külasid; teised raidivad teda. Kõva lahingulimiiti ei ole.
- **Raidi saak: tapetute rõivad, varustus, reliikviad** — mitte toidufarm. Suur
  toiduloot ainult siis, kui küla jääb päriselt kaitseta (vt 2.5).
- **Veretasu sihtimises EI OSALE.** Sihtmärgiks saamist juhivad ainult: rikkus,
  rahvaarv ja kas sind jälitati pärast kaotust (vt 2.3). Rikkus ise ongi agressiooni
  jälg: kes raidib, see rikastub, ja rikkus tõstab nähtavust. Sellest ka päris otsus —
  **võta raidilt kaasa ainult vajalik**, et mitte silma torgata.
- Ainus "mälu" süsteemis: kui kaotad või põgened, võib võitja saata skaudi sind
  jälitama — ebaõnnestunud agressiooni hind on see, et sind leitakse kodust üles.
- (Praegune üksikmängija veretasu-mehaanika AI-naabritega: otsustada etapis 5, kas
  kaob või jääb pehme loo-elemendina, mis sihtimist ei mõjuta.)

### 2.3 Nähtavussüsteem (v2 selgroog)
- Igal hõimul on **nähtavus**, mida kasvatavad: rahvaarv, nähtav vara (sh raidiloot!),
  ehitised (eriti pühapaik/kalme), peod, paigalpüsimise aeg. Kahandavad: väiksus,
  liikumine, varjatud asukoht. Eraldi "sõjamainet" ei ole — rikkus täidab selle rolli.
- **Skaudil on kaks retkeliiki:** (a) vaata võimalikke laagrikohti (olemas),
  (b) otsi raiditavaid külasid (uus). Lisaks jälitusretk kaotaja järel (2.5).
- Avastamine on suuruse-põhine: sind näevad kõige tõenäolisemalt umbes sama suured;
  sina näed suuremaid suurema tõenäosusega kui nemad sind. Emergentne tulemus:
  väikseid rünnatakse harva ja väikeste poolt, suured on paljude kaartidel sihtmärk.
- **Kolimine viib su kõigi teiste kaartidelt maha** (paanikanupp, mille hind on juba
  olemas: lahkumise hind, usk, teekonna risk).
- UI: nähtavus tuua ekraanile pideva mõõdikuna nagu "Lahkumise hind" — mängija peab
  alati suutma vastata küsimusele "miks mind praegu nähakse/rünnatakse".

### 2.4 Koha omadused: varjatus ja kaitstavus
- Lisaks rikkusele/jõele/koopale saab iga laagripaik: **varjatus** (kui hästi koht
  peidab sind teiste kaartide eest) ja **kaitstavus** (lahingukaardi maastik: küngas
  laskuritele, kitsas läbipääs jne).
- Parimad kohad võivad olla mõlemat — aga siis on muu (rikkus, vesi) tõenäoliselt kehvem.
- Lahingukaart genereeritakse koha omadustest, mitte juhuslikult.

### 2.5 Lahing: väike, kiire, panustega
- Kuni **5 võitlejat** kummalgi poolel, **asendusvõitlejaid ei tule**. Lahingud jäävad
  lühikeseks ja kohutavaks.
- Kaitsta saavad ainult need, kes on ringis 1 (juba pooleldi mängus `away`-mehaanikaga).
  Tagajärg: ringi 1 tühjaks tarbimine on ka KAITSERISK — kui su rahvas käib kaugel,
  oled paljas. Ammendumine muutub kaitsestatistikaks.
- **Loot skaleerub kaitsja kaotusega:** kui kaitsjad olid vaid osa külast, saab võitja
  vähe (ainult langenutelt); kui need 5 olid küla viimased kohalolijad, on loot suur ja
  kaitsja kahju ränk.
- Tulevase võrgumängu tarbeks: käigule ajapiir (~25 s). Üksikmängus valikuline.
- **Põgene-nupp**: alati võimalik. Vastane otsustab (50%), kas saata skaut jälgi
  lugema. Kui jälg viib kohale (6–15 päeva; kolimine raputab 50% maha, 35% jälg kaob
  ise), otsustab vastane KOHE: ründab (70%) või vaatab ja läheb (30%). Hiljem seda
  võimalust ei ole — ei mingit "järjehoidjasse panemist".

### 2.6 Varustus (meistri teine käsi)
- Meister valmistab lisaks riietele **lahinguvarustust**, aga vajab erileide: odapea-
  kujuline kivi, kirvekivi, suurulukite luud. Leiud tulevad kaugelt materjalikorjelt
  (ohtlikum = suurem leiutõenäosus), suurjahilt ja raididest.
- Varustus **kulub kasutamisel** → pidev hankimistsükkel.
- **Range piir reliikviatega:** varustus on praktiline ja numbriline; reliikvia on
  nimeline, lugu kandev ja tema mõju ei näidata kunagi. Tööriistu saab usaldada,
  vaime mitte. Seda piiri ei tohi hägustada.

### 2.9 Varjatud isikuomadused (TEHTUD 29.08)
- Igal inimesel sünnist: **anne** (üks valdkond, õpib 1,3×), **nõrkus** (teine, 0,75×),
  **õpitempo** (0,9–1,1×). Numbreid ei näidata kunagi.
- Omadus **avaldub läbi mängu**: piisava töö järel tuleb logiteade ("õpib, nagu oleks
  selleks sündinud") ja inimese rea juurde ilmub märk (✦ / ▿).
- Mõju tahtlikult väike, aga teeb inimesed erinevaks ja annab põhjuse ameteid
  inimeste järgi valida. Konstandid balansipaneelis.

### 2.10 Peidetud erikohad ("kosk") (TEHTUD 29.08)
- Maailmas on 2 erikohta, mida kaardil EI EKSISTEERI (isegi mitte "?"), kuni skaut
  need avastab. Kaugluure (4+ päeva) leiab 12%, lähiluure 3% tõenäosusega retke kohta.
- Erikoht: rikas + kalajooks + koobas/jõgi + varjatud + kaitstav — kiire kasvu koht.
- **Varjatus EI kahane ajaga** (otsus 29.08): koha varjatus on püsiomadus. Nähtavus
  tuleb mängija TEGEVUSEST — rahvaarv, rikkus, ehitised, peod (vt 2.3). Vaikselt elades
  saab kose peal kaua kosuda; kasv ja rikkus paistavad ka sealt. Erikohta piiravad
  ammendumine ja see, et suureks kasvanud küla nähtavus ületab lõpuks ka hea varjatuse.

### 2.7 Skoor
- Mäng on lõputu; skoor mõõdab, kaua ja kui hästi püsid.
- **Skoor koguneb hooajati** (rahvaarv + varad + boonused hooaja kohta), surm lõpetab
  kogumise. NB: mitte lõppseisu korrutis — surm nullina karistaks kõiki, sest mäng
  lõpeb pea alati ebaõnnega.
- **Globaalne liiderboard** (võrgumängu faasis; üksikmängus lokaalne rekorditabel).
- Kaks võistlusvõimelist teed: suur-rikas-riskantne (kogub kiiresti, elab lühidalt) ja
  väike-varjatud-liikuv (kogub aeglaselt, elab kaua).

### 2.8 Asünkroonne võrgumäng (kauge tulevik, arhitektuur kohe)
- **Igal mängijal oma ajarežiim** — valib ise kiiruse, pole ühist arusaama aastaaegadest.
- **Ühist maailmakaarti ei ole** — igaüks näeb oma kaarti, mis on nähtavussüsteemi
  isiklik valim teistest küladest. Midagi pole vaja geograafiliselt sünkroonida.
- **Lahingud käivad snapshot'ide vastu**: kaitsja küla seis on serialiseeritud
  (JSON-salvestus juba töötab), kaitset mängib bot (`Combat.autoResolve` juba olemas).
- Arvuti-hõimud täidavad mängijate rolli algusest peale ja alati, kui mängijaid on vähe.
- **Offline-reegel (otsustatud):** kes ei mängi, seda teiste kaartidel ei ole ja teda
  ei saa rünnata. Rünnak on võimalik ainult leidmise hetkel: skaut leiab küla → kohe
  pakkumine "kas ründad?" — hiljem "järjehoidjast" rünnata ei saa (välistab kiusamise
  ja püsiva sihtmärkide-seisu serveris). Kui kaitsja paneb keset lahingut akna kinni,
  mängib bot (`Combat.autoResolve`) tema eest kaitse lõpuni; pärast seda on ta
  kaartidelt väljas ja puutumatu.

---

## 3. Lahtised küsimused (otsustada enne vastavat etappi)

1. **Offline-kaitse: LAHENDATUD** (vt 2.8): nähtav ja rünnatav ainult mängimise ajal,
   rünnak ainult leidmise hetkel. Alles jäävad kaks alaküsimust: (a) kui pikk on
   "mängimise" armuaeg pärast viimast tegevust (et akna sulgemine keset skauditavat
   hetke ei oleks hetkeline nähtamatus-nupp); (b) raidisagedus — kas üks mängija saab
   samas sessioonis piiramatult skautida-raidida või on jahtimisel rütm/kulu.
2. **Skoori valem: ESIALGNE PAIGAS** (vt tabel rida 7) — lõplik häälestus etapis 5:
   eri mängustiilid (suur-rikas vs väike-varjatud vs agressiivne) peavad suutma
   võrreldavaid tippskoore. Mõõta balansilaboriga, kaalud on paneelis.
3. **Jälitamise mehaanika detailid** (p 2.5): skaudi jälitusretke kestus, õnnestumise
   tõenäosus, kas jälitatav saab jälitajat märgata/tappa.
4. **AI-hõimude oma kasv: LAHENDATUD** — ei kasva, genereeritakse kohtumise hetkel
   valemiga (suurus mängija järgi). Suured sihtmärgid tekivad etapis 4 samamoodi:
   raiditavad külad genereeritakse skaudi leidmise hetkel.

---

## 4. Ehitusjärjekord (sõltuvuste järgi)

Süsteemid enne, suur balanseerimine pärast — sest hilise mängu raskus ONGI nähtavus ja
raidid; kõvera lõpuosa ei saa häälestada enne, kui need olemas on.

| # | Etapp | Sõltub | Märkus |
|---|---|---|---|
| 0 | ✅ Kiire vahepass: algus kergemaks | — | TEHTUD 29.08: algrühm 4+1, väiksuse XP-boonus 1,5× (pop≤7), liitujad tulevad väikesele kergemini, algvarud +. |
| 1 | ✅ Koha omadused: varjatus/kaitstavus (2.4) | — | TEHTUD 29.08: genereerimine profiilidest (kuulus kalajooksukoht nähtav, koopad peidetud-kaitstavad), varjatus → haarangurisk↓, kaitstavus → turvatunne + lahingukünkad (laskuril +1 ulatus, +5% tabamine), skaudiraport ja UI. |
| 2 | ✅ Lahingu ümbertöö + põgenemine/jälitamine (2.5) | 1 | TEHTUD 29.08: 5 võitleja lagi, ring-1 kaitsjad (oli), loot skaleerub kaitsja kohalolekuga (peitunud rahvas → 20%; paljas küla → 55% + reliikviarisk 60%), jälitus pärast põgenemist (50%, kolimine raputab 50% maha). Käigutaimer edasi lükatud MP-faasi. |
| 3 | ✅ Nähtavussüsteem AI-hõimudega (2.3) | 1 | TEHTUD 29.08: nähtavuse valem (rahvaarv+varad+ehitised+peod+aeglane paigalisa − varjatus×0,55), mõõdik ülaribal, haarangud AINULT nähtavusest ((vis−25)/130, max 55%/hooaeg), ründaja genereeritakse kohtumishetkel sinu suuruse järgi (0,8–1,8×). AI-hõimude oma kasvu EI OLE — nad genereeritakse valemiga, nagu otsustatud. |
| 4 | ✅ Raidimine mõlemas suunas (2.2) | 2, 3 | TEHTUD 29.08: skaudi külaotsing (6–12 p, leid 65%+), sihtküla genereeritakse leidmise hetkel (suurus 0,8–2,2× sinu oma), KOHE-või-mitte-kunagi pakkumine, teekond sinna-tagasi (kodu vahepeal nõrk), lahing nende maastikul (künkad kaitsjal), loot langenutelt + paljas-küla reegel (väike küla jääb lahtiseks, suurel peitub rahvas), reliikviarööv 25% paljalt külalt, kaotuse järel jälitus koju 50%. |
| 5 | ✅ **Suur balansipass** | 2–4 | TEHTUD 29.08: botile raidiv profiil + kombod (4 profiili laboris ja testides). Häälestus: teekonnarisk 2,8→3,5%, kohatundmine +18→25%, asustatud koha taastumine +43%, kaugalade toibumine 0,6→0,75, raidikandevõime 10→14, raidiskoor 8→15. Tulemus: ellujäämine 12/11/9/5 /16, tipp-skoorid 1524/1653/1292/1695 — rahumeelsed turvalisemad, agressiivne-paikne klaaskahur kõrgeima tipuga. |
| 6 | ✅ Varustus (2.6) | 4 | TEHTUD 29.08: erileiud (eriline kivi kaugemalt materjalikorjelt ringi järgi 0,4–2,5%/päev; suured luud suursaagilt 20%, suurjahilt +2, kaugretkelt 50%), meister sepistab (relv: +1–2 kahju +4% tabamine; turvis: +3 HP), kulub 25/lahing, röövitud relvad tulevad raidilt pooleldi kulununa. Reliikviatest rangelt lahus. |
| 7 | ✅ Skoor (2.7) | — | TEHTUD 29.08 (toodud ette, et balansipass saaks mõõta kõiki stiile): koguneb hooajati (baas 3 + rahvaarv×2 + varad/20 + reliikviad×5 + varustus + talv 15), võidetud sõjaretk +8 ühekordselt. Kuvatakse ülaribal; surm salvestab lokaalsesse rekorditabelisse (top 10); kaalud balansipaneelis. Valem häälestatakse lõplikult etapis 5. |
| 8 | Võrgumäng (2.8) | kõik | arhitektuuridistsipliin kehtib aga kohe (vt 5) |
| 9 | **Onboarding: avamiste redel** (vt §6) | — | JÄRGMINE. Simuleeritud 29.08, ehitamata. |

---

## 6. Onboarding: eesmärkide rada (otsustatud ja simuleeritud 29.08)

### Otsused
- **Toidubilansi näidikut EI TULE** — mängija avastab ja timmib ise; eesmärkide
  edenemine (nt "kuivata 130 TÜ": 46/130) annab diskreetse tagasiside.
- **Menüüsid EI PEIDETA** — kogu UI jääb nähtavaks; sisse juhatab eesmärkide jada.
- **Eesmärkide jada** on onboarding'u selgroog: üks aktiivne eesmärk korraga,
  täitmine = tähistus + skooripreemia + järgmine.

### Simuleeritud tulemused (60 mängu, "eesmärke järgiv" mängija)
| Variant | 1.a surnud | pop 3.a alguses | kolinud 4.a-ks |
|---|---|---|---|
| Praegu (juhendatud, eesmärkideta) | 42/60 | — | — |
| Eesmärkide jada | 2/60 | 6 | 51/60 |
| + kogenud liitujad väikesele rühmale | **1/60** | **10** | **49/60** |

Õppetunnid: (1) kevad-kala eesmärk kukutas 2. aasta näljasurmad 30→4; (2) sündide
kergendamine tegi asja HULLEMAKS (lapsed söövad, ei tööta) — kasv käib liitujate
kaudu; (3) liitujate SAGEDUS ei aidanud, KVALITEET aitas.

### Mängumuudatused (3 tk, koos eesmärkidega)
1. **Kogenud liituja väikesele rühmale:** kuni pop < 10 tuleb rändaja oskusega 1–2
   toidudomeenis, õige ametiga. Temaatiline: üksi rändab läbi ainult see, kes oskab.
   Toidupiir vastuvõtuks leebem (6× päevavajadus). Alates pop 10 tavaline (mainepõhine).
2. **Liitujate aken laiem:** lisašanss ~1%/päev (suvi-sügis) kuni pop 12.
3. **Skooripreemiad eesmärkide eest** (+10..40, suurim "esimene talv üle elatud").

### Eesmärkide jada (üks korraga; E1–E8 on rada, ülejäänud avanevad olukorrast)
| # | Eesmärk | Täitmine | Õpetab |
|---|---|---|---|
| E1 | "Kogu 20 TÜ toiduvaru" | fresh+dried ≥ 20 | ametid, toit |
| E2 | "Kogu 8 materjali ja ehita kuivatusraam" | raam valmis | materjal-režiim, meister, ehitus |
| E3 | "Kuivata talveks 130 TÜ" (progress!) | dried ≥ 130 | kuivatamine, varu SIHT — asendab bilansinäidikut |
| E4 | "Hangi 4 nahka ja riieta kõik" | kõik riides | kütt, nahad, meister |
| E5 | "Ehita onn (peavari kõigile)" | shelterCap ≥ pop | onn |
| E6 | "Ela esimene talv üle" | kevade 1. päev | ratsioonid, juured (vihjed eesmärgi all) — SUUR tähistus |
| E7 | "Kevadine kalajooks: pane 2 inimest kalale" | 2 kalurit kevadel | hooajad! (kriitiline, vt õppetund 1) |
| E8 | "Kasvata rühm 8 inimeseni" | pop ≥ 8 | liitujad, maine |
| E9 | "Saada skaut naaberpaika luurele" | luure õnnestus | kaart |
| E10 | "Ring 1 tühjeneb — vali uus kodu ja KOLI" (3. aasta paiku) | kolimine tehtud | mängu tuum: jääda või liikuda — SUUR tähistus |
| E11 | "Ehita uues kodus raam ja ela talv üle" | talv üle elatud | tsükkel kinnistub |
| — | Olukorrast avanevad: šamaan (unenägu), pühapaik+rituaal, pidu, suurjaht, relv, kaugretk (pop 16), reliikvia kandja | — | vastavad süsteemid |

### Teostus (ehitamisel)
- `js/objectives.js` (DOM-vaba definitsioonid + kontroll simDay lõpus) + UI-riba
  kanvase alaosas (aktiivne eesmärk + progress + "✓" animatsioon).
- Eesmärgi seis salvestub (G.objectives). Kogenud mängijale nupp "peida eesmärgid".
- Bot-testidesse "eesmärgi-järgija" profiil regressiooniks.

---

## 5. Arhitektuurireeglid, mis kehtivad KOHE (võrgumängu nimel)

1. Kõik otsused käivad läbi Sim API — mitte kunagi otse seisu (`G`) muutes UI-st.
2. Simulatsioonis ei kasutata kunagi kella (`Date.now`) ega `Math.random`-it — ainult
   seemnega `U.rng`. Determinism = snapshot'ide taasesitatavus.
3. Naaberhõim püsib liidese taga, mille saab hiljem asendada teise mängija küla
   snapshot'iga. AI-hõim ja mängija-küla peavad olema sama kujuga andmed.
4. Küla seis peab jääma täielikult JSON-serialiseeritavaks (praegu on).
5. `Combat.autoResolve` = tulevane kaitsja-bot. Hoida elus ja testitud.
