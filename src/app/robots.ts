import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/privacy", "/terms", "/legal"], disallow: ["/api/", "/auth/", "/dashboard", "/new", "/resumes", "/analyses", "/jobs", "/documents", "/profile", "/billing", "/account", "/admin"] },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
