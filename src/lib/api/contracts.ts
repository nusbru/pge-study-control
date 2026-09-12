import type { components } from "./generated";

export type SessionResponse = components["schemas"]["SessionResponse"];
export type SessionRequest = components["schemas"]["SessionRequest"];
export type SessionPage = components["schemas"]["SessionPage"];
export type DashboardData = components["schemas"]["DashboardResponse"];
export type CurrentUser = components["schemas"]["CurrentUser"];

// The view model retains Date objects supported by React server-component serialization.
export type StudySession = Omit<SessionResponse, "studyDate" | "createdAt" | "updatedAt"> & {
  studyDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const QuestionType = {
  JURISPRUDENCE: "JURISPRUDENCE",
  BLACK_LETTER_LAW: "BLACK_LETTER_LAW",
  DOCTRINE: "DOCTRINE",
  UNSPECIFIED: "UNSPECIFIED",
} as const;
export type QuestionType = typeof QuestionType[keyof typeof QuestionType];

export function sessionViewModel(session: SessionResponse): StudySession {
  return {
    ...session,
    studyDate: new Date(`${session.studyDate}T00:00:00.000Z`),
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  };
}
