"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { DashboardPeriod } from "./period";
import {
  serializeDashboardQuestionType,
  type DashboardQuestionType,
} from "./question-type-filter";
import styles from "./dashboard.module.css";

type LocalTodayRedirectProps = {
  period: DashboardPeriod;
  today?: string | null;
  questionType: DashboardQuestionType;
};

export function LocalTodayRedirect({
  period,
  today,
  questionType,
}: Readonly<LocalTodayRedirectProps>) {
  const router = useRouter();

  useEffect(() => {
    const now = new Date();
    const localToday = [
      String(now.getFullYear()).padStart(4, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    if (today === localToday) return;
    const query = new URLSearchParams({
      period,
      today: localToday,
      questionType: serializeDashboardQuestionType(questionType),
    });
    router.replace(`/dashboard?${query.toString()}`, { scroll: false });
  }, [period, questionType, router, today]);

  if (today) return null;

  return (
    <div className={styles.preparing} aria-live="polite" aria-busy="true">
      <p>Preparando seu desempenho...</p>
      <span>Usando a data do seu dispositivo para definir o período.</span>
    </div>
  );
}
