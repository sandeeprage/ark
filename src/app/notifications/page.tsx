import { requireViewer } from "@/modules/auth/session";
import { MilestoneState } from "@/components/milestone-state";
export const metadata = { title: "Notifications" };
export default async function Notifications() {
  await requireViewer("/notifications");
  return (
    <MilestoneState
      title="Good things, worth knowing."
      description="Your private notification center will show follows, project upvotes, and new launches from makers you follow."
      phase="NOTIFICATIONS"
    />
  );
}
