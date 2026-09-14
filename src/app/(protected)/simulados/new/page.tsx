import { requireUserId } from "@/lib/auth-user";
import { ExamForm } from "@/modules/mock-exams/exam-form";

export default async function NewMockExamPage() {
  await requireUserId();
  return <main className="protectedPage"><header className="protectedPageHeader"><div>
    <h1>Novo simulado</h1><p>Prepare o registro para começar ou adicione um simulado já realizado.</p>
  </div></header><ExamForm /></main>;
}
