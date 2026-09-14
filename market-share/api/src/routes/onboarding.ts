import { Router } from "express";
import { deleteOnboarding, setOnboarding } from "../lib/store";

export const onboardingRouter = Router();

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// POST /api/onboarding  { "month": "2026-05", "onboarded": 320 }
onboardingRouter.post("/", async (req, res) => {
  const { month, onboarded } = req.body ?? {};

  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return res.status(400).json({ error: "month must be formatted YYYY-MM" });
  }
  if (typeof onboarded !== "number" || !Number.isInteger(onboarded) || onboarded < 0) {
    return res.status(400).json({ error: "onboarded must be a non-negative integer" });
  }

  try {
    await setOnboarding(month, onboarded);
    res.json({ month, onboarded });
  } catch (err) {
    console.error("POST /api/onboarding failed:", err);
    res.status(502).json({ error: "Kunne ikke gemme lige nu" });
  }
});

// DELETE /api/onboarding/2026-05  — clear a month's manually entered number
onboardingRouter.delete("/:month", async (req, res) => {
  const { month } = req.params;

  if (!MONTH_RE.test(month)) {
    return res.status(400).json({ error: "month must be formatted YYYY-MM" });
  }

  try {
    await deleteOnboarding(month);
    res.json({ month, onboarded: null });
  } catch (err) {
    console.error("DELETE /api/onboarding failed:", err);
    res.status(502).json({ error: "Kunne ikke slette lige nu" });
  }
});
