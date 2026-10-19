"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Badge, Card, Metric } from "../components";

type CommunityData = { counts: { openReports: number; activeThreads: number; replies: number }; reports: Array<{ id: string }>; };

export default function Community() {
  const [data, setData] = useState<CommunityData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<CommunityData>("/admin/community").then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load community data")); }, []);
  return <AdminShell active="Community" title="Community moderation" description="Moderation data currently stored in the database."><>{error && <p className="error-banner">{error}</p>}<div className="metrics compact"><Metric label="Open reports" value={String(data?.counts.openReports ?? 0)} detail="No report records stored" icon="!" /><Metric label="Active threads" value={data ? String(data.counts.activeThreads) : "—"} detail="Open questions" icon="☁" /><Metric label="Replies" value={data ? String(data.counts.replies) : "—"} detail="Stored community replies" icon="✓" /></div><div className="subnav"><a className="selected">Reports <span>{data?.counts.openReports ?? 0}</span></a><a>Recent discussions</a></div><Card title="Reports requiring review" className="table-card"><table><thead><tr><th>Report</th><th>Status</th></tr></thead><tbody>{data?.reports.length ? data.reports.map((report) => <tr key={report.id}><td>{report.id}</td><td><Badge tone="gold">Stored</Badge></td></tr>) : <tr><td colSpan={2} className="empty-table">No moderation reports are stored because this database has no report records yet.</td></tr>}</tbody></table></Card></></AdminShell>;
}
