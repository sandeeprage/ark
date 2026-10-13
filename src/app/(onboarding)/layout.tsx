import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AppShell showTopbar={false}>{children}</AppShell>;
}
