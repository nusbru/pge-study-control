"use client";

import { startTransition, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { mutateApi, navigateAfterMutation } from "@/lib/api/browser";
import type { MockExamResponse } from "@/lib/api/contracts";
import { formatDuration } from "./domain";
import styles from "./mock-exams.module.css";

export function DeleteExam({ id }: Readonly<{ id: string }>) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const busy = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const messageId = useId();
  useEffect(() => { if (confirm) cancel.current?.focus(); }, [confirm]);

  async function remove() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      await mutateApi(`/api/mock-exams/${id}`, "DELETE");
      navigateAfterMutation("/simulados");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir o simulado.");
      busy.current = false;
      setPending(false);
    }
  }

  return <div>
    {!confirm ? <button ref={trigger} className={`${styles.button} ${styles.danger}`} onClick={() => setConfirm(true)}>Excluir</button>
      : <div role="group" aria-labelledby={messageId}>
        <p id={messageId}>Excluir este simulado e seus resultados?</p>
        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.danger}`} disabled={pending} onClick={remove}>{pending ? "Excluindo…" : "Confirmar exclusão"}</button>
          <button ref={cancel} className={styles.button} disabled={pending} onClick={() => {
            setConfirm(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}>Cancelar</button>
        </div>
      </div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}

export function ExamTimer({ exam }: Readonly<{ exam: MockExamResponse }>) {
  const [now, setNow] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const busy = useRef(false);
  useEffect(() => {
    startTransition(() => setNow(Date.now()));
    if (exam.status !== "RUNNING") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [exam.status]);

  async function track(action: "start" | "finish") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      await mutateApi(`/api/mock-exams/${exam.id}/${action}`, "POST");
      navigateAfterMutation(`/simulados/${exam.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o cronômetro.");
      busy.current = false;
      setPending(false);
    }
  }

  const seconds = exam.status === "RUNNING" && exam.startedAt && now !== null
    ? (now - Date.parse(exam.startedAt)) / 1000 : exam.durationSeconds;
  const stamp = (value: string | null | undefined) => value && now !== null
    ? <time dateTime={value}>{new Date(value).toLocaleString("pt-BR")}</time> : "—";

  return <section className={styles.section} aria-labelledby="timer-title">
    <h2 id="timer-title">Tempo do simulado</h2>
    <p className={styles.timer} role="timer" aria-live="off" aria-label="Tempo gasto">
      {exam.status === "READY" ? "00:00:00" : exam.status === "RUNNING" && now === null ? "Carregando…" : formatDuration(seconds)}
    </p>
    {(exam.startedAt || exam.endedAt) && <dl className={styles.counts}>
      <div><dt>Início · horário local</dt><dd>{stamp(exam.startedAt)}</dd></div>
      <div><dt>Fim · horário local</dt><dd>{stamp(exam.endedAt)}</dd></div>
    </dl>}
    {exam.status !== "COMPLETED" && <>
      <p className={styles.help}>{exam.status === "RUNNING"
        ? "O tempo continua contando ao sair da página. Finalize quando concluir as questões."
        : "Ao iniciar, registramos a data e a hora. O tempo é calculado até você finalizar."}</p>
      <div className={styles.actions}>
        <button className="primaryLink" disabled={pending} onClick={() => track(exam.status === "READY" ? "start" : "finish")}>
          {pending ? "Salvando…" : exam.status === "READY" ? "Iniciar simulado" : "Finalizar simulado"}
        </button>
      </div>
    </>}
    {exam.status === "COMPLETED" && exam.correctAnswers == null && <p>
      Correção pendente. <Link href={`/simulados/${exam.id}/edit`}>Adicionar acertos ou erros</Link> quando estiver pronto.
    </p>}
    {error && <p role="alert" className={styles.error}>{error} <a href={`/simulados/${exam.id}`}>Recarregar simulado</a></p>}
  </section>;
}
