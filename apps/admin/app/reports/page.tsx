"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Card, Metric, Progress } from "../components";

type ReportData = { metrics: { activeUsers: number; enrollments: number; completedTopics: number; replies: number }; contentTypes: { topics: number; notes: number; cases: number; statutes: number; articles: number }; topCourses: Array<{ title: string; completionPercent: number; enrollmentCount: number }>; completionByYear: Array<{ label: string; value: number }>; weeklyActivity: Array<{ label: string; value: number }>; communityHealth: number | null };

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<ReportData>("/admin/reports").then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load reports")); }, []);
  const exportReport = () => { if (!data) return; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "juris-prudentia-report.json"; link.click(); URL.revokeObjectURL(url); };
  return <AdminShell active="Reports" title="Reports & analytics" description="Reports calculated from stored database records." action={<button className="button" type="button" onClick={exportReport} disabled={!data}>Export data</button>}>
    {error && <p className="error-banner">{error}</p>}
    <div className="metrics"><Metric label="Active users" value={data ? String(data.metrics.activeUsers) : "—"} detail="Active accounts" icon="◎" /><Metric label="Enrollments" value={data ? String(data.metrics.enrollments) : "—"} detail="Stored course enrollments" icon="◷" /><Metric label="Completed topics" value={data ? String(data.metrics.completedTopics) : "—"} detail="From enrollment records" icon="✓" /><Metric label="Community replies" value={data ? String(data.metrics.replies) : "—"} detail="Stored replies" icon="☁" /></div>
    <div className="grid two wide-left"><Card title="Weekly active learners">{data?.weeklyActivity.length ? <div className="chart">{data.weeklyActivity.map((item) => <div key={item.label} style={{ height: `${item.value}%` }} />)}</div> : <p className="empty-state">Weekly activity is not stored yet.</p>}</Card><Card title="Top courses"><div className="rank-list">{data?.topCourses.length ? data.topCourses.map((course, index) => <div key={course.title}><span>{index + 1}</span><div><strong>{course.title}</strong><Progress value={course.completionPercent} /></div><b>{course.completionPercent}%</b></div>) : <p className="empty-state">No course enrollment records are stored.</p>}</div></Card></div>
    <div className="grid three"><Card title="Published content"><div className="bar-list">{data ? Object.entries(data.contentTypes).map(([label, value]) => <div key={label}><span>{label}</span><Progress value={value ? 100 : 0} /><b>{value}</b></div>) : <p className="empty-state">Loading records…</p>}</div></Card><Card title="Completion by year"><div className="bar-list">{data?.completionByYear.length ? data.completionByYear.map((item) => <div key={item.label}><span>{item.label}</span><Progress value={item.value} /><b>{item.value}%</b></div>) : <p className="empty-state">No completion records are stored.</p>}</div></Card><Card title="Community health"><div className="health-score">{data?.communityHealth ?? "—"}{data?.communityHealth !== null && data?.communityHealth !== undefined && <small>/100</small>}</div><p className="center-muted">No health score is stored in the database.</p></Card></div>
  </AdminShell>;
}
