"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Badge, Card, Progress } from "../components";

type Course = { id: string; code: string; title: string; academicYear: number; semester: number; status: string; completionPercent: number; enrollments: Array<{ completedTopicIds: string[] }>; topics: Array<{ id: string; title: string; position: number; status: string; sections: Array<{ id: string }> }> };

export function CourseEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { const path = courseId === "LAW 2101" ? `/admin/courses/by-code/${encodeURIComponent(courseId)}` : `/admin/courses/${encodeURIComponent(courseId)}`; adminFetch<Course>(path).then(setCourse).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load course")); }, [courseId]);

  if (error) return <AdminShell active="Courses" title="Course unavailable" description="This course was not found in the database." action={<Link className="button secondary" href="/courses">Back to courses</Link>}><p className="error-banner">{error}</p></AdminShell>;
  if (!course) return <AdminShell active="Courses" title="Loading course" description="Reading the course from the database."><p className="empty-state">Loading database records…</p></AdminShell>;

  return <AdminShell active="Courses" title={course.title} description={`${course.code} · Year ${course.academicYear}, Semester ${course.semester}`} action={<Link className="button secondary" href="/courses">Back to courses</Link>}>
    <div className="editor-layout"><div><Card title="Course details"><div className="form-grid"><label className="field"><span>Course title</span><input value={course.title} readOnly /></label><label className="field"><span>Course code</span><input value={course.code} readOnly /></label><label className="field"><span>Academic year</span><input value={`Year ${course.academicYear}`} readOnly /></label><label className="field"><span>Semester</span><input value={`Semester ${course.semester}`} readOnly /></label></div></Card><Card title="Course topics"><div className="sortable-list">{course.topics.length ? course.topics.map((topic) => <div key={topic.id}><span className="topic-number">{topic.position}</span><div><strong>{topic.title}</strong><small>{topic.sections.length} section{topic.sections.length === 1 ? "" : "s"} stored</small></div><Badge tone={topic.status === "PUBLISHED" ? "green" : topic.status === "DRAFT" ? "gold" : "gray"}>{topic.status}</Badge></div>) : <p className="empty-state">No topics are stored for this course.</p>}</div></Card></div><aside><Card title="Publishing"><div className="publish-status"><Badge tone={course.status === "Published" ? "green" : "gold"}>{course.status}</Badge><p>{course.enrollments.length} enrollment{course.enrollments.length === 1 ? "" : "s"} stored for this course.</p></div></Card><Card title="Course completion"><div className="readiness"><strong>{course.completionPercent}%</strong><Progress value={course.completionPercent} /><p>Calculated from stored enrollments and completed topic IDs.</p></div></Card></aside></div>
  </AdminShell>;
}
