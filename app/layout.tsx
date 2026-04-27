import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  title: "SafeSpend AI | Know What You Can Spend Before You Spend It",
  description:
    "SafeSpend AI helps you track income, expenses, bills, budgets, reports, and safe-to-spend decisions before money disappears.",
  metadataBase: new URL("https://safespend-ai-opyqrz4b0-carverbobo-5377s-projects.vercel.app"),
  openGraph: {
    title: "SafeSpend AI",
    description:
      "Know what you can spend before you spend it with AI-powered spending guidance.",
    url: "https://safespend-ai-opyqrz4b0-carverbobo-5377s-projects.vercel.app",
    siteName: "SafeSpend AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
	<GoogleAnalytics />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}