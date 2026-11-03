"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell } from "../components";
import { send } from "../content/shared";

type TopicRow = { id: string; title: string; position: number; status: string; updatedAt: string; sections: Array<{ id: string; blocks: Array<{ type: string }> }> };
type Course = { id: string; code: string; title: string; academicYear: number; semester: number; status: string; enrollments: Array<{ completedTopicIds: string[] }>; topics: TopicRow[] };

const count = (topic: TopicRow, type: string) => topic.sections.reduce((sum, section) => sum + section.blocks.filter((block) => block.type === type).length, 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : word.endsWith("s") ? "es" : "s"}`;
const edited = (iso: string) => { const date = new Date(iso); const today = new Date(); return date.toDateString() === today.toDateString() ? "today" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" }); };

export function CourseEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", code: "", academicYear: "", semester: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => adminFetch<Course>(`/admin/courses/${encodeURIComponent(courseId)}`).then(setCourse).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "This course could not be loaded")), [courseId]);
  useEffect(() => { void load(); }, [load]);

  if (error && !course) return <AdminShell active="Courses" title="Course not found" description={error} action={<Link className="button secondary" href="/courses">All courses</Link>}><p className="empty-state">Go back to the course list and open it from there.</p></AdminShell>;
  if (!course) return <AdminShell active="Courses" title="Course" description="Loading…"><p className="empty-state">Loading the course…</p></AdminShell>;

  const published = course.topics.filter((topic) => topic.status === "PUBLISHED").length;
  const cases = course.topics.reduce((sum, topic) => sum + count(topic, "CASE"), 0);
  const statutes = course.topics.reduce((sum, topic) => sum + count(topic, "STATUTE"), 0);

  async function reorder(from: number, to: number) {
    if (!course || to < 0 || to >= course.topics.length) return;
    const topics = [...course.topics];
    const [moved] = topics.splice(from, 1);
    topics.splice(to, 0, moved!);
    setCourse({ ...course, topics: topics.map((topic, index) => ({ ...topic, position: index + 1 })) });
    try { await send("PUT", `/content/courses/${course.id}/order`, { topicIds: topics.map((topic) => topic.id) }); setNotice(`Moved “${moved!.title}” to position ${to + 1}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The new order could not be saved"); void load(); }
  }

  function startEdit() { if (!course) return; setForm({ title: course.title, code: course.code, academicYear: String(course.academicYear), semester: String(course.semester) }); setEditing(true); setError(""); }
  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try { await send("PUT", `/content/courses/${courseId}`, { ...form, academicYear: Number(form.academicYear), semester: Number(form.semester) }); setEditing(false); setNotice("Course details saved."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The course could not be saved"); }
    finally { setBusy(false); }
  }

  return <AdminShell active="Courses" title={course.title} description={`${course.code}, Year ${course.academicYear}, Semester ${course.semester}`} action={<div className="actions"><button className="button secondary" type="button" onClick={startEdit}>Edit course details</button><Link className="button" href={`/content?course=${course.id}`}>New topic</Link></div>}>
    {notice && <p className="notice success" role="status">{notice}</p>}
    {error && <p className="error-banner" role="alert">{error}</p>}
    {editing && <form className="card course-form" onSubmit={(event) => void saveCourse(event)}>
      <h2>Course details</h2>
      <div className="course-form-grid">
        <label className="w-field wide">Course title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label className="w-field">Course code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required /></label>
        <label className="w-field">Year<select value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })}>{[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
        <label className="w-field">Semester<select value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })}><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label>
      </div>
      <div className="actions"><button className="button secondary" type="button" onClick={() => setEditing(false)}>Cancel</button><button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save course"}</button></div>
    </form>}

    <div className="course-layout">
      <section className="card course-topics" aria-labelledby="topics-h">
        <div className="course-topics-head"><h2 id="topics-h">Topics, in teaching order</h2>{course.topics.length > 1 && <span>Use the arrows to reorder</span>}</div>
        {course.topics.length === 0 ? <div className="course-empty"><p>No topics yet. Students see this course once it has a published topic.</p><Link className="button" href={`/content?course=${course.id}`}>Write the first topic</Link></div>
          : <ol className="course-topic-list">{course.topics.map((topic, index) => {
            const c = count(topic, "CASE"); const s = count(topic, "STATUTE");
            return <li key={topic.id}>
              <span className="course-topic-num">{index + 1}</span>
              <div className="course-topic-main"><Link href={`/content?topic=${topic.id}`}>{topic.title}</Link><small>{plural(topic.sections.length, "section")}, {plural(c, "case")}, {plural(s, "statute")}. Edited {edited(topic.updatedAt)}</small></div>
              <span className={`course-pill ${topic.status === "PUBLISHED" ? "live" : "draft"}`}>{topic.status === "PUBLISHED" ? "Published" : "Draft"}</span>
              <span className="course-order">
                <button type="button" aria-label={`Move ${topic.title} up`} disabled={index === 0} onClick={() => void reorder(index, index - 1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg></button>
                <button type="button" aria-label={`Move ${topic.title} down`} disabled={index === course.topics.length - 1} onClick={() => void reorder(index, index + 1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>
              </span>
              <Link className="row-action" href={`/content?topic=${topic.id}`}>Edit</Link>
            </li>;
          })}</ol>}
        {course.topics.length > 0 && <div className="course-topics-foot"><Link className="row-action" href={`/content?course=${course.id}`}>Add the next topic</Link></div>}
      </section>

      <aside className="course-side">
        <section className="card"><h2>What students see</h2><p className="course-big"><strong>{published} of {course.topics.length}</strong> topic{course.topics.length === 1 ? "" : "s"} published</p><p className="w-muted">Drafts stay hidden until you publish them. {course.enrollments.length} student{course.enrollments.length === 1 ? " is" : "s are"} enrolled.</p></section>
        <section className="card"><h2>Authorities in this course</h2><p className="course-big"><span className="case">{plural(cases, "case")}</span> and <span className="statute">{plural(statutes, "statute")}</span></p><p className="w-muted">Counted from every topic, published or draft.</p></section>
      </aside>
    </div>
  </AdminShell>;
}
