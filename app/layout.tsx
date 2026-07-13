import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/system/theme-provider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://life-in-books-foundation.subs334079.chatgpt.site"),
  title: "Life In Books — Your life, beautifully remembered",
  description:
    "Speak, share, and shape the moments of your life into a memoir you will want to return to.",
  openGraph: {
    title: "Life In Books",
    description: "Your life, beautifully remembered.",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "Life In Books — Your life, beautifully remembered." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Life In Books",
    description: "Your life, beautifully remembered.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${inter.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
