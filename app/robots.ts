import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The journal is personal, the endpoints cost money, and the auth
        // callback is not a page.
        disallow: ["/today", "/api/", "/auth/"],
      },
    ],
    sitemap: "https://lifeonpaper.app/sitemap.xml",
    host: "https://lifeonpaper.app",
  };
}
