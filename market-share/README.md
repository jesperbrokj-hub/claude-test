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
  supabase-schema.sql   Tabellen til det manuelle onboarding-lager.
  api/
    src/    Express/TypeScript-server: StatBank-klient, estimatlogik,
            manuel onboarding-lager (Supabase), REST-API.
    web/    Statisk frontend (vanilla HTML/JS + Chart.js): tabel og graf.
```

`api/src/index.ts` server også `web/` statisk, så hele dashboardet kører
fra én proces. `web/` ligger bevidst *inde i* `api/` (ikke ved siden af)
— platforme som Railway, hvor man peger en "Root Directory" på `api/`,
deployer kun det der ligger inden i den mappe.

## Kør lokalt

```bash
cd market-share/api
npm install
cp .env.example .env   # udfyld SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (se "Onboarding-lager" nedenfor)
npm run dev
```

Åbn <http://localhost:3002>.

## API

- `GET /api/market-share?months=12` — trailing N måneder (eller
  `?from=2025-01&to=2026-06` for et eksplicit interval). Returnerer for
  hver måned: `newCvr`, `source` (`actual` / `estimate` / `unavailable`),
  `onboarded`, `marketSharePct`.
- `POST /api/onboarding` — `{ "month": "2026-05", "onboarded": 320 }`,
  gemmer det manuelle onboarding-tal for måneden i Supabase.
- `GET /api/news?limit=8` — nyhedsartikler om nye CVR-numre/nystiftede
  virksomheder, via Google News' offentlige RSS-søgning (ingen API-nøgle
  krævet). Bedste-forsøg søgning, ikke en kurateret eller garanteret
  komplet liste — se `api/src/lib/news.ts`.

## Kendt begrænsning i denne udviklingssession

Denne build-container kan ikke nå `api.statbank.dk` eller
`news.google.com` — organisationens udgående netværkspolitik blokerer
begge (403 på CONNECT). Backend-koden følger begge kilders dokumenterede
format nøje, og serverlogik/validering/persistens/graceful-fejlhåndtering
er testet lokalt end-to-end, men selve hentningen er **ikke** blevet
verificeret mod et rigtigt svar for nogen af dem. Når appen kører et sted
med normal internetadgang (som hos dig lokalt), bør du tjekke:
- et par måneder i tabellen mod kendte StatBank-tal — særligt
  CSV-talformatet (`api/src/lib/statbank.ts` → `parseStatbankNumber`),
  som er skrevet defensivt til at håndtere både dansk og engelsk
  talformatering, men ikke bekræftet mod en live respons.
- at nyhedslisten (`api/src/lib/news.ts`) rent faktisk viser relevante
  artikler — RSS-parsingen er skrevet efter Google News' dokumenterede
  format, men søgeordene (`nye CVR-numre`, `nystiftede virksomheder`
  osv.) er ikke afprøvet mod rigtige resultater endnu.

## Onboarding-lager (Supabase)

De manuelle onboarding-tal gemmes i Supabase i stedet for en lokal fil
— nødvendigt for at de overlever en redeploy på Railway (eller enhver
anden hosting med et flygtigt filsystem).

1. Opret en tabel: kør SQL'en i [`supabase-schema.sql`](./supabase-schema.sql)
   i dit Supabase-projekts SQL editor. Det kan enten være et nyt
   Supabase-projekt eller samme projekt som GrowthDeal bruger i denne
   repo — det er bare en ny, urelateret tabel.
2. Under Supabase-projektets **Settings → API**, find **Project URL** og
   **service_role key** (ikke `anon`-nøglen — service_role har skriverettigheder).
3. Sæt dem som miljøvariabler:
   - Lokalt: i `api/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
   - På Railway: Settings → Variables på servicen

Uden disse variabler starter serveren stadig (health-check virker),
men `/api/market-share` viser ingen onboarding-tal, og
`/api/onboarding` fejler med en tydelig fejlmeddelelse i stedet for at
crashe.

## Deploy

Deployet til Railway (Root Directory: `market-share/api`, branch:
`claude/friendly-ptolemy-eiahec`) — se ovenstående Supabase-opsætning
først, ellers mister redeploys alle indtastede tal.
