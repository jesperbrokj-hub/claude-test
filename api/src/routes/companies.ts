import { Router, Request, Response } from "express";
import { searchCompanies } from "../lib/claude";
import { isKnownClient } from "../lib/supabase";

export const searchCompaniesRoute = Router();

// GET /api/companies/search?q=b2b+saas+climate
searchCompaniesRoute.get("/search", async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: "q parameter is required" });
    return;
  }

  try {
    const companies = await searchCompanies(query);

    const enriched = await Promise.all(
      companies.map(async (c) => {
        const known = await isKnownClient(c.company_name);
        return {
          ...c,
          is_existing_client: known,
          client_status: known ? "Existing Client" : "New Prospect",
        };
      })
    );

    res.json({ data: enriched, count: enriched.length, query });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search companies" });
  }
});
