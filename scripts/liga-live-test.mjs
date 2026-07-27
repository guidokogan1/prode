const LEAGUE = "arg.1";
const SEASON_SLUG = "torneo-clausura";

const dateArg = process.argv[2];
const url = dateArg
  ? `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard?dates=${dateArg}`
  : `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard`;

const stateLabel = { pre: "POR JUGAR", in: "EN VIVO", post: "TERMINADO" };

function outcome1x2(home, away) {
  const hs = home.score == null ? null : Number(home.score);
  const as = away.score == null ? null : Number(away.score);
  if (hs == null || as == null) return "-";
  if (hs > as) return "gana local";
  if (as > hs) return "gana visitante";
  return "empate";
}

async function main() {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error(`ESPN respondió ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  const events = data.events ?? [];

  console.log(`\nLiga: ${data.leagues?.[0]?.name ?? LEAGUE}`);
  console.log(`Fecha consultada: ${dateArg ?? "hoy"} — ${events.length} partidos\n`);

  for (const ev of events) {
    const comp = ev.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    const st = ev.status;
    const state = st.type.state;
    const slug = ev.season?.slug ?? "?";

    const score = `${home.score ?? "-"} : ${away.score ?? "-"}`;
    const clock = state === "in" ? `  ⏱ ${st.displayClock} (${st.type.shortDetail})` : "";
    const done = state === "post" ? `  → ${outcome1x2(home, away)} [${st.type.shortDetail}]` : "";
    const winnerFlag = home.winner ? " (L✓)" : away.winner ? " (V✓)" : "";
    const pens =
      home.shootoutScore != null || away.shootoutScore != null
        ? `  penales ${home.shootoutScore ?? "-"}:${away.shootoutScore ?? "-"}`
        : "";

    console.log(
      `[${stateLabel[state] ?? state}] ${home.team.abbreviation} ${score} ${away.team.abbreviation}` +
        `${winnerFlag}${clock}${done}${pens}`,
    );
    console.log(`         ${home.team.displayName} vs ${away.team.displayName}  ·  slug=${slug}  ·  espnEventId=${ev.id}`);
    console.log(`         teamIds  local=${home.team.id}  visitante=${away.team.id}`);
  }

  const others = events.filter((ev) => (ev.season?.slug ?? "") !== SEASON_SLUG);
  if (others.length) {
    console.log(`\n⚠ ${others.length} partido(s) con season.slug distinto de "${SEASON_SLUG}" (posibles playoffs u otra copa).`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
