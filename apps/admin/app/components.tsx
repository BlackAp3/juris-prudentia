import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Overview", "/", "⌂"], ["Courses", "/courses", "▤"], ["Cases & statutes", "/cases", "⚖"], ["News", "/news", "◫"], ["Community", "/community", "☁"], ["Users", "/users", "◎"], ["Reports", "/reports", "▥"], ["Settings", "/settings", "⚙"],
] satisfies ReadonlyArray<readonly [string, string, string]>;

export function AdminShell({ active, title, description, action, children }: { active: string; title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <main className="shell">
    <aside className="sidebar"><Link className="brand" href="/"><span>⚖</span><div>Juris Prudentia<small>Administration</small></div></Link><nav>{nav.map(([label,href,icon]) => <Link className={active === label ? "active" : ""} href={href} key={label}><span>{icon}</span>{label}</Link>)}</nav><div className="admin-profile"><div className="avatar">SN</div><div><strong>Sydney N.</strong><small>Super Administrator</small></div><span>⋮</span></div></aside>
    <section className="content"><header className="topbar"><div className="mobile-brand">⚖</div><div className="global-search">⌕ <input placeholder="Search content, users or cases…" /></div><button className="icon-button">◉<i /></button><div className="top-avatar">SN</div></header><div className="page"><div className="page-heading"><div><p className="eyebrow">JURIS PRUDENTIA</p><h1>{title}</h1><p>{description}</p></div>{action}</div>{children}</div></section>
  </main>;
}

export function Button({ children, secondary = false }: { children: ReactNode; secondary?: boolean }) { return <button className={secondary ? "button secondary" : "button"}>{children}</button>; }
export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "red" | "blue" | "gray" }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) { return <article className="metric"><div className="metric-icon">{icon}</div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>; }
export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) { return <article className={`card ${className}`}>{title && <div className="card-head"><h2>{title}</h2>{action}</div>}{children}</article>; }
export function Progress({ value }: { value: number }) { return <div className="progress"><span style={{ width: `${value}%` }} /></div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
