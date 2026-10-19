"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Badge, Card } from "../components";

type Article = { id: string; title: string; summary: string; sourceUrl: string | null; status: string; publishedAt: string | null; updatedAt: string };
type NewsData = { articles: Article[]; counts: { published: number; scheduled: number; drafts: number }; sourceCount: number };

export default function News() {
  const [data, setData] = useState<NewsData | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<NewsData>("/admin/news").then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load news")); }, []);
  const articles = data?.articles.filter((article) => `${article.title} ${article.summary}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  return <AdminShell active="News" title="Legal news" description="News articles currently stored in the database."><>{error && <p className="error-banner">{error}</p>}<div className="news-layout"><div><div className="toolbar"><div className="search-box"><span className="search-icon">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles…" /></div></div>{articles.length ? articles.map((article) => <article className="story" key={article.id}><div className="story-art">§</div><div><div className="story-meta"><Badge>{article.status}</Badge><span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : new Date(article.updatedAt).toLocaleDateString()}</span></div><h3>{article.title}</h3><p>{article.summary}</p>{article.sourceUrl && <a href={article.sourceUrl} target="_blank" rel="noreferrer"><small>Open source ↗</small></a>}</div></article>) : <Card><p className="empty-state">No news articles are stored in the database.</p></Card>}</div><aside><Card title="Publishing summary"><div className="summary-list"><div><strong>{data?.counts.published ?? "—"}</strong><span>Published</span></div><div><strong>{data?.counts.scheduled ?? "—"}</strong><span>Archived</span></div><div><strong>{data?.counts.drafts ?? "—"}</strong><span>Drafts</span></div></div></Card><Card title="Source metadata"><p className="empty-state">{data?.sourceCount ?? "—"} article source link{data?.sourceCount === 1 ? "" : "s"} stored.</p></Card></aside></div></></AdminShell>;
}
