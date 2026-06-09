import { Router, Request, Response } from "express";
import { upsertKnownClients, getAllKnownClients } from "../lib/supabase";

export const syncClients = Router();
export const getKnownClients = Router();

// POST /api/clients/sync
// Body: { clients: [{ name: string, crm_id?: string }] }
// Upserts client list from CRM CSV export
syncClients.post("/sync", async (req: Request, res: Response) => {
  const { clients } = req.body;

  if (!Array.isArray(clients) || clients.length === 0) {
    res.status(400).json({ error: "clients array is required" });
    return;
  }

  try {
    await upsertKnownClients(clients);
    res.json({ message: `Synced ${clients.length} clients`, count: clients.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync clients" });
  }
});

// GET /api/clients
// Returns all known clients
getKnownClients.get("/", async (_req: Request, res: Response) => {
  try {
    const clients = await getAllKnownClients();
    res.json({ data: clients, count: clients.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});
