import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEALROOM_MCP = {
  type: "url" as const,
  url: "https://mcp.dealroom.co/sse",
  name: "dealroom",
  authorization_token: process.env.API_DEALROOM,
};

// Fetch recent Nordic Series A+ rounds and return as structured JSON
export async function fetchNordicRounds(): Promise<NordicRound[]> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    mcp_servers: [DEALROOM_MCP],
    messages: [
      {
        role: "user",
        content: `Use the Dealroom MCP to find the 20 most recent funding rounds in Denmark, Sweden, Norway, and Finland where the round type is Series A, Series B, Series C, Series D, or Growth. Sort by date descending.

Return ONLY a JSON array with no markdown, matching this structure:
[{
  "id": "dealroom_round_id",
  "date": "YYYY-MM-DD",
  "company_name": "string",
  "company_id": "dealroom_uuid",
  "company_website": "string or null",
  "company_sector": "string",
  "company_hq": "string",
  "company_tagline": "string or null",
  "company_employees": number or null,
  "round": "SERIES A",
  "amount_m": "$12.5M or Undisclosed",
  "investors": "Investor A, Investor B"
}]`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "[]";
  return JSON.parse(text) as NordicRound[];
}

// Natural language company search
export async function searchCompanies(query: string): Promise<NordicRound[]> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    mcp_servers: [DEALROOM_MCP],
    messages: [
      {
        role: "user",
        content: `Use the Dealroom MCP to search for companies matching this description: "${query}"
Limit results to companies headquartered in Denmark, Sweden, Norway, or Finland. Return up to 20 results.

Return ONLY a JSON array with no markdown, matching this structure:
[{
  "id": "dealroom_uuid",
  "date": null,
  "company_name": "string",
  "company_id": "dealroom_uuid",
  "company_website": "string or null",
  "company_sector": "string",
  "company_hq": "string",
  "company_tagline": "string or null",
  "company_employees": number or null,
  "round": "latest round type or null",
  "amount_m": "latest round amount or Unknown",
  "investors": "lead investors or Unknown"
}]`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "[]";
  return JSON.parse(text) as NordicRound[];
}

// Generate AI banking brief for a single company
export async function generateBrief(company: BriefInput): Promise<BriefOutput> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    mcp_servers: [DEALROOM_MCP],
    messages: [
      {
        role: "user",
        content: `Use the Dealroom MCP to look up "${company.company_name}" (Dealroom ID: ${company.company_id ?? "unknown"}) and fetch their funding history and growth analytics.

Then, acting as a senior relationship manager at a Nordic growth bank, produce a concise banking intelligence brief.

The company is ${company.is_existing_client ? "AN EXISTING CLIENT — focus on upsell opportunities" : "NOT YET A CLIENT — focus on new business approach"}.

Return ONLY a JSON object with no markdown:
{
  "summary": "2-sentence company overview for a banker",
  "why_now": "1-2 sentences on why to approach RIGHT NOW",
  "recommended_products": ["product1", "product2"],
  "action": "Specific next step for the banker",
  "relevance_score": <1-10 integer>
}

Choose recommended_products only from: ["Business Account", "FX Hedging", "Venture Debt", "Credit Facility", "Treasury Management", "Trade Finance", "Acquisition Financing", "IPO Advisory"]`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  return JSON.parse(text) as BriefOutput;
}

export interface NordicRound {
  id: string;
  date: string | null;
  company_name: string;
  company_id: string;
  company_website: string | null;
  company_sector: string;
  company_hq: string;
  company_tagline: string | null;
  company_employees: number | null;
  round: string;
  amount_m: string;
  investors: string;
}

export interface BriefInput {
  company_name: string;
  company_id: string | null;
  is_existing_client: boolean;
}

export interface BriefOutput {
  summary: string;
  why_now: string;
  recommended_products: string[];
  action: string;
  relevance_score: number;
}
