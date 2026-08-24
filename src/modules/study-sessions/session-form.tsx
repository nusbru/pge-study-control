"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { percentage, resolveQuestionCounts } from "./domain";
import type { SessionActionState } from "./actions";
import styles from "./session-form.module.css";

type CountField = "totalQuestions" | "correctAnswers" | "wrongAnswers";

type FormValues = {
  studyDate: string;
  subject: string;
  totalQuestions: string;
  correctAnswers: string;
  wrongAnswers: string;
  questionListUrl: string;
  wrongQuestionListUrl: string;
};

export type SessionFormDefaults = {
  [Field in keyof FormValues]?: FormValues[Field] | number | null;
};

type SessionFormProps = {
  action: (previous: SessionActionState, formData: FormData) => Promise<SessionActionState>;
  defaultStudyDate: string;
  defaultValues?: SessionFormDefaults;
  submitLabel?: string;
};

const countFields: CountField[] = ["totalQuestions", "correctAnswers", "wrongAnswers"];

function toString(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function initialValues(defaultStudyDate: string, defaults: SessionFormDefaults = {}): FormValues {
  return {
    studyDate: toString(defaults.studyDate) || defaultStudyDate,
    subject: toString(defaults.subject),
    totalQuestions: toString(defaults.totalQuestions),
    correctAnswers: toString(defaults.correctAnswers),
    wrongAnswers: toString(defaults.wrongAnswers),
    questionListUrl: toString(defaults.questionListUrl),
    wrongQuestionListUrl: toString(defaults.wrongQuestionListUrl),
  };
}

function resolveCounts(values: Pick<FormValues, CountField>) {
  return resolveQuestionCounts({
    totalQuestions: values.totalQuestions === "" ? undefined : Number(values.totalQuestions),
    correctAnswers: values.correctAnswers === "" ? undefined : Number(values.correctAnswers),
    wrongAnswers: values.wrongAnswers === "" ? undefined : Number(values.wrongAnswers),
  });
}

export function SessionForm({
  action,
  defaultStudyDate,
  defaultValues,
  submitLabel = "Salvar sessão",
}: Readonly<SessionFormProps>) {
  const [state, formAction, pending] = useActionState(action, {});
  const [draft, setDraft] = useState(() => ({
    actionValues: undefined as Record<string, string> | undefined,
    values: initialValues(defaultStudyDate, defaultValues),
  }));
  const [calculation, setCalculation] = useState(() => ({
    actionValues: undefined as Record<string, string> | undefined,
    field: null as CountField | null,
  }));
  const hasNewActionValues = state.values !== undefined && state.values !== draft.actionValues;
  const values = hasNewActionValues
    ? initialValues(defaultStudyDate, state.values)
    : draft.values;
  const calculatedField = state.values !== undefined && state.values !== calculation.actionValues
    ? null
    : calculation.field;

  function setValues(nextValues: FormValues) {
    setDraft({ actionValues: state.values, values: nextValues });
  }

  function setCalculatedField(field: CountField | null) {
    setCalculation({ actionValues: state.values, field });
  }

  function updateCount(name: CountField, value: string) {
    const counts = {
      totalQuestions: values.totalQuestions,
      correctAnswers: values.correctAnswers,
      wrongAnswers: values.wrongAnswers,
      [name]: value,
    };

    if (name === calculatedField) {
      setValues({ ...values, [name]: value });
      setCalculatedField(null);
      return;
    }

    if (calculatedField && value !== "") counts[calculatedField] = "";
    const populated = countFields.filter((field) => counts[field] !== "");

    if (populated.length === 2) {
      const missingField = countFields.find((field) => counts[field] === "")!;
      try {
        const resolved = resolveCounts(counts);
        counts[missingField] = String(resolved[missingField]);
        setCalculatedField(missingField);
      } catch {
        setCalculatedField(null);
      }
    } else if (populated.length < 2) {
      setCalculatedField(null);
    }

    setValues({ ...values, ...counts });
  }

  let resolvedCounts: ReturnType<typeof resolveQuestionCounts> | null = null;
  let countError: string | null = null;
  if (countFields.every((field) => values[field] !== "")) {
    try {
      resolvedCounts = resolveCounts(values);
    } catch (error) {
      countError = error instanceof Error ? error.message : "Revise os valores das questões.";
    }
  }

  const fieldError = (name: keyof FormValues) => state.fieldErrors?.[name]?.join(" ");

  function describedBy(name: keyof FormValues) {
    return [
      fieldError(name) ? `${name}-error` : null,
      name === calculatedField ? `${name}-calculated` : null,
    ].filter(Boolean).join(" ") || undefined;
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.formError && (
        <p className={styles.formError} role="alert">{state.formError}</p>
      )}

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="studyDate">Data do estudo</label>
          <input
            id="studyDate"
            name="studyDate"
            type="date"
            required
            value={values.studyDate}
            aria-invalid={fieldError("studyDate") ? true : undefined}
            aria-describedby={describedBy("studyDate")}
            onChange={(event) => setValues({ ...values, studyDate: event.target.value })}
          />
          {fieldError("studyDate") && <p className={styles.fieldError} id="studyDate-error">{fieldError("studyDate")}</p>}
        </div>

        <div className={`${styles.field} ${styles.subjectField}`}>
          <label htmlFor="subject">Assunto</label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            maxLength={120}
            value={values.subject}
            aria-invalid={fieldError("subject") ? true : undefined}
            aria-describedby={describedBy("subject")}
            onChange={(event) => setValues({ ...values, subject: event.target.value })}
          />
          {fieldError("subject") && <p className={styles.fieldError} id="subject-error">{fieldError("subject")}</p>}
        </div>
      </div>

      <fieldset className={styles.countSection} aria-describedby={countError ? "question-count-error" : undefined}>
        <legend>Desempenho</legend>
        <p className={styles.countHelp}>Preencha dois valores; o terceiro será calculado.</p>
        <div className={styles.countGrid}>
          {([
            ["totalQuestions", "Total de questões"],
            ["correctAnswers", "Acertos"],
            ["wrongAnswers", "Erros"],
          ] as const).map(([name, label]) => (
            <div className={styles.field} key={name}>
              <label htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                type="number"
                inputMode="numeric"
                min={0}
                max={1_000_000}
                step={1}
                value={values[name]}
                aria-invalid={fieldError(name) || countError ? true : undefined}
                aria-describedby={describedBy(name)}
                onChange={(event) => updateCount(name, event.target.value)}
              />
              {name === calculatedField && (
                <p className={styles.calculated} id={`${name}-calculated`}>Calculado automaticamente</p>
              )}
              {fieldError(name) && <p className={styles.fieldError} id={`${name}-error`}>{fieldError(name)}</p>}
            </div>
          ))}
        </div>
        {countError && <p className={styles.countError} id="question-count-error" role="alert">{countError}</p>}
        {resolvedCounts && (
          <div className={styles.percentages} aria-label="Percentuais da sessão">
            <span>{percentage(resolvedCounts.correctAnswers, resolvedCounts.totalQuestions)}% de acertos</span>
            <span>{percentage(resolvedCounts.wrongAnswers, resolvedCounts.totalQuestions)}% de erros</span>
          </div>
        )}
      </fieldset>

      <fieldset className={styles.linksSection}>
        <legend>Links de apoio <span>(opcional)</span></legend>
        <div className={styles.field}>
          <label htmlFor="questionListUrl">Link da lista de questões</label>
          <input
            id="questionListUrl"
            name="questionListUrl"
            type="url"
            maxLength={2_048}
            placeholder="https://"
            value={values.questionListUrl}
            aria-invalid={fieldError("questionListUrl") ? true : undefined}
            aria-describedby={describedBy("questionListUrl")}
            onChange={(event) => setValues({ ...values, questionListUrl: event.target.value })}
          />
          {fieldError("questionListUrl") && <p className={styles.fieldError} id="questionListUrl-error">{fieldError("questionListUrl")}</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="wrongQuestionListUrl">Link da lista de erros</label>
          <input
            id="wrongQuestionListUrl"
            name="wrongQuestionListUrl"
            type="url"
            maxLength={2_048}
            placeholder="https://"
            value={values.wrongQuestionListUrl}
            aria-invalid={fieldError("wrongQuestionListUrl") ? true : undefined}
            aria-describedby={describedBy("wrongQuestionListUrl")}
            onChange={(event) => setValues({ ...values, wrongQuestionListUrl: event.target.value })}
          />
          {fieldError("wrongQuestionListUrl") && <p className={styles.fieldError} id="wrongQuestionListUrl-error">{fieldError("wrongQuestionListUrl")}</p>}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <button type="submit" disabled={pending}>{pending ? "Salvando..." : submitLabel}</button>
        <Link href="/sessions">Cancelar</Link>
      </div>
    </form>
  );
}
