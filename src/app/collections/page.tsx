import { requireViewer } from "@/modules/auth/session";
import { MilestoneState } from "@/components/milestone-state";
export const metadata = { title: "Collections" };
export default async function Collections() {
  await requireViewer("/collections");
  return (
    <MilestoneState
      title="Keep the work that inspires you."
      description="Collections will let you save projects into public lists. Anyone can view every collection, including Saved."
      phase="COLLECTIONS"
    />
  );
}
