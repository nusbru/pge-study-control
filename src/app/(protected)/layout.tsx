import type { ReactNode } from "react";
import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { ProtectedNavigation } from "./protected-navigation";
import styles from "./protected-layout.module.css";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireUserId();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard">PGE Study</Link>
          <ProtectedNavigation />
          <form
            className={styles.signOut}
            action={async () => {
              "use server";
              const { signOut } = await import("@/auth");
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit">Sair</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
