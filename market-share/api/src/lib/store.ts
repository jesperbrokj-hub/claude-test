import fs from "fs";
import path from "path";
import { MonthKey } from "./months";

const DATA_FILE = path.join(__dirname, "..", "..", "data", "onboarding.json");

type OnboardingData = Record<MonthKey, number>;

function readAll(): OnboardingData {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return {};
  }
}

function writeAll(data: OnboardingData): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function getOnboarding(month: MonthKey): number | null {
  const data = readAll();
  return data[month] ?? null;
}

export function getAllOnboarding(): OnboardingData {
  return readAll();
}

export function setOnboarding(month: MonthKey, value: number): void {
  const data = readAll();
  data[month] = value;
  writeAll(data);
}

export function deleteOnboarding(month: MonthKey): void {
  const data = readAll();
  delete data[month];
  writeAll(data);
}
