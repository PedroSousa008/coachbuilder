export type PersonalizationRequestStatus = "requested" | "approved" | "declined";

export type FullPersonalizationRequestPublic = {
  id: string;
  status: PersonalizationRequestStatus;
  requestedAt: string;
  approvedAt: string | null;
  declinedAt: string | null;
  scheduledFor: string | null;
  contactEmail: string;
  notesFromCoach: string | null;
  preferredDateNotes: string | null;
  adminNotes: string | null;
};

