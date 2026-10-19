"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Badge, Card, Progress } from "../components";

type Course = { id: string; code: string; title: string; academicYear: number; semester: number; status: string; topicCount: number; completionPercent: number };

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => { adminFetch<Course[]>("/admin/courses").then(setCourses).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load courses")); }, []);
  const years = useMemo(() => [...new Set(courses.map((course) => course.academicYear))].sort((left, right) => left - right), [courses]);
  const filtered = courses.filter((course) => `${course.title} ${course.code}`.toLowerCase().includes(query.toLowerCase()) && (year === "all" || String(course.academicYear) === year) && (status === "all" || course.status === status));

  return <AdminShell active="Courses" title="Courses" description="Courses currently stored in the database." action={<Link className="button" href="/content">＋ Import course content</Link>}>
    {error && <p className="error-banner">{error}</p>}
    <div className="toolbar"><div className="search-box"><span className="search-icon">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses…" /></div><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All academic years</option>{years.map((item) => <option value={item} key={item}>Year {item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{[...new Set(courses.map((course) => course.status))].map((item) => <option value={item} key={item}>{item}</option>)}</select></div>
    <Card className="table-card"><table><thead><tr><th>Course</th><th>Academic period</th><th>Topics</th><th>Completion</th><th>Status</th><th /></tr></thead><tbody>{filtered.length ? filtered.map((course) => <tr key={course.id}><td><div className="course-cell"><span>{course.title.charAt(0)}</span><div><strong>{course.title}</strong><small>{course.code}</small></div></div></td><td>Year {course.academicYear} · Semester {course.semester}</td><td>{course.topicCount}</td><td><div className="table-progress"><Progress value={course.completionPercent} /><small>{course.completionPercent}%</small></div></td><td><Badge tone={course.status === "Published" ? "green" : course.status === "Draft" ? "gold" : "gray"}>{course.status}</Badge></td><td><Link className="row-action" href={`/courses/${course.id}`}>Open ›</Link></td></tr>) : <tr><td colSpan={6} className="empty-table">No courses are stored in the database.</td></tr>}</tbody></table></Card>
  </AdminShell>;
}
