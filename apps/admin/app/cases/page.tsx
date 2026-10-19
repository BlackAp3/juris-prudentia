"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Badge, Card } from "../components";

type LegalCase = { id: string; title: string; citation: string; principle: string; status: string; updatedAt: string; topic: { title: string; course: { title: string } } };
type CaseData = { cases: LegalCase[]; counts: { cases: number; publishedCases: number; statutes: number; constitution: number } };

export default function Cases() {
  const [data, setData] = useState<CaseData | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<CaseData>("/admin/cases").then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load authorities")); }, []);
  const cases = data?.cases.filter((item) => `${item.title} ${item.citation} ${item.principle}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || item.status === status)) ?? [];
  const statuses = [...new Set(data?.cases.map((item) => item.status) ?? [])];
  return <AdminShell active="Cases & statutes" title="Cases & statutes" description="Legal authorities currently stored in the database."><>{error && <p className="error-banner">{error}</p>}<div className="subnav"><a className="selected">Cases <span>{data?.counts.cases ?? "—"}</span></a><a>Statutes <span>{data?.counts.statutes ?? "—"}</span></a><a>Constitution <span>{data?.counts.constitution ?? "—"}</span></a></div><div className="toolbar"><div className="search-box"><span className="search-icon">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, citation or principle…" /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((item) => <option value={item} key={item}>{item}</option>)}</select></div><Card className="table-card"><table><thead><tr><th>Case</th><th>Topic</th><th>Linked course</th><th>Status</th><th>Updated</th></tr></thead><tbody>{cases.length ? cases.map((item) => <tr key={item.id}><td><div className="authority"><span>⚖</span><div><strong>{item.title}</strong><small>{item.citation}</small></div></div></td><td><Badge tone="blue">{item.topic.title}</Badge></td><td>{item.topic.course.title}</td><td><Badge tone={item.status === "PUBLISHED" ? "green" : item.status === "DRAFT" ? "gold" : "gray"}>{item.status}</Badge></td><td>{new Date(item.updatedAt).toLocaleDateString()}</td></tr>) : <tr><td colSpan={5} className="empty-table">No legal cases are stored in the database.</td></tr>}</tbody></table></Card></></AdminShell>;
}
