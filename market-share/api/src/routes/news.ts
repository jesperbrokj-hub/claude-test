import { Router } from "express";
import { fetchNews } from "../lib/news";

export const newsRouter = Router();

// GET /api/news?limit=8
newsRouter.get("/", async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  try {
    const articles = await fetchNews(limit);
    res.json({ articles });
  } catch {
    res.status(502).json({ error: "Kunne ikke hente nyheder lige nu", articles: [] });
  }
});
