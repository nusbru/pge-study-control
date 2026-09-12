import type { ReactNode } from "react";
import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { ProtectedNavigation } from "./protected-navigation";
import styles from "./protected-layout.module.css";
import { SignOutForm } from "@/modules/auth/sign-out-form";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireUserId();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard">PGE Study</Link>
          <ProtectedNavigation />
          <SignOutForm className={styles.signOut} />
        </div>
      </header>
      {children}
    </div>
  );
}
