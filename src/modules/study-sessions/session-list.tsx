"use client";

import type { StudySession } from "@/generated/prisma/client";
import Link from "next/link";
import { useActionState } from "react";
import { deleteSessionAction, type SessionActionState } from "./actions";
import { formatPercentage, percentage } from "./domain";
import styles from "./session-list.module.css";

type SessionListProps = {
  sessions: StudySession[];
  page: number;
  totalPages: number;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function formatDate(value: Date) {
  return dateFormatter.format(value);
}

function DeleteSessionForm({ session }: Readonly<{ session: StudySession }>) {
  const action = deleteSessionAction.bind(null, session.id);
  const [state, formAction, pending] = useActionState<SessionActionState, FormData>(action, {});

  return (
    <form
      className={styles.deleteForm}
      action={formAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Excluir a sessão de ${session.subject}? Esta ação não pode ser desfeita.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} aria-label={`Excluir sessão de ${session.subject}`}>
        {pending ? "Excluindo..." : "Excluir"}
      </button>
      {state.formError && <p role="alert">{state.formError}</p>}
    </form>
  );
}

export function SessionList({ sessions, page, totalPages }: Readonly<SessionListProps>) {
  if (totalPages === 0) {
    return (
      <section className={styles.empty} aria-labelledby="empty-title">
        <h2 id="empty-title">Seu histórico começa com uma sessão</h2>
        <p>Registre as questões de hoje para acompanhar acertos e erros por assunto.</p>
        <Link href="/sessions/new">Registrar primeira sessão</Link>
      </section>
    );
  }

  return (
    <>
      {sessions.length === 0 ? (
        <section className={styles.missingPage} aria-labelledby="missing-page-title">
          <h2 id="missing-page-title">Esta página não tem sessões</h2>
          <Link href="/sessions">Voltar ao início do histórico</Link>
        </section>
      ) : (
        <ol className={styles.list}>
          {sessions.map((session) => (
            <li className={styles.item} key={session.id}>
              <div className={styles.identity}>
                <time dateTime={session.studyDate.toISOString().slice(0, 10)}>
                  {formatDate(session.studyDate)}
                </time>
                <h2>{session.subject}</h2>
              </div>

              <dl className={styles.counts}>
                <div>
                  <dt>Acertos</dt>
                  <dd>{session.correctAnswers} ({formatPercentage(percentage(session.correctAnswers, session.totalQuestions))})</dd>
                </div>
                <div>
                  <dt>Erros</dt>
                  <dd>{session.wrongAnswers} ({formatPercentage(percentage(session.wrongAnswers, session.totalQuestions))})</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{session.totalQuestions}</dd>
                </div>
              </dl>

              <div className={styles.resources} aria-label={`Links de ${session.subject}`}>
                {session.questionListUrl && (
                  <a href={session.questionListUrl} target="_blank" rel="noopener noreferrer">
                    Lista de questões <span aria-hidden="true">↗</span>
                  </a>
                )}
                {session.wrongQuestionListUrl && (
                  <a href={session.wrongQuestionListUrl} target="_blank" rel="noopener noreferrer">
                    Lista de erros <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>

              <div className={styles.itemActions}>
                <Link href={`/sessions/${session.id}/edit`}>Editar</Link>
                <DeleteSessionForm session={session} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Paginação do histórico">
          {page > 1 ? <Link href={`/sessions?page=${page - 1}`}>Página anterior</Link> : <span />}
          <span>Página {page} de {totalPages}</span>
          {page < totalPages ? <Link href={`/sessions?page=${page + 1}`}>Próxima página</Link> : <span />}
        </nav>
      )}
    </>
  );
}
