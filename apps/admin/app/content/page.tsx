"use client";

import { ChangeEvent, useState } from "react";
import { AdminShell, Badge, Card } from "../components";

type BlockType = "HEADING" | "PARAGRAPH" | "BULLET_LIST" | "QUOTE" | "CASE" | "STATUTE" | "CITATION";
type Block = { type: BlockType; text: string; citation?: string };
type Section = { title: string; blocks: Block[] };
type Draft = { courseTitle: string; courseCode: string; topicTitle: string; academicYear: number; semester: number; sourceFile?: string; status: "DRAFT" | "PUBLISHED"; sections: Section[] };

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const blockLabels: Record<BlockType, string> = { HEADING: "Heading", PARAGRAPH: "Paragraph", BULLET_LIST: "List", QUOTE: "Quote", CASE: "Case", STATUTE: "Statute", CITATION: "Citation" };

function token() { return typeof window === "undefined" ? "" : localStorage.getItem("juris.accessToken") ?? ""; }

function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The file could not be read"));
    reader.readAsDataURL(file);
  });
}

export default function ContentManager() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("Choose a Word document to create an editable draft.");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  async function importDocument(file: File) {
    setBusy(true);
    setFileName(file.name);
    setMessage("Reading the document and organizing its headings…");
    try {
      const response = await fetch(`${apiBase}/content/import`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify({ fileName: file.name, fileBase64: await fileAsBase64(file) }) });
      const payload = await response.json() as { data?: { courseTitle: string; topicTitle: string; sourceFile: string; sections: Section[]; warnings?: string[] }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "The document could not be imported");
      setDraft({ courseTitle: payload.data.courseTitle, courseCode: "LAW 2101", topicTitle: payload.data.topicTitle, academicYear: 2, semester: 1, sourceFile: payload.data.sourceFile, status: "DRAFT", sections: payload.data.sections });
      setMessage(payload.data.warnings?.length ? `Imported with ${payload.data.warnings.length} formatting note(s). Review the draft before publishing.` : "Imported as a draft. Review and organize the blocks before publishing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be imported");
    } finally { setBusy(false); }
  }

  function updateDraft(fields: Partial<Draft>) { setDraft((current) => current ? { ...current, ...fields } : current); }
  function updateSection(index: number, title: string) { setDraft((current) => current ? { ...current, sections: current.sections.map((section, i) => i === index ? { ...section, title } : section) } : current); }
  function updateBlock(sectionIndex: number, blockIndex: number, fields: Partial<Block>) { setDraft((current) => current ? { ...current, sections: current.sections.map((section, i) => i === sectionIndex ? { ...section, blocks: section.blocks.map((block, j) => j === blockIndex ? { ...block, ...fields } : block) } : section) } : current); }
  function addBlock(sectionIndex: number) { setDraft((current) => current ? { ...current, sections: current.sections.map((section, i) => i === sectionIndex ? { ...section, blocks: [...section.blocks, { type: "PARAGRAPH", text: "" }] } : section) } : current); }
  function removeBlock(sectionIndex: number, blockIndex: number) { setDraft((current) => current ? { ...current, sections: current.sections.map((section, i) => i === sectionIndex ? { ...section, blocks: section.blocks.filter((_block, j) => j !== blockIndex) } : section) } : current); }

  async function save(status: Draft["status"]) {
    if (!draft) return;
    setBusy(true);
    setMessage(status === "PUBLISHED" ? "Publishing topic…" : "Saving draft…");
    try {
      const response = await fetch(`${apiBase}/content/topics`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify({ course: { code: draft.courseCode, title: draft.courseTitle, academicYear: draft.academicYear, semester: draft.semester }, topic: { title: draft.topicTitle, sourceFile: draft.sourceFile, status, sections: draft.sections } }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The topic could not be saved");
      setDraft({ ...draft, status });
      setMessage(status === "PUBLISHED" ? "Published. Students can now receive this topic from the content API." : "Draft saved successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The topic could not be saved"); }
    finally { setBusy(false); }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) void importDocument(file); }

  return <AdminShell active="Content Manager" title="Content Manager" description="Import Word documents, organize learning content and publish it to students." action={draft ? <div className="actions"><button className="button secondary" type="button" onClick={() => setPreview((value) => !value)}>{preview ? "Edit content" : "Preview student view"}</button><button className="button" type="button" disabled={busy} onClick={() => void save("PUBLISHED")}>Publish topic</button></div> : undefined}>
    <div className="content-manager">
      <aside className="content-sidebar">
        <Card title="Import source"><label className="upload-dropzone"><span className="upload-icon">＋</span><strong>{busy ? "Importing…" : "Choose a Word document"}</strong><small>.docx files are converted into editable blocks.</small><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} disabled={busy} /></label>{fileName && <p className="file-name">{fileName}</p>}<p className="import-message">{message}</p></Card>
        {draft && <Card title="Publishing"><div className="publish-status"><Badge tone={draft.status === "PUBLISHED" ? "green" : "gold"}>{draft.status}</Badge><p>{draft.status === "PUBLISHED" ? "Visible to students." : "Only administrators can see this draft."}</p></div><button className="full-secondary" type="button" disabled={busy} onClick={() => void save("DRAFT")}>Save as draft</button></Card>}
      </aside>
      <section className="content-workspace">
        {!draft ? <Card className="content-empty"><div className="empty-content-icon">▤</div><h2>Start with a Word document</h2><p>Upload a lesson or topic document. The importer will create a draft with sections, paragraphs, lists, cases and statutes that you can correct before publishing.</p></Card> : preview ? <Preview draft={draft} /> : <Card title="Editable topic draft"><div className="content-form-grid"><label className="field"><span>Course</span><input value={draft.courseTitle} onChange={(event) => updateDraft({ courseTitle: event.target.value })} /></label><label className="field"><span>Course code</span><input value={draft.courseCode} onChange={(event) => updateDraft({ courseCode: event.target.value })} /></label><label className="field"><span>Topic title</span><input value={draft.topicTitle} onChange={(event) => updateDraft({ topicTitle: event.target.value })} /></label><label className="field"><span>Academic period</span><select value={`${draft.academicYear}-${draft.semester}`} onChange={(event) => { const [academicYear, semester] = event.target.value.split("-").map(Number); updateDraft({ academicYear, semester }); }}><option value="1-1">Year 1 · Semester 1</option><option value="2-1">Year 2 · Semester 1</option><option value="2-2">Year 2 · Semester 2</option><option value="3-1">Year 3 · Semester 1</option></select></label></div>{draft.sections.map((section, sectionIndex) => <div className="section-editor" key={`${section.title}-${sectionIndex}`}><div className="section-heading-row"><label className="field"><span>Section {sectionIndex + 1}</span><input value={section.title} onChange={(event) => updateSection(sectionIndex, event.target.value)} /></label><span className="section-count">{section.blocks.length} blocks</span></div>{section.blocks.map((block, blockIndex) => <div className="block-editor" key={`${sectionIndex}-${blockIndex}`}><div className="block-toolbar"><select value={block.type} onChange={(event) => updateBlock(sectionIndex, blockIndex, { type: event.target.value as BlockType })}>{Object.entries(blockLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><span>Block {blockIndex + 1}</span><button type="button" className="remove-block" onClick={() => removeBlock(sectionIndex, blockIndex)}>Remove</button></div><textarea value={block.text} onChange={(event) => updateBlock(sectionIndex, blockIndex, { text: event.target.value })} placeholder="Write or correct this content block…" />{(block.type === "CASE" || block.type === "CITATION") && <input value={block.citation ?? ""} onChange={(event) => updateBlock(sectionIndex, blockIndex, { citation: event.target.value })} placeholder="Citation or authority" />}</div>)}<button type="button" className="add-block" onClick={() => addBlock(sectionIndex)}>＋ Add content block</button></div>)}</Card>}
      </section>
    </div>
  </AdminShell>;
}

function Preview({ draft }: { draft: Draft }) {
  return <article className="preview-page"><p className="eyebrow">{draft.courseTitle} · {draft.courseCode}</p><h2>{draft.topicTitle}</h2><p className="preview-intro">Student preview · {draft.status === "PUBLISHED" ? "Published" : "Draft"}</p>{draft.sections.map((section) => <section key={section.title}><h3>{section.title}</h3>{section.blocks.map((block, index) => block.type === "HEADING" ? <h4 key={index}>{block.text}</h4> : block.type === "BULLET_LIST" ? <ul key={index}>{block.text.split("•").filter(Boolean).map((item) => <li key={item}>{item.trim()}</li>)}</ul> : block.type === "QUOTE" ? <blockquote key={index}>{block.text}</blockquote> : <p key={index} className={block.type === "CASE" || block.type === "STATUTE" ? "authority-block" : ""}>{block.text}</p>)}</section>)}</article>;
}
