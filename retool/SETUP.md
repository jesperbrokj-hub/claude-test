# GrowthDeal — Retool Setup Guide

## Step 1: Supabase

1. Go to https://supabase.com → New project → name it `growthdeal`
2. Copy your **Project URL** and **service_role key** (Settings → API)
3. Open the SQL editor → paste the contents of `../supabase/schema.sql` → Run

## Step 2: Deploy the API

Deploy to Railway (recommended — free tier available):

1. Go to https://railway.app → New project → Deploy from GitHub repo
2. Set root directory to `api/`
3. Add environment variables from `.env.example`
4. Railway gives you a public URL like `https://growthdeal-api.railway.app`

## Step 3: Connect Retool to your API

1. In Retool → Resources → New Resource → REST API
2. Name: `GrowthDeal API`
3. Base URL: `https://your-railway-url.railway.app`
4. No auth needed (it's internal)

## Step 4: Connect Retool to Supabase

1. In Retool → Resources → New Resource → Supabase
2. Enter your Supabase URL and service_role key

---

## Retool App: Deal Feed

### Query 1 — Fetch recent rounds (name it `fetchRounds`)
- Resource: GrowthDeal API
- Method: GET
- URL path: `/api/funding/recent`
- Run on page load: YES

### Table component
- Data source: `{{ fetchRounds.data.data }}`
- Columns to show:
  - `date` → Date
  - `company_name` → Company
  - `round` → Stage
  - `amount_m` → Amount
  - `company_sector` → Sector
  - `company_hq` → HQ
  - `investors` → Investors
  - `client_status` → Client Status (tag column: green = Existing Client, blue = New Prospect)

### Row click → AI Brief panel

Add a Drawer or Modal component. Inside it:

**Query 2 — Get AI brief (name it `getBrief`)**
- Resource: GrowthDeal API
- Method: POST
- URL path: `/api/brief`
- Body (JSON):
```json
{
  "name": "{{ table1.selectedRow.data.company_name }}",
  "tagline": "{{ table1.selectedRow.data.company_tagline }}",
  "industries": ["{{ table1.selectedRow.data.company_sector }}"],
  "hq_locations": ["{{ table1.selectedRow.data.company_hq }}"],
  "employees": "{{ table1.selectedRow.data.company_employees }}",
  "total_funding_usd": null,
  "growth_stage": null,
  "latest_round": {
    "round": "{{ table1.selectedRow.data.round }}",
    "amount_usd": null,
    "date": "{{ table1.selectedRow.data.date }}",
    "investors": ["{{ table1.selectedRow.data.investors }}"]
  }
}
```
- Run when: triggered (not on load)
- Trigger: table1 row click event → `getBrief.trigger()`

**Display in drawer:**
- Text: `{{ getBrief.data.summary }}`
- Text: `Why now: {{ getBrief.data.why_now }}`
- Tag list: `{{ getBrief.data.recommended_products }}`
- Text: `Action: {{ getBrief.data.action }}`
- Stat: `Relevance: {{ getBrief.data.relevance_score }}/10`
- Badge: `{{ getBrief.data.client_status }}`

---

## Retool App: Natural Language Search

### Text input component (name it `searchInput`)
- Placeholder: "e.g. B2B SaaS companies expanding to US"

### Button: Search

### Query 3 — Search companies (name it `searchCompanies`)
- Resource: GrowthDeal API
- Method: GET
- URL path: `/api/companies/search`
- Query params: `q = {{ searchInput.value }}`
- Run when: triggered
- Trigger: Search button onClick → `searchCompanies.trigger()`

### Results table
- Same columns as deal feed table
- Data source: `{{ searchCompanies.data.data }}`

---

## Retool App: CRM Sync

### File picker component (CSV upload)

### Query 4 — Sync clients (name it `syncClients`)
- Resource: GrowthDeal API  
- Method: POST
- URL path: `/api/clients/sync`
- Body: parse the CSV and pass as:
```json
{
  "clients": "{{ Papa.parse(filePicker1.value[0].base64Data, {header: true}).data }}"
}
```

> CSV format expected: columns `name` (required), `crm_id` (optional)

---

## Tips

- Set up a **Scheduled Job** in Retool to run `fetchRounds` every morning at 08:00 and send results to your team's Slack channel via Retool's Slack integration
- Use Retool's **Notifications** to ping a banker when a high relevance score (≥8) company appears in the feed
- Add a **"Save to Pipeline"** button on each row that inserts the company into the `saved_companies` Supabase table
