import Link from "next/link";
import { Code2 } from "lucide-react";
export function MilestoneState({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="page narrow-page">
      <p className="eyebrow">INTERNAL BUILD · {phase}</p>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
      <div className="milestone-note">
        <Code2 size={25} strokeWidth={1.4} />
        <h2>This workflow is under construction.</h2>
        <p>
          The foundation is running. This feature will be enabled when its database, authorization,
          and integration checks are complete.
        </p>
        <Link href="/explore" className="button button-outline">
          Back to Explore
        </Link>
      </div>
    </div>
  );
}
