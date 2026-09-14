"use client";

import styles from "@/modules/study-sessions/session-form.module.css";

export default function SessionsError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Não foi possível carregar os dados</h1>
        <p role="alert">Não conseguimos consultar as sessões ou os assuntos. Tente novamente.</p>
      </header>
      <div className={styles.actions}>
        <button type="button" onClick={reset}>Tentar novamente</button>
      </div>
    </main>
  );
}
