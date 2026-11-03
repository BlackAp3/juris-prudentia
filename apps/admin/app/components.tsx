import Link from "next/link";
import type { ReactNode } from "react";
import { ProfileMenu } from "./ProfileMenu";
import { TopBar } from "./TopBar";

// Stroke icons (24px grid) for the sidebar.
const icons: Record<string, ReactNode> = {
  overview: <path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />,
  courses: <path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />,
  content: <path d="M5 19h4L19 9l-4-4L5 15zM13 7l4 4" />,
  cases: <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z" />,
  news: <path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5" />,
  community: <path d="M4 5h16v10H9l-5 4z" />,
  users: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c1-4 4-6 7-6s6 2 7 6M16 3.5a4 4 0 0 1 0 7M18 15c2 .7 3.4 2.6 4 6" />,
  reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  settings: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.8 4.6V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" />,
};
function NavIcon({ name }: { name: string }) { return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>; }

const nav = [
  ["Overview", "/", "overview"], ["Courses", "/courses", "courses"], ["Content Manager", "/content", "content"], ["Cases & statutes", "/cases", "cases"], ["News", "/news", "news"], ["Community", "/community", "community"], ["Users", "/users", "users"], ["Reports", "/reports", "reports"], ["Settings", "/settings", "settings"],
] satisfies ReadonlyArray<readonly [string, string, string]>;

export function AdminShell({ active, title, description, action, children }: { active: string; title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <main className="shell">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">JP</span><div>Juris Prudentia<small>Administration</small></div></Link><nav>{nav.map(([label,href,icon]) => <Link className={active === label ? "active" : ""} href={href} key={label}><span><NavIcon name={icon} /></span>{label}</Link>)}</nav><ProfileMenu /></aside>
    <section className="content"><TopBar /><div className="page"><div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>{children}</div></section>
  </main>;
}

export function Button({ children, secondary = false }: { children: ReactNode; secondary?: boolean }) { return <button className={secondary ? "button secondary" : "button"}>{children}</button>; }
export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "red" | "blue" | "gray" }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) { return <article className="metric"><div className="metric-icon">{icon}</div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>; }
export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) { return <article className={`card ${className}`}>{title && <div className="card-head"><h2>{title}</h2>{action}</div>}{children}</article>; }
export function Progress({ value }: { value: number }) { return <div className="progress"><span style={{ width: `${value}%` }} /></div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
