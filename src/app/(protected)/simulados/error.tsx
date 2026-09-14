"use client";

import Link from "next/link";
import styles from "@/modules/mock-exams/mock-exams.module.css";

export default function MockExamError({ reset }: Readonly<{ reset: () => void }>) {
  return <main className="protectedPage"><section className={styles.panel}>
    <h1>Não foi possível carregar os simulados</h1><p>Tente novamente para consultar seus registros.</p>
    <div className={styles.actions}><button className={styles.button} onClick={reset}>Tentar novamente</button><Link href="/dashboard">Voltar ao dashboard</Link></div>
  </section></main>;
}
