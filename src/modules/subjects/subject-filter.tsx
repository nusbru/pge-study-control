"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SubjectResponse } from "@/lib/api/contracts";
import { getSubjectGroup } from "./group";
import styles from "./subject-filter.module.css";

type SubjectFilterProps = {
  subjects: SubjectResponse[];
  subjectId?: string;
  pathname: "/dashboard" | "/sessions";
  query?: Record<string, string>;
};

export function SubjectFilter({ subjects, subjectId, pathname, query = {} }: Readonly<SubjectFilterProps>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const subject = subjects.find((item) => item.id === subjectId);
  const group = subject ? getSubjectGroup(subject.subject) : undefined;

  return (
    <div className={styles.field} aria-busy={pending}>
      <label htmlFor="subject-filter">Assunto</label>
      <select
        id="subject-filter"
        name="subjectId"
        value={subjectId ?? ""}
        disabled={pending}
        style={{ color: group?.color, backgroundColor: group?.backgroundColor }}
        onChange={(event) => {
          const params = new URLSearchParams(query);
          params.delete("page");
          if (event.target.value) params.set("subjectId", event.target.value);
          else params.delete("subjectId");
          const search = params.toString();
          startTransition(() => router.push(`${pathname}${search ? `?${search}` : ""}`, { scroll: false }));
        }}
      >
        <option value="" style={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}>Todos os assuntos</option>
        {subjectId && !subject && <option value={subjectId}>Assunto indisponível</option>}
        {subjects.map((item) => (
          <option key={item.id} value={item.id}
            style={{ color: getSubjectGroup(item.subject).color, backgroundColor: "var(--surface)" }}>
            {item.subject}
          </option>
        ))}
      </select>
      <span className={styles.status} role="status">{pending ? "Atualizando resultados..." : ""}</span>
    </div>
  );
}
