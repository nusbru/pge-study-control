import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-user";
import { getMockExam } from "@/modules/mock-exams/queries";
import { DeleteExam, ExamTimer } from "@/modules/mock-exams/exam-controls";
import { feelingLabels, formatExamDate, statusLabel } from "@/modules/mock-exams/domain";
import { formatPercentage, percentage } from "@/modules/study-sessions/domain";
import styles from "@/modules/mock-exams/mock-exams.module.css";

export default async function MockExamPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireUserId();
  const exam = await getMockExam((await params).id);
  if (!exam) notFound();
  return <main className="protectedPage"><header className="protectedPageHeader"><div>
    <h1>Simulado de {formatExamDate(exam.examDate)}</h1><p>Consulte o tempo, a correção e suas impressões sobre esta prova.</p>
  </div><Link className="primaryLink" href={`/simulados/${exam.id}/edit`}>Editar simulado</Link></header>
    <div className={styles.panel}>
      <div className={styles.metadata}><span className={`${styles.status} ${exam.status === "RUNNING" ? styles.running : ""}`}>{statusLabel(exam.status)}</span>
        {exam.isHistorical && <span>Registrado após a realização</span>}</div>
      <dl className={styles.counts}>
        <div><dt>Total de questões</dt><dd>{exam.totalQuestions}</dd></div>
        <div><dt>Acertos</dt><dd>{exam.correctAnswers ?? "Não informados"}</dd></div>
        <div><dt>Erros</dt><dd>{exam.wrongAnswers ?? "Não informados"}</dd></div>
        <div><dt>Aproveitamento</dt><dd>{exam.correctAnswers == null ? "Aguardando correção" : formatPercentage(percentage(exam.correctAnswers, exam.totalQuestions))}</dd></div>
      </dl>
      <ExamTimer exam={exam} />
      <section className={styles.section} aria-labelledby="feeling-title"><h2 id="feeling-title">Como você se sentiu</h2>
        <p>{exam.feeling ? feelingLabels[exam.feeling as keyof typeof feelingLabels] : "Sentimento não informado"}</p>
        {exam.comment && <p className={styles.comment}>{exam.comment}</p>}
      </section>
      <footer className={`${styles.section} ${styles.actions}`}><Link href="/simulados">Voltar aos simulados</Link><DeleteExam id={exam.id} /></footer>
    </div>
  </main>;
}
