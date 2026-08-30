import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-user";
import { updateSessionAction } from "@/modules/study-sessions/actions";
import { getSession } from "@/modules/study-sessions/repository";
import { SessionForm } from "@/modules/study-sessions/session-form";
import styles from "@/modules/study-sessions/session-form.module.css";

type EditSessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSessionPage({ params }: EditSessionPageProps) {
  const userId = await requireUserId();
  const { id } = await params;
  const session = await getSession(userId, id);
  if (!session) notFound();

  const action = updateSessionAction.bind(null, session.id);
  const studyDate = session.studyDate.toISOString().slice(0, 10);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Editar sessão</h1>
        <p>Corrija o registro sem alterar o restante do histórico.</p>
      </header>
      <section className={styles.panel} aria-label={`Editar sessão de ${session.subject}`}>
        <SessionForm
          action={action}
          defaultStudyDate={studyDate}
          defaultValues={{
            studyDate,
            subject: session.subject,
            questionType: session.questionType,
            totalQuestions: session.totalQuestions,
            correctAnswers: session.correctAnswers,
            wrongAnswers: session.wrongAnswers,
            questionListUrl: session.questionListUrl,
            wrongQuestionListUrl: session.wrongQuestionListUrl,
          }}
          submitLabel="Salvar alterações"
        />
      </section>
    </main>
  );
}
