import type { CSSProperties } from "react";
import Link from "next/link";
import { formatPercentage } from "@/modules/study-sessions/domain";
import type { DashboardData } from "./queries";
import styles from "./dashboard.module.css";

export function PerformanceBars({ data }: Readonly<{ data: DashboardData }>) {
  if (data.subjects.length === 0) {
    return (
      <section className={styles.empty} aria-labelledby="dashboard-empty-title">
        <h2 id="dashboard-empty-title">Ainda não há desempenho neste período</h2>
        <p>Registre uma sessão com questões para começar a comparar acertos e erros por assunto.</p>
        <Link href="/sessions/new">Registrar uma sessão</Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="performance-title">
      <header className={styles.performanceHeader}>
        <div>
          <h2 id="performance-title">Desempenho por assunto</h2>
          <p>Assuntos com mais questões aparecem primeiro.</p>
        </div>
        <div className={styles.legend} aria-label="Legenda">
          <span><i className={styles.correctKey} aria-hidden="true" />Acertos</span>
          <span><i className={styles.wrongKey} aria-hidden="true" />Erros</span>
        </div>
      </header>

      <ol className={styles.subjects}>
        {data.subjects.map((subject) => {
          const correct = formatPercentage(subject.correctPercentage);
          const wrong = formatPercentage(subject.wrongPercentage);
          const questionLabel = subject.totalQuestions === 1 ? "questão" : "questões";
          const accessibleLabel = `${subject.subject}: ${correct} de acertos e ${wrong} de erros em ${subject.totalQuestions} ${questionLabel}`;

          return (
            <li className={styles.subject} key={subject.subjectKey}>
              <div className={styles.subjectHeading}>
                <h3>{subject.subject}</h3>
                <span>{subject.totalQuestions} {questionLabel}</span>
              </div>
              <dl className={styles.subjectCounts}>
                <div className={styles.correctCount}>
                  <dt>Acertos</dt>
                  <dd>{subject.correctAnswers} acertos <span>{correct}</span></dd>
                </div>
                <div className={styles.wrongCount}>
                  <dt>Erros</dt>
                  <dd>{subject.wrongAnswers} erros <span>{wrong}</span></dd>
                </div>
              </dl>
              <div className={styles.bar} role="img" aria-label={accessibleLabel}>
                <span
                  className={styles.correctSegment}
                  style={{ width: `${subject.correctPercentage}%` } as CSSProperties}
                  aria-hidden="true"
                />
                <span
                  className={styles.wrongSegment}
                  style={{ width: `${subject.wrongPercentage}%` } as CSSProperties}
                  aria-hidden="true"
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
