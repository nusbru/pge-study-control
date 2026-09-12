import { SessionEditor } from "@/modules/study-sessions/session-editor";
import styles from "@/modules/study-sessions/session-form.module.css";

export default function NewSessionPage() {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Nova sessão</h1>
        <p>Registre os números enquanto o estudo ainda está fresco.</p>
      </header>
      <section className={styles.panel} aria-label="Dados da nova sessão">
        <SessionEditor />
      </section>
    </main>
  );
}
