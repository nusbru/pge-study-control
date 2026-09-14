import Link from "next/link";
import type { MockExamPerformance } from "@/lib/api/contracts";
import { formatPercentage, percentage } from "@/modules/study-sessions/domain";
import { formatDuration, formatExamDate } from "./domain";
import styles from "./mock-exams.module.css";

export function MockExamPerformanceSection({ data }: Readonly<{ data: MockExamPerformance }>) {
  return <section className={`${styles.panel} ${styles.section}`} aria-labelledby="mock-exam-performance-title">
    <header className="protectedPageHeader"><div><h2 id="mock-exam-performance-title">Desempenho nos simulados</h2>
      <p>Resultados do período selecionado. O aproveitamento considera apenas simulados corrigidos.</p></div>
      <Link href="/simulados">Ver simulados</Link></header>
    {data.completedCount === 0 ? <p className={styles.help}>Nenhum simulado finalizado neste período. <Link href="/simulados/new">Registre seu primeiro simulado</Link> para acompanhar a evolução.</p> : <>
      <dl className={styles.counts}>
        <div><dt>Simulados finalizados</dt><dd>{data.completedCount}</dd></div>
        <div><dt>Correções pendentes</dt><dd>{data.completedCount - data.correctedCount}</dd></div>
        <div><dt>Questões corrigidas</dt><dd>{data.overall.totalQuestions}</dd></div>
        <div><dt>Acertos nos simulados</dt><dd>{data.overall.correctAnswers}</dd></div>
        <div><dt>Erros nos simulados</dt><dd>{data.overall.wrongAnswers}</dd></div>
        <div><dt>Aproveitamento nos simulados</dt><dd>{data.overall.correctPercentage == null ? "Aguardando correção"
          : `${formatPercentage(data.overall.correctPercentage)} · ${data.overall.correctAnswers} de ${data.overall.totalQuestions}`}</dd></div>
      </dl>
      <dl className={styles.counts}>
        <div><dt>Tempo total registrado</dt><dd>{data.timedCount ? formatDuration(data.totalDurationSeconds) : "Tempo não informado"}</dd></div>
        <div><dt>Duração média</dt><dd>{formatDuration(data.averageDurationSeconds)}</dd></div>
      </dl>
      <p className={styles.help}>Tempo calculado a partir de {data.timedCount} {data.timedCount === 1 ? "simulado com início e fim registrados" : "simulados com início e fim registrados"}.</p>
      {data.recent.length > 0 && <div className={styles.section}>
        <h3>Evolução do aproveitamento</h3>
        <p className={styles.help}>Até 12 simulados corrigidos mais recentes do período, em ordem de realização.</p>
        <ol className={styles.evolution}>{data.recent.map(exam => <li key={exam.id}>
          <Link href={`/simulados/${exam.id}`}>{formatExamDate(exam.examDate)}</Link>
          <div><span>{formatPercentage(percentage(exam.correctAnswers!, exam.totalQuestions))} · {exam.correctAnswers} acertos e {exam.wrongAnswers} erros em {exam.totalQuestions} questões</span>
            <progress className={styles.progress} value={exam.correctAnswers!} max={exam.totalQuestions} aria-label={`Aproveitamento do simulado de ${formatExamDate(exam.examDate)}`} />
          </div>
        </li>)}</ol>
      </div>}
    </>}
  </section>;
}
