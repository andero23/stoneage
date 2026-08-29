# Juurutus (thewintercount.com)

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
