# Kiviaja mäng: mehaanika ja numbrid v1

Kõik tabelid on arvutatud läbi ja omavahel kooskõlas. Numbrid on **häälestamise lähtepunkt**, mitte lõplik tõde, aga suhted nende vahel on juba kontrollitud.

Muudatused eelmisest: **vanur eemaldatud**. Lisatud: kaugretk, surmaorg, ajaskaala, oskusesüsteem.

---

## 1. Aeg ja tempo

| Ühik | Pikkus | Reaalaeg (1× kiirusel) |
|---|---|---|
| **Päev** | atomaarne tikk | 15 sekundit |
| **Hooaeg** | 30 päeva | 7,5 minutit |
| **Aasta** | 120 päeva (4 hooaega) | 30 minutit |
| **Kampaania** | 6–8 aastat | 3–4 tundi |

**Kiirused:** paus, 1×, 2×, 4×.
- **Automaatne paus** iga sündmuse peale (rünnak, surm, mürgitus, liituja, hooaja vahetus).
- **Talv jookseb vaikimisi 4× kiirusel** ja peatub ainult sündmuse peale. Talv on 30 päeva, aga mängija jaoks umbes 2 minutit.
- Suvi ja sügis 1×, sest seal tehakse otsuseid.

**Ühe töökäigu pikkus:**

| Kus | Käigu pikkus | Tootlikkuse kordaja | Märkus |
|---|---|---|---|
| Ring 1 | 1 päev | ×1,00 | kohe tagasi kutsutav |
| Ring 2 | 2 päeva | ×0,85 | **rünnaku ajal ei jõua koju** |
| Ring 3 | 3 päeva | ×0,65 | vajab saatjat |

See, et ringi 2 ja 3 töötajaid **ei saa kaitsesse tagasi kutsuda**, on tähtsam kui tootlikkuse kordaja. Rünnak tuleb siis, kui pool rahvast on metsas.

---

## 2. Toidumatemaatika

**Toiduühik (TÜ):** täiskasvanu sööb 1 TÜ päevas, laps 0,5.

### Tootlikkus TÜ/päevas, suvi, ring 1

| Amet | Oskus 0 | Oskus 1 | Oskus 2 | Oskus 3 |
|---|---|---|---|---|
| **Korilane (marjad)** | 1,5 | 1,9 | 2,3 | 2,6 |
| **Korilane (seened)** | 1,2 + mürgitusrisk | 2,0 | 2,8 | 3,6 |
| **Kalur** | 1,8 | 2,4 | 3,0 | 3,6 |
| **Kütt** | 1,0 (kõikuv) | 2,0 | 3,2 | 4,5 |

**Oskuseta korilane toidab 1,5 inimest** (nagu sa pakkusid). See tähendab, et **alguses peab ~2/3 rahvast olema toidu peal**. 5 inimesega: 3,3 inimest toidu peal, 1,7 vabaks. Just piisavalt kitsas, et esimene aasta oleks päris.

Kütt on **kõikuv**: saak tuleb pahmakas (üks põder = 60 TÜ), mitte ühtlaselt. Ta võib nädala tühja käia. Seepärast ei tohi kunagi olla ainult jahil.

### Hooajakordajad

| | Kevad | Suvi | Sügis | Talv |
|---|---|---|---|---|
| **Korilus** | 0,4 | 1,0 | **1,4** | 0,1 |
| **Kalapüük** | **1,2** (kudemine) | 1,0 | 0,9 | 0,3 (jää) |
| **Jaht** | 0,7 | 0,9 | **1,3** (rasvased loomad) | 0,6 |

Kevadine kalajooks on ajalooliselt õige ja mänguliselt vajalik: see on ainus asi, mis näljakuudel päästab. **Kes kalurit ei arendanud, sellel on kevad väga hull.**

### Oskuse kasv

- 1 oskusetase = **400 kogemuspunkti**.
- Ring 1: +1/päev. Ring 2: +2/päev. Ring 3: +3/päev. **Uus laagripaik: +3/päev esimesel hooajal.**
- Ehk: mugavas kohas kerget tööd tehes kulub tasemele ~3,3 aastat. Raskes kohas ~1,1 aastat.

**See on kogu mängu vaikne mootor:** mugav elu ei õpeta. Rühm, kes istub rikkas kohas ringis 1, kasvab suureks ja jääb rumalaks.

**Õpetamine (vanuri asemel):** kaks inimest paari, üks kogenud + üks algaja. Ühine toodang on 1,2× kogenu omast (mitte 2×), aga algaja saab **3× kogemust**. Otsene vahetuskaup: toit täna versus oskus järgmiseks aastaks.

---

## 3. Koosseis: kui palju rahvast läheb mitte-toidu peale

Nõuded kasvavad rahvaarvuga, ja sõdalaste nõue **ruudus** (`sõdalasi ≈ rahvaarv² / 100`), sest suurem hõim on nähtavam ja tõmbab rohkem vastaseid.

| Rahvaarv | Lapsi | Sõdalasi | Meistreid | Šamaan | Skaut | Mitte-toidu peal | **Toidu peal** | Vaja TÜ/päevas | **Nõutud tootlikkus (R1)** |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 1 | 0 | 1 | 0 | 0 | 1 | 3 | 4,5 | **1,50** |
| 8 | 1 | 1 | 1 | 1 | 0 | 3 | 4 | 7,5 | **1,88** |
| 10 | 2 | 1 | 1 | 1 | 1 | 4 | 4 | 9,0 | **2,25** |
| 12 | 2 | 1 | 1 | 1 | 1 | 4 | 6 | 11,0 | 1,83 |
| 16 | 2 | 3 | 2 | 1 | 1 | 7 | 7 | 15,0 | 2,14 |
| 20 | 3 | 4 | 2 | 1 | 1 | 8 | 9 | 18,5 | 2,06 |
| 24 | 4 | 6 | 2 | 1 | 1 | 10 | 10 | 22,0 | 2,20 |
| 28 | 4 | 8 | 3 | 2 | 1 | 14 | 10 | 26,0 | **2,60** |
| 30 | 4 | 9 | 3 | 2 | 1 | 15 | 11 | 28,0 | **2,55** |
| 32 | 5 | 10 | 3 | 2 | 1 | 16 | 11 | 29,5 | **2,68** |

Ringis 2 korruta nõutud tootlikkus **1,18×**, ringis 3 **1,54×**.
Maksimaalne saavutatav tootlikkus on **3,6**. Seega **ringis 3 on 28+ inimesega hõim matemaatiliselt võimatu** (vaja 4,0).

**Kolm lävendit, mis on kriisid:**
- **10 inimest**: skaut ja šamaan mõlemad nõutud, nõue hüppab 1,88 → **2,25**. Esimene päris kitsikus.
- **16 inimest**: sõdalasi vaja juba 3. Aga see avab kaugretke (vt allpool).
- **26 inimest**: teine šamaan ja kolmas meister korraga, nõue hüppab 2,20 → **2,67**. Siit edasi on iga lisainimene puhas kahjum, kui oskused pole maksimumis.

---

## 4. Surmaorg: 10–14 inimest

See tuli numbritest välja ja on mängu kõige olulisem koht.

**Kas hõim tuleb toime vaeses laagripaigas (30 punkti) ainult kohalikest ressurssidest?**

| Rahvaarv | Sõdalasi | Aasta vajadus (TÜ) | Kohalik ressurss | Puudujääk | Retki vaja | Retki suudab | Kokkuvõte |
|---:|---:|---:|---:|---:|---:|---:|---|
| 8 | 1 | 900 | 900 | 0 | 0 | – | **elab ära** |
| **12** | **1** | **1320** | **900** | **420** | **1,4** | **0** | **SUREB** |
| 16 | 3 | 1800 | 900 | 900 | 3,0 | 10 | elab ära |
| 20 | 4 | 2220 | 900 | 1320 | 4,4 | 10 | elab ära |
| 25 | 6 | 2760 | 900 | 1860 | 6,2 | 20 | elab ära |
| 30 | 9 | 3360 | 900 | 2460 | 8,2 | 30 | elab ära |

**Mida see tähendab:** 8 inimest elab ära ükskõik kus. 16+ inimest elab ära ükskõik kus, sest suudab välja saata kaugretki. **10–14 inimest on lõksus:** liiga suur, et vaesest kohast toituda, liiga väike, et kaugretke välja saata.

See on **täpselt see kiire keerulisemaks minek, mida sa tahtsid**, ja see ei ole kunstlik piirang. See tuleb kolme lihtsa reegli koosmõjust.

**Mängija jaoks tähendab see:** kasvamine peab olema **otsus, mitte triiv**. Kui hakkad kasvama, pead kasvama kiiresti 16-ni. Kui jääd 12 juurde toppama, oled halvimas võimalikus kohas.

---

## 5. Kaugretk: see, mis teeb sõdalastest midagi muud kui kulu

**Kaugretk** = 3 sõdalast + 3 kütti lähevad 12 päevaks kaugele jahile.

| | |
|---|---|
| **Koosseis** | 3 sõdalast + 3 kütti (miinimum 3 sõdalast, seepärast pole see 16 inimeseni võimalik) |
| **Kestus** | 12 päeva |
| **Saak** | 200 TÜ (oskus 1) kuni 400 TÜ (oskus 3) + 6–10 nahka |
| **Risk** | 20–30% keegi saab haavata, 5–10% keegi sureb |
| **Kõrvalmõju** | **ei ammenda kohalikku ringi üldse** |
| **Piirang** | küla on 12 päeva ilma pooleta sõdalastest |

See lahendab neli asja korraga:
1. Sõdalased muutuvad tootlikuks ilma, et nad lakkaksid olemast kaitse.
2. Suur hästi ehitatud hõim **suudab tõesti aasta ükskõik kus vastu pidada**, nagu sa tahtsid.
3. Tekib rütm: umbes üks retk hooaja kohta, iga kord draama.
4. Tekib klassikaline lõks: retk on väljas, siis ründab keegi küla.

---

## 6. Ammendumine

Reegel: **1 ammendumispunkt = 30 TÜ ümbrusest välja võetud.** Ei ole eraldi valemit inimese kohta, see tuleb ise välja.

Laagripaiga rikkus: vaene 30, keskmine 60, rikas 100 punkti.
Jaotus ringide vahel: ring 1 = 40%, ring 2 = 35%, ring 3 = 25%.

**Mitu hooaega üks koht kestab:**

| Rahvaarv | Punkti aastas | Vaene: R1 / kokku | Keskmine: R1 / kokku | Rikas: R1 / kokku |
|---:|---:|---:|---:|---:|
| 8 | 30 | 1,6 / 4,0 | 3,2 / 8,0 | 5,3 / **13,3 hooaega** |
| 12 | 44 | 1,1 / 2,7 | 2,2 / 5,5 | 3,6 / **9,1** |
| 16 | 60 | 0,8 / 2,0 | 1,6 / 4,0 | 2,7 / **6,7** |
| 20 | 74 | 0,6 / 1,6 | 1,3 / 3,2 | 2,2 / **5,4** |
| 25 | 92 | 0,5 / 1,3 | 1,0 / 2,6 | 1,7 / **4,3** |
| 30 | 112 | 0,4 / 1,1 | 0,9 / 2,1 | 1,4 / **3,6** |

Loe nii: **rikas koht kannab 12-inimest 9 hooaega ehk 2,3 aastat ehk kaks talve.** Täpselt see, mida sa ütlesid. 30-inimest kannab sama koht 3,6 hooaega ehk vähem kui aasta.

**Ammendumine ei ole seina vastu jooksmine.** Kui ring 1 tühi, kolib töö ringi 2: reis pikeneb, tootlikkus langeb 15%, tekib ohu ja saatjate vajadus. Küla sureb aeglaselt ja **mängija näeb seda tulemas**.

---

## 7. Talv

### Kui palju peab varuma

Talvine oma toodang on väike, ülejäänu peab olema laos.

| Rahvaarv | Talve vajadus (TÜ) | Talvine toodang | **Varuda** | Kuivatusraame (100 TÜ) |
|---:|---:|---:|---:|---:|
| 8 | 225 | 92 | 133 | 2 |
| 12 | 330 | 139 | 191 | 2 |
| 16 | 450 | 162 | 288 | 3 |
| 20 | 555 | 208 | 347 | 4 |
| 25 | 690 | 208 | 482 | 5 |
| 30 | 840 | 254 | 586 | 6 |

### Sügise töökoormus: uus koht vs teine aasta samas kohas

Töölispäevades (tp). Sisaldab **nii ehitamist kui ka varu kogumist**, mis on tegelikult suurem osa tööst.

| Rahvaarv | Onn | Raamid | Riided | Varu kogumine | **1. aasta uues kohas** | **2. aasta samas** | Sääst | **Koopaga 1. aasta** |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 12 | 16 | 6 | 46 | **81 tp** | 53 tp | 34% | 69 tp |
| 12 | 18 | 16 | 10 | 67 | **111 tp** | 75 tp | 32% | 93 tp |
| 20 | 30 | 32 | 16 | 121 | **199 tp** | 136 tp | 32% | 169 tp |
| 30 | 45 | 48 | 24 | 205 | **322 tp** | 226 tp | 30% | 277 tp |

**Teine aasta samas kohas hoiab kokku umbes kolmandiku sügisesest tööst.** See on tuntav, aga mitte nii suur, et paigalejäämine oleks alati õige. Täpselt õige suurusjärk.

**Koobas laagripaigas** kaotab onni ehitamise täielikult (12–45 tp) ja annab lisaks turvatunnet. See teeb koopaga paigast **märgatavalt parema esimese aasta koha**, ja see on hea põhjus skauti kuulata.

### Sügise meeldetuletus

Sügise **5. päeval** annab mäng ühe selge teate, mitte hoiatuste rea:

> **"Talv tuleb 55 päeva pärast. Sul on varus 40 TÜ. Vaja on 191. Praeguse tempoga jääd puudu."**

Ja kui laagripaigas on koobas: *"Koobas hoiab teid soojas. Onni ei ole vaja ehitada."*

Üks arv, üks võrdlus, üks tagajärg. Ei mingit ülesandeloendit.

### Talvised sündmused

Talv jookseb 4× ja peatub sündmuse peale. **Umbes 3–4 sündmust talve kohta.**

| Sündmus | Mida nõuab |
|---|---|
| **Hundikari küla juures** | käigupõhine kaitse, öösel, lõke on nähtavuse allikas |
| **Külmalaine (5 päeva)** | toidukulu 1,5×; kes on ilma nahkriieteta, jääb haigeks |
| **Haigus** | tõenäosus kasvab rahvaarvu ja paigalpüsimise ajaga; šamaan vähendab |
| **Varud rikutud** | rebane või niiskus, kaotad 10–20% laost |
| **Külmunud rändaja** | üks inimene ukse taga: võtad vastu (sööb, aga võib olla oskaja) või mitte (maine langeb) |
| **Jõgi külmub / sulab** | kalapüük katkeb või avaneb ootamatult |
| **Sünnitus talvel** | kõrge risk emale ja lapsele |
| **Vaikne talv** | mitte midagi ei juhtu. **Peab ka juhtuma**, muidu muutub iga talv ootuspäraseks. |

Talve ajal saab mängija teha ainult kolme asja: **ratsioone vähendada** (pool ratsiooni = varu kestab kaks korda kauem, aga tervis ja usk langevad), **saata riskantse talvejahi** või **pidada rituaali**. See vähesus on tahtlik: talv on aeg, kus makstakse sügisel tehtud otsuste eest.

---

## 8. Jääda või kolida: mis päriselt juhtub

### Paigalejääja lõks, numbritega

**Paigalejääja** istub rikkas kohas, kasvab mugavalt, jõuab 4. aastaks 20 inimeseni. Punktid on otsas, peab kolima.
**Kolija** on kolinud iga 2 aasta järel, hoidnud rahvaarvu ~10 juures, oskused kõrgemad.

Mõlemad kolivad nüüd **keskmisesse** kohta (60 punkti):

| | Ring 1 kestab | Terve koht kestab |
|---|---|---|
| **Paigalejääja, 20 inimest** | 1,3 hooaega | **3,2 hooaega = 0,8 aastat** |
| **Kolija, 10 inimest** | 2,7 hooaega | **6,7 hooaega = 1,7 aastat** |

Paigalejääja **ei jõua uues kohas isegi ühte aastat täis**. Ta peab kohe uuesti kolima, aga tal on 20 suud, madalad oskused (istus ringis 1) ja 4 sõdalast, mida on kaugretkeks napilt. **Ta on ehitanud endale masina, mis ei saa peatuda.**

See on täpselt see risk, mille sa ise sõnastasid, ja numbrid kinnitavad selle.

### Aga paigalejäämine ei ole vale

Paigalejääjal on 20 inimest, kolijal 10. Kui paigalejääja jõuab **16-ni enne kui punktid otsa saavad**, avab ta kaugretke ja **muutub kohast sõltumatuks** (tabel peatükis 4). Siis ta võidab.

Ehk päris otsus on: **kas jõuad läbi surmaoru (10–14) enne, kui su rikas koht ammendub?** Rikas koht annab 12 inimesega 9 hooaega. Kasvamine 12-lt 16-ni võtab umbes 6–8 hooaega. **See on napp ja see ongi mäng.**

---

## 9. Kasv ja kahanemine

- **Sünd:** kui toiduülejääk on olnud positiivne 2 hooaega järjest ja usk üle 40, sünnib laps. Umbes 1 sünd aastas 12-inimesega rühmas.
- **Laps** sööb 0,5 TÜ, ei tööta, saab täiskasvanuks **3 aastaga** (12 hooaega).
- **Liituja:** 1–2 korda aastas, kui maine kõrge ja toitu jätkub. Maine määrab, kas tuleb haige rändaja või kogenud kütt.
- **Lahkuja:** kui `nälg + surmad − usk` ületab läve. Lahkuja **võtab oma oskused kaasa** ja langetab mainet. Spiraal on tahtlik.

---

## 10. Mängu silmus ühel lehel

**Suvi.** Korja, kala, õpi. Ring 1 on lahke. Rahvas kasvab. Kõik on hästi ja see on lõks.
**Sügis.** Meeldetuletus tuleb. Kas ehitada, varuda või kolida? Iga tund läheb arvesse.
**Talv.** 4× kiirus. Kolm-neli sündmust. Sa ei tee midagi, sa ainult vaatad, kas arvutasid õigesti.
**Kevad.** Näljakuud. Kalajooks päästab, kui sul on kalur. Ja siin on **liikumisaken**.
**Ja siis otsus:** ring 1 on tühjaks saamas, rahvast on 13, sõdalasi on 1. Kas kasvad kiiresti 16-ni ja saad kaugretke, või kolid kohe ja alustad väiksena otsast peale?

---

## 11. Mis on veel häälestamata

Aus nimekiri sellest, mida ma ei ole kontrollinud:

1. **Materjali ja nahkade majandus** on numbriliselt lahti kirjutamata. Ainult toit on tasakaalus.
2. **Maine ja usu numbrid** on ribadena kirjeldatud, aga skaala pole paigas.
3. **Lahingu numbrid** (elupunktid, tabamustõenäosus) on täiesti tegemata.
4. **Mürgituse tõenäosused** vajavad oma tabelit: kui palju täpselt oskus 0 vs oskus 2 vahet teeb.
5. **Kaugretke tasakaal on kõige riskantsem koht.** Kui see on liiga hea, muutub mäng "kasvata 16-ni ja võida". Kaitse selle vastu: iga retk ammendab **piirkonna** kaugala punkte, nii et retki ei saa lõputult samast suunast teha.

Punkt 5 on kõige tähtsam ja seda tasub prototüübis esimesena katsetada.

---

## Kokkuvõte

**Neli numbrit juhivad kogu mängu:** rahvaarv, oskus, ammendumispunktid ja sõdalaste arv.

**Kolm avastust nendest numbritest:**

1. **Surmaorg 10–14 inimest.** Liiga suur vaesest kohast elamiseks, liiga väike kaugretkeks. Kasvamine peab olema otsustatud tegu, mitte triiv.
2. **Mugav elu ei õpeta.** Ringis 1 istumine annab oskust kolm korda aeglasemalt. Paigalejääja kasvab suureks ja jääb rumalaks, ja saab selle eest karistada alles siis, kui kolib.
3. **Kaugretk on sild.** 16 inimest ja 3 sõdalast teeb hõimu kohast sõltumatuks. See on ainus tee surmaorust välja ja see on kogu mängu keskne eesmärk.
