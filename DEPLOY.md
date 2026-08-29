# Juurutus (thewintercount.com)

**Praegune tootmisseade: kontoriserver `kl-nuc` + Cloudflare Tunnel** (vt allpool "Tegelik seadistus").
Allolev VPS-i juhend on alternatiiv, kui mäng peaks kunagi pilve kolima.

## 1. Server
Vaja on väikest VPS-i (1 vCPU / 1–2 GB on küllaga): Zone Cloud VPS, Hetzner CX22 vms.
Ubuntu 24.04 + Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

## 2. DNS (zone.ee halduses)
- `A` kirje: `@` → serveri IP
- `A` kirje: `www` → serveri IP

## 3. Käivitus
```bash
git clone https://github.com/andero23/stoneage.git && cd stoneage
ADMIN_KEY=pane-siia-salasona docker compose up -d --build
```
Caddy hangib Let's Encrypti sertifikaadi ise (eeldab, et DNS juba osutab serverile).

## 4. Uue versiooni väljalase
```bash
cd stoneage && git pull && docker compose up -d --build
```

## 5. Testiraport
- Serveris: `docker compose exec game node server.js report`
- Veebis: `https://thewintercount.com/api/report?key=SINU_ADMIN_KEY`
- Toorandmed: volume `game-data` (`/app/data/*.jsonl`)


---

# Tegelik seadistus (kl-nuc, Cloudflare Tunnel)

Mäng jookseb kontoriserveris NAT-i taga; avalik liiklus tuleb Cloudflare Tunneli kaudu,
seega ühtegi porti ei ole ruuteris avatud ja HTTPS tuleb Cloudflare'ilt.

```
internet → Cloudflare (proxy) → tunnel (väljuv ühendus) → cloudflared → game:8125
```

## Komponendid serveris
- `~/stoneage` — repo (git pull uuendab)
- `~/.cloudflared/` — `cert.pem`, tunneli credentials JSON, `config.yml` (EI ole gitis, sisaldab saladusi)
- `docker-compose.override.yml` — avab pordi 8125 LAN-i ja lisab `cloudflared` teenuse
- `.env` — `ADMIN_KEY=...` raporti jaoks
- Tunnel: `wintercount` (id `10644ad7-9b8a-497d-9243-9f8d491b09b7`)

## Igapäevane kasutus
```bash
ssh anc@kl-nuc
cd ~/stoneage
git pull && docker compose up -d --build game    # uus versioon välja
docker compose ps                                 # seis
docker compose logs -f cloudflared                # tunneli logi
docker compose exec game node server.js report    # testiraport
```

## Aadressid
- Avalik: https://thewintercount.com ja https://www.thewintercount.com
- Kohalik/tailnet: http://kl-nuc:8125
- Raport veebist: `https://thewintercount.com/api/report?key=$ADMIN_KEY`

## Kui midagi katki
- Sait ei vasta, aga `http://kl-nuc:8125` töötab → tunnel maas: `docker compose restart cloudflared`
- Cloudflare'i DNS-kirjed peavad olema **proxied (oranž pilv)** — `cfargotunnel.com` ei ole
  avalikult resolvitav, DNS-only režiimis sait ei tööta
- Telemeetria on Docker volume'is `stoneage_game-data`; varundus: `docker run --rm -v stoneage_game-data:/d -v $PWD:/b alpine tar czf /b/telemetry-backup.tgz /d`
