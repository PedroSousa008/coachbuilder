import type {
  Coach,
  Conversation,
  MatchClip,
  Message,
  NextMatch,
  Player,
  Tactic,
  TeamQuickStats,
  TrainingSession,
} from "@/types";
import { FORMATION_LAYOUTS } from "./formations";

function playersFor(formation: Tactic["formation"], prefix: string): Tactic["players"] {
  return FORMATION_LAYOUTS[formation].map((p, i) => ({
    ...p,
    id: `${prefix}-p${i}`,
  }));
}

export const mockCoach: Coach = {
  id: "coach-1",
  name: "Marcus Silva",
  club: "Northbridge FC U19",
  role: "Head Coach",
  email: "marcus@northbridgefc.example",
  plan: "free",
  tacticsCreated: 12,
  sessionsPlanned: 34,
  matchesAnalyzed: 8,
};

export const mockTeamStats: TeamQuickStats = {
  formLast5: ["W", "W", "D", "W", "L"],
  goalsFor: 28,
  goalsAgainst: 11,
  cleanSheets: 6,
};

export const mockNextMatch: NextMatch = {
  opponent: "Riverside Athletic",
  competition: "Regional Youth League",
  kickoff: "2026-04-13T15:00:00",
  venue: "home",
};

export const mockUpcomingSession: TrainingSession = {
  id: "sess-1",
  title: "Mid-block → high press triggers",
  date: "2026-04-11T18:30:00",
  durationMin: 90,
  intensity: "high",
  categories: ["Pressing", "Defensive shape", "Possession"],
  description:
    "Start with rondos, progress to 8v8 with cue-based pressing when the ball enters wide zones. Finish with set-piece defensive organisation.",
};

export const mockTactics: Tactic[] = [
  {
    id: "t1",
    name: "vs Riverside — wide overload",
    formation: "4-3-3",
    opponent: "Riverside Athletic",
    notes:
      "Full-back tucks inside on build; winger holds width. Trigger press when ball goes to their LB — jump with RW and CM.",
    matchesUsed: 4,
    wins: 3,
    losses: 1,
    players: playersFor("4-3-3", "t1"),
    updatedAt: "2026-04-08T10:00:00",
  },
  {
    id: "t2",
    name: "Compact 4-2-3-1 rest defence",
    formation: "4-2-3-1",
    opponent: "Harbor City",
    notes:
      "CAM screens pivot; double pivot stays connected. On regain, look for third-man through CAM lane within 5 seconds.",
    matchesUsed: 6,
    wins: 4,
    losses: 2,
    players: playersFor("4-2-3-1", "t2"),
    updatedAt: "2026-04-02T14:30:00",
  },
  {
    id: "t3",
    name: "Wing-back overload (3-5-2)",
    formation: "3-5-2",
    opponent: "Metro United",
    notes:
      "Stagger midfield three; one jumps to press, two cover. Target switches to free wing-back after baiting press.",
    matchesUsed: 2,
    wins: 2,
    losses: 0,
    players: playersFor("3-5-2", "t3"),
    updatedAt: "2026-03-28T09:15:00",
  },
];

export const mockPlayers: Player[] = [
  {
    id: "pl-1",
    name: "Tomás Almeida",
    position: "GK",
    age: 18,
    availability: "available",
    performance: "up",
    number: 1,
  },
  {
    id: "pl-2",
    name: "Luca Ferreira",
    position: "CB",
    age: 17,
    availability: "available",
    performance: "steady",
    number: 4,
  },
  {
    id: "pl-3",
    name: "Noah Kowalski",
    position: "CB",
    age: 18,
    availability: "doubt",
    performance: "down",
    number: 5,
  },
  {
    id: "pl-4",
    name: "Diego Martins",
    position: "LB",
    age: 17,
    availability: "available",
    performance: "up",
    number: 3,
  },
  {
    id: "pl-5",
    name: "James Okafor",
    position: "RB",
    age: 18,
    availability: "out",
    performance: "steady",
    number: 2,
  },
  {
    id: "pl-6",
    name: "Elias Berg",
    position: "CM",
    age: 18,
    availability: "available",
    performance: "up",
    number: 8,
  },
  {
    id: "pl-7",
    name: "Sven Nielsen",
    position: "CM",
    age: 17,
    availability: "available",
    performance: "steady",
    number: 6,
  },
  {
    id: "pl-8",
    name: "Rafa Costa",
    position: "CAM",
    age: 18,
    availability: "available",
    performance: "up",
    number: 10,
  },
  {
    id: "pl-9",
    name: "Mateo Rossi",
    position: "LW",
    age: 17,
    availability: "available",
    performance: "up",
    number: 11,
  },
  {
    id: "pl-10",
    name: "Kojo Mensah",
    position: "RW",
    age: 18,
    availability: "available",
    performance: "steady",
    number: 7,
  },
  {
    id: "pl-11",
    name: "André Duarte",
    position: "ST",
    age: 18,
    availability: "available",
    performance: "up",
    number: 9,
  },
];

export const mockSessions: TrainingSession[] = [
  mockUpcomingSession,
  {
    id: "sess-2",
    title: "Finishing under pressure",
    date: "2026-04-09T18:00:00",
    durationMin: 75,
    intensity: "medium",
    categories: ["Finishing", "Possession"],
    description: "1v1 + GK scenarios, cut-back patterns, and small-sided games to goal.",
  },
  {
    id: "sess-3",
    title: "Low block compactness",
    date: "2026-04-07T18:30:00",
    durationMin: 90,
    intensity: "low",
    categories: ["Defensive shape", "Recovery"],
    description: "Shape drills, channel defending, and transition to attack after regain.",
  },
  {
    id: "sess-4",
    title: "Pressing cues & rest defence",
    date: "2026-04-04T10:00:00",
    durationMin: 120,
    intensity: "high",
    categories: ["Pressing", "Defensive shape"],
    description: "Phase play with audible triggers; video debrief on half-time clips.",
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv-group",
    type: "group",
    title: "Northbridge U19 — Squad",
    subtitle: "24 members",
    avatarInitials: "NB",
    lastMessagePreview: "Luca: Set pieces at 17:45 tomorrow — who’s on delivery?",
    lastMessageAt: "2026-04-10T16:42:00",
    unread: 2,
    participantIds: ["coach-1", "pl-1", "pl-2", "pl-6"],
  },
  {
    id: "conv-dm-1",
    type: "dm",
    title: "Elias Berg",
    subtitle: "CM · #8",
    avatarInitials: "EB",
    lastMessagePreview: "You: Thanks — watch their LB stepping early on throw-ins.",
    lastMessageAt: "2026-04-10T12:05:00",
    participantIds: ["coach-1", "pl-6"],
  },
  {
    id: "conv-dm-2",
    type: "dm",
    title: "Tomás Almeida",
    subtitle: "GK · #1",
    avatarInitials: "TA",
    lastMessagePreview: "Tomás: Clip from last match is uploaded.",
    lastMessageAt: "2026-04-09T21:18:00",
    participantIds: ["coach-1", "pl-1"],
  },
];

export const mockMessages: Record<string, Message[]> = {
  "conv-group": [
    {
      id: "m1",
      conversationId: "conv-group",
      authorId: "pl-2",
      authorName: "Luca Ferreira",
      body: "Set pieces at 17:45 tomorrow — who’s on delivery?",
      sentAt: "2026-04-10T16:42:00",
    },
    {
      id: "m2",
      conversationId: "conv-group",
      authorId: "coach-1",
      authorName: "Marcus Silva",
      body: "I’ll take inswingers from the left. Rafa, you’re first man zone — stick to assignments we walked through.",
      sentAt: "2026-04-10T16:38:00",
    },
    {
      id: "m3",
      conversationId: "conv-group",
      authorId: "pl-8",
      authorName: "Rafa Costa",
      body: "Copy. I’ll communicate the switch if they go short to the front post.",
      sentAt: "2026-04-10T16:35:00",
    },
    {
      id: "m4",
      conversationId: "conv-group",
      authorId: "pl-6",
      authorName: "Elias Berg",
      body: "Coach — can we add 10’ of pressing rehearsal before the rondo?",
      sentAt: "2026-04-10T16:20:00",
    },
  ],
  "conv-dm-1": [
    {
      id: "dm1",
      conversationId: "conv-dm-1",
      authorId: "coach-1",
      authorName: "Marcus Silva",
      body: "Thanks — watch their LB stepping early on throw-ins.",
      sentAt: "2026-04-10T12:05:00",
    },
    {
      id: "dm2",
      conversationId: "conv-dm-1",
      authorId: "pl-6",
      authorName: "Elias Berg",
      body: "Noted. I’ll pinch inside when our winger shows short.",
      sentAt: "2026-04-10T11:58:00",
    },
  ],
  "conv-dm-2": [
    {
      id: "dm3",
      conversationId: "conv-dm-2",
      authorId: "pl-1",
      authorName: "Tomás Almeida",
      body: "Clip from last match is uploaded.",
      sentAt: "2026-04-09T21:18:00",
    },
  ],
};

export const mockClips: MatchClip[] = [
  {
    id: "c1",
    title: "Build-up — third-man through half-space",
    durationSec: 42,
    tags: ["Build-up", "Chance created"],
    thumbnailTone: "green",
  },
  {
    id: "c2",
    title: "Pressing trigger — sideways pass to FB",
    durationSec: 28,
    tags: ["Pressing trigger"],
    thumbnailTone: "slate",
  },
  {
    id: "c3",
    title: "Defensive mistake — line not stepping together",
    durationSec: 35,
    tags: ["Defensive mistake"],
    thumbnailTone: "amber",
  },
];
