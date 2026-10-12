import { MakerConnections } from "@/components/maker-connections";
export const metadata = { title: "Followers" };
export default async function Followers({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ after?: string | string[] }>;
}) {
  return (
    <MakerConnections
      username={(await params).username}
      direction="followers"
      after={(await searchParams).after}
    />
  );
}
