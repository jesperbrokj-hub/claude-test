import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { marketShareRouter } from "./routes/marketShare";
import { onboardingRouter } from "./routes/onboarding";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "market-share-api" });
});

app.use("/api/market-share", marketShareRouter);
app.use("/api/onboarding", onboardingRouter);

app.use(express.static(path.join(__dirname, "..", "..", "web")));

app.listen(PORT, () => {
  console.log(`Market-share API running on port ${PORT}`);
});
