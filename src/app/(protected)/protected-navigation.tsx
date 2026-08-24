"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./protected-layout.module.css";

export function ProtectedNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Navegação principal">
      <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>
        Dashboard
      </Link>
      <Link href="/sessions" aria-current={pathname.startsWith("/sessions") ? "page" : undefined}>
        Sessões
      </Link>
    </nav>
  );
}
