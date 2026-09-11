import { Router } from "express";
import { setOnboarding } from "../lib/store";

export const onboardingRouter = Router();

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// POST /api/onboarding  { "month": "2026-05", "onboarded": 320 }
onboardingRouter.post("/", (req, res) => {
  const { month, onboarded } = req.body ?? {};

  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: "month must be formatted YYYY-MM" });
  }
  if (typeof onboarded !== "number" || !Number.isInteger(onboarded) || onboarded < 0) {
    return res.status(400).json({ error: "onboarded must be a non-negative integer" });
  }

  setOnboarding(month, onboarded);
  res.json({ month, onboarded });
});
