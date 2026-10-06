import type { ReactNode } from "react";
import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { ProtectedNavigation } from "./protected-navigation";
import styles from "./protected-layout.module.css";
import { SignOutForm } from "@/modules/auth/sign-out-form";
import { BrandMark } from "@/components/ui/icon";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireUserId();
  return (
    <div className={styles.shell}>
      <a className="skipLink" href="#study-content">Pular para o conteúdo</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/dashboard"><BrandMark />PGE Study</Link>
          <ProtectedNavigation />
          <SignOutForm className={styles.signOut} />
        </div>
      </header>
      <div id="study-content" className={styles.content} tabIndex={-1}>{children}</div>
      <footer className={styles.footer}><span>PGE Study · Sua preparação, com clareza.</span><span>Feito para sua rotina de estudos.</span></footer>
    </div>
  );
}
