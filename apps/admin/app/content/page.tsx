"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { adminFetch } from "../admin-api";
import { AdminShell, Badge, Card } from "../components";

type BlockType = "HEADING" | "PARAGRAPH" | "BULLET_LIST" | "QUOTE" | "CASE" | "STATUTE" | "CITATION";
type Block = { type: BlockType; text: string; citation?: string | undefined; flagged?: string | undefined };
type Section = { title: string; blocks: Block[] };
type Status = "DRAFT" | "PUBLISHED";
type CourseOption = { id: string; code: string; title: string; academicYear: number; semester: number; topicCount: number };
type NewCourse = { code: string; title: string; academicYear: string; semester: string };
type SavedTopic = { id: string; title: string; status: Status; courseId: string; sourceFile?: string | null; sections: Array<{ title: string; blocks: Array<{ type: BlockType; text: string; citation?: string | null }> }> };

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const blockLabels: Record<BlockType, string> = { PARAGRAPH: "Paragraph", HEADING: "Sub-heading", BULLET_LIST: "List", QUOTE: "Quote", CASE: "Case", STATUTE: "Statute", CITATION: "Citation" };
const blockHints: Record<BlockType, string> = { PARAGRAPH: "Write the paragraph…", HEADING: "Sub-heading text…", BULLET_LIST: "One point per line…", QUOTE: "The quoted passage…", CASE: "Case name, e.g. R v Woollin [1999] 1 AC 82", STATUTE: "Provision, e.g. Section 12 of the Penal Code Act", CITATION: "Reference text…" };
const emptySection = (): Section => ({ title: "", blocks: [{ type: "PARAGRAPH", text: "" }] });
const emptyCourse: NewCourse = { code: "", title: "", academicYear: "", semester: "" };

function token() { return typeof window === "undefined" ? "" : localStorage.getItem("juris.accessToken") ?? ""; }

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) throw new Error(payload.error ?? "The request failed");
  return payload.data;
}

function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The file could not be read"));
    reader.readAsDataURL(file);
  });
}

// Lists are stored as "• a • b" (the existing convention); the editor shows one point per line.
const listToLines = (text: string) => text.split("•").map((item) => item.trim()).filter(Boolean).join("\n");
const linesToList = (text: string) => text.split("\n").map((item) => item.trim()).filter(Boolean).map((item) => `• ${item}`).join(" ");
const fromServer = (sections: SavedTopic["sections"]): Section[] => sections.map((section) => ({ title: section.title, blocks: section.blocks.map((block) => ({ type: block.type, text: block.type === "BULLET_LIST" ? listToLines(block.text) : block.text, ...(block.citation ? { citation: block.citation } : {}) })) }));
const toServer = (sections: Section[]) => sections.map((section) => ({ title: section.title, blocks: section.blocks.map((block) => ({ type: block.type, text: block.type === "BULLET_LIST" ? linesToList(block.text) : block.text, ...(block.citation ? { citation: block.citation } : {}) })) }));

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item!);
  return copy;
}

export default function ContentManager() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseMode, setCourseMode] = useState<"existing" | "new">("existing");
  const [courseId, setCourseId] = useState("");
  const [newCourse, setNewCourse] = useState<NewCourse>(emptyCourse);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("DRAFT");
  const [sourceFile, setSourceFile] = useState<string | undefined>();
  const [sections, setSections] = useState<Section[]>([emptySection()]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  const course = courses.find((item) => item.id === courseId);
  const flagged = sections.reduce((sum, section) => sum + section.blocks.filter((block) => block.flagged).length, 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("topic");
    const presetCourse = params.get("course");
    Promise.all([adminFetch<CourseOption[]>("/admin/courses"), editId ? adminFetch<SavedTopic>(`/content/topics/${encodeURIComponent(editId)}`) : Promise.resolve(null)])
      .then(([list, topic]) => {
        setCourses(list);
        if (topic) {
          setTopicId(topic.id); setTitle(topic.title); setStatus(topic.status); setCourseId(topic.courseId);
          setSourceFile(topic.sourceFile ?? undefined);
          setSections(topic.sections.length ? fromServer(topic.sections) : [emptySection()]);
        } else if (presetCourse && list.some((item) => item.id === presetCourse)) setCourseId(presetCourse);
        else if (!list.length) setCourseMode("new");
      })
      .catch((reason: unknown) => setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Unable to load" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function changeSections(update: (current: Section[]) => Section[]) { setSections(update); setDirty(true); }
  const updateSection = (index: number, fields: Partial<Section>) => changeSections((current) => current.map((section, i) => i === index ? { ...section, ...fields } : section));
  const updateBlocks = (index: number, update: (blocks: Block[]) => Block[]) => changeSections((current) => current.map((section, i) => i === index ? { ...section, blocks: update(section.blocks) } : section));
  const updateBlock = (sectionIndex: number, blockIndex: number, fields: Partial<Block>) => updateBlocks(sectionIndex, (blocks) => blocks.map((block, j) => j === blockIndex ? { ...block, ...fields, flagged: undefined } : block));

  async function importDocument(file: File) {
    const hasContent = sections.some((section) => section.title.trim() || section.blocks.some((block) => block.text.trim()));
    if (hasContent && !window.confirm("Importing replaces the sections you have written so far. Continue?")) return;
    setBusy(true);
    setMessage({ tone: "info", text: `Reading ${file.name}…` });
    try {
      const data = await send<{ suggestedTitle: string; sections: Section[]; warnings: string[]; sourceFile: string }>("POST", "/content/import", { fileName: file.name, fileBase64: await fileAsBase64(file) });
      setSections(data.sections.length ? data.sections.map((section) => ({ ...section, blocks: section.blocks.map((block) => block.type === "BULLET_LIST" ? { ...block, text: listToLines(block.text) } : block) })) : [emptySection()]);
      if (!title.trim() && data.suggestedTitle) setTitle(data.suggestedTitle);
      setSourceFile(data.sourceFile);
      setWarnings(data.warnings);
      setDirty(true);
      const blocks = data.sections.reduce((sum, section) => sum + section.blocks.length, 0);
      setMessage({ tone: "success", text: `Imported ${data.sections.length} section${data.sections.length === 1 ? "" : "s"} and ${blocks} blocks. Check them before publishing.` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The document could not be imported" });
    } finally { setBusy(false); }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importDocument(file); }

  function problems(nextStatus: Status) {
    if (courseMode === "existing" && !courseId) return "Choose a course for this topic.";
    if (courseMode === "new" && (!newCourse.title.trim() || !newCourse.code.trim() || !newCourse.academicYear || !newCourse.semester)) return "Fill in the new course's title, code, year and semester.";
    if (!title.trim()) return "Give the topic a title.";
    const untitled = sections.findIndex((section) => !section.title.trim());
    if (untitled >= 0) return `Section ${untitled + 1} needs a title.`;
    if (nextStatus === "PUBLISHED" && !sections.some((section) => section.blocks.some((block) => block.text.trim()))) return "Write some content before publishing.";
    if (nextStatus === "PUBLISHED" && flagged && !window.confirm(`${flagged} imported block${flagged === 1 ? " is" : "s are"} still flagged for checking. Publish anyway?`)) return "Publishing cancelled.";
    return "";
  }

  async function save(nextStatus: Status) {
    const problem = problems(nextStatus);
    if (problem) { setMessage({ tone: "error", text: problem }); return; }
    setBusy(true);
    setMessage({ tone: "info", text: nextStatus === "PUBLISHED" ? "Publishing…" : "Saving…" });
    try {
      let targetCourseId = courseId;
      if (courseMode === "new") {
        const created = await send<CourseOption>("POST", "/content/courses", { code: newCourse.code, title: newCourse.title, academicYear: Number(newCourse.academicYear), semester: Number(newCourse.semester) });
        targetCourseId = created.id;
        setCourses((current) => [...current, { ...created, topicCount: 0 }].sort((a, b) => a.title.localeCompare(b.title)));
        setCourseId(created.id);
        setCourseMode("existing");
        setNewCourse(emptyCourse);
      }
      const body = { courseId: targetCourseId, title, status: nextStatus, sourceFile, sections: toServer(sections) };
      const saved = topicId ? await send<SavedTopic>("PUT", `/content/topics/${topicId}`, body) : await send<SavedTopic>("POST", "/content/topics", body);
      setTopicId(saved.id);
      setStatus(saved.status);
      setSections(saved.sections.length ? fromServer(saved.sections) : [emptySection()]);
      setDirty(false);
      window.history.replaceState(null, "", `/content?topic=${saved.id}`);
      setMessage({ tone: "success", text: nextStatus === "PUBLISHED" ? "Published. Students can now see this topic." : "Draft saved." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The topic could not be saved" });
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!topicId || !window.confirm(`Delete “${title || "this topic"}” permanently?`)) return;
    setBusy(true);
    try {
      await send("DELETE", `/content/topics/${topicId}`);
      setDirty(false);
      window.location.href = courseId ? `/courses/${courseId}` : "/courses";
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The topic could not be deleted" });
      setBusy(false);
    }
  }

  const heading = topicId ? (title || "Untitled topic") : "New topic";
  const actions = <div className="actions">
    <button className="button secondary" type="button" onClick={() => setPreview((value) => !value)}>{preview ? "Back to editing" : "Student preview"}</button>
    <button className="button secondary" type="button" disabled={busy || loading} onClick={() => void save("DRAFT")}>{status === "PUBLISHED" ? "Unpublish & save draft" : "Save draft"}</button>
    <button className="button" type="button" disabled={busy || loading} onClick={() => void save("PUBLISHED")}>{status === "PUBLISHED" ? "Update published topic" : "Publish"}</button>
  </div>;

  return <AdminShell active="Content Manager" title={heading} description="Write a topic in the system, or start from a Word document. Every course uses the same structure: sections made of content blocks." action={actions}>
    {message && <p className={`notice ${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
    {loading ? <p className="empty-state">Loading…</p> : <div className="content-manager">
      <aside className="content-sidebar">
        <Card title="Where it belongs">
          <div className="segmented" role="radiogroup" aria-label="Course">
            <button type="button" role="radio" aria-checked={courseMode === "existing"} className={courseMode === "existing" ? "on" : ""} onClick={() => { setCourseMode("existing"); setDirty(true); }} disabled={!courses.length}>Existing course</button>
            <button type="button" role="radio" aria-checked={courseMode === "new"} className={courseMode === "new" ? "on" : ""} onClick={() => { setCourseMode("new"); setDirty(true); }}>New course</button>
          </div>
          {courseMode === "existing" ? <label className="field"><span>Course <span className="required">*</span></span>
            <select value={courseId} onChange={(event) => { setCourseId(event.target.value); setDirty(true); }}>
              <option value="">Choose a course…</option>
              {courses.map((item) => <option value={item.id} key={item.id}>{item.title} · {item.code}</option>)}
            </select>
            {course && <small>Year {course.academicYear} · Semester {course.semester} · {course.topicCount} topic{course.topicCount === 1 ? "" : "s"}</small>}
          </label> : <div className="stack">
            <label className="field"><span>Course title <span className="required">*</span></span><input value={newCourse.title} onChange={(event) => { setNewCourse({ ...newCourse, title: event.target.value }); setDirty(true); }} placeholder="e.g. Law of Contract I" /></label>
            <label className="field"><span>Course code <span className="required">*</span></span><input value={newCourse.code} onChange={(event) => { setNewCourse({ ...newCourse, code: event.target.value }); setDirty(true); }} placeholder="e.g. LAW 1203" /><small>Must be unique.</small></label>
            <div className="two-col">
              <label className="field"><span>Year <span className="required">*</span></span><select value={newCourse.academicYear} onChange={(event) => { setNewCourse({ ...newCourse, academicYear: event.target.value }); setDirty(true); }}><option value="">Choose…</option>{[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
              <label className="field"><span>Semester <span className="required">*</span></span><select value={newCourse.semester} onChange={(event) => { setNewCourse({ ...newCourse, semester: event.target.value }); setDirty(true); }}><option value="">Choose…</option><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label>
            </div>
          </div>}
          <label className="field topic-title-field"><span>Topic title <span className="required">*</span></span><input value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} placeholder="e.g. Mens rea" /></label>
        </Card>

        <Card title="Status">
          <div className="publish-status"><Badge tone={status === "PUBLISHED" ? "green" : "gold"}>{status === "PUBLISHED" ? "Published" : topicId ? "Draft" : "Not saved yet"}</Badge><p>{status === "PUBLISHED" ? "Visible to students." : "Only editors can see drafts."}{dirty ? " You have unsaved changes." : ""}</p></div>
          {topicId && <button className="danger-link" type="button" disabled={busy} onClick={() => void remove()}>Delete topic</button>}
          {course && <Link className="row-action" href={`/courses/${course.id}`}>Go to {course.title} ›</Link>}
        </Card>

        <Card title="Start from Word (optional)">
          <label className="upload-dropzone compact"><strong>{busy ? "Working…" : "Choose a .docx file"}</strong><small>Fills the editor using the Word styles. Replaces what you have written.</small><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} disabled={busy} /></label>
          {sourceFile && <p className="file-name">Source: {sourceFile}</p>}
        </Card>
      </aside>

      <section className="content-workspace">
        {(warnings.length > 0 || flagged > 0) && <div className="import-report" role="status"><strong>Import report</strong>{flagged > 0 && <span>{flagged} block{flagged === 1 ? "" : "s"} flagged for checking</span>}{warnings.map((warning) => <span key={warning}>{warning}</span>)}<button type="button" onClick={() => setWarnings([])}>Dismiss</button></div>}
        {preview ? <Preview title={title} courseLabel={course ? `${course.title} · ${course.code}` : newCourse.title} sections={sections} /> : <>
          {sections.map((section, sectionIndex) => <Card className="section-card" key={sectionIndex}>
            <div className="section-heading-row">
              <label className="field"><span>Section {sectionIndex + 1} title <span className="required">*</span></span><input value={section.title} onChange={(event) => updateSection(sectionIndex, { title: event.target.value })} placeholder="e.g. Meaning of mens rea" /></label>
              <div className="icon-actions">
                <button type="button" aria-label={`Move section ${sectionIndex + 1} up`} disabled={sectionIndex === 0} onClick={() => changeSections((current) => move(current, sectionIndex, sectionIndex - 1))}>↑</button>
                <button type="button" aria-label={`Move section ${sectionIndex + 1} down`} disabled={sectionIndex === sections.length - 1} onClick={() => changeSections((current) => move(current, sectionIndex, sectionIndex + 1))}>↓</button>
                <button type="button" className="remove-block" onClick={() => { if (window.confirm(`Remove section ${sectionIndex + 1} and its content?`)) changeSections((current) => current.length > 1 ? current.filter((_item, i) => i !== sectionIndex) : [emptySection()]); }}>Remove section</button>
              </div>
            </div>
            {section.blocks.map((block, blockIndex) => <div className={`block-editor${block.flagged ? " flagged" : ""}`} key={blockIndex}>
              <div className="block-toolbar">
                <select aria-label="Block type" value={block.type} onChange={(event) => updateBlock(sectionIndex, blockIndex, { type: event.target.value as BlockType })}>{Object.entries(blockLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                <span>Block {blockIndex + 1}</span>
                <button type="button" aria-label="Move block up" disabled={blockIndex === 0} onClick={() => updateBlocks(sectionIndex, (blocks) => move(blocks, blockIndex, blockIndex - 1))}>↑</button>
                <button type="button" aria-label="Move block down" disabled={blockIndex === section.blocks.length - 1} onClick={() => updateBlocks(sectionIndex, (blocks) => move(blocks, blockIndex, blockIndex + 1))}>↓</button>
                <button type="button" className="remove-block" onClick={() => updateBlocks(sectionIndex, (blocks) => blocks.filter((_item, j) => j !== blockIndex))}>Remove</button>
              </div>
              {block.flagged && <p className="flag-note">{block.flagged}</p>}
              <textarea aria-label={`Section ${sectionIndex + 1}, block ${blockIndex + 1}`} value={block.text} onChange={(event) => updateBlock(sectionIndex, blockIndex, { text: event.target.value })} placeholder={blockHints[block.type]} rows={block.type === "PARAGRAPH" || block.type === "BULLET_LIST" ? 4 : 2} />
              {(block.type === "CASE" || block.type === "CITATION") && <input aria-label="Citation" value={block.citation ?? ""} onChange={(event) => updateBlock(sectionIndex, blockIndex, { citation: event.target.value })} placeholder="Citation, e.g. [1999] 1 AC 82" />}
            </div>)}
            <div className="add-row">{(["PARAGRAPH", "HEADING", "BULLET_LIST", "QUOTE", "CASE", "STATUTE"] as BlockType[]).map((type) => <button type="button" className="add-block" key={type} onClick={() => updateBlocks(sectionIndex, (blocks) => [...blocks, { type, text: "" }])}>＋ {blockLabels[type]}</button>)}</div>
          </Card>)}
          <button type="button" className="add-section" onClick={() => changeSections((current) => [...current, emptySection()])}>＋ Add section</button>
        </>}
      </section>
    </div>}
  </AdminShell>;
}

function Preview({ title, courseLabel, sections }: { title: string; courseLabel: string; sections: Section[] }) {
  return <article className="preview-page"><p className="eyebrow">{courseLabel || "No course chosen"}</p><h2>{title || "Untitled topic"}</h2><p className="preview-intro">Student preview</p>{sections.map((section, sectionIndex) => <section key={sectionIndex}><h3>{section.title || `Section ${sectionIndex + 1}`}</h3>{section.blocks.filter((block) => block.text.trim()).map((block, index) => block.type === "HEADING" ? <h4 key={index}>{block.text}</h4> : block.type === "BULLET_LIST" ? <ul key={index}>{block.text.split("\n").filter((line) => line.trim()).map((item, i) => <li key={i}>{item.trim()}</li>)}</ul> : block.type === "QUOTE" ? <blockquote key={index}>{block.text}</blockquote> : <p key={index} className={block.type === "CASE" || block.type === "STATUTE" ? "authority-block" : ""}>{block.text}{block.type === "CASE" && block.citation && block.citation !== block.text ? <small className="citation"> {block.citation}</small> : null}</p>)}</section>)}</article>;
}
