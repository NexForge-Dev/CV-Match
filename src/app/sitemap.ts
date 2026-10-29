import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/signup", "/privacy", "/terms", "/legal"].map((path) => ({ url: `${APP_URL}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.5 }));
}
