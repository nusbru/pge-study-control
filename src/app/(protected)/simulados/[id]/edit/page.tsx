import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-user";
import { getMockExam } from "@/modules/mock-exams/queries";
import { ExamForm } from "@/modules/mock-exams/exam-form";

export default async function EditMockExamPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireUserId();
  const exam = await getMockExam((await params).id);
  if (!exam) notFound();
  return <main className="protectedPage"><header className="protectedPageHeader"><div>
    <h1>Editar simulado</h1><p>Atualize o registro, adicione sua correção e conte como se sentiu.</p>
  </div></header><ExamForm exam={exam} /></main>;
}
