import { notFound } from "next/navigation";
import { MatchDetailCard } from "@/components/match-detail-card";
import { getMatchById } from "@/lib/repositories/matches";

type MatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const match = await getMatchById(id);

  if (!match) {
    notFound();
  }

  return (
    <main className="page-shell page-scroll section-stack-lg">
      <MatchDetailCard match={match} />
    </main>
  );
}
