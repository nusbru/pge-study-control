import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-user";
import { formatPercentage, percentage } from "@/modules/study-sessions/domain";
import { getSession } from "@/modules/study-sessions/repository";
import styles from "./session-details.module.css";

type SessionDetailsPageProps = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export default async function SessionDetailsPage({ params }: SessionDetailsPageProps) {
  const userId = await requireUserId();
  const { id } = await params;
  const session = await getSession(userId, id);
  if (!session) notFound();

  const correctPercentage = formatPercentage(
    percentage(session.correctAnswers, session.totalQuestions),
  );
  const wrongPercentage = formatPercentage(
    percentage(session.wrongAnswers, session.totalQuestions),
  );
  const hasMaterials = session.questionListUrl || session.wrongQuestionListUrl;

  return (
    <main className="protectedPage">
      <header className="protectedPageHeader">
        <div>
          <h1>Detalhes da sessão</h1>
          <p>Consulte os resultados e materiais registrados nesta sessão.</p>
        </div>
        <Link className="primaryLink" href={`/sessions/${session.id}/edit`}>
          Editar sessão
        </Link>
      </header>

      <section className={styles.panel} aria-labelledby="session-subject">
        <div className={styles.identity}>
          <time dateTime={session.studyDate.toISOString().slice(0, 10)}>
            {dateFormatter.format(session.studyDate)}
          </time>
          <h2 id="session-subject">{session.subject}</h2>
        </div>

        <dl className={styles.counts}>
          <div>
            <dt>Acertos</dt>
            <dd>{session.correctAnswers} ({correctPercentage})</dd>
          </div>
          <div>
            <dt>Erros</dt>
            <dd>{session.wrongAnswers} ({wrongPercentage})</dd>
          </div>
          <div>
            <dt>Total de questões</dt>
            <dd>{session.totalQuestions}</dd>
          </div>
        </dl>

        {hasMaterials && (
          <section className={styles.resources} aria-label="Materiais da sessão">
            <h3>Materiais</h3>
            <div>
              {session.questionListUrl && (
                <a
                  href={session.questionListUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Lista de questões (abre em nova aba)"
                >
                  Lista de questões <span aria-hidden="true">↗</span>
                </a>
              )}
              {session.wrongQuestionListUrl && (
                <a
                  href={session.wrongQuestionListUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Lista de erros (abre em nova aba)"
                >
                  Lista de erros <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </section>
        )}

        <footer className={styles.actions}>
          <Link href="/sessions">Voltar ao histórico</Link>
        </footer>
      </section>
    </main>
  );
}
