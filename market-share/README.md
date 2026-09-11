# Markedsandel-dashboard

Viser bankens andel af det samlede marked for nystiftede virksomheder:

```
Markedsandel (%) = Nye bankkunder onboardet med CVR-nummer < 1 måned gammel
                    / Nye CVR-numre stiftet i samme periode
```

- **Tæller** (onboarding-tal): indtastes manuelt i dashboardet hver måned.
- **Nævner** (nye CVR-numre): hentes automatisk fra Danmarks Statistiks
  offentlige StatBank API (`api.statbank.dk`) — ingen login eller API-nøgle
  krævet.

## Sådan virker nævneren

- **≤ december 2025**: rå, faktiske tal fra tabellen `KONKEUM` (DST's
  "reelle virksomhed"-definition).
- **≥ januar 2026** (KONKEUM opdateres ikke længere): estimeret ved at
  skalere samme måned året før med udviklingen i indekset `NYRVI2`:

  ```
  Estimat(måned, år) = Faktisk(måned, år-1) × [Indeks(måned, år) / Indeks(måned, år-1)]
  ```

Dashboardet markerer tydeligt hvilke måneder der er **Faktisk** og hvilke
der er **Estimat** (badge i tabellen, stiplet linje i grafen).

**Kendt begrænsning:** estimatet kræver et faktisk KONKEUM-tal fra samme
måned året før, så det virker for hele 2026 (basisår 2025 er faktisk) —
men ikke for 2027+, hvor basisåret selv ville være et estimat. Det er en
bevidst afgrænsning for nu (dashboardet er en midlertidig løsning indtil
Datafordeler-sporet evt. genoptages, jf. det oprindelige brief), ikke en
fejl.

Se det oprindelige brief for baggrund, kildevalidering og det parkerede
Datafordeler-spor: [Google Doc](https://docs.google.com/document/d/12C7snxQUwKCo4-ELJw5MCBxn2Rq_H8K4_6qmQEoVpAA/edit).

## Struktur

```
market-share/
  api/    Express/TypeScript-server: StatBank-klient, estimatlogik,
          manuel onboarding-lager (data/onboarding.json), REST-API.
  web/    Statisk frontend (vanilla HTML/JS + Chart.js): tabel og graf.
```

`api/src/index.ts` server også `web/` statisk, så hele dashboardet kører
fra én proces.

## Kør lokalt

```bash
cd market-share/api
npm install
cp .env.example .env   # valgfrit, default port er 3002
npm run dev
```

Åbn <http://localhost:3002>.

## API

- `GET /api/market-share?months=12` — trailing N måneder (eller
  `?from=2025-01&to=2026-06` for et eksplicit interval). Returnerer for
  hver måned: `newCvr`, `source` (`actual` / `estimate` / `unavailable`),
  `onboarded`, `marketSharePct`.
- `POST /api/onboarding` — `{ "month": "2026-05", "onboarded": 320 }`,
  gemmer det manuelle onboarding-tal for måneden i
  `api/data/onboarding.json`.

## Kendt begrænsning i denne udviklingssession

Denne build-container kan ikke nå `api.statbank.dk` — organisationens
udgående netværkspolitik blokerer værten (403 på CONNECT). Backend-koden
følger StatBank's dokumenterede kald og CSV-format nøje, og
serverlogik/validering/persistens er testet lokalt end-to-end, men selve
StatBank-hentningen er **ikke** blevet verificeret mod et rigtigt svar. Når
appen kører et sted med normal internetadgang (fx efter deploy), bør du
tjekke et par måneder i tabellen mod kendte tal — særligt
CSV-talformatet (`api/src/lib/statbank.ts` → `parseStatbankNumber`), som
er skrevet defensivt til at håndtere både dansk og engelsk talformatering,
men ikke bekræftet mod en live respons.

## Deploy

Dashboardet er bevidst kun sat op til lokal brug: manuelle
onboarding-tal gemmes i en flad JSON-fil på disken
(`api/data/onboarding.json`), hvilket kun er robust, når appen kører på
en maskine I selv kontrollerer (fx en kontor-PC eller intern server) —
ikke på ephemeral hosting som Railways standard-filsystem, hvor en
redeploy kan slette filen. Hvis I senere vil deploye det et sted med
et flygtigt filsystem, skal onboarding-lageret flyttes til en rigtig
database (fx Supabase, som allerede er sat op til GrowthDeal-projektet
i denne repo) først.
