import { redirect } from "next/navigation";

export default async function MatchSimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/match/${id}?tab=simulation`);
}
