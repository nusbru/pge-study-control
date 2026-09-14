import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-user";
import { getSession, listSubjects } from "@/modules/study-sessions/repository";
import { SessionEditor } from "@/modules/study-sessions/session-editor";
import styles from "@/modules/study-sessions/session-form.module.css";

type EditSessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSessionPage({ params }: EditSessionPageProps) {
  await requireUserId();
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();
  const subjects = await listSubjects();

  const studyDate = session.studyDate.toISOString().slice(0, 10);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Editar sessão</h1>
        <p>Corrija o registro sem alterar o restante do histórico.</p>
      </header>
      <section className={styles.panel} aria-label={`Editar sessão de ${session.subject}`}>
        <SessionEditor
          sessionId={session.id}
          subjects={subjects}
          defaultStudyDate={studyDate}
          defaultValues={{
            studyDate,
            subjectId: session.subjectId,
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
