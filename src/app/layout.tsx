import type { Metadata } from "next";
import "./globals.css";
import "./publishing.css";
import "./discovery.css";
import "./social.css";
import "./landing.css";
import "./community.css";

export const metadata: Metadata = {
  title: { default: "ARK", template: "%s · ARK" },
  description:
    "Discover completed projects, meet the developers behind them, and build a portfolio of the work you’ve shipped.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
