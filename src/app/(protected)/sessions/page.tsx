import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { listSessions, listSubjects } from "@/modules/study-sessions/repository";
import { SessionList } from "@/modules/study-sessions/session-list";
import { parseSubjectFilter } from "@/modules/subjects/filter";
import { SubjectFilter } from "@/modules/subjects/subject-filter";

type SessionsPageProps = {
  searchParams: Promise<{ page?: string; subjectId?: string | string[] }>;
};

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const { page: rawPage, subjectId: rawSubjectId } = await searchParams;
  const subjectId = parseSubjectFilter(rawSubjectId);
  const parsedPage = Number(rawPage);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  await requireUserId();
  const [{ records, totalPages }, subjects] = await Promise.all([listSessions(page, subjectId), listSubjects()]);

  return (
    <main className="protectedPage">
      <header className="protectedPageHeader">
        <div>
          <h1>Sessões de estudo</h1>
          <p>Histórico de questões, acertos e pontos que merecem revisão.</p>
        </div>
        <Link className="primaryLink" href="/sessions/new">Nova sessão</Link>
      </header>
      <SubjectFilter subjects={subjects} subjectId={subjectId} pathname="/sessions" />
      <SessionList sessions={records} page={page} totalPages={totalPages} subjectId={subjectId} />
    </main>
  );
}
