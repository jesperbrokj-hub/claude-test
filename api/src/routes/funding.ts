import { Router, Request, Response } from "express";
import { getRecentNordicRounds } from "../lib/dealroom";
import { isKnownClient } from "../lib/supabase";

export const searchFundingRounds = Router();

// GET /api/funding/recent
// Returns recent Nordic funding rounds enriched with known-client flag
searchFundingRounds.get("/recent", async (_req: Request, res: Response) => {
  try {
    const rounds = await getRecentNordicRounds(25);

    const enriched = await Promise.all(
      rounds.map(async (round) => {
        const known = await isKnownClient(round.company.name);
        return {
          id: round.id,
          date: round.date,
          amount_usd: round.amount_usd,
          amount_m: round.amount_usd ? `$${(round.amount_usd / 1_000_000).toFixed(1)}M` : "Undisclosed",
          round: round.round,
          company_id: round.company.id,
          company_name: round.company.name,
          company_website: round.company.website,
          company_hq: round.company.hq_locations?.join(", ") ?? "",
          company_sector: round.company.industries?.join(", ") ?? "",
          company_tagline: round.company.tagline,
          company_employees: round.company.employees,
          investors: round.investors?.map((i) => i.name).join(", ") ?? "",
          is_existing_client: known,
          client_status: known ? "Existing Client" : "New Prospect",
        };
      })
    );

    res.json({ data: enriched, count: enriched.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch funding rounds" });
  }
});
