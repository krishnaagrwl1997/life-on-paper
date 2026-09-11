/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/system/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lifeonpaper.app"),
  title: "Life on Paper — Write 90 seconds a day. Get a book of your life.",
  description:
    "A journal that treats your writing as the story of a life. Every entry is quietly polished, filed into the people and eras it belongs to, and woven into chapters — then printed as a book you can hold.",
  openGraph: {
    type: "website",
    siteName: "Life on Paper",
    url: "/",
    title: "Write 90 seconds a day. Get a book of your life.",
    description:
      "Every entry quietly polished, filed into the people and eras it belongs to, and woven into chapters — then printed as a book you can hold.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Life on Paper — write 90 seconds a day, get a book of your life.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Write 90 seconds a day. Get a book of your life.",
    description:
      "Every entry quietly polished, filed into the people and eras it belongs to, and woven into chapters — then printed as a book you can hold.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
