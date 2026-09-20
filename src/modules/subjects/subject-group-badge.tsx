import { getSubjectGroup } from "./group";
import styles from "./subject-group-badge.module.css";

export function SubjectGroupBadge({ subject }: Readonly<{ subject: string }>) {
  const { code, color, backgroundColor } = getSubjectGroup(subject);

  return (
    <span className={styles.badge} style={{ color, backgroundColor }}>
      <span className={styles.dot} aria-hidden="true" />
      {code === null ? "Sem grupo" : `Grupo ${code}`}
    </span>
  );
}
