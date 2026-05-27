import type {
  HistoryEntry,
  MatchOutcomeCode,
  MatchStatusVariant,
  MatchViewModel,
  ProfileViewModel,
  RankingEntry,
} from "@/lib/domain";

export type DemoPersonaSlug = "guido" | "mari" | "bato" | "pepo" | "cami";

export type DemoPersona = {
  slug: DemoPersonaSlug;
  name: string;
  badge: string;
  summary: string;
};

const DEFAULT_DEMO_PERSONA: DemoPersonaSlug = "guido";

const demoPersonas: DemoPersona[] = [
  {
    slug: "guido",
    name: "Guido",
    badge: "Lider",
    summary: "Va arriba, mezcla favoritos con una o dos lecturas jugadas y sirve para revisar estados ganadores.",
  },
  {
    slug: "mari",
    name: "Mari",
    badge: "Perseguidora",
    summary: "Perfil mas prolijo y conservador, ideal para ver resultados positivos cortos y picks mas cubiertos.",
  },
  {
    slug: "bato",
    name: "Bato",
    badge: "Contrarian",
    summary: "Se la juega seguido contra el consenso. Bueno para revisar derrotas, batacazos y tablas medias.",
  },
  {
    slug: "pepo",
    name: "Pepo",
    badge: "Remontada",
    summary: "Viene abajo pero con margen para pegar un salto. Sirve para revisar estados incompletos y pendientes.",
  },
  {
    slug: "cami",
    name: "Cami",
    badge: "Nueva",
    summary: "Perfil mas fresco y flojo en resultados. Bueno para ver empty-ish states sin irse a cero absoluto.",
  },
];

const ranking: RankingEntry[] = [
  { position: 1, name: "Guido", net: 12222, netLabel: "+12.222", positiveTickets: 19, bestHit: "+18.000" },
  { position: 2, name: "Mari", net: 5523, netLabel: "+5.523", positiveTickets: 17, bestHit: "+9.800" },
  { position: 3, name: "Bato", net: -2017, netLabel: "-2.017", positiveTickets: 15, bestHit: "+6.154" },
  { position: 4, name: "Pepo", net: -3151, netLabel: "-3.151", positiveTickets: 14, bestHit: "+7.020" },
  { position: 5, name: "Juli", net: -5280, netLabel: "-5.280", positiveTickets: 12, bestHit: "+11.300" },
  { position: 6, name: "Cami", net: -7299, netLabel: "-7.299", positiveTickets: 10, bestHit: "+5.440" },
];

const personaProfiles: Record<DemoPersonaSlug, ProfileViewModel> = {
  guido: {
    name: "Guido",
    netLabel: "+12.222",
    positiveTickets: 19,
    bestHit: "+18.000",
    championPick: "Argentina",
  },
  mari: {
    name: "Mari",
    netLabel: "+5.523",
    positiveTickets: 17,
    bestHit: "+9.800",
    championPick: "Brasil",
  },
  bato: {
    name: "Bato",
    netLabel: "-2.017",
    positiveTickets: 15,
    bestHit: "+6.154",
    championPick: "Uruguay",
  },
  pepo: {
    name: "Pepo",
    netLabel: "-3.151",
    positiveTickets: 14,
    bestHit: "+7.020",
    championPick: "Francia",
  },
  cami: {
    name: "Cami",
    netLabel: "-7.299",
    positiveTickets: 10,
    bestHit: "+5.440",
    championPick: "Japon",
  },
};

const personaHistories: Record<DemoPersonaSlug, HistoryEntry[]> = {
  guido: [
    {
      id: "h1",
      title: "Argentina vs Japon",
      stage: "Fase de grupos",
      description: "Fuiste fuerte con Argentina y terminaste arriba del pozo del partido.",
      net: 6154,
      netLabel: "+6.154",
      allocations: [
        { label: "Argentina", amount: "7.000" },
        { label: "Empate", amount: "2.000" },
        { label: "Japon", amount: "1.000" },
      ],
    },
    {
      id: "h2",
      title: "Brasil vs Mexico",
      stage: "Fase de grupos",
      description: "Te cubriste con el empate y saliste apenas arriba de la base.",
      net: 714,
      netLabel: "+714",
      allocations: [
        { label: "Brasil", amount: "3.000" },
        { label: "Empate", amount: "5.000" },
        { label: "Mexico", amount: "2.000" },
      ],
    },
    {
      id: "h3",
      title: "Jordania vs Alemania",
      stage: "Octavos de final",
      description: "Leiste el batacazo, casi nadie fue para ese lado y te disparaste en la tabla.",
      net: 11000,
      netLabel: "+11.000",
      allocations: [
        { label: "Clasifica Jordania", amount: "7.000" },
        { label: "Clasifica Alemania", amount: "3.000" },
      ],
    },
  ],
  mari: [
    {
      id: "m1",
      title: "Argentina vs Japon",
      stage: "Fase de grupos",
      description: "Repartiste mas parejo y cobraste, pero sin gran diferencia sobre el resto.",
      net: 1538,
      netLabel: "+1.538",
      allocations: [
        { label: "Argentina", amount: "4.000" },
        { label: "Empate", amount: "4.000" },
        { label: "Japon", amount: "2.000" },
      ],
    },
    {
      id: "m2",
      title: "Brasil vs Mexico",
      stage: "Fase de grupos",
      description: "Leiste bien el empate y subiste sin tomar demasiado riesgo.",
      net: 2857,
      netLabel: "+2.857",
      allocations: [
        { label: "Brasil", amount: "2.000" },
        { label: "Empate", amount: "6.000" },
        { label: "Mexico", amount: "2.000" },
      ],
    },
    {
      id: "m3",
      title: "Jordania vs Alemania",
      stage: "Octavos de final",
      description: "Fuiste con el favorito y el cruce te dejo por debajo de la base.",
      net: -4000,
      netLabel: "-4.000",
      allocations: [
        { label: "Clasifica Jordania", amount: "2.000" },
        { label: "Clasifica Alemania", amount: "8.000" },
      ],
    },
  ],
  bato: [
    {
      id: "b1",
      title: "Argentina vs Japon",
      stage: "Fase de grupos",
      description: "Te fuiste largo con Japon y el partido te dejo corto de retorno.",
      net: -5385,
      netLabel: "-5.385",
      allocations: [
        { label: "Argentina", amount: "2.000" },
        { label: "Empate", amount: "3.000" },
        { label: "Japon", amount: "5.000" },
      ],
    },
    {
      id: "b2",
      title: "Jordania vs Alemania",
      stage: "Octavos de final",
      description: "No llegaste a cargar suficiente del batacazo y el golpe se noto.",
      net: -7000,
      netLabel: "-7.000",
      allocations: [
        { label: "Clasifica Jordania", amount: "1.000" },
        { label: "Clasifica Alemania", amount: "9.000" },
      ],
    },
    {
      id: "b3",
      title: "Espana vs Uruguay",
      stage: "Cuartos de final",
      description: "Todavia estas esperando el cruce ideal para pegar el salto.",
      net: 0,
      netLabel: "+0",
      allocations: [
        { label: "Clasifica Espana", amount: "3.500" },
        { label: "Clasifica Uruguay", amount: "6.500" },
      ],
    },
  ],
  pepo: [
    {
      id: "p1",
      title: "Brasil vs Mexico",
      stage: "Fase de grupos",
      description: "Cubriste demasiado al favorito y cobraste por debajo de lo esperado.",
      net: -1800,
      netLabel: "-1.800",
      allocations: [
        { label: "Brasil", amount: "6.000" },
        { label: "Empate", amount: "2.500" },
        { label: "Mexico", amount: "1.500" },
      ],
    },
    {
      id: "p2",
      title: "Espana vs Uruguay",
      stage: "Cuartos de final",
      description: "Todavia no cerraste esta jugada, asi que el perfil sirve para revisar pendientes.",
      net: 0,
      netLabel: "+0",
      allocations: [
        { label: "Clasifica Espana", amount: "5.000" },
        { label: "Clasifica Uruguay", amount: "5.000" },
      ],
    },
  ],
  cami: [
    {
      id: "c1",
      title: "Argentina vs Japon",
      stage: "Fase de grupos",
      description: "Entraste mas tibia y el favorito no te alcanzo para quedar arriba.",
      net: -2308,
      netLabel: "-2.308",
      allocations: [
        { label: "Argentina", amount: "3.000" },
        { label: "Empate", amount: "4.000" },
        { label: "Japon", amount: "3.000" },
      ],
    },
    {
      id: "c2",
      title: "Uruguay vs Espana",
      stage: "Cuartos de final",
      description: "Todavia venis buscando una jugada grande que te vuelva a meter.",
      net: 0,
      netLabel: "+0",
      allocations: [
        { label: "Clasifica Espana", amount: "4.000" },
        { label: "Clasifica Uruguay", amount: "6.000" },
      ],
    },
  ],
};

function deriveStatusVariant(match: Pick<MatchViewModel, "status" | "isEditable" | "revealedTickets">): MatchStatusVariant {
  if (match.status === "live") {
    return "live";
  }

  if (match.status === "finished") {
    return "settled";
  }

  if (match.revealedTickets.length > 0) {
    return "revealed";
  }

  return match.isEditable ? "upcoming" : "locked";
}

function inferOutcomeCode(
  marketType: MatchViewModel["marketType"],
  index: number,
  length: number,
): MatchOutcomeCode {
  if (marketType === "qualifies") {
    return index === 0 ? "home_qualifies" : "away_qualifies";
  }

  if (length === 2) {
    return index === 0 ? "home" : "away";
  }

  if (index === 0) {
    return "home";
  }

  if (index === length - 1) {
    return "away";
  }

  return "draw";
}

function buildShortLabel(label: string) {
  return label
    .replace(/^Clasifica\s+/i, "")
    .replace(/^Estados Unidos$/i, "EE.UU.")
    .replace(/^Paises Bajos$/i, "NED")
    .replace(/^Empate$/i, "EMP");
}

type RawOutcome = {
  label: string;
  amount: string;
  percentage: number;
};

type RawConsensus = {
  label: string;
  percentage: number;
};

type RawRevealedTicket = {
  userName: string;
  allocations: {
    label: string;
    amount: string;
  }[];
  netLabel?: string;
};

type RawMatchViewModel = Omit<MatchViewModel, "statusVariant" | "allocation" | "consensus" | "revealedTickets"> & {
  allocation: RawOutcome[];
  consensus: RawConsensus[];
  revealedTickets: RawRevealedTicket[];
};

function decorateMatch(match: RawMatchViewModel): MatchViewModel {
  const allocation = match.allocation.map((item, index, list) => ({
    ...item,
    code: inferOutcomeCode(match.marketType, index, list.length),
    shortLabel: buildShortLabel(item.label),
  }));

  const consensus = match.consensus.map((item, index, list) => ({
    ...item,
    code: inferOutcomeCode(match.marketType, index, list.length),
    shortLabel: buildShortLabel(item.label),
  }));

  const revealedTickets = match.revealedTickets.map((ticket) => ({
    ...ticket,
    allocations: ticket.allocations.map((allocationItem, index, list) => ({
      ...allocationItem,
      code: inferOutcomeCode(match.marketType, index, list.length),
      shortLabel: buildShortLabel(allocationItem.label),
    })),
  }));

  return {
    ...match,
    allocation,
    consensus,
    revealedTickets,
    statusVariant: deriveStatusVariant({
      status: match.status,
      isEditable: match.isEditable,
      revealedTickets,
    }),
  };
}

function createMatchSet(persona: DemoPersonaSlug): MatchViewModel[] {
  const profiles = {
    guido: {
      argJpn: [
        { label: "Argentina", amount: "7.000", percentage: 70 },
        { label: "Empate", amount: "2.000", percentage: 20 },
        { label: "Japon", amount: "1.000", percentage: 10 },
      ],
      braMex: [
        { label: "Brasil", amount: "3.000", percentage: 30 },
        { label: "Empate", amount: "5.000", percentage: 50 },
        { label: "Mexico", amount: "2.000", percentage: 20 },
      ],
      jorGer: [
        { label: "Clasifica Jordania", amount: "7.000", percentage: 70 },
        { label: "Clasifica Alemania", amount: "3.000", percentage: 30 },
      ],
      espUru: [
        { label: "Clasifica Espana", amount: "5.500", percentage: 55 },
        { label: "Clasifica Uruguay", amount: "4.500", percentage: 45 },
      ],
      marSen: [
        { label: "Marruecos", amount: "4.000", percentage: 40 },
        { label: "Empate", amount: "3.000", percentage: 30 },
        { label: "Senegal", amount: "3.000", percentage: 30 },
      ],
      usaNed: [
        { label: "Clasifica Estados Unidos", amount: "3.000", percentage: 30 },
        { label: "Clasifica Paises Bajos", amount: "7.000", percentage: 70 },
      ],
      states: {
        argJpn: "Tu jugada guardada",
        braMex: "Reveal activo",
        jorGer: "Ganaste +11.000",
        espUru: "Te falta jugar",
        marSen: "Tu jugada guardada",
        usaNed: "Perdiste -3.800",
      },
    },
    mari: {
      argJpn: [
        { label: "Argentina", amount: "4.000", percentage: 40 },
        { label: "Empate", amount: "4.000", percentage: 40 },
        { label: "Japon", amount: "2.000", percentage: 20 },
      ],
      braMex: [
        { label: "Brasil", amount: "2.000", percentage: 20 },
        { label: "Empate", amount: "6.000", percentage: 60 },
        { label: "Mexico", amount: "2.000", percentage: 20 },
      ],
      jorGer: [
        { label: "Clasifica Jordania", amount: "2.000", percentage: 20 },
        { label: "Clasifica Alemania", amount: "8.000", percentage: 80 },
      ],
      espUru: [
        { label: "Clasifica Espana", amount: "6.000", percentage: 60 },
        { label: "Clasifica Uruguay", amount: "4.000", percentage: 40 },
      ],
      marSen: [
        { label: "Marruecos", amount: "4.500", percentage: 45 },
        { label: "Empate", amount: "2.500", percentage: 25 },
        { label: "Senegal", amount: "3.000", percentage: 30 },
      ],
      usaNed: [
        { label: "Clasifica Estados Unidos", amount: "3.000", percentage: 30 },
        { label: "Clasifica Paises Bajos", amount: "7.000", percentage: 70 },
      ],
      states: {
        argJpn: "Tu jugada guardada",
        braMex: "Reveal activo",
        jorGer: "Perdiste -4.000",
        espUru: "Tu jugada guardada",
        marSen: "Tu jugada guardada",
        usaNed: "Ganaste +2.400",
      },
    },
    bato: {
      argJpn: [
        { label: "Argentina", amount: "2.000", percentage: 20 },
        { label: "Empate", amount: "3.000", percentage: 30 },
        { label: "Japon", amount: "5.000", percentage: 50 },
      ],
      braMex: [
        { label: "Brasil", amount: "5.000", percentage: 50 },
        { label: "Empate", amount: "3.000", percentage: 30 },
        { label: "Mexico", amount: "2.000", percentage: 20 },
      ],
      jorGer: [
        { label: "Clasifica Jordania", amount: "1.000", percentage: 10 },
        { label: "Clasifica Alemania", amount: "9.000", percentage: 90 },
      ],
      espUru: [
        { label: "Clasifica Espana", amount: "3.500", percentage: 35 },
        { label: "Clasifica Uruguay", amount: "6.500", percentage: 65 },
      ],
      marSen: [
        { label: "Marruecos", amount: "1.500", percentage: 15 },
        { label: "Empate", amount: "2.000", percentage: 20 },
        { label: "Senegal", amount: "6.500", percentage: 65 },
      ],
      usaNed: [
        { label: "Clasifica Estados Unidos", amount: "7.000", percentage: 70 },
        { label: "Clasifica Paises Bajos", amount: "3.000", percentage: 30 },
      ],
      states: {
        argJpn: "Tu jugada guardada",
        braMex: "Reveal activo",
        jorGer: "Perdiste -7.000",
        espUru: "Tu jugada guardada",
        marSen: "Te falta jugar",
        usaNed: "Te falta jugar",
      },
    },
    pepo: {
      argJpn: [
        { label: "Argentina", amount: "5.000", percentage: 50 },
        { label: "Empate", amount: "2.500", percentage: 25 },
        { label: "Japon", amount: "2.500", percentage: 25 },
      ],
      braMex: [
        { label: "Brasil", amount: "6.000", percentage: 60 },
        { label: "Empate", amount: "2.500", percentage: 25 },
        { label: "Mexico", amount: "1.500", percentage: 15 },
      ],
      jorGer: [
        { label: "Clasifica Jordania", amount: "3.000", percentage: 30 },
        { label: "Clasifica Alemania", amount: "7.000", percentage: 70 },
      ],
      espUru: [
        { label: "Clasifica Espana", amount: "5.000", percentage: 50 },
        { label: "Clasifica Uruguay", amount: "5.000", percentage: 50 },
      ],
      marSen: [
        { label: "Marruecos", amount: "0", percentage: 0 },
        { label: "Empate", amount: "0", percentage: 0 },
        { label: "Senegal", amount: "0", percentage: 0 },
      ],
      usaNed: [
        { label: "Clasifica Estados Unidos", amount: "4.000", percentage: 40 },
        { label: "Clasifica Paises Bajos", amount: "6.000", percentage: 60 },
      ],
      states: {
        argJpn: "Tu jugada guardada",
        braMex: "Reveal activo",
        jorGer: "Perdiste -2.600",
        espUru: "Te falta jugar",
        marSen: "Te falta jugar",
        usaNed: "Tu jugada guardada",
      },
    },
    cami: {
      argJpn: [
        { label: "Argentina", amount: "3.000", percentage: 30 },
        { label: "Empate", amount: "4.000", percentage: 40 },
        { label: "Japon", amount: "3.000", percentage: 30 },
      ],
      braMex: [
        { label: "Brasil", amount: "4.000", percentage: 40 },
        { label: "Empate", amount: "4.000", percentage: 40 },
        { label: "Mexico", amount: "2.000", percentage: 20 },
      ],
      jorGer: [
        { label: "Clasifica Jordania", amount: "2.500", percentage: 25 },
        { label: "Clasifica Alemania", amount: "7.500", percentage: 75 },
      ],
      espUru: [
        { label: "Clasifica Espana", amount: "4.000", percentage: 40 },
        { label: "Clasifica Uruguay", amount: "6.000", percentage: 60 },
      ],
      marSen: [
        { label: "Marruecos", amount: "3.000", percentage: 30 },
        { label: "Empate", amount: "3.000", percentage: 30 },
        { label: "Senegal", amount: "4.000", percentage: 40 },
      ],
      usaNed: [
        { label: "Clasifica Estados Unidos", amount: "3.000", percentage: 30 },
        { label: "Clasifica Paises Bajos", amount: "7.000", percentage: 70 },
      ],
      states: {
        argJpn: "Tu jugada guardada",
        braMex: "Reveal activo",
        jorGer: "Perdiste -5.800",
        espUru: "Te falta jugar",
        marSen: "Tu jugada guardada",
        usaNed: "Perdiste -1.499",
      },
    },
  }[persona];

  const matches: RawMatchViewModel[] = [
    {
      id: "arg-jpn",
      stage: "Fase de grupos",
      venue: "Monterrey",
      kickoffLabel: "11 Jun · 22:00",
      status: "scheduled",
      statusLabel: "Falta 1 dia",
      marketType: "1x2",
      marketTypeLabel: "1X2",
      userStateLabel: profiles.states.argJpn,
      isEditable: true,
      home: { name: "Argentina", flag: "🇦🇷", score: 0 },
      away: { name: "Japon", flag: "🇯🇵", score: 0 },
      allocation: profiles.argJpn,
      consensus: [
        { label: "Argentina", percentage: 64 },
        { label: "Empate", percentage: 19 },
        { label: "Japon", percentage: 17 },
      ],
      form: { home: "V V V E V", away: "E D V V D", homeGoals: "11", awayGoals: "7" },
      revealedTickets: [],
    },
    {
      id: "bra-mex",
      stage: "Fase de grupos",
      venue: "Los Angeles",
      kickoffLabel: "12 Jun · 19:30",
      status: "live",
      statusLabel: "Live · 58'",
      marketType: "1x2",
      marketTypeLabel: "1X2",
      userStateLabel: profiles.states.braMex,
      isEditable: false,
      home: { name: "Brasil", flag: "🇧🇷", score: 1 },
      away: { name: "Mexico", flag: "🇲🇽", score: 1 },
      allocation: profiles.braMex,
      consensus: [
        { label: "Brasil", percentage: 47 },
        { label: "Empate", percentage: 31 },
        { label: "Mexico", percentage: 22 },
      ],
      form: { home: "V V E V V", away: "V D V E V", homeGoals: "9", awayGoals: "8" },
      revealedTickets: [
        {
          userName: "Guido",
          allocations: [
            { label: "Brasil", amount: "3.000" },
            { label: "Empate", amount: "5.000" },
            { label: "Mexico", amount: "2.000" },
          ],
        },
        {
          userName: "Mari",
          allocations: [
            { label: "Brasil", amount: "2.000" },
            { label: "Empate", amount: "6.000" },
            { label: "Mexico", amount: "2.000" },
          ],
        },
        {
          userName: "Bato",
          allocations: [
            { label: "Brasil", amount: "5.000" },
            { label: "Empate", amount: "3.000" },
            { label: "Mexico", amount: "2.000" },
          ],
        },
        {
          userName: "Pepo",
          allocations: [
            { label: "Brasil", amount: "6.000" },
            { label: "Empate", amount: "2.500" },
            { label: "Mexico", amount: "1.500" },
          ],
        },
      ],
    },
    {
      id: "jor-ger",
      stage: "Octavos de final",
      venue: "Miami",
      kickoffLabel: "30 Jun · 21:00",
      status: "finished",
      statusLabel: "Liquidado",
      marketType: "qualifies",
      marketTypeLabel: "Clasifica",
      userStateLabel: profiles.states.jorGer,
      isEditable: false,
      home: { name: "Jordania", flag: "🇯🇴", score: 1 },
      away: { name: "Alemania", flag: "🇩🇪", score: 0 },
      allocation: profiles.jorGer,
      consensus: [
        { label: "Clasifica Jordania", percentage: 18 },
        { label: "Clasifica Alemania", percentage: 82 },
      ],
      form: { home: "V E V D V", away: "V V V E V", homeGoals: "8", awayGoals: "12" },
      revealedTickets: [
        {
          userName: "Guido",
          allocations: [
            { label: "Clasifica Jordania", amount: "7.000" },
            { label: "Clasifica Alemania", amount: "3.000" },
          ],
          netLabel: "+11.000",
        },
        {
          userName: "Mari",
          allocations: [
            { label: "Clasifica Jordania", amount: "2.000" },
            { label: "Clasifica Alemania", amount: "8.000" },
          ],
          netLabel: "-4.000",
        },
        {
          userName: "Bato",
          allocations: [
            { label: "Clasifica Jordania", amount: "1.000" },
            { label: "Clasifica Alemania", amount: "9.000" },
          ],
          netLabel: "-7.000",
        },
      ],
    },
    {
      id: "esp-uru",
      stage: "Cuartos de final",
      venue: "Dallas",
      kickoffLabel: "4 Jul · 18:00",
      status: "scheduled",
      statusLabel: "Abierto",
      marketType: "qualifies",
      marketTypeLabel: "Clasifica",
      userStateLabel: profiles.states.espUru,
      isEditable: true,
      home: { name: "Espana", flag: "🇪🇸", score: 0 },
      away: { name: "Uruguay", flag: "🇺🇾", score: 0 },
      allocation: profiles.espUru,
      consensus: [
        { label: "Clasifica Espana", percentage: 53 },
        { label: "Clasifica Uruguay", percentage: 47 },
      ],
      form: { home: "V V D V V", away: "V E V V D", homeGoals: "10", awayGoals: "9" },
      revealedTickets: [],
    },
    {
      id: "mar-sen",
      stage: "Fase de grupos",
      venue: "Vancouver",
      kickoffLabel: "13 Jun · 16:00",
      status: "scheduled",
      statusLabel: "En 4 horas",
      marketType: "1x2",
      marketTypeLabel: "1X2",
      userStateLabel: profiles.states.marSen,
      isEditable: true,
      home: { name: "Marruecos", flag: "🇲🇦", score: 0 },
      away: { name: "Senegal", flag: "🇸🇳", score: 0 },
      allocation: profiles.marSen,
      consensus: [
        { label: "Marruecos", percentage: 39 },
        { label: "Empate", percentage: 26 },
        { label: "Senegal", percentage: 35 },
      ],
      form: { home: "V D E V V", away: "V V D E V", homeGoals: "8", awayGoals: "8" },
      revealedTickets: [],
    },
    {
      id: "usa-ned",
      stage: "Octavos de final",
      venue: "Houston",
      kickoffLabel: "29 Jun · 20:00",
      status: "finished",
      statusLabel: "Liquidado",
      marketType: "qualifies",
      marketTypeLabel: "Clasifica",
      userStateLabel: profiles.states.usaNed,
      isEditable: false,
      home: { name: "Estados Unidos", flag: "🇺🇸", score: 1 },
      away: { name: "Paises Bajos", flag: "🇳🇱", score: 2 },
      allocation: profiles.usaNed,
      consensus: [
        { label: "Clasifica Estados Unidos", percentage: 28 },
        { label: "Clasifica Paises Bajos", percentage: 72 },
      ],
      form: { home: "V E V V D", away: "V V E V V", homeGoals: "9", awayGoals: "11" },
      revealedTickets: [
        {
          userName: "Guido",
          allocations: [
            { label: "Clasifica Estados Unidos", amount: "3.000" },
            { label: "Clasifica Paises Bajos", amount: "7.000" },
          ],
          netLabel: "-3.800",
        },
        {
          userName: "Mari",
          allocations: [
            { label: "Clasifica Estados Unidos", amount: "3.000" },
            { label: "Clasifica Paises Bajos", amount: "7.000" },
          ],
          netLabel: "+2.400",
        },
      ],
    },
  ];

  return matches.map((match) => decorateMatch(match));
}

function normalizeDemoPersonaSlug(slug?: string | null): DemoPersonaSlug {
  return isDemoPersonaSlug(slug) ? slug : DEFAULT_DEMO_PERSONA;
}

export function isDemoPersonaSlug(value: string | null | undefined): value is DemoPersonaSlug {
  return demoPersonas.some((persona) => persona.slug === value);
}

export function getDemoPersonas() {
  return demoPersonas;
}

export function getDefaultDemoPersonaSlug() {
  return DEFAULT_DEMO_PERSONA;
}

export function getFallbackMatches(persona?: string | null) {
  return createMatchSet(normalizeDemoPersonaSlug(persona));
}

export function getFallbackMatchesByStage(persona?: string | null) {
  const matches = getFallbackMatches(persona);

  return [
    {
      stage: "Grupos",
      label: "Primeras jornadas",
      matches: matches.filter((match) => match.marketType === "1x2"),
    },
    {
      stage: "Eliminacion directa",
      label: "Todo o nada",
      matches: matches.filter((match) => match.marketType === "qualifies"),
    },
  ];
}

export function getFallbackRanking() {
  return ranking;
}

export function getFallbackHistory(persona?: string | null) {
  return personaHistories[normalizeDemoPersonaSlug(persona)];
}

export function getFallbackProfile(persona?: string | null) {
  return personaProfiles[normalizeDemoPersonaSlug(persona)];
}

export function getFallbackMatchById(id: string, persona?: string | null) {
  return getFallbackMatches(persona).find((match) => match.id === id);
}

export function getFallbackHomeSummary(persona?: string | null) {
  const slug = normalizeDemoPersonaSlug(persona);
  const matches = getFallbackMatches(slug);
  const profile = getFallbackProfile(slug);

  return {
    liveMatches: String(matches.filter((match) => match.status === "live").length),
    pendingPicks: String(matches.filter((match) => match.userStateLabel === "Te falta jugar").length),
    settledToday: String(matches.filter((match) => match.status === "finished").length),
    yourNet: profile.netLabel,
  };
}
