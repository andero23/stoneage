# Kiviaja mäng: süsteemid v1

Lihtne versioon. Kõik numbrid on **lähtepunktid häälestamiseks**, mitte tõde.
Põhimõte: iga süsteem, mis ei tekita otsust, lendab välja.

---

## 1. Ressursid

### Kolm kõva ressurssi (numbrid laos)

| Ressurss | Kust | Kulub | Miks olemas |
|---|---|---|---|
| **Toit** | korilus, jaht, kalapüük | iga inimene 1 ühik/päev | põhipinge |
| **Materjal** | mets, kivi (ohutu, aeglane) | tööriistad, ehitised | tööriistad korrutavad kõike |
| **Nahad ja luu** | **ainult jahilt** | talveriided, relvad | sunnib jahtima ka siis, kui toitu jätkub |

Kolmas on tähtis: korilus on ohutu ja annab toitu, aga **nahku ei anna**. Ilma nahkadeta külmuvad inimesed talvel. Nii ei saa mängija kunagi jahti täiesti vältida.

### Kolm pehmet mõõdikut (ribad 0–100)

| Riba | Mida teeb | Tõuseb | Langeb |
|---|---|---|---|
| **Turvatunne** | takistab paanikat, öiseid õnnetusi, tööst keeldumist | sõdalased, tara, lõke, varjualune, võidetud lahing | rahvaarvu kasv, kaotused, kiskjad lähedal, öö metsas |
| **Usk** | **puhver raskuse vastu**: kõrge usk = inimesed taluvad nälga ja surma ilma lahkumata | šamaan, pühapaik, reliikviad, rituaalid, matused | ennustus läks valesti, surm ilma matuseta, šamaani surm |
| **Maine** | väline: kes tuleb, kes ründab, kes kaupleb | pidu, suur jaht, võit, reliikvia, suur rahvaarv | nälg, lahkujad, kaotatud lahing |

**Turvatunde nõue kasvab rahvaarvuga.** 6 inimest ei taha kaitset. 25 inimest tahab. Valem lähtepunktiks: nõutav turvatunne = `rahvaarv × 3`. Kui tegelik jääb alla nõutava, langeb töötempo ja inimesed hakkavad lahkuma.

---

## 2. Üks number, mis seob kogu mängu: **ammendumine**

See on mängu selgroog ja ainuke asi, mida pead täpselt paika saama.

- Igal laagripaigal on **rikkus**: vaene 30, keskmine 60, rikas 100 punkti.
- Iga inimene ammendab ümbrust **1 punkt hooajas** (talvel 0,5). Aastas seega ~3,5 punkti inimese kohta.

| Rahvaarv | Kulu aastas | Rikas koht (100) | Keskmine (60) | Vaene (30) |
|---|---|---|---|---|
| 8 | 28 | ~3,5 aastat | ~2 aastat | 1 aasta |
| 12 | 42 | **~2,4 aastat (2 talve)** | ~1,4 aastat | < 1 aasta |
| 20 | 70 | ~1,4 aastat | < 1 aasta | ei kannata üldse |
| 30 | 105 | **< 1 aasta** | ei kannata | ei kannata |

**See annab sulle täpselt selle, mida tahtsid:** väike rühm kannatab rikkas kohas kaks talve, suur rühm ei kannata ühtegi. Ja rahvaarvu kasv muutub **hinnaks**, mitte skooriks.

**Ammendumine ei ole järsk.** Kui punktid otsas, ei kao toit. Töötajad peavad lihtsalt kaugemale minema: ring 1 → ring 2 → ring 3. Iga ring tähendab **rohkem aega ühe reisi peale ja rohkem ohtu**. Nii sureb küla aeglaselt ja nähtavalt, mitte ühe päevaga.

---

## 3. Ametid: seitse

| Amet | Toodab | Riskiaste | Lahingus |
|---|---|---|---|
| **Korilane** | toit, materjal | madal (mürgitus) | kehv, viskab kivi |
| **Kütt** | toit + **nahad** | kõrge | **parim kaugvõitleja** (oda, vibu) |
| **Kalur** | toit, stabiilne | madal | keskmine (**harpuun** = pikk ulatus) |
| **Sõdalane** | **mitte midagi** | ei lähe kaugele | parim |
| **Meister** | tööriistad ja ehitised | puudub | kehv |
| **Skaut** | **järgmise laagripaiga info**, ohtude info | **kõrgeim** | hea põgenemises, kehv löömises |
| **Šamaan** | usk + **ravib mürgituse ja haavad** | puudub | ei võitle |

**Sõdalane on tahtlikult kallis:** ta sööb ja ei tooda midagi. Alguses on ta luksus. Suures külas on ta paratamatus. See ongi otsus.

**Skaut on migratsioonimängu võti.** Ilma skaudita hüppad tundmatusse. Skaut kaardistab, kui rikas järgmine koht on ja mis seal ees ootab. Tema kaotamine on eriti valus.

**Vanur ei ole amet, vaid seisund.** Iga inimene üle teatud vanuse toodab vähem, aga saab **õpetada**: teise inimese teadmine kasvab kaks korda kiiremini. Kui vanur sureb enne õpetamist, kaob tema teadmine mängust.

---

## 4. Teadmine ja mürgitus

Teadmine on **iga inimese oma, mitte hõimu oma**, ja sureb temaga koos.

| Valdkond | Teadmise kasv | Mürgituse risk | Tagajärg | Saagikus |
|---|---|---|---|---|
| **Marjad** | kiire (+3 / käik) | väike | 2–3 päeva haige | madal |
| **Seened** | **aeglane (+1 / käik)** | suur | haigus kuni **surm** | **kõrge, ja säilib kuivatatult** |
| **Juured ja koor** | keskmine | väike | nõrkus | madal, aga **talvel ainus korilus** |

Seened on riski-tasu tuum: kõige parem talvevaru, aga selleks peab keegi aastaid õppima ja vahepeal keegi sureb. Šamaan vähendab mürgituse raskust, ei väldi seda.

**Väike, aga võimas detail:** kui kogenud korilane sureb, langeb tema õpilaste teadmine tagasi ja **mürgitused algavad uuesti**. Mängija tunneb kaotust ilma, et mäng peaks seda talle ütlema.

---

## 5. Rahvaarv

- **Algus: 5–7 inimest.** Ei mingeid tööriistu, ei mingit riietust.
- **Mugav: 10–16.** Siin mäng töötab hästi.
- **Pinges: 17–25.** Turvatunde nõue kasvab, ammendumine kiireneb, haigused algavad.
- **Lagi: ~30.** Ära tee sellest kõva piiri. Tee nii, et **30 inimest lihtsalt ei ole ühes kohas hoitav** ja mängija avastab selle ise.

Suur rahvaarv peaks olema **saavutus, mis kohe hakkab valus olema**. See on hea disain: mängija saab selle, mida tahtis, ja avastab, et ei tahtnud.

**Lapsed:** sünnivad aeg-ajalt, elavad küla keskel, ei tee midagi, söövad pool ratsiooni. Täiskasvanuks ~3 mänguaastaga. Nad on **investeering, mis maksab kohe ja tasub end ära alles siis, kui sa oled juba mujal**.

---

## 6. Aeg ja aastaajad

Tempo: reaalajas pausiga, *Outlanders*'i moodi. Üks aastaaeg ≈ **8–10 minutit**, aasta ≈ 35–40 min, kampaania 5–8 aastat ≈ 3–5 tundi.

| Aastaaeg | Iseloom | Peamine tegevus | Oht |
|---|---|---|---|
| **Kevad** | **näljakuud, aasta raskeim aeg** | ellujäämine, skautimine, **liikumisaken 1** | varud otsas, nõrkus, haigus |
| **Suvi** | küllus | korilus, õppimine, ehitamine, kalapüük | vähe, siin on turvaline |
| **Sügis** | **otsustav** | varumine, kuivatamine, suur jaht nahkade pärast | **liikumisaken 2** |
| **Talv** | kokkutõmbumine | vähe tegevusi, varude söömine | **hundikari, külm, haigus, surmad** |

**Kaks liikumisakent, kaks eri riski:**
- **Kevadel liigud**: oled nõrk ja teekond võib tappa, aga uues kohas on terve suvi ees.
- **Sügise alguses liigud**: oled tugev, teekond on ohutum, aga uues kohas jääb vähe aega enne talve varuda.

Kolmas variant: **ei liigugi ja jääd**. Siis mängib ammendumistabel sinu vastu.

---

## 7. Ehitised: kuus

Kõik on lihtsad ja mahajäetavad. Nimekiri on tahtlikult lühike.

| Ehitis | Annab | Lahkumisel |
|---|---|---|
| **Lõke** (kohustuslik) | küla keskus, soojus, öine turvatunne | jääb maha, ei maksa midagi |
| **Varjualune / koobas / onn** | talvise ellujäämise, turvatunde | jääb maha |
| **Kuivatusraam** | **ainus viis toitu talveks säilitada** | saab pooled materjalid tagasi |
| **Pühapaik** | usk, koht reliikviatele | jääb maha, **usk langeb lahkumisel** |
| **Töökoht** | tööriistad (kõik ametid kiiremad) | pooled materjalid tagasi |
| **Tara / okastara** | turvatunne, kaitse huntide vastu | jääb maha |

**Ehitamise loogika, mille sa juba leidsid:** ehitamine teeb elu kohe lihtsamaks, aga tõstab lahkumise hinda. Tee see nähtavaks ühe numbriga: **"Lahkumise hind"**, mis kasvab iga ehitisega ja mida mängija näeb kogu aeg ekraanil. See on kogu mängu keskne pinge, tehtud üheks numbriks.

---

## 8. Kaks teed

| | **Paikne** | **Rändav** |
|---|---|---|
| Ehitamine | jah | peaaegu üldse mitte |
| Toidu varumine | kuivatusraam, talvevaru | ei saa varuda, **järgned loomadele** |
| Rahvaarv | kuni ~25 | kuni ~12 |
| Maine | kõrge (nähtav, kutsub liitujaid) | madal, aga **ka ründajaid ei tule** |
| Talv | varude peal | **rände peal, kõige ohtlikum osa mängust** |
| Haigused | kasvavad ajaga | peaaegu puuduvad |

Mõlemad peavad olema läbitavad. Rändav tee on raskem, aga puhtam. Paikne on mugavam, aga koguneb võlga.

---

## 9. Ohud ja kaugus

Kolm ringi ümber laagri:

- **Ring 1** (küla ümber): ohutu. Ammendub esimesena.
- **Ring 2**: hundid üksikult, metssiga, võõras rändaja. Reis võtab 2× kauem.
- **Ring 3**: **karu, hundikari, teine hõim, eksimine**. Reis 4× kauem. Üksik inimene ei tohiks sinna minna.

**Talvel nihkub kõik ühe ringi võrra ohtlikumaks.** Hundid tulevad ring 1-e, see tähendab **küla juurde**. See annab talvele oma näo.

Suurulukid (karu, tarvas, põder, hiljem mammut) on **vabatahtlikud pealikud**: suur saak (toit + palju nahku + maine + reliikvia võimalus), aga vajad 4–6 inimest ja keegi tuleb tõenäoliselt haavatuna tagasi.

> **Väike ajalooline märkus mammuti kohta:** mandri-Euraasias kadusid mammutid umbes 10 000 aastat tagasi, ainult Wrangeli saarel elasid nad ~4000 aastat tagasini. Kui mäng on "keskmine kiviaeg", on mammut ajaliselt piiripealne. Alternatiivid, mis on täpsemad ja sama dramaatilised: **tarvas (aurohs), piison, karu, metssiga, põder**. Aga kui mammut on visuaalselt liiga hea, et loobuda, pane mäng varasemasse aega ja see on korras.

---

## 10. Lahing

Käigupõhine, väike, lühike. **3–6 sinu vs 1–4 vastast, 5–10 käiku.**

| Tüüp | Ulatus | Löök | Märkus |
|---|---|---|---|
| Kütt | pikk (oda, vibu) | kõrge | parim, aga habras |
| Sõdalane | lühike (nui, kirves) | kõrge | kannatab lööke |
| Kalur | keskmine (**harpuun**) | keskmine | üllatavalt kasulik |
| Korilane, meister | lühike (kivi, käsi) | madal | **kohustus, mitte abi** |
| Šamaan, laps, vanur | ei võitle | – | kui nad on lahingus, oled juba hädas |

**Kolm reeglit, mis teevad lahingu tõsiseks:**

1. **Haavad jäävad.** Haavatu sööb, aga ei tooda, nädalaid. Võit kahe haavatuga võib olla kahjum.
2. **Surm on lõplik** ja võtab kaasa selle inimese teadmise.
3. **Põgenemine on alati võimalik** ja sageli õige. Kaotad saagi ja maine, aga mitte inimesi.

Lahinguid peaks kogu mängus olema **vähe**: umbes 5–10. Kui neid on 40, muutub see rutiiniks ja ajastu tunne kaob.

---

## 11. Reliikviad

Sinu reegel: **seotud konkreetse inimesega, annab talle tema ametis midagi juurde.** Ununemistähtaega ei ole.

- Reliikvia leitakse: suurest jahist, matusest, kaugelt kauplejalt, võidetud lahingust, šamaani nägemusest.
- **Reliikvia kuulub inimesele, mitte külale.** Kui see inimene sureb, jääb reliikvia järele ja **tuleb uuele kandjale üle anda** (rituaal, kulutab veidi toitu ja aega). Nii tekib lugu ilma ühegi lisasüsteemita.
- Pühapaik lubab hoida reliikviaid, mida keegi parasjagu ei kanna, ja need annavad **usku**.

Kaheksa näidet:

| Reliikvia | Kandja | Mõju |
|---|---|---|
| **Sarvedega peakate** (punahirve kolju) | kütt või šamaan | jaht õnnestub sagedamini; kandes on ta lahingus "keegi teine" |
| **Karu käpp** | sõdalane | vastased kõhklevad, tema lööb kõvemini |
| **Merevaikkivi** | šamaan | rituaalid mõjuvad tugevamalt |
| **Sirge tulekivituum** | meister | tööriistad kestavad kauem |
| **Vanaema seenekorv** | korilane | mürgituse risk märgatavalt väiksem |
| **Luust harpuuniots** | kalur | rikkalikum saak, parem lahingus |
| **Rändaja jalaluu** | skaut | leiab paremaid paiku, eksib harvem |
| **Esimese lapse ehe** | ükskõik kes | ainult usk, ei mingit praktilist mõju. **Ja see on hea.** |

---

## 12. Maine: liitujad ja lahkujad

**Liituda tahetakse**, kui maine on kõrge ja toitu jätkub. Umbes 1–2 korda aastas ilmub keegi. Kes ta on, sõltub mainest: madal maine toob nõrga või haige, kõrge maine toob **kogenud sõdalase, ravitseja või seenetundja**.

**Lahkutakse**, kui `nälg + surmad − usk` ületab läve. Lahkuja võtab kaasa oma teadmise ja **langetab mainet veelgi**. Spiraal on tahtlik.

**Pidu** on peamine maine-hoob: kulutab palju toitu korraga, tõstab mainet ja usku, taastab moraali. Õigel hetkel peetud pidu päästab hõimu. **Vales kohas peetud pidu tapab talvel.** See on hea otsus, sest see on ahvatlev täpselt siis, kui on kõige rumalam.

---

## 13. Kaks parandust sinu plaanis

**1. Toitu peab saama ladustada, muidu kaob sügis ära.**
Sa kirjutasid, et toitu eriti ladustada ei saa ja see peab pidevalt tasakaalus olema. Sellega kaob mängust **kogu sügis** ja talv muutub puhtaks õnnemänguks. Ettepanek, mis hoiab su mõtte alles:

- **Värske toit rikneb 5–7 päevaga.** Hunnikut ei saa koguda.
- **Kuivatatud toit säilib terve talve**, aga tekib ainult kuivatusraamiga ja **võtab tööjõudu** (keegi peab seda tegema, selle asemel et koguda).
- Kuivatusraami maht on piiratud. Rohkem varu = rohkem ehitist = kõrgem lahkumise hind.

Nii jääb sinu põhimõte alles (ei saa lõputult koguda), aga sügis muutub mängu kõige pingelisemaks hooajaks: **kas koguda toitu täna või kuivatada toitu homseks**.

**2. Ära tee 30 inimest kõvaks laeks.**
Kõva lagi ütleb mängijale "siin on lõpp". Ammendumistabel ütleb "sa võid, aga tead ju küll". Teine on palju parem. Lase mängijal jõuda 30-ni ja lase tal ise aru saada, et see oli viga.

---

## 14. Mida esimesena prototüüpida

Ära ehita kõike. Ehita **üks aasta** ja vaata, kas see on huvitav:

1. **5 inimest, suvi, ainult korilus ja üks jaht.** Kas mürgitussüsteem tekitab pinget?
2. **Lisa sügis ja kuivatusraam.** Kas "koguda või kuivatada" on raske otsus?
3. **Lisa talv.** Kas talv tapab kellegi ja kas see teeb haiget?
4. **Lisa ammendumine ja kevadine liikumisotsus.** Kas mängija kahtleb?

Kui punkt 4 tekitab tõelise kõhkluse, on mäng olemas. Kõik ülejäänu (lahing, reliikviad, maine, liitujad) on selle peale ehitatud kiht ja seda ei tasu enne teha.

---

## Kokkuvõte

**Mängu üks lause:** hoiad väikest rühma elus läbi aastaaegade ja pead otsustama, millal maha jätta koht, mille sa ise üles ehitasid.

**Kolm numbrit, mis mängu juhivad:** rahvaarv, ammendumine, lahkumise hind. Kõik kolm on omavahel seotud ja kõik kolm liiguvad samas suunas.

**Üks asi, mis ei tohi kaduma minna:** mängija peab lõpuks olema olukorras, kus **jääda on hukatuslik ja lahkuda on hukatuslik**, ja tema peab valima. Kui su mäng suudab selle hetke tekitada, siis kõik muu on kaunistus.
