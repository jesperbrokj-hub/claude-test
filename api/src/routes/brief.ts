import { Router, Request, Response } from "express";
import { generateCompanyBrief, CompanyBriefInput } from "../lib/claude";
import { isKnownClient } from "../lib/supabase";

export const getCompanyBrief = Router();

// POST /api/brief
// Body: company data from the Retool table row
// Returns AI-generated banking intelligence brief
getCompanyBrief.post("/", async (req: Request, res: Response) => {
  const {
    name,
    tagline,
    industries,
    hq_locations,
    employees,
    total_funding_usd,
    growth_stage,
    latest_round,
  } = req.body;

  if (!name) {
    res.status(400).json({ error: "company name is required" });
    return;
  }

  try {
    const is_existing_client = await isKnownClient(name);

    const input: CompanyBriefInput = {
      name,
      tagline: tagline ?? null,
      industries: industries ?? [],
      hq_locations: hq_locations ?? [],
      employees: employees ?? null,
      total_funding_usd: total_funding_usd ?? null,
      growth_stage: growth_stage ?? null,
      latest_round: latest_round ?? null,
      is_existing_client,
    };

    const brief = await generateCompanyBrief(input);

    res.json({
      company: name,
      is_existing_client,
      client_status: is_existing_client ? "Existing Client" : "New Prospect",
      ...brief,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate brief" });
  }
});
