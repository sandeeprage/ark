import { requireViewer } from "@/modules/auth/session";
import { MilestoneState } from "@/components/milestone-state";
export const metadata = { title: "Following" };
export default async function Following() {
  await requireViewer("/following");
  return (
    <MilestoneState
      title="Keep up with your makers."
      description="Following, public following lists, and launches from makers you follow arrive in the social milestone."
      phase="FOLLOWING"
    />
  );
}
