import { MonthKey, toStatbankTid } from "./months";
import { TtlCache } from "./cache";

const BASE_URL = "https://api.statbank.dk/v1/data";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — closed months never change, open ones update infrequently

const konkeumCache = new TtlCache<number | null>(CACHE_TTL_MS);
const nyrvi2Cache = new TtlCache<number | null>(CACHE_TTL_MS);

/**
 * Parses a single numeric value out of a StatBank CSV response. StatBank
 * mixes Danish (comma decimal, dot thousands) and English (dot decimal,
 * comma thousands) formatting depending on `lang`; this handles both.
 */
function parseStatbankNumber(raw: string): number | null {
  let s = raw.trim().replace(/^"|"$/g, "");
  if (!s || s === ".." || s === "-") return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal separator.
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  // dot-only (or neither): already valid JS number syntax

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Extracts the value from the last column of the last data row of a StatBank CSV response. */
function parseStatbankCsv(csv: string): number | null {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const dataRow = lines[lines.length - 1];
  const cols = dataRow.split(delimiter);
  return parseStatbankNumber(cols[cols.length - 1]);
}

async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`StatBank request failed (${res.status}): ${url}`);
  }
  return res.text();
}

/**
 * KONKEUM: raw monthly count of newly registered ("reelle") companies.
 * Covers 2009 through December 2025.
 */
export async function fetchKonkeum(month: MonthKey): Promise<number | null> {
  return konkeumCache.getOrLoad(month, async () => {
    const url = `${BASE_URL}/KONKEUM/CSV?lang=en&INDIKATOR=BURE&BRANCHE07=BTSXO_S94&Tid=${toStatbankTid(month)}`;
    const csv = await fetchCsv(url);
    return parseStatbankCsv(csv);
  });
}

/**
 * NYRVI2: index of newly registered companies (2022=100). Covers January
 * 2015 through the current month, used to scale KONKEUM's last actual
 * year forward once raw counts stop being published.
 */
export async function fetchNyrvi2(month: MonthKey): Promise<number | null> {
  return nyrvi2Cache.getOrLoad(month, async () => {
    const url = `${BASE_URL}/NYRVI2/CSV?lang=en&VIRKF1=TOT1&Tid=${toStatbankTid(month)}`;
    const csv = await fetchCsv(url);
    return parseStatbankCsv(csv);
  });
}
