"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import type { MockExamRequest, MockExamResponse } from "@/lib/api/contracts";
import { mutateApi, navigateAfterMutation } from "@/lib/api/browser";
import { ApiError } from "@/lib/api/errors";
import { feelingLabels, localDateTime } from "./domain";
import { mockExamSchema } from "./schema";
import styles from "./mock-exams.module.css";

export function ExamForm({ exam }: Readonly<{ exam?: MockExamResponse }>) {
  const [historical, setHistorical] = useState(exam?.isHistorical ?? false);
  const [date, setDate] = useState(exam?.examDate ?? "");
  const [total, setTotal] = useState(exam ? String(exam.totalQuestions) : "");
  const [resultType, setResultType] = useState<"correctAnswers" | "wrongAnswers">("correctAnswers");
  const [result, setResult] = useState(exam?.correctAnswers == null ? "" : String(exam.correctAnswers));
  const [started, setStarted] = useState("");
  const [ended, setEnded] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string>();
  const errorRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const canCorrect = historical || exam?.status === "COMPLETED";

  useEffect(() => {
    startTransition(() => {
      if (!exam) setDate(localDateTime(new Date()).slice(0, 10));
      setStarted(exam?.startedAt ? localDateTime(new Date(exam.startedAt)) : "");
      setEnded(exam?.endedAt ? localDateTime(new Date(exam.endedAt)) : "");
      setReady(true);
    });
  }, [exam]);

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error, errors]);

  function feedback(field: string) {
    return errors[field] ? <p className={styles.error} id={`${field}-error`}>{errors[field]?.join(" ")}</p> : null;
  }
  function attributes(field: string) {
    return { "aria-invalid": errors[field] ? true as const : undefined,
      "aria-describedby": errors[field] ? `${field}-error` : undefined };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const iso = (value: string) => value ? Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : value : null;
    const body = {
      examDate: date, totalQuestions: total.trim() ? Number(total) : NaN, isHistorical: historical,
      correctAnswers: canCorrect && resultType === "correctAnswers" && result.trim() !== "" ? Number(result) : null,
      wrongAnswers: canCorrect && resultType === "wrongAnswers" && result.trim() !== "" ? Number(result) : null,
      feeling: data.get("feeling") || null, comment: data.get("comment") || null,
      startedAt: historical ? iso(started) : exam?.startedAt ?? null,
      endedAt: historical ? iso(ended) : exam?.endedAt ?? null, version: exam?.version ?? null,
    };
    const parsed = mockExamSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      setError("Revise os campos indicados para salvar o simulado.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError(undefined);
    setErrors({});
    try {
      const saved = await mutateApi<MockExamResponse>(exam ? `/api/mock-exams/${exam.id}` : "/api/mock-exams",
        exam ? "PUT" : "POST", parsed.data satisfies MockExamRequest);
      navigateAfterMutation(`/simulados/${saved.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o simulado.");
      if (cause instanceof ApiError) setErrors(cause.problem.errors ?? {});
      busy.current = false;
      setPending(false);
    }
  }

  const validResult = result.trim() !== "" && total.trim() !== "" && Number.isInteger(Number(total)) && Number(total) > 0
    && Number.isInteger(Number(result)) && Number(result) >= 0 && Number(result) <= Number(total);
  const derived = validResult ? String(Number(total) - Number(result)) : "";

  return <form className={`${styles.panel} ${styles.form}`} onSubmit={submit} noValidate aria-busy={pending}>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className={`${styles.errorBox} ${styles.error}`}>{error}</div>}
    {!exam && <fieldset disabled={pending}><legend>Como deseja registrar?</legend>
      <div className={styles.choices}>
        <label><input type="radio" name="mode" checked={!historical} onChange={() => setHistorical(false)} />Fazer com cronômetro</label>
        <label><input type="radio" name="mode" checked={historical} onChange={() => setHistorical(true)} />Já realizei este simulado</label>
      </div>
      <p className={styles.help}>{historical ? "Registre um simulado anterior. O tempo e a correção são opcionais." : "Salve o registro e inicie o cronômetro na página do simulado."}</p>
    </fieldset>}
    <div className={styles.row}>
      <div className={styles.field}><label htmlFor="examDate">Data do simulado</label>
        <input id="examDate" type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={pending} {...attributes("examDate")} />{feedback("examDate")}</div>
      <div className={styles.field}><label htmlFor="totalQuestions">Total de questões</label>
        <input id="totalQuestions" type="number" min="1" max="1000000" step="1" value={total} onChange={e => setTotal(e.target.value)} required disabled={pending} {...attributes("totalQuestions")} />{feedback("totalQuestions")}</div>
    </div>
    {historical && <fieldset disabled={pending || !ready}><legend>Tempo gasto (opcional)</legend>
      <div className={styles.row}>
        <div className={styles.field}><label htmlFor="startedAt">Data e hora de início</label><input id="startedAt" type="datetime-local" step="1" value={started} onChange={e => setStarted(e.target.value)} {...attributes("startedAt")} />{feedback("startedAt")}</div>
        <div className={styles.field}><label htmlFor="endedAt">Data e hora de fim</label><input id="endedAt" type="datetime-local" step="1" value={ended} onChange={e => setEnded(e.target.value)} {...attributes("endedAt")} />{feedback("endedAt")}</div>
      </div><p className={styles.help}>Use o seu horário local. A duração é calculada pela diferença entre início e fim.</p>
    </fieldset>}
    {canCorrect ? <fieldset disabled={pending}><legend>Correção (opcional)</legend>
      <div className={styles.field}><label htmlFor="resultType">Qual resultado deseja informar?</label>
        <select id="resultType" value={resultType} onChange={e => {
          setResultType(e.target.value as typeof resultType);
          setResult(derived);
        }}><option value="correctAnswers">Acertos</option><option value="wrongAnswers">Erros</option></select>
      </div>
      <div className={styles.row}>
        {(["correctAnswers", "wrongAnswers"] as const).map(field => <div key={field} className={styles.field}>
          <label htmlFor={field}>{field === "correctAnswers" ? "Acertos" : "Erros"}{field !== resultType ? " (calculados)" : ""}</label>
          <input id={field} type="number" min="0" max={total || "1000000"} step="1" readOnly={field !== resultType}
            value={field === resultType ? result : derived} onChange={e => setResult(e.target.value)} {...attributes(field)} />{feedback(field)}
        </div>)}
      </div>
      <p className={styles.help}>Informe apenas acertos ou erros. O outro valor é calculado pelo total. Deixe em branco se ainda não corrigiu.</p>
    </fieldset> : <p className={styles.help}>A correção ficará disponível depois que você finalizar o simulado.</p>}
    <fieldset disabled={pending}><legend>Como você se sentiu?</legend>
      <div className={styles.field}><label htmlFor="feeling">Sentimento (opcional)</label>
        <select id="feeling" name="feeling" defaultValue={exam?.feeling ?? ""} {...attributes("feeling")}>
          <option value="">Prefiro não informar</option>{Object.entries(feelingLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>{feedback("feeling")}
      </div>
      <div className={styles.field}><label htmlFor="comment">Comentário (opcional)</label>
        <textarea id="comment" name="comment" defaultValue={exam?.comment ?? ""} maxLength={2000} rows={4} {...attributes("comment")} />{feedback("comment")}
        <p className={styles.help}>Até 2.000 caracteres para registrar suas impressões.</p>
      </div>
    </fieldset>
    <div className={styles.actions}><button className="primaryLink" disabled={pending || !ready} type="submit">{pending ? "Salvando…" : "Salvar simulado"}</button>
      <Link href={exam ? `/simulados/${exam.id}` : "/simulados"}>Cancelar</Link></div>
  </form>;
}
