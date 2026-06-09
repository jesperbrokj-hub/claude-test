import { Router, Request, Response } from "express";
import { generateBrief } from "../lib/claude";
import { isKnownClient } from "../lib/supabase";

export const getCompanyBrief = Router();

// POST /api/brief
// Body: { company_name, company_id }
getCompanyBrief.post("/", async (req: Request, res: Response) => {
  const { company_name, company_id } = req.body;

  if (!company_name) {
    res.status(400).json({ error: "company_name is required" });
    return;
  }

  try {
    const is_existing_client = await isKnownClient(company_name);
    const brief = await generateBrief({ company_name, company_id: company_id ?? null, is_existing_client });

    res.json({
      company: company_name,
      is_existing_client,
      client_status: is_existing_client ? "Existing Client" : "New Prospect",
      ...brief,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate brief" });
  }
});
