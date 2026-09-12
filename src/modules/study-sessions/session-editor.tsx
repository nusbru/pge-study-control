"use client";

import { createSessionAction, updateSessionAction } from "./actions";
import { SessionForm, type SessionFormDefaults } from "./session-form";

export function SessionEditor({ sessionId, defaultStudyDate, defaultValues, submitLabel }: Readonly<{
  sessionId?: string;
  defaultStudyDate?: string;
  defaultValues?: SessionFormDefaults;
  submitLabel?: string;
}>) {
  return <SessionForm
    action={sessionId ? updateSessionAction.bind(null, sessionId) : createSessionAction}
    defaultStudyDate={defaultStudyDate}
    defaultValues={defaultValues}
    submitLabel={submitLabel}
  />;
}
