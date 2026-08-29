import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { LocalTodayRedirect } from "@/modules/dashboard/local-today-redirect";
import { PerformanceBars } from "@/modules/dashboard/performance-bars";
import {
  parseDashboardPeriod,
  parseDashboardWindow,
  type DashboardPeriod,
} from "@/modules/dashboard/period";
import { getDashboard } from "@/modules/dashboard/queries";
import { formatPercentage } from "@/modules/study-sessions/domain";
import styles from "@/modules/dashboard/dashboard.module.css";

type DashboardPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    today?: string | string[];
  }>;
};

const periodLabels: Record<DashboardPeriod, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  all: "Tudo",
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const userId = await requireUserId();
  const { period: rawPeriod, today: rawToday } = await searchParams;
  const period = parseDashboardPeriod(rawPeriod);
  const today = parseDashboardWindow(period, rawToday);

  if (!today) {
    return (
      <main className="protectedPage">
        <header className="protectedPageHeader">
          <div>
            <h1>Desempenho</h1>
            <p>Uma leitura ponderada das questões para orientar o próximo assunto de estudo.</p>
          </div>
        </header>
        <LocalTodayRedirect period={period} today={today} />
      </main>
    );
  }

  const data = await getDashboard(userId, period, today);
  const overallCorrect = data.overall.correctPercentage === null
    ? null
    : formatPercentage(data.overall.correctPercentage);
  const overallWrong = data.overall.wrongPercentage === null
    ? null
    : formatPercentage(data.overall.wrongPercentage);

  return (
    <>
      <LocalTodayRedirect period={period} today={today} />
      <main className="protectedPage">
        <header className="protectedPageHeader">
          <div>
            <h1>Desempenho</h1>
            <p>Uma leitura ponderada das questões para orientar o próximo assunto de estudo.</p>
          </div>
          <Link className="primaryLink" href="/sessions/new">Nova sessão</Link>
        </header>

        <section className={styles.ledger} aria-label="Período e resumo do desempenho">
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <h2>Período</h2>
              <nav className={styles.filters} aria-label="Filtrar período">
                {(Object.entries(periodLabels) as [DashboardPeriod, string][]).map(([value, label]) => (
                  <Link
                    key={value}
                    href={{ pathname: "/dashboard", query: { period: value, today } }}
                    aria-current={period === value ? "page" : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <time className={styles.throughDate} dateTime={today}>
              Até {today.slice(8, 10)}/{today.slice(5, 7)}/{today.slice(0, 4)}
            </time>
          </div>

          <dl className={styles.summary}>
            <div>
              <dt>Questões</dt>
              <dd>{data.overall.totalQuestions}</dd>
            </div>
            <div className={styles.summaryCorrect}>
              <dt>Acertos</dt>
              <dd>
                {data.overall.correctAnswers}
                {overallCorrect && <>{" "}<span>{overallCorrect}</span></>}
              </dd>
            </div>
            <div className={styles.summaryWrong}>
              <dt>Erros</dt>
              <dd>
                {data.overall.wrongAnswers}
                {overallWrong && <>{" "}<span>{overallWrong}</span></>}
              </dd>
            </div>
            <div>
              <dt>Aproveitamento</dt>
              <dd>
                {overallCorrect === null
                  ? <>Não disponível <span>Sem questões no período</span></>
                  : <>{overallCorrect}{" "}<span>{data.overall.correctAnswers} de {data.overall.totalQuestions}</span></>}
              </dd>
            </div>
          </dl>
        </section>

        <PerformanceBars data={data} />
      </main>
    </>
  );
}
