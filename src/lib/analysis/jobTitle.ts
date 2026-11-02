/** Without a title a job shows as "—" everywhere: use the ad's first line (usually the role), shortened. */
export function titleFromAd(rawText: string): string {
  const first =
    rawText
      .split(/\r?\n/)
      .map((l) => l.replace(/^[#*•\-\s]+/, "").trim())
      .find(Boolean) ?? "";
  return first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
}
