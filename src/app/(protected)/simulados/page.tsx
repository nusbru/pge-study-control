import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { listMockExams } from "@/modules/mock-exams/queries";
import { DeleteExam } from "@/modules/mock-exams/exam-controls";
import { formatDuration, formatExamDate, statusLabel } from "@/modules/mock-exams/domain";
import { formatPercentage, percentage } from "@/modules/study-sessions/domain";
import styles from "@/modules/mock-exams/mock-exams.module.css";

export default async function MockExamsPage({ searchParams }: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  await requireUserId();
  const raw = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(raw) && raw > 0 && raw <= 2147483647 ? raw : 1;
  const data = await listMockExams(page);
  return <main className="protectedPage">
    <header className="protectedPageHeader"><div><h1>Simulados</h1><p>Registre suas provas, acompanhe o tempo e aprenda com cada resultado.</p></div>
      <Link className="primaryLink" href="/simulados/new">Novo simulado</Link></header>
    {data.records.length === 0 ? <section className={styles.panel}>
      <h2>{page > 1 ? "Nenhum simulado nesta página" : "Seu próximo simulado começa aqui"}</h2>
      <p className={styles.help}>{page > 1 ? "Volte ao início do histórico para consultar seus registros." : "Inicie um simulado com cronômetro ou registre um que você já realizou. A correção pode ser adicionada depois."}</p>
      {page > 1 && <Link href="/simulados">Voltar à primeira página</Link>}
    </section> : <ul className={styles.list}>{data.records.map(exam => <li className={styles.entry} key={exam.id}>
      <div><h2><Link href={`/simulados/${exam.id}`}>Simulado de {formatExamDate(exam.examDate)}</Link></h2>
        <div className={styles.metadata}>
          <span className={`${styles.status} ${exam.status === "RUNNING" ? styles.running : ""}`}>{statusLabel(exam.status)}</span>
          <span>{exam.totalQuestions} questões</span>
          <span>{exam.status === "RUNNING" ? "Cronômetro em execução" : exam.status === "READY" ? "Aguardando início" : formatDuration(exam.durationSeconds)}</span>
        </div>
        <p className={styles.help}>{exam.correctAnswers == null ? exam.status === "COMPLETED" ? "Correção pendente" : "Resultado disponível após finalizar"
          : `${exam.correctAnswers} acertos · ${exam.wrongAnswers} erros · ${formatPercentage(percentage(exam.correctAnswers, exam.totalQuestions))} de aproveitamento`}</p>
      </div>
      <div className={styles.actions}><Link href={`/simulados/${exam.id}`}>Visualizar</Link><Link href={`/simulados/${exam.id}/edit`}>Editar</Link><DeleteExam id={exam.id} /></div>
    </li>)}</ul>}
    {data.totalPages > 1 && <nav className={styles.pagination} aria-label="Páginas de simulados">
      {page > 1 && <Link href={`/simulados?page=${Math.min(page - 1, data.totalPages)}`}>Anterior</Link>}
      <span>Página {page} de {data.totalPages}</span>
      {page < data.totalPages && <Link href={`/simulados?page=${page + 1}`}>Próxima</Link>}
    </nav>}
  </main>;
}
