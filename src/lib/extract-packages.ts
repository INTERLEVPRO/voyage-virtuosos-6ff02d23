import type { TravelPackage, PackagesPayload } from "@/types/travel";

const JSON_BLOCK_RE = /```json\s*([\s\S]*?)```/i;

export function extractPackages(text: string): TravelPackage[] | null {
  const m = text.match(JSON_BLOCK_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]) as PackagesPayload;
    if (parsed?.status === "packages_ready" && Array.isArray(parsed.packages)) {
      return parsed.packages;
    }
  } catch {
    return null;
  }
  return null;
}

export function stripJsonBlock(text: string): string {
  return text.replace(JSON_BLOCK_RE, "").trim();
}
