"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyboardEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "../admin-api";
import {
  Authority, Block, BlockType, CourseOption, ImportResult, Section, ServerTopic, Status,
  addableTypes, authoritiesOf, blockHints, blockLabels, emptyBlock, emptySection, fromServer, hasText, importKey, readingMinutes, send, toServer,
} from "./shared";

type SaveState = "saved" | "dirty" | "saving" | "error";

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item!);
  return copy;
}

/** A textarea that grows with its content, so the page reads like a page rather than a form. */
function AutoText({ value, onChange, className, placeholder, label, autoFocus, onKeyDown }: { value: string; onChange: (value: string) => void; className: string; placeholder: string; label: string; autoFocus?: boolean; onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = useCallback(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }, []);
  useLayoutEffect(fit, [value, fit]);
  // Re-measure when the column width changes or the web fonts finish loading.
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; fit(); } });
    observer.observe(el);
    void document.fonts?.ready.then(fit);
    document.fonts?.addEventListener("loadingdone", fit);
    return () => { observer.disconnect(); document.fonts?.removeEventListener("loadingdone", fit); };
  }, [fit]);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return <textarea ref={ref} rows={1} className={className} value={value} placeholder={placeholder} aria-label={label} onChange={(event) => onChange(event.target.value)} {...(onKeyDown ? { onKeyDown } : {})} />;
}

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
const ICON = { back: "M15 18l-6-6 6-6", up: "m6 15 6-6 6 6", down: "m6 9 6 6 6-6", plus: "M12 5v14M5 12h14", check: "M20 6 9 17l-5-5", chevron: "m6 9 6 6 6-6", more: "M5 12h.01M12 12h.01M19 12h.01", alert: "M12 8v5M12 16h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" };

export function Writer({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("DRAFT");
  const [courseId, setCourseId] = useState("");
  const [position, setPosition] = useState(1);
  const [sourceFile, setSourceFile] = useState<string | undefined>();
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [importNote, setImportNote] = useState<{ warnings: string[]; sourceFile: string } | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"publish" | "published" | null>(null);
  const [preview, setPreview] = useState(false);
  const [coursePicker, setCoursePicker] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const saving = useRef(false);

  const course = courses.find((item) => item.id === courseId);
  const authorities = useMemo(() => authoritiesOf(sections), [sections]);
  const flaggedCount = sections.reduce((sum, section) => sum + section.blocks.filter((block) => block.flagged).length, 0);

  useEffect(() => {
    Promise.all([adminFetch<ServerTopic>(`/content/topics/${encodeURIComponent(topicId)}`), adminFetch<CourseOption[]>("/admin/courses")])
      .then(([topic, list]) => {
        setCourses(list);
        setTitle(topic.title); setStatus(topic.status); setCourseId(topic.courseId); setPosition(topic.position);
        setSourceFile(topic.sourceFile ?? undefined);
        let imported: ImportResult | null = null;
        try { const raw = sessionStorage.getItem(importKey(topic.id)); if (raw) { imported = JSON.parse(raw) as ImportResult; sessionStorage.removeItem(importKey(topic.id)); } } catch { imported = null; }
        if (imported) { setSections(fromServer(imported.sections)); setImportNote({ warnings: imported.warnings, sourceFile: imported.sourceFile }); }
        else setSections(topic.sections.length ? fromServer(topic.sections) : [emptySection()]);
        setLoaded(true);
      })
      .catch((reason: unknown) => setLoadError(reason instanceof Error ? reason.message : "This topic could not be opened"));
  }, [topicId]);

  const save = useCallback(async (nextStatus: Status, current: { title: string; courseId: string; sections: Section[]; sourceFile?: string | undefined }) => {
    if (saving.current) return false;
    if (!current.title.trim()) { setSaveState("error"); setSaveError("Add a title to save this topic."); return false; }
    saving.current = true;
    const at = version.current;
    setSaveState("saving");
    try {
      const saved = await send<ServerTopic>("PUT", `/content/topics/${topicId}`, { courseId: current.courseId, title: current.title, status: nextStatus, sourceFile: current.sourceFile, sections: toServer(current.sections) });
      savedVersion.current = at;
      setStatus(saved.status); setPosition(saved.position);
      setSaveError("");
      setSaveState(version.current === at ? "saved" : "dirty");
      return true;
    } catch (reason) {
      setSaveState("error");
      setSaveError(reason instanceof Error ? reason.message : "Saving failed");
      return false;
    } finally { saving.current = false; }
  }, [topicId]);

  // Drafts save themselves shortly after you stop typing. Published topics only change when you press Update.
  useEffect(() => {
    if (!loaded || status !== "DRAFT" || saveState !== "dirty") return;
    const timer = window.setTimeout(() => { void save("DRAFT", { title, courseId, sections, sourceFile }); }, 1200);
    return () => window.clearTimeout(timer);
  }, [loaded, status, saveState, title, courseId, sections, sourceFile, save]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saveState === "dirty" || saveState === "saving") event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  useEffect(() => {
    if (!loaded) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActiveSection(Number((visible.target as HTMLElement).dataset.index ?? 0));
    }, { rootMargin: "-80px 0px -60% 0px" });
    document.querySelectorAll("[data-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loaded, sections.length]);

  function touch() { version.current += 1; setSaveState("dirty"); }
  function changeSections(update: (current: Section[]) => Section[]) { setSections(update); touch(); }
  const updateSection = (index: number, fields: Partial<Section>) => changeSections((current) => current.map((section, i) => i === index ? { ...section, ...fields } : section));
  const updateBlocks = (index: number, update: (blocks: Block[]) => Block[]) => changeSections((current) => current.map((section, i) => i === index ? { ...section, blocks: update(section.blocks) } : section));
  const updateBlock = (sectionIndex: number, key: string, fields: Partial<Block>) => updateBlocks(sectionIndex, (blocks) => blocks.map((block) => block.key === key ? { ...block, ...fields } : block));

  function addBlock(sectionIndex: number, type: BlockType) {
    const block = emptyBlock(type);
    // A section's empty starter paragraph is replaced rather than left behind.
    updateBlocks(sectionIndex, (blocks) => { const last = blocks[blocks.length - 1]; return last && last.type === "PARAGRAPH" && !hasText(last) ? [...blocks.slice(0, -1), block] : [...blocks, block]; });
    setFocusKey(block.key);
    setMenuFor(null);
  }
  function addSection() { const section = emptySection(); changeSections((current) => [...current, section]); setFocusKey(`title-${section.key}`); window.setTimeout(() => document.getElementById(`sec-${section.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  function removeSection(index: number) {
    const section = sections[index]!;
    const filled = section.title.trim() || section.blocks.some(hasText);
    if (filled && !window.confirm(`Remove section ${index + 1}${section.title ? `, “${section.title}”,` : ""} and everything in it?`)) return;
    changeSections((current) => current.length > 1 ? current.filter((_item, i) => i !== index) : [emptySection()]);
  }
  function jumpTo(id: string) { const el = document.getElementById(id); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.querySelector<HTMLElement>("textarea,input")?.focus({ preventScroll: true }); }

  async function publish() {
    if (await save("PUBLISHED", { title, courseId, sections, sourceFile })) setDialog("published");
  }
  async function update() { await save("PUBLISHED", { title, courseId, sections, sourceFile }); }
  async function unpublish() { setMoreOpen(false); if (window.confirm("Move this topic back to draft? Students will stop seeing it.")) await save("DRAFT", { title, courseId, sections, sourceFile }); }
  async function remove() {
    setMoreOpen(false);
    if (!window.confirm(`Delete “${title || "this topic"}” permanently? This can’t be undone.`)) return;
    try { await send("DELETE", `/content/topics/${topicId}`); version.current = savedVersion.current; setSaveState("saved"); router.replace(`/courses/${courseId}`); }
    catch (reason) { setSaveState("error"); setSaveError(reason instanceof Error ? reason.message : "The topic could not be deleted"); }
  }

  if (loadError) return <div className="w-screen"><header className="w-bar"><Link className="w-back" href="/courses"><Icon d={ICON.back} size={18} />Courses</Link></header><main className="setup"><div className="setup-form"><h1>This topic couldn’t be opened</h1><p className="setup-lede">{loadError}</p><Link className="w-primary" href="/content">Start a new topic</Link></div></main></div>;
  if (!loaded) return <div className="w-screen"><p className="w-loading">Opening the topic…</p></div>;

  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "error" ? saveError : saveState === "dirty" ? (status === "PUBLISHED" ? "Changes not live yet" : "Unsaved changes") : status === "PUBLISHED" ? "Published" : "Draft saved";
  const courseLabel = course ? `${course.code}, Year ${course.academicYear}, Semester ${course.semester}` : "Choose a course";

  return <div className="w-screen">
    <header className="w-bar">
      <Link className="w-back" href={courseId ? `/courses/${courseId}` : "/courses"}><Icon d={ICON.back} size={18} />{course?.title ?? "Courses"}</Link>
      <div className="w-pop-wrap">
        <button type="button" className="w-chip" aria-expanded={coursePicker} onClick={() => setCoursePicker((open) => !open)}>{courseLabel}<Icon d={ICON.chevron} size={14} /></button>
        {coursePicker && <div className="w-pop" role="dialog" aria-label="Move to another course">
          <p className="w-pop-title">Course</p>
          {courses.map((item) => <button type="button" key={item.id} className={`w-pop-item${item.id === courseId ? " on" : ""}`} onClick={() => { setCoursePicker(false); if (item.id !== courseId) { setCourseId(item.id); touch(); } }}><strong>{item.title}</strong><small>{item.code}</small></button>)}
          <p className="w-pop-note">Moving a topic puts it at the end of the other course.</p>
        </div>}
      </div>
      <span className={`w-save ${saveState}`} role="status">{saveState === "saved" && <Icon d={ICON.check} size={14} />}{saveState === "error" && <Icon d={ICON.alert} size={14} />}{saveLabel}{saveState === "error" && title.trim() && <button type="button" className="w-link small" onClick={() => void save(status, { title, courseId, sections, sourceFile })}>Try again</button>}</span>
      <button type="button" className="w-secondary" onClick={() => setPreview(true)}>Preview as student</button>
      {status === "PUBLISHED"
        ? <button type="button" className="w-primary" disabled={saveState !== "dirty" && saveState !== "error"} onClick={() => void update()}>Update</button>
        : <button type="button" className="w-primary" onClick={() => setDialog("publish")}>Publish</button>}
      <div className="w-pop-wrap">
        <button type="button" className="w-icon" aria-label="More actions" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}><Icon d={ICON.more} size={20} /></button>
        {moreOpen && <div className="w-pop right" role="menu">
          {status === "PUBLISHED" && <button type="button" role="menuitem" className="w-pop-item" onClick={() => void unpublish()}>Move back to draft</button>}
          <button type="button" role="menuitem" className="w-pop-item danger" onClick={() => void remove()}>Delete topic</button>
        </div>}
      </div>
    </header>

    <div className="w-body">
      <nav className="w-outline" aria-label="Sections">
        <p className="w-side-title">Sections</p>
        {sections.map((section, index) => <a key={section.key} href={`#sec-${section.key}`} className={index === activeSection ? "on" : ""} onClick={(event) => { event.preventDefault(); jumpTo(`sec-${section.key}`); }}><span>{index + 1}</span>{section.title.trim() || "Untitled section"}</a>)}
        <button type="button" className="w-link" onClick={addSection}>Add section</button>
      </nav>

      <main className="w-main">
        {importNote && <div className="w-import" role="status">
          <Icon d={ICON.check} size={18} />
          <p>Read {sections.length} section{sections.length === 1 ? "" : "s"} from {importNote.sourceFile}.{flaggedCount > 0 ? <> <strong>{flaggedCount} need{flaggedCount === 1 ? "s" : ""} a look</strong> because {flaggedCount === 1 ? "it wasn’t" : "they weren’t"} styled with the template.</> : " Everything matched the template styles."}{importNote.warnings.map((warning) => <span key={warning} className="w-import-warn"> {warning}</span>)}</p>
          {flaggedCount > 0 && <button type="button" className="w-link" onClick={() => { const first = sections.flatMap((section) => section.blocks).find((block) => block.flagged); if (first) jumpTo(`blk-${first.key}`); }}>Go to the first one</button>}
          <button type="button" className="w-link muted" onClick={() => setImportNote(null)}>Dismiss</button>
        </div>}

        <article className="w-page">
          <div className="w-row w-head">
            <div />
            <div>
              <AutoText className="w-title" value={title} label="Topic title" placeholder="Topic title" onChange={(value) => { setTitle(value.replace(/\n/g, " ")); touch(); }} />
              <p className="w-meta">Topic {position} of {course?.title ?? "its course"}</p>
            </div>
          </div>

          {sections.map((section, sectionIndex) => <section className="w-section" key={section.key} id={`sec-${section.key}`} data-section="" data-index={sectionIndex} aria-label={`Section ${sectionIndex + 1}`}>
            <div className="w-row">
              <div className="w-note strong">Section {sectionIndex + 1}
                <span className="w-tools">
                  <button type="button" aria-label={`Move section ${sectionIndex + 1} up`} disabled={sectionIndex === 0} onClick={() => changeSections((current) => move(current, sectionIndex, sectionIndex - 1))}><Icon d={ICON.up} /></button>
                  <button type="button" aria-label={`Move section ${sectionIndex + 1} down`} disabled={sectionIndex === sections.length - 1} onClick={() => changeSections((current) => move(current, sectionIndex, sectionIndex + 1))}><Icon d={ICON.down} /></button>
                  <button type="button" className="danger" onClick={() => removeSection(sectionIndex)}>Remove</button>
                </span>
              </div>
              <AutoText className="w-section-title" value={section.title} label={`Section ${sectionIndex + 1} title`} placeholder="Section title" autoFocus={focusKey === `title-${section.key}`} onChange={(value) => updateSection(sectionIndex, { title: value.replace(/\n/g, " ") })} />
            </div>

            {section.blocks.map((block, blockIndex) => <BlockEditor key={block.key} block={block} index={blockIndex} count={section.blocks.length} autoFocus={focusKey === block.key}
              onChange={(fields) => updateBlock(sectionIndex, block.key, fields)}
              onMove={(to) => updateBlocks(sectionIndex, (blocks) => move(blocks, blockIndex, to))}
              onRemove={() => updateBlocks(sectionIndex, (blocks) => blocks.filter((item) => item.key !== block.key))}
              onEnterAtEnd={() => addBlock(sectionIndex, "PARAGRAPH")} />)}

            <div className="w-row">
              <div />
              {menuFor === section.key
                ? <div className="w-add-menu" role="menu" aria-label="Add a block">{addableTypes.map((type) => <button type="button" role="menuitem" key={type} className={`w-add-item ${type.toLowerCase()}`} onClick={() => addBlock(sectionIndex, type)}><strong>{blockLabels[type]}</strong><span>{blockHints[type]}</span></button>)}<button type="button" className="w-link muted" onClick={() => setMenuFor(null)}>Close</button></div>
                : <button type="button" className="w-add" aria-expanded="false" onClick={() => setMenuFor(section.key)}><Icon d={ICON.plus} />Add to this section</button>}
            </div>
          </section>)}

          <div className="w-row"><div /><button type="button" className="w-add-section" onClick={addSection}><Icon d={ICON.plus} />Add a section</button></div>
        </article>
      </main>

      <AuthorityTable authorities={authorities} onJump={(key) => jumpTo(`blk-${key}`)} />
    </div>

    {dialog === "publish" && <PublishCheck title={title} courseTitle={course?.title ?? "this course"} position={position} sections={sections} authorities={authorities} flagged={flaggedCount} busy={saveState === "saving"} error={saveState === "error" ? saveError : ""} onClose={() => setDialog(null)} onPublish={() => void publish()} onJump={(key) => { setDialog(null); jumpTo(`blk-${key}`); }} />}
    {dialog === "published" && <div className="w-modal-back"><div className="w-modal" role="dialog" aria-modal="true" aria-labelledby="pub-done">
      <h2 id="pub-done">Published</h2>
      <p>“{title}” is now live for {course?.title ?? "the course"} students. From here, edits go live when you press Update.</p>
      <div className="w-modal-actions"><button type="button" className="w-secondary" onClick={() => { setDialog(null); setPreview(true); }}>See it as a student</button><Link className="w-primary" href={`/courses/${courseId}`}>Back to the course</Link></div>
    </div></div>}
    {preview && <StudentPreview title={title} courseTitle={course?.title ?? ""} position={position} sections={sections} onClose={() => setPreview(false)} />}
  </div>;
}

function BlockEditor({ block, index, count, autoFocus, onChange, onMove, onRemove, onEnterAtEnd }: { block: Block; index: number; count: number; autoFocus: boolean; onChange: (fields: Partial<Block>) => void; onMove: (to: number) => void; onRemove: () => void; onEnterAtEnd: () => void }) {
  const tone = block.flagged ? "flag" : block.type === "CASE" ? "case" : block.type === "STATUTE" ? "statute" : "";
  const label = block.flagged ? `${blockLabels[block.type]}?` : blockLabels[block.type];
  // Enter on an empty last line of a paragraph starts a new paragraph, the way a word processor does.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && block.type === "PARAGRAPH" && index === count - 1 && block.text.endsWith("\n")) { event.preventDefault(); onChange({ text: block.text.replace(/\n+$/, "") }); onEnterAtEnd(); }
  };
  const text = (className: string, placeholder: string) => <AutoText className={className} value={block.text} label={`${blockLabels[block.type]} ${index + 1}`} placeholder={placeholder} autoFocus={autoFocus} onChange={(value) => onChange({ text: value })} onKeyDown={onKeyDown} />;

  return <div className="w-row w-blk" id={`blk-${block.key}`}>
    <div className={`w-note ${tone}`}>{label}
      <span className="w-tools">
        <select aria-label="Block type" value={block.type} onChange={(event) => onChange({ type: event.target.value as BlockType, flagged: undefined })}>{Object.entries(blockLabels).map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select>
        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}><Icon d={ICON.up} /></button>
        <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index + 1)}><Icon d={ICON.down} /></button>
        <button type="button" className="danger" onClick={onRemove}>Remove</button>
      </span>
    </div>
    <div className={`w-content ${tone}`}>
      {block.type === "CASE" ? <>
        <div className="w-case-line">{text("w-in case-name", "Case name, e.g. R v Woollin")}<input className="w-in citation" aria-label="Citation" value={block.citation ?? ""} placeholder="[1999] 1 AC 82" onChange={(event) => onChange({ citation: event.target.value })} /></div>
      </> : block.type === "STATUTE" ? text("w-in statute-name", "Provision, e.g. Section 12 of the Penal Code Act")
        : block.type === "HEADING" ? text("w-in sub", "Sub-heading")
        : block.type === "QUOTE" ? text("w-in prose quote", "The quoted passage")
        : block.type === "BULLET_LIST" ? text("w-in prose list", "One point per line")
        : block.type === "CITATION" ? text("w-in cite", "Reference")
        : text("w-in prose", index === 0 ? "Start writing…" : "Write…")}
      {block.flagged && <div className="w-flag">
        <p>{block.flagged}</p>
        <div><button type="button" className={`w-chip-btn ${block.type === "STATUTE" ? "statute" : "case"}`} onClick={() => onChange({ flagged: undefined })}>Yes, it’s a {block.type === "STATUTE" ? "statute" : "case"}</button><button type="button" className="w-chip-btn" onClick={() => onChange({ type: "PARAGRAPH", citation: undefined, flagged: undefined })}>No, keep as paragraph</button></div>
      </div>}
    </div>
  </div>;
}

function AuthorityTable({ authorities, onJump }: { authorities: Authority[]; onJump: (key: string) => void }) {
  const cases = authorities.filter((item) => item.kind === "case");
  const statutes = authorities.filter((item) => item.kind === "statute");
  const problems = authorities.filter((item) => item.problem);
  const list = (items: Authority[]) => <ul>{items.map((item) => <li key={item.key}><button type="button" onClick={() => onJump(item.key)}><span className={item.kind === "case" ? "w-case-name" : "w-statute-name"}>{item.name}</span><small>{[item.detail, `section ${item.section}`].filter(Boolean).join(", ")}</small>{item.problem && <em>{item.problem}</em>}</button></li>)}</ul>;
  return <aside className="w-authorities" aria-label="Table of authorities">
    <h2>Table of authorities</h2>
    <p className="w-muted">Every case and statute in this topic, as students will see it listed.</p>
    {authorities.length === 0 && <p className="w-empty">Cases and statutes you add appear here.</p>}
    {cases.length > 0 && <><h3 className="case">Cases</h3>{list(cases)}</>}
    {statutes.length > 0 && <><h3 className="statute">Statutes</h3>{list(statutes)}</>}
    {problems.length > 0 && <p className="w-warn">{problems.length === 1 ? "One authority is" : `${problems.length} authorities are`} missing a citation or section number. Fill {problems.length === 1 ? "it" : "them"} in before publishing so students can look {problems.length === 1 ? "it" : "them"} up.</p>}
  </aside>;
}

function PublishCheck({ title, courseTitle, position, sections, authorities, flagged, busy, error, onClose, onPublish, onJump }: { title: string; courseTitle: string; position: number; sections: Section[]; authorities: Authority[]; flagged: number; busy: boolean; error: string; onClose: () => void; onPublish: () => void; onJump: (key: string) => void }) {
  const withContent = sections.filter((section) => section.blocks.some(hasText)).length;
  const untitled = sections.findIndex((section) => !section.title.trim());
  const empty = sections.length - withContent;
  const cases = authorities.filter((item) => item.kind === "case");
  const problems = authorities.filter((item) => item.problem);
  const blocking = !title.trim() ? "The topic needs a title." : untitled >= 0 ? `Section ${untitled + 1} needs a title.` : withContent === 0 ? "Write some content first." : "";
  useEffect(() => { const close = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  const row = (ok: boolean, content: ReactNode) => <li className={ok ? "ok" : "warn"}><Icon d={ok ? ICON.check : ICON.alert} size={20} /><span>{content}</span></li>;
  return <div className="w-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-modal" role="dialog" aria-modal="true" aria-labelledby="pub-h">
      <h2 id="pub-h">Publish “{title || "Untitled topic"}”?</h2>
      <p>Students taking {courseTitle} will see it as topic {position} in the app.</p>
      <ul className="w-checks">
        {row(!blocking, blocking || `${withContent} section${withContent === 1 ? "" : "s"} with content${empty ? `, ${empty} empty (left out for students)` : ""}`)}
        {row(problems.length === 0, problems.length === 0 ? (cases.length ? `${cases.length} case${cases.length === 1 ? "" : "s"}, all with citations` : "No cases cited") : <><strong>{problems.length} authorit{problems.length === 1 ? "y is" : "ies are"} incomplete.</strong> <button type="button" className="w-link small" onClick={() => onJump(problems[0]!.key)}>Fix it first</button>, or publish and fill {problems.length === 1 ? "it" : "them"} in later.</>)}
        {flagged > 0 && row(false, <><strong>{flagged} imported block{flagged === 1 ? "" : "s"} still marked for checking.</strong> They’ll publish as they are now.</>)}
      </ul>
      {error && <p className="w-error" role="alert">{error}</p>}
      <div className="w-modal-actions"><button type="button" className="w-secondary" onClick={onClose}>Keep editing</button><button type="button" className="w-primary" disabled={Boolean(blocking) || busy} onClick={onPublish}>{busy ? "Publishing…" : "Publish"}</button></div>
    </div>
  </div>;
}

function StudentPreview({ title, courseTitle, position, sections, onClose }: { title: string; courseTitle: string; position: number; sections: Section[]; onClose: () => void }) {
  const [device, setDevice] = useState<"phone" | "web">("phone");
  useEffect(() => { const close = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  return <div className="w-preview" role="dialog" aria-modal="true" aria-label="Student preview">
    <header className="w-preview-bar">
      <button type="button" className="w-back light" onClick={onClose}><Icon d={ICON.back} size={18} />Back to editing</button>
      <span>Previewing “{title || "Untitled topic"}” as a {courseTitle} student.</span>
      <div className="w-seg" role="radiogroup" aria-label="Device">{(["phone", "web"] as const).map((item) => <button type="button" role="radio" aria-checked={device === item} className={device === item ? "on" : ""} key={item} onClick={() => setDevice(item)}>{item === "phone" ? "Phone" : "Web"}</button>)}</div>
    </header>
    <div className="w-preview-stage">
      {device === "phone"
        ? <div className="w-phone"><div className="w-phone-screen"><div className="sr-top"><span>{courseTitle}, topic {position}</span></div><StudentReader title={title} sections={sections} compact /></div></div>
        : <div className="w-web"><p className="sr-kicker">{courseTitle}, topic {position}</p><StudentReader title={title} sections={sections} /></div>}
    </div>
  </div>;
}

/** How a topic reads in the student app: the same blocks, typeset for reading. */
export function StudentReader({ title, sections, compact = false }: { title: string; sections: Section[]; compact?: boolean }) {
  const shown = sections.filter((section) => section.blocks.some(hasText));
  return <article className={`sr${compact ? " compact" : ""}`}>
    <h1>{title || "Untitled topic"}</h1>
    <p className="sr-meta">{shown.length} section{shown.length === 1 ? "" : "s"}, about {readingMinutes(sections)} minute{readingMinutes(sections) === 1 ? "" : "s"}</p>
    {shown.length === 0 && <p className="sr-empty">Nothing to read yet. Content you write appears here.</p>}
    {shown.map((section, index) => <section key={section.key}>
      <h2>{index + 1}. {section.title.trim() || "Untitled section"}</h2>
      {section.blocks.filter(hasText).map((block) => block.type === "HEADING" ? <h3 key={block.key}>{block.text}</h3>
        : block.type === "BULLET_LIST" ? <ul key={block.key}>{block.text.split("\n").filter((line) => line.trim()).map((line, i) => <li key={i}>{line.trim()}</li>)}</ul>
        : block.type === "QUOTE" ? <blockquote key={block.key}>{block.text}</blockquote>
        : block.type === "CASE" ? <div className="sr-slip case" key={block.key}><span className="sr-slip-head"><em>{block.text}</em><b>Case</b></span>{block.citation && <span className="sr-cite">{block.citation}</span>}</div>
        : block.type === "STATUTE" ? <div className="sr-slip statute" key={block.key}><span className="sr-slip-head"><span>{block.text}</span><b>Statute</b></span></div>
        : block.type === "CITATION" ? <p className="sr-cite-line" key={block.key}>{block.text}</p>
        : <p key={block.key}>{block.text.split("\n").map((line, i, all) => <span key={i}>{line}{i < all.length - 1 && <br />}</span>)}</p>)}
    </section>)}
  </article>;
}
