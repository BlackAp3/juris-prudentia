"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { adminFetch } from "../admin-api";
import { CourseOption, ImportResult, ServerTopic, fileAsBase64, importKey, send } from "./shared";

type NewCourse = { code: string; title: string; academicYear: string; semester: string };
const blankCourse: NewCourse = { code: "", title: "", academicYear: "", semester: "" };

export function Setup({ presetCourse }: { presetCourse: string | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<CourseOption[] | null>(null);
  const [pick, setPick] = useState<string>("");
  const [newCourse, setNewCourse] = useState<NewCourse>(blankCourse);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    adminFetch<CourseOption[]>("/admin/courses").then((list) => {
      setCourses(list);
      if (presetCourse && list.some((course) => course.id === presetCourse)) setPick(presetCourse);
      else if (list.length === 1) setPick(list[0]!.id);
      else if (!list.length) setPick("new");
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Courses could not be loaded"));
  }, [presetCourse]);

  function courseProblem() {
    if (!pick) return "Choose the course this topic belongs to.";
    if (pick === "new" && (!newCourse.title.trim() || !newCourse.code.trim() || !newCourse.academicYear || !newCourse.semester)) return "Fill in the new course’s title, code, year and semester.";
    return "";
  }

  async function resolveCourse() {
    if (pick !== "new") return pick;
    const created = await send<CourseOption>("POST", "/content/courses", { code: newCourse.code, title: newCourse.title, academicYear: Number(newCourse.academicYear), semester: Number(newCourse.semester) });
    setCourses((current) => [...(current ?? []), { ...created, topicCount: 0 }]);
    setPick(created.id);
    setNewCourse(blankCourse);
    return created.id;
  }

  async function startWriting(event: FormEvent) {
    event.preventDefault();
    const problem = courseProblem() || (title.trim() ? "" : "Give the topic a title.");
    if (problem) { setError(problem); return; }
    setBusy("Creating the topic…"); setError("");
    try {
      const courseId = await resolveCourse();
      const topic = await send<ServerTopic>("POST", "/content/topics", { courseId, title, status: "DRAFT", sections: [] });
      router.replace(`/content?topic=${topic.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The topic could not be created");
      setBusy("");
    }
  }

  function chooseWord() {
    const problem = courseProblem();
    if (problem) { setError(problem); return; }
    setError("");
    fileInput.current?.click();
  }

  async function startFromWord(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(`Reading ${file.name}…`); setError("");
    try {
      const imported = await send<ImportResult>("POST", "/content/import", { fileName: file.name, fileBase64: await fileAsBase64(file) });
      const courseId = await resolveCourse();
      const topicTitle = title.trim() || imported.suggestedTitle.replace(/^\[.*\]$/, "") || file.name.replace(/\.docx$/i, "");
      const topic = await send<ServerTopic>("POST", "/content/topics", { courseId, title: topicTitle, status: "DRAFT", sourceFile: imported.sourceFile, sections: imported.sections });
      // The saved topic drops the importer's flags, so hand them to the writer for this session.
      try { sessionStorage.setItem(importKey(topic.id), JSON.stringify(imported)); } catch { /* the flags are a convenience */ }
      router.replace(`/content?topic=${topic.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The document could not be imported");
      setBusy("");
    }
  }

  const field = (key: keyof NewCourse) => ({ value: newCourse[key], onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNewCourse({ ...newCourse, [key]: event.target.value }) });

  return <div className="w-screen">
    <header className="w-bar"><Link className="w-back" href="/courses"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Courses</Link></header>
    <main className="setup">
      <form className="setup-form" onSubmit={(event) => void startWriting(event)}>
        <h1>Start a new topic</h1>
        <p className="setup-lede">Choose the course it belongs to and give it a title. You’ll write the content on the next screen, and nothing is visible to students until you publish.</p>

        <fieldset className="setup-courses">
          <legend>Course</legend>
          {courses === null && !error ? <p className="w-muted">Loading courses…</p> : <div className="setup-options" role="radiogroup" aria-label="Course">
            {(courses ?? []).map((course) => <button type="button" role="radio" aria-checked={pick === course.id} className={`setup-option${pick === course.id ? " on" : ""}`} key={course.id} onClick={() => setPick(course.id)}>
              <span className="setup-dot" aria-hidden="true" />
              <span><strong>{course.title}</strong><small>{course.code}, Year {course.academicYear}, Semester {course.semester}. {course.topicCount} topic{course.topicCount === 1 ? "" : "s"}</small></span>
            </button>)}
            <button type="button" role="radio" aria-checked={pick === "new"} className={`setup-option${pick === "new" ? " on" : ""}`} onClick={() => setPick("new")}>
              <span className="setup-dot" aria-hidden="true" />
              <span><strong>New course</strong><small>Create a course for this topic</small></span>
            </button>
          </div>}
          {pick === "new" && <div className="setup-new">
            <label className="w-field wide">Course title<input {...field("title")} placeholder="Law of Contract I" /></label>
            <label className="w-field">Course code<input {...field("code")} placeholder="LAW 1203" /><small>Must not match an existing course.</small></label>
            <span />
            <label className="w-field">Year<select {...field("academicYear")}><option value="">Choose</option>{[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
            <label className="w-field">Semester<select {...field("semester")}><option value="">Choose</option><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label>
          </div>}
        </fieldset>

        <label className="w-field setup-title">Topic title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Mens rea" /></label>

        {error && <p className="w-error" role="alert">{error}</p>}
        {busy && <p className="w-muted" role="status">{busy}</p>}
        <div className="setup-actions">
          <button className="w-primary" type="submit" disabled={Boolean(busy)}>Start writing</button>
          <button className="w-link" type="button" disabled={Boolean(busy)} onClick={chooseWord}>Or start from a Word document</button>
          <input ref={fileInput} type="file" hidden accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void startFromWord(event)} />
        </div>
      </form>
    </main>
  </div>;
}
