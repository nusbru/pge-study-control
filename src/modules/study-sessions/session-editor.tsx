"use client";

import { createSessionAction, updateSessionAction } from "./actions";
import { SessionForm, type SessionFormDefaults } from "./session-form";
import type { SubjectResponse } from "@/lib/api/contracts";

export function SessionEditor({ sessionId, subjects, defaultStudyDate, defaultValues, submitLabel }: Readonly<{
  sessionId?: string;
  subjects: SubjectResponse[];
  defaultStudyDate?: string;
  defaultValues?: SessionFormDefaults;
  submitLabel?: string;
}>) {
  return <SessionForm
    action={sessionId ? updateSessionAction.bind(null, sessionId) : createSessionAction}
    subjects={subjects}
    defaultStudyDate={defaultStudyDate}
    defaultValues={defaultValues}
    submitLabel={submitLabel}
  />;
}
