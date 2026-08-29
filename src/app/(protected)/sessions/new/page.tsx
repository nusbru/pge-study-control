import { createSessionAction } from "@/modules/study-sessions/actions";
import { SessionForm } from "@/modules/study-sessions/session-form";
import styles from "@/modules/study-sessions/session-form.module.css";

export default function NewSessionPage() {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Nova sessão</h1>
        <p>Registre os números enquanto o estudo ainda está fresco.</p>
      </header>
      <section className={styles.panel} aria-label="Dados da nova sessão">
        <SessionForm action={createSessionAction} />
      </section>
    </main>
  );
}
