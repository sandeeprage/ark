import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import "./publishing.css";
import "./discovery.css";
import "./social.css";

export const metadata: Metadata = {
  title: { default: "ARK — A home for shipped work", template: "%s · ARK" },
  description:
    "Discover completed projects, meet the developers behind them, and build a portfolio of the work you’ve shipped.",
};
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
