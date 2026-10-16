import type { MetadataRoute } from "next";

/** Lets people install Life on Paper to their home screen, opening straight to Today. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life on Paper",
    short_name: "Life on Paper",
    description: "A few lines a day. A book of your life.",
    id: "/today",
    start_url: "/today?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f1e7",
    theme_color: "#f7f1e7",
    categories: ["lifestyle", "books", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Write today", short_name: "Write", url: "/today?write=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Speak a memory", short_name: "Speak", url: "/today?speak=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
