import Link from "next/link";
import { QuestionType } from "@/lib/api/contracts";
import { requireUserId } from "@/lib/auth-user";
import { LocalTodayRedirect } from "@/modules/dashboard/local-today-redirect";
import { PerformanceBars } from "@/modules/dashboard/performance-bars";
import {
  parseDashboardPeriod,
  parseDashboardWindow,
  type DashboardPeriod,
} from "@/modules/dashboard/period";
import {
  parseDashboardQuestionType,
  serializeDashboardQuestionType,
} from "@/modules/dashboard/question-type-filter";
import { getDashboard } from "@/modules/dashboard/queries";
import { formatPercentage } from "@/modules/study-sessions/domain";
import { questionTypeLabels } from "@/modules/study-sessions/question-type";
import styles from "@/modules/dashboard/dashboard.module.css";
import { getMockExamPerformance } from "@/modules/mock-exams/queries";
import { MockExamPerformanceSection } from "@/modules/mock-exams/performance-section";
import { parseDashboardTab } from "@/modules/dashboard/tab";
import { listSubjects } from "@/modules/study-sessions/repository";
import { parseSubjectFilter } from "@/modules/subjects/filter";
import { SubjectFilter } from "@/modules/subjects/subject-filter";

type DashboardPageProps = {
  searchParams: Promise<{
    period?: string | string[];
    today?: string | string[];
    questionType?: string | string[];
    tab?: string | string[];
    subjectId?: string | string[];
  }>;
};

const periodLabels: Record<DashboardPeriod, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  all: "Tudo",
};

const questionTypeOptions = [
  { value: "all", label: "Todos" },
  { value: "jurisprudence", label: questionTypeLabels[QuestionType.JURISPRUDENCE] },
  { value: "black-letter-law", label: questionTypeLabels[QuestionType.BLACK_LETTER_LAW] },
  { value: "doctrine", label: questionTypeLabels[QuestionType.DOCTRINE] },
  { value: "unspecified", label: questionTypeLabels[QuestionType.UNSPECIFIED] },
] as const;

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireUserId();
  const {
    period: rawPeriod,
    today: rawToday,
    questionType: rawQuestionType,
    tab: rawTab,
    subjectId: rawSubjectId,
  } = await searchParams;
  const tab = parseDashboardTab(rawTab);
  const tabQuery = tab === "simulados" ? { tab } : {};
  const subjectId = parseSubjectFilter(rawSubjectId);
  const subjectQuery = subjectId ? { subjectId } : {};
  const description = tab === "simulados"
    ? "Acompanhe o aproveitamento, o tempo e a evolução dos seus simulados."
    : "Uma leitura ponderada das questões para orientar o próximo assunto de estudo.";
  const period = parseDashboardPeriod(rawPeriod);
  const questionType = parseDashboardQuestionType(rawQuestionType);
  const questionTypeParam = serializeDashboardQuestionType(questionType);
  const today = parseDashboardWindow(period, rawToday);

  if (!today) {
    return (
      <main className="protectedPage">
        <header className="protectedPageHeader">
          <div>
            <h1>Desempenho</h1>
            <p>{description}</p>
          </div>
        </header>
        <LocalTodayRedirect period={period} today={today} questionType={questionType} tab={tab} subjectId={subjectId} />
      </main>
    );
  }

  const [data, subjects] = tab === "sessoes"
    ? await Promise.all([getDashboard(period, today, questionType, subjectId), listSubjects()])
    : [null, []];
  const mockExams = tab === "simulados" ? await getMockExamPerformance(period, today) : null;
  const overallCorrect = data?.overall.correctPercentage == null
    ? null
    : formatPercentage(data.overall.correctPercentage);
  const overallWrong = data?.overall.wrongPercentage == null
    ? null
    : formatPercentage(data.overall.wrongPercentage);

  return (
    <>
      <LocalTodayRedirect period={period} today={today} questionType={questionType} tab={tab} subjectId={subjectId} />
      <main className="protectedPage">
        <header className="protectedPageHeader">
          <div>
            <h1>Desempenho</h1>
            <p>{description}</p>
          </div>
          <Link className="primaryLink" href={tab === "sessoes" ? "/sessions/new" : "/simulados/new"}>
            {tab === "sessoes" ? "Nova sessão" : "Novo simulado"}
          </Link>
        </header>

        <nav className={styles.tabs} aria-label="Abas do dashboard">
          <Link href={{ pathname: "/dashboard", query: { period, today, questionType: questionTypeParam, ...subjectQuery } }}
            scroll={false} aria-current={tab === "sessoes" ? "page" : undefined}>
            Sessões de estudo
          </Link>
          <Link href={{ pathname: "/dashboard", query: { period, today, questionType: questionTypeParam, tab: "simulados", ...subjectQuery } }}
            scroll={false} aria-current={tab === "simulados" ? "page" : undefined}>
            Simulados
          </Link>
        </nav>

        <section className={styles.ledger} aria-label="Filtros e resumo do desempenho">
          <div className={styles.filterRow}>
            <div className={styles.filterStack}>
              <div className={styles.filterControls}>
                <div className={styles.filterGroup}>
                  <h2>Período</h2>
                  <nav className={styles.filters} aria-label="Filtrar período">
                    {(Object.entries(periodLabels) as [DashboardPeriod, string][]).map(([value, label]) => (
                      <Link
                        key={value}
                        href={{
                          pathname: "/dashboard",
                          query: { period: value, today, questionType: questionTypeParam, ...tabQuery, ...subjectQuery },
                        }}
                        aria-current={period === value ? "page" : undefined}
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>
                </div>
                {tab === "sessoes" && <div className={styles.filterGroup}>
                  <h2>Tipo de questão das sessões</h2>
                  <nav className={styles.filters} aria-label="Filtrar tipo de questão">
                    {questionTypeOptions.map(({ value, label }) => (
                      <Link
                        key={value}
                        href={{ pathname: "/dashboard", query: { period, today, questionType: value, ...subjectQuery } }}
                        aria-current={questionTypeParam === value ? "page" : undefined}
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>
                </div>}
              </div>
              {tab === "sessoes" && (
                <SubjectFilter subjects={subjects} subjectId={subjectId} pathname="/dashboard"
                  query={{ period, today, questionType: questionTypeParam }} />
              )}
            </div>
            <time className={styles.throughDate} dateTime={today}>
              Até {today.slice(8, 10)}/{today.slice(5, 7)}/{today.slice(0, 4)}
            </time>
          </div>

          {data && <dl className={styles.summary}>
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
                  ? <>Não disponível <span>Sem questões nos filtros selecionados</span></>
                  : <>{overallCorrect}{" "}<span>{data.overall.correctAnswers} de {data.overall.totalQuestions}</span></>}
              </dd>
            </div>
          </dl>}
        </section>

        {data && <PerformanceBars data={data} filtered={!!subjectId || questionType !== "all"} />}
        {mockExams && <MockExamPerformanceSection data={mockExams} />}
      </main>
    </>
  );
}
