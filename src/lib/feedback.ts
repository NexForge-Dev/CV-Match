/** Shared by the balloon, the API and the admin screen. */
export const FEEDBACK_KINDS = ["suggestion", "problem"] as const;
export const FEEDBACK_STATUSES = ["new", "reviewing", "resolved"] as const;
export const FEEDBACK_MAX = 4000;
export const FEEDBACK_PER_HOUR = 10;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

const MAX_PAGE = 500;

/** Path only: drops the query string and fragment (they can hold tokens), and anything that is not a local path. */
export function cleanPage(raw: string): string {
  const path = raw.split(/[?#]/, 1)[0].trim();
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\s\p{Cc}]/u.test(path)) return "";
  return path.slice(0, MAX_PAGE);
}
