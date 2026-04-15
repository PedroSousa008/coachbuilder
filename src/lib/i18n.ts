export const SUPPORTED_LANGUAGES = ["pt-PT", "en", "es", "fr", "it", "de"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "pt-PT";

export type TranslationKey =
  | "app.loading"
  | "shell.dashboard"
  | "shell.tactics"
  | "shell.trainingPlans"
  | "shell.messages"
  | "shell.sketchArea"
  | "shell.team"
  | "shell.calendar"
  | "shell.profile"
  | "shell.settings"
  | "shell.admin"
  | "shell.database"
  | "shell.coachBuilder"
  | "nav.home"
  | "nav.dashboard"
  | "nav.tactics"
  | "nav.training"
  | "nav.messages"
  | "nav.sketch"
  | "nav.team"
  | "nav.calendar"
  | "nav.profile"
  | "nav.settings"
  | "nav.admin"
  | "nav.database"
  | "header.openMenu"
  | "header.notifications"
  | "header.openChat"
  | "sidebar.operatingSystem"
  | "sidebar.logout"
  | "sidebar.proBlurb"
  | "sidebar.freeBlurb"
  | "sidebar.plansAndColor"
  | "settings.language.title"
  | "settings.language.description"
  | "settings.language.current"
  | "settings.language.note"
  | "settings.account"
  | "settings.accountHelp"
  | "settings.editProfile"
  | "settings.notifications"
  | "settings.notificationsDesc"
  | "settings.notif.newMessages.label"
  | "settings.notif.newMessages.desc"
  | "settings.notif.sessionReminder.label"
  | "settings.notif.sessionReminder.desc"
  | "settings.notif.matchday.label"
  | "settings.notif.matchday.desc";

type Dict = Record<TranslationKey, Record<AppLanguage, string>>;

const dict: Dict = {
  "app.loading": {
    "pt-PT": "A carregar…",
    en: "Loading…",
    es: "Cargando…",
    fr: "Chargement…",
    it: "Caricamento…",
    de: "Wird geladen…",
  },
  "shell.dashboard": {
    "pt-PT": "Dashboard",
    en: "Dashboard",
    es: "Panel",
    fr: "Tableau de bord",
    it: "Dashboard",
    de: "Dashboard",
  },
  "shell.tactics": { "pt-PT": "Táticas", en: "Tactics", es: "Tácticas", fr: "Tactiques", it: "Tattiche", de: "Taktik" },
  "shell.trainingPlans": {
    "pt-PT": "Planos de treino",
    en: "Training Plans",
    es: "Planes de entrenamiento",
    fr: "Plans d'entraînement",
    it: "Piani di allenamento",
    de: "Trainingspläne",
  },
  "shell.messages": { "pt-PT": "Mensagens", en: "Messages", es: "Mensajes", fr: "Messages", it: "Messaggi", de: "Nachrichten" },
  "shell.sketchArea": {
    "pt-PT": "Sketch Area",
    en: "Sketch Area",
    es: "Área Sketch",
    fr: "Zone Sketch",
    it: "Area Sketch",
    de: "Sketch-Bereich",
  },
  "shell.team": { "pt-PT": "Equipa", en: "Team", es: "Equipo", fr: "Équipe", it: "Squadra", de: "Team" },
  "shell.calendar": { "pt-PT": "Calendário", en: "Calendar", es: "Calendario", fr: "Calendrier", it: "Calendario", de: "Kalender" },
  "shell.profile": { "pt-PT": "Perfil", en: "Profile", es: "Perfil", fr: "Profil", it: "Profilo", de: "Profil" },
  "shell.settings": { "pt-PT": "Definições", en: "Settings", es: "Ajustes", fr: "Paramètres", it: "Impostazioni", de: "Einstellungen" },
  "shell.admin": { "pt-PT": "Admin", en: "Admin", es: "Admin", fr: "Admin", it: "Admin", de: "Admin" },
  "shell.database": { "pt-PT": "Base de dados", en: "Database", es: "Base de datos", fr: "Base de données", it: "Database", de: "Datenbank" },
  "shell.coachBuilder": { "pt-PT": "CoachBuilder", en: "CoachBuilder", es: "CoachBuilder", fr: "CoachBuilder", it: "CoachBuilder", de: "CoachBuilder" },
  "nav.home": { "pt-PT": "Início", en: "Home", es: "Inicio", fr: "Accueil", it: "Home", de: "Start" },
  "nav.dashboard": { "pt-PT": "Dashboard", en: "Dashboard", es: "Panel", fr: "Tableau de bord", it: "Dashboard", de: "Dashboard" },
  "nav.tactics": { "pt-PT": "Táticas", en: "Tactics", es: "Tácticas", fr: "Tactiques", it: "Tattiche", de: "Taktik" },
  "nav.training": { "pt-PT": "Treino", en: "Training", es: "Entrenamiento", fr: "Entraînement", it: "Allenamento", de: "Training" },
  "nav.messages": { "pt-PT": "Mensagens", en: "Messages", es: "Mensajes", fr: "Messages", it: "Messaggi", de: "Nachrichten" },
  "nav.sketch": { "pt-PT": "Sketch", en: "Sketch", es: "Sketch", fr: "Sketch", it: "Sketch", de: "Sketch" },
  "nav.team": { "pt-PT": "Equipa", en: "Team", es: "Equipo", fr: "Équipe", it: "Squadra", de: "Team" },
  "nav.calendar": { "pt-PT": "Calendário", en: "Calendar", es: "Calendario", fr: "Calendrier", it: "Calendario", de: "Kalender" },
  "nav.profile": { "pt-PT": "Perfil", en: "Profile", es: "Perfil", fr: "Profil", it: "Profilo", de: "Profil" },
  "nav.settings": { "pt-PT": "Definições", en: "Settings", es: "Ajustes", fr: "Paramètres", it: "Impostazioni", de: "Einstellungen" },
  "nav.admin": { "pt-PT": "Admin", en: "Admin", es: "Admin", fr: "Admin", it: "Admin", de: "Admin" },
  "nav.database": { "pt-PT": "Base de dados", en: "Database", es: "Base de datos", fr: "Base de données", it: "Database", de: "Datenbank" },
  "header.openMenu": { "pt-PT": "Abrir menu", en: "Open menu", es: "Abrir menú", fr: "Ouvrir le menu", it: "Apri menu", de: "Menü öffnen" },
  "header.notifications": { "pt-PT": "Notificações", en: "Notifications", es: "Notificaciones", fr: "Notifications", it: "Notifiche", de: "Benachrichtigungen" },
  "header.openChat": { "pt-PT": "Abrir chat", en: "Open chat", es: "Abrir chat", fr: "Ouvrir le chat", it: "Apri chat", de: "Chat öffnen" },
  "sidebar.operatingSystem": {
    "pt-PT": "Sistema operativo",
    en: "Operating system",
    es: "Sistema operativo",
    fr: "Système d'exploitation",
    it: "Sistema operativo",
    de: "Betriebssystem",
  },
  "sidebar.logout": { "pt-PT": "Sair", en: "Log out", es: "Cerrar sesión", fr: "Se déconnecter", it: "Disconnetti", de: "Abmelden" },
  "sidebar.proBlurb": {
    "pt-PT": "Coach Pro desbloqueia táticas, treino, sketch workspace e ferramentas de equipa.",
    en: "Coach Pro unlocks tactics, training, sketch workspace and team tools.",
    es: "Coach Pro desbloquea tácticas, entrenamiento, sketch workspace y herramientas de equipo.",
    fr: "Coach Pro débloque tactiques, entraînement, espace sketch et outils d'équipe.",
    it: "Coach Pro sblocca tattiche, allenamento, sketch workspace e strumenti squadra.",
    de: "Coach Pro schaltet Taktik, Training, Sketch-Workspace und Team-Tools frei.",
  },
  "sidebar.freeBlurb": {
    "pt-PT": "Plano Free: apenas chat da equipa. Faz upgrade em Definições para desbloquear o workspace completo.",
    en: "Free plan: squad chat only. Upgrade in Settings to unlock the full workspace.",
    es: "Plan Free: solo chat del equipo. Mejora en Ajustes para desbloquear todo el espacio.",
    fr: "Plan Free : chat d'équipe uniquement. Passez à niveau dans Paramètres pour tout débloquer.",
    it: "Piano Free: solo chat squadra. Fai upgrade in Impostazioni per lo spazio completo.",
    de: "Free-Plan: nur Team-Chat. Upgrade in den Einstellungen für den vollen Workspace.",
  },
  "sidebar.plansAndColor": {
    "pt-PT": "Planos e cor da equipa",
    en: "Plans & team color",
    es: "Planes y color del equipo",
    fr: "Forfaits et couleur d'équipe",
    it: "Piani e colore squadra",
    de: "Pläne & Teamfarbe",
  },
  "settings.language.title": {
    "pt-PT": "Idioma",
    en: "Language",
    es: "Idioma",
    fr: "Langue",
    it: "Lingua",
    de: "Sprache",
  },
  "settings.language.description": {
    "pt-PT": "Escolhe o idioma da aplicação.",
    en: "Choose the application language.",
    es: "Elige el idioma de la aplicación.",
    fr: "Choisissez la langue de l'application.",
    it: "Scegli la lingua dell'applicazione.",
    de: "Wähle die Sprache der Anwendung.",
  },
  "settings.language.current": {
    "pt-PT": "Idioma atual",
    en: "Current language",
    es: "Idioma actual",
    fr: "Langue actuelle",
    it: "Lingua attuale",
    de: "Aktuelle Sprache",
  },
  "settings.language.note": {
    "pt-PT": "Português é sempre Português de Portugal (pt-PT).",
    en: "Portuguese is always Portuguese from Portugal (pt-PT).",
    es: "El portugués siempre es portugués de Portugal (pt-PT).",
    fr: "Le portugais est toujours le portugais du Portugal (pt-PT).",
    it: "Il portoghese è sempre portoghese del Portogallo (pt-PT).",
    de: "Portugiesisch ist immer Portugiesisch aus Portugal (pt-PT).",
  },
  "settings.account": { "pt-PT": "Conta", en: "Account", es: "Cuenta", fr: "Compte", it: "Account", de: "Konto" },
  "settings.accountHelp": {
    "pt-PT": "Email e palavra-passe estão guardados neste dispositivo. Para alterar a palavra-passe, contacta o suporte.",
    en: "Email and password are stored on this device. To change your password, contact support.",
    es: "Email y contraseña se guardan en este dispositivo. Para cambiarla, contacta con soporte.",
    fr: "Email et mot de passe sont stockés sur cet appareil. Pour changer le mot de passe, contactez le support.",
    it: "Email e password sono salvati su questo dispositivo. Per cambiarla, contatta il supporto.",
    de: "E-Mail und Passwort werden auf diesem Gerät gespeichert. Für Änderungen kontaktiere den Support.",
  },
  "settings.editProfile": {
    "pt-PT": "Editar perfil",
    en: "Edit profile",
    es: "Editar perfil",
    fr: "Modifier le profil",
    it: "Modifica profilo",
    de: "Profil bearbeiten",
  },
  "settings.notifications": {
    "pt-PT": "Notificações",
    en: "Notifications",
    es: "Notificaciones",
    fr: "Notifications",
    it: "Notifiche",
    de: "Benachrichtigungen",
  },
  "settings.notificationsDesc": {
    "pt-PT": "Escolhe o que chega ao teu telemóvel no dia de jogo.",
    en: "Choose what reaches your phone on matchday.",
    es: "Elige qué llega a tu móvil en día de partido.",
    fr: "Choisissez ce qui arrive sur votre téléphone le jour du match.",
    it: "Scegli cosa ricevi sul telefono nel giorno della partita.",
    de: "Wähle, was dich am Spieltag auf dem Handy erreicht.",
  },
  "settings.notif.newMessages.label": {
    "pt-PT": "Novas mensagens do plantel",
    en: "New squad messages",
    es: "Nuevos mensajes del equipo",
    fr: "Nouveaux messages de l'équipe",
    it: "Nuovi messaggi della squadra",
    de: "Neue Teamnachrichten",
  },
  "settings.notif.newMessages.desc": {
    "pt-PT": "Chat de grupo e mensagens diretas",
    en: "Group chat and DMs",
    es: "Chat de grupo y mensajes directos",
    fr: "Chat de groupe et messages privés",
    it: "Chat di gruppo e messaggi diretti",
    de: "Gruppenchat und Direktnachrichten",
  },
  "settings.notif.sessionReminder.label": {
    "pt-PT": "Lembretes de treino",
    en: "Session reminders",
    es: "Recordatorios de entrenamiento",
    fr: "Rappels d'entraînement",
    it: "Promemoria allenamento",
    de: "Trainingserinnerungen",
  },
  "settings.notif.sessionReminder.desc": {
    "pt-PT": "24h antes do treino",
    en: "24h before training",
    es: "24h antes del entrenamiento",
    fr: "24h avant l'entraînement",
    it: "24h prima dell'allenamento",
    de: "24h vor dem Training",
  },
  "settings.notif.matchday.label": {
    "pt-PT": "Resumo de dia de jogo",
    en: "Matchday brief",
    es: "Resumen de día de partido",
    fr: "Brief de jour de match",
    it: "Brief del giorno partita",
    de: "Spieltag-Briefing",
  },
  "settings.notif.matchday.desc": {
    "pt-PT": "Onze inicial e PDF de bolas paradas (brevemente)",
    en: "Lineup & set-piece PDF (soon)",
    es: "Once inicial y PDF de jugadas a balón parado (pronto)",
    fr: "Composition et PDF coups de pied arrêtés (bientôt)",
    it: "Formazione e PDF palle inattive (presto)",
    de: "Aufstellung & Standardsituationen-PDF (bald)",
  },
};

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  "pt-PT": "Português (Portugal)",
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
};

export function isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
  return !!value && SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function tFor(language: AppLanguage, key: TranslationKey): string {
  const line = dict[key];
  return line[language] ?? line[DEFAULT_LANGUAGE];
}
