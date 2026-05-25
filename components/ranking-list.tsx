import type { RankingEntry } from "@/lib/domain";

type RankingListProps = {
  items: RankingEntry[];
};

export function RankingList({ items }: RankingListProps) {
  return (
    <section className="ranking-list">
      {items.map((item) => (
        <article className={`ranking-row rank-${Math.min(item.position, 3)}`} key={item.name}>
          <div className="position-badge">{item.position}</div>
          <div className="ranking-copy">
            <strong>{item.name}</strong>
            <p className="subtle">
              {item.positiveTickets} jugadas positivas · mejor acierto {item.bestHit}
            </p>
          </div>
          <div className="ranking-net">
            <strong className={item.net >= 0 ? "money-positive" : "money-negative"}>
              {item.netLabel}
            </strong>
            <span className="subtle">neto</span>
          </div>
        </article>
      ))}
    </section>
  );
}
