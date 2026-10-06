"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SubjectResponse } from "@/lib/api/contracts";
import { getSubjectGroup } from "@/modules/subjects/group";
import { SubjectFilter } from "@/modules/subjects/subject-filter";
import fieldStyles from "@/modules/subjects/subject-filter.module.css";
import styles from "./dashboard.module.css";
import { Icon } from "@/components/ui/icon";

type DetailedSearchProps = {
  subjects: SubjectResponse[];
  subjectId?: string;
  subjectGroup?: string;
  query: Record<string, string>;
};

export function DetailedSearch({ subjects, subjectId, subjectGroup, query }: Readonly<DetailedSearchProps>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeCount = Number(!!subjectId) + Number(!!subjectGroup);
  const [open, setOpen] = useState(activeCount > 0);
  const groups = [...new Set(subjects.map((subject) => getSubjectGroup(subject.subject).code)
    .filter((code): code is string => code !== null))].sort();
  const availableSubjects = subjectGroup
    ? subjects.filter((subject) => getSubjectGroup(subject.subject).code === subjectGroup)
    : subjects;
  const selectedGroup = subjectGroup ? getSubjectGroup(`${subjectGroup}00`) : undefined;

  return (
    <details className={styles.detailedSearch} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className={styles.searchIcon}><Icon name="search" width="20" height="20" /></span>
        Busca detalhada
        {activeCount > 0 && <span className={styles.activeFilters}>
          {activeCount} {activeCount === 1 ? "filtro ativo" : "filtros ativos"}
        </span>}
      </summary>
      <p id="subject-group-help" className={styles.filterHelp}>
        O grupo corresponde aos dois primeiros dígitos do código do assunto.
      </p>
      <fieldset className={styles.detailedFields} disabled={pending} aria-busy={pending} aria-label="Filtrar por grupo e assunto">
        <div className={fieldStyles.field}>
          <label htmlFor="subject-group-filter">Grupo de assunto</label>
          <select id="subject-group-filter" name="subjectGroup" value={subjectGroup ?? ""}
            aria-describedby="subject-group-help"
            style={{ color: selectedGroup?.color, backgroundColor: selectedGroup?.backgroundColor }}
            onChange={(event) => {
              const group = event.target.value;
              const params = new URLSearchParams(query);
              if (group) params.set("subjectGroup", group);
              else params.delete("subjectGroup");
              const selectedSubject = subjects.find((subject) => subject.id === subjectId);
              if (subjectId && (!group || (selectedSubject && getSubjectGroup(selectedSubject.subject).code === group))) {
                params.set("subjectId", subjectId);
              } else {
                params.delete("subjectId");
              }
              startTransition(() => router.push(`/dashboard?${params}`, { scroll: false }));
            }}>
            <option value="" style={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}>Todos os grupos</option>
            {subjectGroup && !groups.includes(subjectGroup) && <option value={subjectGroup}>Grupo {subjectGroup}</option>}
            {groups.map((code) => <option key={code} value={code}
              style={{ color: getSubjectGroup(`${code}00`).color, backgroundColor: "var(--surface)" }}>
              Grupo {code}
            </option>)}
          </select>
          <span className={fieldStyles.status} role="status">{pending ? "Atualizando resultados..." : ""}</span>
        </div>
        <SubjectFilter subjects={availableSubjects} subjectId={subjectId} pathname="/dashboard"
          query={{ ...query, ...(subjectGroup ? { subjectGroup } : {}) }} />
      </fieldset>
    </details>
  );
}
