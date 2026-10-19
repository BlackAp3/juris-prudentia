"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "./admin-api";
import { AdminShell, Badge, Card, Metric, Progress } from "./components";

type OverviewData = {
  counts: Record<string, number>;
  progress: Array<{ label: string; current: number; total: number }>;
  recentContent: Array<{ title: string; subtitle: string; type: string; status: string; updatedAt: string }>;
  attention: Array<{ title: string; detail: string; count: number }>;
  activity: Array<{ label: string; value: number }>;
};

export default function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<OverviewData>("/admin/overview").then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load overview"));
  }, []);

  const counts = data?.counts;
  return <AdminShell active="Overview" title="Platform overview" description="Live information from your Juris Prudentia database." action={<Link className="button" href="/content">＋ Add content</Link>}>
    {error && <p className="error-banner">{error}</p>}
    <div className="metrics"><Metric label="Active users" value={counts ? String(counts.activeUsers) : "—"} detail={counts ? `${counts.users} total users` : "Loading database records"} icon="◎" /><Metric label="Published courses" value={counts ? String(counts.publishedCourses) : "—"} detail={counts ? `${counts.courses} total courses` : "Loading database records"} icon="▤" /><Metric label="Published cases" value={counts ? String(counts.publishedCases) : "—"} detail={counts ? `${counts.cases} total cases` : "Loading database records"} icon="⚖" /><Metric label="Open reports" value="0" detail="No report records stored" icon="!" /></div>
    <div className="grid two"><Card title="Content overview"><div className="progress-list">{data?.progress.length ? data.progress.map((item) => <div className="progress-item" key={item.label}><div><span>{item.label}</span><b>{item.current} / {item.total}</b></div><Progress value={item.total ? (item.current / item.total) * 100 : 0} /></div>) : <p className="empty-state">No content records are available yet.</p>}</div></Card><Card title="Items requiring attention" action={<Badge tone="red">{data?.attention.reduce((sum, item) => sum + item.count, 0) ?? 0} OPEN</Badge>}><ul className="activity">{data?.attention.length ? data.attention.map((item) => <li key={item.title}><span className="activity-icon warning">!</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.count}</time></li>) : <li className="empty-state">No attention items are stored.</li>}</ul></Card></div>
    <div className="grid two wide-left"><Card title="Recent content"><table><thead><tr><th>Content</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead><tbody>{data?.recentContent.length ? data.recentContent.map((item) => <tr key={`${item.type}-${item.title}`}><td><strong>{item.title}</strong><small>{item.subtitle}</small></td><td>{item.type}</td><td><Badge tone={item.status === "Published" ? "green" : item.status === "Draft" ? "gold" : "gray"}>{item.status}</Badge></td><td>{new Date(item.updatedAt).toLocaleDateString()}</td></tr>) : <tr><td colSpan={4} className="empty-table">No content records are stored yet.</td></tr>}</tbody></table></Card><Card title="Platform activity">{data?.activity.length ? <div className="chart">{data.activity.map((item) => <div key={item.label} style={{ height: `${item.value}%` }} />)}</div> : <p className="empty-state">Activity history is not stored yet.</p>}</Card></div>
  </AdminShell>;
}
