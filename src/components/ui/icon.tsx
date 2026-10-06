import type { ReactNode, SVGProps } from "react";

export type IconName = "book" | "chart" | "timer" | "search" | "menu" | "close" | "arrow";

const paths: Record<IconName, ReactNode> = {
  book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" /><path d="M12 6v14M6 9h3m-3 4h3m6-4h3m-3 4h3" /></>,
  chart: <><path d="M4 4v16h17M8 15v-4m5 4V6m5 9V9" /><path d="m7 6 5-3 6 2" /></>,
  timer: <><circle cx="12" cy="14" r="8" /><path d="M12 10v4l3 2M9 2h6m-3 0v4m6-1 2 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export function BrandMark() {
  return <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 9c-3-3-7-4-12-3v19c5-1 9 0 12 3 3-3 7-4 12-3V6c-5-1-9 0-12 3Zm0 0v19" />
    <path d="m10 15 4 4 8-9" />
  </svg>;
}
