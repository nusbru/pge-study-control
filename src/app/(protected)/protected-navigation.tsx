"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import styles from "./protected-layout.module.css";

const destinations: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "chart" },
  { href: "/sessions", label: "Sessões", icon: "book" },
  { href: "/simulados", label: "Simulados", icon: "timer" },
];

export function ProtectedNavigation() {
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 744px)");
    const closeOnDesktop = () => { if (media.matches) sheet.current?.close(); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  function links() {
    return destinations.map(({ href, label, icon }) => (
      <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}
        onClick={() => sheet.current?.close()}>
        <span className={styles.navIcon}><Icon name={icon} width="32" height="32" /></span>
        <span>{label}</span>
      </Link>
    ));
  }

  return (
    <>
      <nav className={styles.navigation} aria-label="Navegação principal">{links()}</nav>
      <button className={styles.menuButton} type="button" aria-label="Abrir navegação" aria-haspopup="dialog"
        onClick={() => sheet.current?.showModal()}><Icon name="menu" /></button>
      <dialog className={styles.sheet} ref={sheet} aria-labelledby="navigation-title">
        <div className={styles.sheetHeader}>
          <h2 id="navigation-title">Seus estudos</h2>
          <button className={styles.closeButton} type="button" aria-label="Fechar navegação"
            onClick={() => sheet.current?.close()}><Icon name="close" /></button>
        </div>
        <nav className={styles.sheetNavigation} aria-label="Navegação principal">{links()}</nav>
        <p>Um espaço para acompanhar sua preparação.</p>
      </dialog>
    </>
  );
}
