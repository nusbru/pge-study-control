"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { DashboardPeriod } from "./period";
import styles from "./dashboard.module.css";

export function LocalTodayRedirect({ period }: Readonly<{ period: DashboardPeriod }>) {
  const router = useRouter();

  useEffect(() => {
    const now = new Date();
    const today = [
      String(now.getFullYear()).padStart(4, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const query = new URLSearchParams({ period, today });
    router.replace(`/dashboard?${query.toString()}`, { scroll: false });
  }, [period, router]);

  return (
    <div className={styles.preparing} aria-live="polite" aria-busy="true">
      <p>Preparando seu desempenho...</p>
      <span>Usando a data do seu dispositivo para definir o período.</span>
    </div>
  );
}
