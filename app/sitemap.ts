import type { MetadataRoute } from "next";

const BASE = "https://lifeonpaper.app";

/**
 * The journal itself lives at /today and is per-person, so only the public
 * pages belong in a sitemap. /api is disallowed outright.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: BASE, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/sample`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
