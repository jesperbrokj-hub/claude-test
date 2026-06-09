import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { searchFundingRounds } from "./routes/funding";
import { getCompanyBrief } from "./routes/brief";
import { syncClients, getKnownClients } from "./routes/clients";
import { searchCompaniesRoute } from "./routes/companies";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "growthdeal-api" });
});

// Routes
app.use("/api/funding", searchFundingRounds);
app.use("/api/brief", getCompanyBrief);
app.use("/api/clients", syncClients);
app.use("/api/clients", getKnownClients);
app.use("/api/companies", searchCompaniesRoute);

app.listen(PORT, () => {
  console.log(`GrowthDeal API running on port ${PORT}`);
});
