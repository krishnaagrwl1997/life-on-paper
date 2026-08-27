/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/system/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lifeonpaper.app"),
  title: "Life on Paper — Your life, beautifully remembered",
  description:
    "Speak, share, and shape the moments of your life into a memoir you will want to return to.",
  openGraph: {
    title: "Life on Paper",
    description: "Your life, beautifully remembered.",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "Life on Paper — Your life, beautifully remembered." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Life on Paper",
    description: "Your life, beautifully remembered.",
    images: ["/og.png"],
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
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
