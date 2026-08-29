import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { listSessions } from "@/modules/study-sessions/repository";
import { SessionList } from "@/modules/study-sessions/session-list";

type SessionsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const { page: rawPage } = await searchParams;
  const parsedPage = Number(rawPage);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const userId = await requireUserId();
  const { records, totalPages } = await listSessions(userId, page);

  return (
    <main className="protectedPage">
      <header className="protectedPageHeader">
        <div>
          <h1>Sessões de estudo</h1>
          <p>Histórico de questões, acertos e pontos que merecem revisão.</p>
        </div>
        <Link className="primaryLink" href="/sessions/new">Nova sessão</Link>
      </header>
      <SessionList sessions={records} page={page} totalPages={totalPages} />
    </main>
  );
}
