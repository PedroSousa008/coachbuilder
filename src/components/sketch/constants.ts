import type {
  SketchCalendarEventCategory,
  SketchFileFolder,
  SketchStaffNoteCategory,
  SketchTaskCategory,
} from "@/types";

export const EVENT_CATEGORY_LABELS: Record<SketchCalendarEventCategory, string> = {
  training: "Sessão de treino",
  match: "Jogo",
  player_review: "Revisão de jogador",
  opponent_analysis: "Análise ao adversário",
  task_deadline: "Prazo / tarefa",
  meeting: "Reunião",
  other: "Outro",
};

export const NOTE_CATEGORY_LABELS: Record<SketchStaffNoteCategory, string> = {
  training: "Notas de treino",
  player: "Notas de jogador",
  todo: "Notas de tarefas",
  meeting: "Notas de reunião",
  match: "Notas de jogo",
  opponent: "Notas do adversário",
  players_to_analyze: "Jogadores a analisar",
  session_reflection: "Reflexão de sessão",
  recruitment: "Recrutamento / observação",
  generic: "Geral",
};

export const TASK_CATEGORY_LABELS: Record<SketchTaskCategory, string> = {
  team: "Equipa",
  player: "Jogador",
  training: "Treino",
  match: "Jogo",
  staff: "Staff",
  personal: "Pessoal",
};

export const FILE_FOLDER_LABELS: Record<SketchFileFolder, string> = {
  training: "Treino",
  matchday: "Dia de jogo",
  opponents: "Adversários",
  team_talks: "Palestras de equipa",
  player_analysis: "Análise de jogador",
  staff_meetings: "Reuniões de staff",
  season_planning: "Planeamento da época",
  recruitment: "Recrutamento",
};
