import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface CompanyBriefInput {
  name: string;
  tagline: string | null;
  industries: string[];
  hq_locations: string[];
  employees: number | null;
  total_funding_usd: number | null;
  growth_stage: string | null;
  latest_round: {
    round: string;
    amount_usd: number | null;
    date: string;
    investors: string[];
  } | null;
  is_existing_client: boolean;
}

export interface CompanyBriefOutput {
  summary: string;
  why_now: string;
  recommended_products: string[];
  action: string;
  relevance_score: number; // 1-10
}

export async function generateCompanyBrief(company: CompanyBriefInput): Promise<CompanyBriefOutput> {
  const prompt = `You are a senior relationship manager at a Nordic growth bank. Analyse this company and produce a concise banking intelligence brief.

Company: ${company.name}
Tagline: ${company.tagline ?? "N/A"}
Sector: ${company.industries.join(", ")}
HQ: ${company.hq_locations.join(", ")}
Employees: ${company.employees ?? "Unknown"}
Total funding: ${company.total_funding_usd ? `$${(company.total_funding_usd / 1_000_000).toFixed(1)}M` : "Unknown"}
Growth stage: ${company.growth_stage ?? "Unknown"}
Latest round: ${
    company.latest_round
      ? `${company.latest_round.round} — $${((company.latest_round.amount_usd ?? 0) / 1_000_000).toFixed(1)}M on ${company.latest_round.date} — Lead investors: ${company.latest_round.investors.join(", ")}`
      : "No recent round"
  }
Existing client: ${company.is_existing_client ? "YES — focus on upsell" : "NO — new prospect"}

Respond with a JSON object matching this exact structure:
{
  "summary": "2-sentence company overview for a banker who has never heard of them",
  "why_now": "1-2 sentences on why this company is relevant to approach RIGHT NOW",
  "recommended_products": ["product1", "product2"],
  "action": "Specific next action for the banker (e.g. 'Request intro via [investor name]', 'Cold outreach to CFO')",
  "relevance_score": <integer 1-10 where 10 = must contact this week>
}

Choose recommended_products only from: ["Business Account", "FX Hedging", "Venture Debt", "Credit Facility", "Treasury Management", "Trade Finance", "Acquisition Financing", "IPO Advisory"]

Return only valid JSON, no markdown.`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  return JSON.parse(text) as CompanyBriefOutput;
}
