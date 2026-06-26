import type {
  HistoryEntry,
  MatchOutcomeCode,
  MatchStageGroup,
  MarketStatus,
  MatchStatusVariant,
  MatchViewModel,
  ProfileViewModel,
  RankingEntry,
} from "@/lib/domain";
import { parseCredits } from "@/lib/format";

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
  { position: 1, name: "Mari", netAmount: 5523, grossAmount: 205523, positiveTickets: 17, bestHitAmount: 9800, bestHitGrossAmount: 19800, movement: 1 },
  { position: 2, name: "Bato", netAmount: -2017, grossAmount: 197983, positiveTickets: 15, bestHitAmount: 6154, bestHitGrossAmount: 16154, movement: -1 },
  { position: 3, name: "Pepo", netAmount: -3151, grossAmount: 196849, positiveTickets: 14, bestHitAmount: 7020, bestHitGrossAmount: 17020, movement: 0 },
  { position: 4, name: "Juli", netAmount: -5280, grossAmount: 194720, positiveTickets: 12, bestHitAmount: 11300, bestHitGrossAmount: 21300, movement: 2 },
  { position: 5, name: "Cami", netAmount: -7299, grossAmount: 192701, positiveTickets: 10, bestHitAmount: 5440, bestHitGrossAmount: 15440, movement: -2 },
  { position: 6, name: "Guido", netAmount: 0, grossAmount: 0, positiveTickets: 0, bestHitAmount: 0, bestHitGrossAmount: 0, movement: null },
];

const personaProfiles: Record<DemoPersonaSlug, ProfileViewModel> = {
  guido: {
    name: "Guido",
    netAmount: 0,
    grossAmount: 0,
    positiveTickets: 0,
    bestHitAmount: 0,
    bestHitGrossAmount: 0,
    championPick: null,
  },
  mari: {
    name: "Mari",
    netAmount: 5523,
    grossAmount: 205523,
    positiveTickets: 17,
    bestHitAmount: 9800,
    bestHitGrossAmount: 19800,
    championPick: "Brasil",
  },
  bato: {
    name: "Bato",
    netAmount: -2017,
    grossAmount: 197983,
    positiveTickets: 15,
    bestHitAmount: 6154,
    bestHitGrossAmount: 16154,
    championPick: "Uruguay",
  },
  pepo: {
    name: "Pepo",
    netAmount: -3151,
    grossAmount: 196849,
    positiveTickets: 14,
    bestHitAmount: 7020,
    bestHitGrossAmount: 17020,
    championPick: "Francia",
  },
  cami: {
    name: "Cami",
    netAmount: -7299,
    grossAmount: 192701,
    positiveTickets: 10,
    bestHitAmount: 5440,
    bestHitGrossAmount: 15440,
    championPick: "Japon",
  },
};

const personaHistories: Record<DemoPersonaSlug, HistoryEntry[]> = {
  guido: [],
  mari: [
    {
      id: "m1",
      title: "Argentina vs Japon",
      stage: "Fase de grupos",
      description: "Repartiste mas parejo y cobraste, pero sin gran diferencia sobre el resto.",
      netAmount: 1538,
      grossAmount: 11538,
      allocations: [
        { label: "Argentina", amount: 4000 },
        { label: "Empate", amount: 4000 },
        { label: "Japon", amount: 2000 },
      ],
    },
    {
      id: "m2",
      title: "Brasil vs Mexico",
      stage: "Fase de grupos",
      description: "Leiste bien el empate y subiste sin tomar demasiado riesgo.",
      netAmount: 2857,
      grossAmount: 12857,
      allocations: [
        { label: "Brasil", amount: 2000 },
        { label: "Empate", amount: 6000 },
        { label: "Mexico", amount: 2000 },
      ],
    },
    {
      id: "m3",
      title: "Jordania vs Alemania",
      stage: "Octavos de final",
      description: "Fuiste con el favorito y el cruce te dejo por debajo de la base.",
      netAmount: -4000,
      grossAmount: 6000,
      allocations: [
        { label: "Clasifica Jordania", amount: 2000 },
        { label: "Clasifica Alemania", amount: 8000 },
      ],
    },
  ],
  bato: [
    {
      id: "b1",
      title: "Argentina vs Japon",
      stage: "Fase de grupos",
      description: "Te fuiste largo con Japon y el partido te dejo corto de retorno.",
      netAmount: -5385,
      grossAmount: 4615,
      allocations: [
        { label: "Argentina", amount: 2000 },
        { label: "Empate", amount: 3000 },
        { label: "Japon", amount: 5000 },
      ],
    },
    {
      id: "b2",
      title: "Jordania vs Alemania",
      stage: "Octavos de final",
      description: "No llegaste a cargar suficiente del batacazo y el golpe se noto.",
      netAmount: -7000,
      grossAmount: 3000,
      allocations: [
        { label: "Clasifica Jordania", amount: 1000 },
        { label: "Clasifica Alemania", amount: 9000 },
      ],
    },
    {
      id: "b3",
      title: "España vs Uruguay",
      stage: "Cuartos de final",
      description: "Todavia estas esperando el cruce ideal para pegar el salto.",
      netAmount: 0,
      grossAmount: 10000,
      allocations: [
        { label: "Clasifica España", amount: 3500 },
        { label: "Clasifica Uruguay", amount: 6500 },
      ],
    },
  ],
  pepo: [
    {
      id: "p1",
      title: "Brasil vs Mexico",
      stage: "Fase de grupos",
      description: "Cubriste demasiado al favorito y cobraste por debajo de lo esperado.",
      netAmount: -1800,
      grossAmount: 8200,
      allocations: [
        { label: "Brasil", amount: 6000 },
        { label: "Empate", amount: 2500 },
        { label: "Mexico", amount: 1500 },
      ],
    },
    {
      id: "p2",
      title: "España vs Uruguay",
      stage: "Cuartos de final",
      description: "Todavia no cerraste esta jugada, asi que el perfil sirve para revisar pendientes.",
      netAmount: 0,
      grossAmount: 10000,
      allocations: [
        { label: "Clasifica España", amount: 5000 },
        { label: "Clasifica Uruguay", amount: 5000 },
      ],
    },
  ],
  cami: [
    {
      id: "c1",
      title: "Argentina vs Japon",
      stage: "Fase de grupos",
      description: "Entraste mas tibia y el favorito no te alcanzo para quedar arriba.",
      netAmount: -2308,
      grossAmount: 7692,
      allocations: [
        { label: "Argentina", amount: 3000 },
        { label: "Empate", amount: 4000 },
        { label: "Japon", amount: 3000 },
      ],
    },
    {
      id: "c2",
      title: "Uruguay vs España",
      stage: "Cuartos de final",
      description: "Todavia venis buscando una jugada grande que te vuelva a meter.",
      netAmount: 0,
      grossAmount: 10000,
      allocations: [
        { label: "Clasifica España", amount: 4000 },
        { label: "Clasifica Uruguay", amount: 6000 },
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

function deriveMarketStatus(match: Pick<MatchViewModel, "status" | "isEditable" | "revealedTickets">): MarketStatus {
  if (match.status === "finished") {
    return "settled";
  }

  if (match.status === "live") {
    return "revealed";
  }

  if (match.revealedTickets.length > 0) {
    return "revealed";
  }

  return match.isEditable ? "open" : "locked";
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
  netAmount?: number;
  grossAmount?: number;
};

type RawMatchViewModel = Omit<MatchViewModel, "statusVariant" | "marketStatus" | "draftState" | "allocation" | "consensus" | "revealedTickets" | "pickCountByCode" | "poolByCode" | "form"> & {
  allocation: RawOutcome[];
  consensus: RawConsensus[];
  revealedTickets: RawRevealedTicket[];
  form: {
    home: string;
    away: string;
    homeGoals: string;
    awayGoals: string;
  };
};

function decorateMatch(match: RawMatchViewModel): MatchViewModel {
  const allocation = match.allocation.map((item, index, list) => ({
    ...item,
    amount: parseCredits(item.amount),
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
        amount: parseCredits(allocationItem.amount),
        code: inferOutcomeCode(match.marketType, index, list.length),
        shortLabel: buildShortLabel(allocationItem.label),
      })),
  }));

  const pickCountByCode: Partial<Record<MatchOutcomeCode, number>> = {};
  const poolByCode: Partial<Record<MatchOutcomeCode, number>> = {};
  for (const ticket of revealedTickets) {
    const dominant = [...ticket.allocations].sort((left, right) => right.amount - left.amount)[0];
    if (!dominant) continue;
    pickCountByCode[dominant.code] = (pickCountByCode[dominant.code] ?? 0) + 1;
    for (const allocation of ticket.allocations) {
      if (allocation.amount > 0) {
        poolByCode[allocation.code] = (poolByCode[allocation.code] ?? 0) + allocation.amount;
      }
    }
  }

  return {
    ...match,
    allocation,
    consensus,
    pickCountByCode,
    poolByCode,
    revealedTickets,
    marketStatus: deriveMarketStatus({
      status: match.status,
      isEditable: match.isEditable,
      revealedTickets,
    }),
    statusVariant: deriveStatusVariant({
      status: match.status,
      isEditable: match.isEditable,
      revealedTickets,
    }),
    draftState: match.userStateLabel === "Te falta jugar" ? "idle" : "saved_local",
    form: {
      ...match.form,
      homeGoals: Number(match.form.homeGoals),
      awayGoals: Number(match.form.awayGoals),
    },
  };
}

type PendingGroupFixture = {
  id: string;
  groupLabel: string;
  venue: string;
  kickoffLabel: string;
  statusLabel: string;
  home: { name: string; flag: string };
  away: { name: string; flag: string };
  consensus: [number, number, number];
  form: { home: string; away: string; homeGoals: string; awayGoals: string };
};

const pendingGroupFixtures: PendingGroupFixture[] = [
  {
    id: "eng-cro",
    groupLabel: "Grupo D",
    venue: "Atlanta",
    kickoffLabel: "14 Jun · 16:00",
    statusLabel: "En 3 dias",
    home: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    away: { name: "Croacia", flag: "🇭🇷" },
    consensus: [52, 26, 22],
    form: { home: "V V E V D", away: "V E V V D", homeGoals: "11", awayGoals: "9" },
  },
  {
    id: "sui-ecu",
    groupLabel: "Grupo D",
    venue: "Seattle",
    kickoffLabel: "14 Jun · 19:30",
    statusLabel: "En 3 dias",
    home: { name: "Suiza", flag: "🇨🇭" },
    away: { name: "Ecuador", flag: "🇪🇨" },
    consensus: [38, 30, 32],
    form: { home: "E V D V V", away: "V V E D V", homeGoals: "7", awayGoals: "8" },
  },
  {
    id: "cro-sui",
    groupLabel: "Grupo D",
    venue: "Atlanta",
    kickoffLabel: "19 Jun · 16:00",
    statusLabel: "En 8 dias",
    home: { name: "Croacia", flag: "🇭🇷" },
    away: { name: "Suiza", flag: "🇨🇭" },
    consensus: [41, 30, 29],
    form: { home: "V E V V D", away: "E V D V V", homeGoals: "9", awayGoals: "7" },
  },
  {
    id: "eng-ecu",
    groupLabel: "Grupo D",
    venue: "Toronto",
    kickoffLabel: "19 Jun · 19:30",
    statusLabel: "En 8 dias",
    home: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    away: { name: "Ecuador", flag: "🇪🇨" },
    consensus: [58, 24, 18],
    form: { home: "V V E V D", away: "V V E D V", homeGoals: "11", awayGoals: "8" },
  },
  {
    id: "ecu-cro",
    groupLabel: "Grupo D",
    venue: "Seattle",
    kickoffLabel: "24 Jun · 16:00",
    statusLabel: "En 13 dias",
    home: { name: "Ecuador", flag: "🇪🇨" },
    away: { name: "Croacia", flag: "🇭🇷" },
    consensus: [29, 31, 40],
    form: { home: "V V E D V", away: "V E V V D", homeGoals: "8", awayGoals: "9" },
  },
  {
    id: "sui-eng",
    groupLabel: "Grupo D",
    venue: "Toronto",
    kickoffLabel: "24 Jun · 19:30",
    statusLabel: "En 13 dias",
    home: { name: "Suiza", flag: "🇨🇭" },
    away: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    consensus: [22, 26, 52],
    form: { home: "E V D V V", away: "V V E V D", homeGoals: "7", awayGoals: "11" },
  },
  {
    id: "fra-col",
    groupLabel: "Grupo E",
    venue: "Guadalajara",
    kickoffLabel: "15 Jun · 16:00",
    statusLabel: "En 4 dias",
    home: { name: "Francia", flag: "🇫🇷" },
    away: { name: "Colombia", flag: "🇨🇴" },
    consensus: [49, 27, 24],
    form: { home: "V V V E D", away: "V E V V D", homeGoals: "12", awayGoals: "9" },
  },
  {
    id: "den-kor",
    groupLabel: "Grupo E",
    venue: "Kansas City",
    kickoffLabel: "15 Jun · 19:30",
    statusLabel: "En 4 dias",
    home: { name: "Dinamarca", flag: "🇩🇰" },
    away: { name: "Corea del Sur", flag: "🇰🇷" },
    consensus: [44, 30, 26],
    form: { home: "V E V D V", away: "V D V E V", homeGoals: "8", awayGoals: "7" },
  },
  {
    id: "col-den",
    groupLabel: "Grupo E",
    venue: "Guadalajara",
    kickoffLabel: "20 Jun · 16:00",
    statusLabel: "En 9 dias",
    home: { name: "Colombia", flag: "🇨🇴" },
    away: { name: "Dinamarca", flag: "🇩🇰" },
    consensus: [40, 30, 30],
    form: { home: "V E V V D", away: "V E V D V", homeGoals: "9", awayGoals: "8" },
  },
  {
    id: "fra-kor",
    groupLabel: "Grupo E",
    venue: "Mexico DF",
    kickoffLabel: "20 Jun · 19:30",
    statusLabel: "En 9 dias",
    home: { name: "Francia", flag: "🇫🇷" },
    away: { name: "Corea del Sur", flag: "🇰🇷" },
    consensus: [62, 22, 16],
    form: { home: "V V V E D", away: "V D V E V", homeGoals: "12", awayGoals: "7" },
  },
  {
    id: "kor-col",
    groupLabel: "Grupo E",
    venue: "Kansas City",
    kickoffLabel: "25 Jun · 16:00",
    statusLabel: "En 14 dias",
    home: { name: "Corea del Sur", flag: "🇰🇷" },
    away: { name: "Colombia", flag: "🇨🇴" },
    consensus: [27, 29, 44],
    form: { home: "V D V E V", away: "V E V V D", homeGoals: "7", awayGoals: "9" },
  },
  {
    id: "den-fra",
    groupLabel: "Grupo E",
    venue: "Mexico DF",
    kickoffLabel: "25 Jun · 19:30",
    statusLabel: "En 14 dias",
    home: { name: "Dinamarca", flag: "🇩🇰" },
    away: { name: "Francia", flag: "🇫🇷" },
    consensus: [24, 27, 49],
    form: { home: "V E V D V", away: "V V V E D", homeGoals: "8", awayGoals: "12" },
  },
];

function buildPendingGroupMatches(): RawMatchViewModel[] {
  return pendingGroupFixtures.map((fixture) => ({
    id: fixture.id,
    stage: "Fase de grupos",
    stageSortOrder: 1,
    groupLabel: fixture.groupLabel,
    venue: fixture.venue,
    kickoffLabel: fixture.kickoffLabel,
    status: "scheduled",
    statusLabel: fixture.statusLabel,
    marketType: "1x2",
    marketTypeLabel: "1X2",
    userStateLabel: "Te falta jugar",
    isEditable: true,
    home: { ...fixture.home, score: 0 },
    away: { ...fixture.away, score: 0 },
    allocation: [
      { label: fixture.home.name, amount: "0", percentage: 0 },
      { label: "Empate", amount: "0", percentage: 0 },
      { label: fixture.away.name, amount: "0", percentage: 0 },
    ],
    consensus: [
      { label: fixture.home.name, percentage: fixture.consensus[0] },
      { label: "Empate", percentage: fixture.consensus[1] },
      { label: fixture.away.name, percentage: fixture.consensus[2] },
    ],
    form: fixture.form,
    revealedTickets: [],
  }));
}

function createMatchSet(persona: DemoPersonaSlug): MatchViewModel[] {
  const profiles = {
    guido: {
      argJpn: [
        { label: "Argentina", amount: "0", percentage: 0 },
        { label: "Empate", amount: "0", percentage: 0 },
        { label: "Japon", amount: "0", percentage: 0 },
      ],
      braMex: [
        { label: "Brasil", amount: "0", percentage: 0 },
        { label: "Empate", amount: "0", percentage: 0 },
        { label: "Mexico", amount: "0", percentage: 0 },
      ],
      jorGer: [
        { label: "Clasifica Jordania", amount: "0", percentage: 0 },
        { label: "Clasifica Alemania", amount: "0", percentage: 0 },
      ],
      espUru: [
        { label: "Clasifica España", amount: "0", percentage: 0 },
        { label: "Clasifica Uruguay", amount: "0", percentage: 0 },
      ],
      marSen: [
        { label: "Marruecos", amount: "0", percentage: 0 },
        { label: "Empate", amount: "0", percentage: 0 },
        { label: "Senegal", amount: "0", percentage: 0 },
      ],
      usaNed: [
        { label: "Clasifica Estados Unidos", amount: "0", percentage: 0 },
        { label: "Clasifica Paises Bajos", amount: "0", percentage: 0 },
      ],
      states: {
        argJpn: "Te falta jugar",
        braMex: "Sin jugar",
        jorGer: "Sin jugar",
        espUru: "Te falta jugar",
        marSen: "Te falta jugar",
        usaNed: "Sin jugar",
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
        { label: "Clasifica España", amount: "6.000", percentage: 60 },
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
        jorGer: "Resultado $6.000",
        espUru: "Tu jugada guardada",
        marSen: "Tu jugada guardada",
        usaNed: "Resultado $12.400",
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
        { label: "Clasifica España", amount: "3.500", percentage: 35 },
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
        jorGer: "Resultado $3.000",
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
        { label: "Clasifica España", amount: "5.000", percentage: 50 },
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
        jorGer: "Resultado $7.400",
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
        { label: "Clasifica España", amount: "4.000", percentage: 40 },
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
        jorGer: "Resultado $4.200",
        espUru: "Te falta jugar",
        marSen: "Tu jugada guardada",
        usaNed: "Resultado $8.501",
      },
    },
  }[persona];

  const matches: RawMatchViewModel[] = [
    {
      id: "arg-jpn",
      stage: "Fase de grupos",
      stageSortOrder: 1,
      groupLabel: "Grupo A",
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
      stageSortOrder: 1,
      groupLabel: "Grupo B",
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
      stageSortOrder: 14,
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
          userName: "Mari",
          allocations: [
            { label: "Clasifica Jordania", amount: "2.000" },
            { label: "Clasifica Alemania", amount: "8.000" },
          ],
          netAmount: -4000,
      grossAmount: 6000,
        },
        {
          userName: "Bato",
          allocations: [
            { label: "Clasifica Jordania", amount: "1.000" },
            { label: "Clasifica Alemania", amount: "9.000" },
          ],
          netAmount: -7000,
      grossAmount: 3000,
        },
      ],
    },
    {
      id: "esp-uru",
      stage: "Cuartos de final",
      stageSortOrder: 15,
      venue: "Dallas",
      kickoffLabel: "4 Jul · 18:00",
      status: "scheduled",
      statusLabel: "Abierto",
      marketType: "qualifies",
      marketTypeLabel: "Clasifica",
      userStateLabel: profiles.states.espUru,
      isEditable: true,
      home: { name: "España", flag: "🇪🇸", score: 0 },
      away: { name: "Uruguay", flag: "🇺🇾", score: 0 },
      allocation: profiles.espUru,
      consensus: [
        { label: "Clasifica España", percentage: 53 },
        { label: "Clasifica Uruguay", percentage: 47 },
      ],
      form: { home: "V V D V V", away: "V E V V D", homeGoals: "10", awayGoals: "9" },
      revealedTickets: [],
    },
    {
      id: "mar-sen",
      stage: "Fase de grupos",
      stageSortOrder: 1,
      groupLabel: "Grupo C",
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
      stageSortOrder: 14,
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
          userName: "Mari",
          allocations: [
            { label: "Clasifica Estados Unidos", amount: "3.000" },
            { label: "Clasifica Paises Bajos", amount: "7.000" },
          ],
          netAmount: 2400,
      grossAmount: 12400,
        },
      ],
    },
    ...buildPendingGroupMatches(),
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

export function getFallbackMatchesByStage(persona?: string | null): MatchStageGroup[] {
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
    liveMatches: matches.filter((match) => match.status === "live").length,
    pendingPicks: matches.filter((match) => match.userStateLabel === "Te falta jugar").length,
    settledToday: matches.filter((match) => match.status === "finished").length,
    yourNetAmount: profile.netAmount,
    yourGrossAmount: profile.grossAmount,
  };
}
