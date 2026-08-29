"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { DashboardPeriod } from "./period";
import styles from "./dashboard.module.css";

type LocalTodayRedirectProps = {
  period: DashboardPeriod;
  today?: string | null;
};

export function LocalTodayRedirect({ period, today }: Readonly<LocalTodayRedirectProps>) {
  const router = useRouter();

  useEffect(() => {
    const now = new Date();
    const localToday = [
      String(now.getFullYear()).padStart(4, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    if (today === localToday) return;
    const query = new URLSearchParams({ period, today: localToday });
    router.replace(`/dashboard?${query.toString()}`, { scroll: false });
  }, [period, router, today]);

  if (today) return null;

  return (
    <div className={styles.preparing} aria-live="polite" aria-busy="true">
      <p>Preparando seu desempenho...</p>
      <span>Usando a data do seu dispositivo para definir o período.</span>
    </div>
  );
}
