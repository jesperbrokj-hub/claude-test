import axios from "axios";

const BASE_URL = "https://api.dealroom.co/api/v1";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.DEALROOM_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export interface FundingRound {
  id: string;
  date: string;
  amount_usd: number | null;
  round: string;
  company: {
    name: string;
    id: string;
    website: string | null;
    hq_locations: string[];
    industries: string[];
    tagline: string | null;
    employees: number | null;
  };
  investors: { name: string; id: string }[];
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  tagline: string | null;
  industries: string[];
  hq_locations: string[];
  employees: number | null;
  total_funding_usd: number | null;
  growth_stage: string | null;
  founded: string | null;
}

// Fetch recent funding rounds in the Nordics, Series A and above
export async function getRecentNordicRounds(limit = 25): Promise<FundingRound[]> {
  const response = await client.post("/funding-rounds/search", {
    filter: {
      locations: ["Denmark", "Sweden", "Norway", "Finland", "Iceland"],
      rounds: ["SERIES A", "SERIES B", "SERIES C", "SERIES D", "SERIES E", "GROWTH", "PRE IPO"],
      date_range: {
        // Last 90 days
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    },
    limit,
    sort: "date",
  });
  return response.data.items ?? [];
}

// Search companies by natural language query
export async function searchCompaniesByQuery(query: string, limit = 20): Promise<Company[]> {
  const response = await client.post("/companies/search", {
    keyword: query,
    keyword_type: "semantic",
    filter: {
      locations: ["Denmark", "Sweden", "Norway", "Finland", "Iceland"],
      growth_stages: ["early stage", "mid stage", "late stage"],
    },
    limit,
  });
  return response.data.items ?? [];
}

// Get a single company's full profile by Dealroom ID
export async function getCompanyProfile(companyId: string): Promise<Company & { fundings: FundingRound[] }> {
  const [profileRes, fundingRes] = await Promise.all([
    client.get(`/companies/${companyId}`),
    client.get(`/companies/${companyId}/funding-rounds`),
  ]);
  return {
    ...profileRes.data,
    fundings: fundingRes.data.items ?? [],
  };
}
