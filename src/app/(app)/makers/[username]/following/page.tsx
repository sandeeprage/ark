import { MakerConnections } from "@/components/maker-connections";
export const metadata = { title: "Following makers" };
export default async function FollowingMakers({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ after?: string | string[] }>;
}) {
  return (
    <MakerConnections
      username={(await params).username}
      direction="following"
      after={(await searchParams).after}
    />
  );
}
