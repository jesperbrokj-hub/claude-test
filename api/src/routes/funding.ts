import { Router, Request, Response } from "express";
import { fetchNordicRounds } from "../lib/claude";
import { isKnownClient } from "../lib/supabase";

export const searchFundingRounds = Router();

// GET /api/funding/recent
searchFundingRounds.get("/recent", async (_req: Request, res: Response) => {
  try {
    const rounds = await fetchNordicRounds();

    const enriched = await Promise.all(
      rounds.map(async (r) => {
        const known = await isKnownClient(r.company_name);
        return {
          ...r,
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
