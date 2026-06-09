import { Router, Request, Response } from "express";
import { searchCompaniesByQuery } from "../lib/dealroom";
import { isKnownClient } from "../lib/supabase";

export const searchCompanies = Router();

// GET /api/companies/search?q=b2b+saas+climate
// Natural language company search, Nordic-scoped, with client flag
searchCompanies.get("/search", async (req: Request, res: Response) => {
  const query = req.query.q as string;

  if (!query) {
    res.status(400).json({ error: "q parameter is required" });
    return;
  }

  try {
    const companies = await searchCompaniesByQuery(query, 20);

    const enriched = await Promise.all(
      companies.map(async (company) => {
        const known = await isKnownClient(company.name);
        return {
          ...company,
          is_existing_client: known,
          client_status: known ? "Existing Client" : "New Prospect",
          total_funding_m: company.total_funding_usd
            ? `$${(company.total_funding_usd / 1_000_000).toFixed(1)}M`
            : "Unknown",
          hq: company.hq_locations?.join(", ") ?? "",
          sector: company.industries?.join(", ") ?? "",
        };
      })
    );

    res.json({ data: enriched, count: enriched.length, query });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search companies" });
  }
});
