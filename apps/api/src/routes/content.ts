import { Router } from "express";
import mammoth from "mammoth";
import { ContentBlockType, ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "../auth.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

type DraftBlock = { type: ContentBlockType; text: string; citation?: string; flagged?: string };
type DraftSection = { title: string; blocks: DraftBlock[] };

const editorRoles = ["CONTENT_EDITOR", "ADMIN", "SUPER_ADMIN"];
const editorsOnly = requireRoles("CONTENT_EDITOR", "ADMIN", "SUPER_ADMIN");
const blockTypes = new Set<string>(Object.values(ContentBlockType));

// Word styles from the shared topic template. Everything else falls back to Mammoth's defaults.
const styleMap = [
  "p[style-name='Title'] => h1.jp-title:fresh",
  "p[style-name='Case'] => p.jp-case:fresh",
  "p[style-name='Statute'] => p.jp-statute:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",
];

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#x2019;|&#8217;/gi, "’")
    .replace(/&#x2018;|&#8216;/gi, "‘")
    .replace(/&#x201c;|&#8220;/gi, "“")
    .replace(/&#x201d;|&#8221;/gi, "”");
}

function cleanMarkup(value: string) {
  return decodeEntities(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Splits "R v Woollin [1999] 1 AC 82" into the case name and its citation. */
function splitCase(text: string) {
  const citation = text.match(/[[(]\d{4}[\])].*$/)?.[0]?.trim();
  const name = citation ? text.slice(0, text.length - citation.length).trim().replace(/[,;]$/, "") : "";
  return name && citation ? { text: name, citation } : { text };
}

/** Turns Mammoth HTML into sections using Word structure only — the same rules for every course. */
function parseHtml(html: string) {
  const sections: DraftSection[] = [];
  const warnings: string[] = [];
  let current: DraftSection = { title: "Introduction", blocks: [] };
  let suggestedTitle = "";
  let skippingInstructions = false;
  // Ignore the template instruction page (if left in) when counting skipped tables and images.
  const titleAt = html.search(/class="jp-title"/);
  const body = titleAt > 0 && /instructions\b[\s\S]*?delete this page/i.test(html.slice(0, titleAt)) ? html.slice(titleAt) : html;
  const tables = (body.match(/<table[\s>]/gi) ?? []).length;
  const images = (body.match(/<img[\s>]/gi) ?? []).length;
  const withoutTables = html.replace(/<table[\s\S]*?<\/table>/gi, "");
  const matches = withoutTables.match(/<(h[1-6]|p|ul|ol|blockquote)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];

  for (const match of matches) {
    const opening = match.match(/^<(h[1-6]|p|ul|ol|blockquote)((?:\s[^>]*)?)>/i);
    const tag = (opening?.[1] ?? "p").toLowerCase();
    const className = opening?.[2]?.match(/class="([^"]*)"/i)?.[1] ?? "";
    const inner = match.replace(/^<[^>]+>/, "").replace(/<\/[a-z0-9]+>$/i, "");
    const text = tag === "ul" || tag === "ol"
      ? inner.split(/<li[^>]*>/i).map(cleanMarkup).filter(Boolean).map((item) => `• ${item}`).join(" ")
      : cleanMarkup(inner);
    if (!text) continue;

    // The template's instruction page should be deleted, but skip it if someone forgets.
    if (/^instructions\b.*delete this page/i.test(text)) { skippingInstructions = true; continue; }
    if (className.includes("jp-title")) {
      skippingInstructions = false;
      if (!suggestedTitle) suggestedTitle = text;
      continue;
    }
    if (skippingInstructions) continue;

    if (tag === "h1") {
      if (current.blocks.length) sections.push(current);
      current = { title: text, blocks: [] };
      continue;
    }
    if (tag.startsWith("h")) { current.blocks.push({ type: ContentBlockType.HEADING, text }); continue; }
    if (tag === "ul" || tag === "ol") { current.blocks.push({ type: ContentBlockType.BULLET_LIST, text }); continue; }
    if (tag === "blockquote") { current.blocks.push({ type: ContentBlockType.QUOTE, text }); continue; }
    if (className.includes("jp-case")) { current.blocks.push({ type: ContentBlockType.CASE, ...splitCase(text) }); continue; }
    if (className.includes("jp-statute")) { current.blocks.push({ type: ContentBlockType.STATUTE, text }); continue; }

    // Untemplated documents: guess, and flag the guess for a reviewer.
    if (text.length < 200 && /^(article|section|regulation|rule)\s+\d/i.test(text)) {
      current.blocks.push({ type: ContentBlockType.STATUTE, text, flagged: "Guessed as a statute from its wording. Check the type." });
    } else if (text.length < 200 && /\sv\.?\s/.test(text) && /[[(]\d{4}[\])]/.test(text)) {
      current.blocks.push({ type: ContentBlockType.CASE, ...splitCase(text), flagged: "Guessed as a case from “v” and a year. Check the citation." });
    } else {
      current.blocks.push({ type: ContentBlockType.PARAGRAPH, text });
    }
  }
  if (current.blocks.length) sections.push(current);
  if (tables) warnings.push(`${tables} table${tables === 1 ? " was" : "s were"} skipped. Add that content by hand.`);
  if (images) warnings.push(`${images} image${images === 1 ? " was" : "s were"} skipped.`);
  if (!matches.some((match) => /^<h1(?![^>]*jp-title)/i.test(match))) warnings.push("No Heading 1 found, so everything is in one section. Use Heading 1 for section titles.");
  return { suggestedTitle, sections, warnings };
}

function readSections(value: unknown, draft: boolean): { sections: DraftSection[] } | { error: string } {
  if (!Array.isArray(value)) return { error: "Sections are required" };
  const sections: DraftSection[] = [];
  for (const [index, raw] of value.entries()) {
    const section = raw as { title?: unknown; blocks?: unknown };
    const typed = typeof section?.title === "string" ? section.title.trim() : "";
    // Drafts autosave while someone is still typing, so an untitled section is allowed until publishing.
    if (!typed && !draft) return { error: `Section ${index + 1} needs a title` };
    const title = typed || "Untitled section";
    if (!Array.isArray(section.blocks)) return { error: `Section ${index + 1} has no blocks list` };
    const blocks: DraftBlock[] = [];
    for (const rawBlock of section.blocks) {
      const block = rawBlock as { type?: unknown; text?: unknown; citation?: unknown };
      const text = typeof block?.text === "string" ? block.text.trim() : "";
      if (!text) continue; // empty blocks are dropped rather than saved
      if (typeof block.type !== "string" || !blockTypes.has(block.type)) return { error: `Section ${index + 1} has a block with an unknown type` };
      const citation = typeof block.citation === "string" && block.citation.trim() ? block.citation.trim() : undefined;
      blocks.push({ type: block.type as ContentBlockType, text, ...(citation ? { citation } : {}) });
    }
    sections.push({ title, blocks });
  }
  return { sections };
}

function sectionCreates(sections: DraftSection[]) {
  return {
    create: sections.map((section, sectionIndex) => ({
      title: section.title,
      position: sectionIndex + 1,
      blocks: { create: section.blocks.map((block, blockIndex) => ({ type: block.type, text: block.text, ...(block.citation ? { citation: block.citation } : {}), position: blockIndex + 1 })) },
    })),
  };
}

function readTopicBody(value: unknown) {
  const body = (value ?? {}) as { courseId?: unknown; title?: unknown; status?: unknown; sourceFile?: unknown; sections?: unknown };
  const courseId = typeof body.courseId === "string" ? body.courseId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!courseId) return { error: "Choose a course for this topic" };
  if (!title) return { error: "Give the topic a title" };
  const status = body.status === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
  const parsed = readSections(body.sections, status === ContentStatus.DRAFT);
  if ("error" in parsed) return parsed;
  if (status === ContentStatus.PUBLISHED && !parsed.sections.some((section) => section.blocks.length)) return { error: "Add some content before publishing" };
  const sourceFile = typeof body.sourceFile === "string" && body.sourceFile ? body.sourceFile : undefined;
  return { courseId, title, status, sourceFile, sections: parsed.sections };
}

async function nextPosition(transaction: Prisma.TransactionClient, courseId: string) {
  const last = await transaction.topic.findFirst({ where: { courseId }, orderBy: { position: "desc" }, select: { position: true } });
  return (last?.position ?? 0) + 1;
}

const topicInclude = { course: true, sections: { orderBy: { position: "asc" as const }, include: { blocks: { orderBy: { position: "asc" as const } } } } };

export const contentRouter = Router();

contentRouter.get("/topics/:id", requireAuth, async (request, response) => {
  const topicId = typeof request.params.id === "string" ? request.params.id : undefined;
  if (!topicId) { response.status(400).json({ error: "A topic id is required" }); return; }
  const topic = await prisma.topic.findUnique({ where: { id: topicId }, include: topicInclude });
  if (!topic || (topic.status !== ContentStatus.PUBLISHED && !editorRoles.includes(request.authUser!.role))) {
    response.status(404).json({ error: "Published topic not found" });
    return;
  }
  response.json({ data: topic });
});

function readCourseBody(value: unknown) {
  const body = (value ?? {}) as { code?: unknown; title?: unknown; academicYear?: unknown; semester?: unknown };
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/\s+/g, " ") : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const academicYear = Number(body.academicYear);
  const semester = Number(body.semester);
  if (!code || !title) return { error: "A course needs a title and a code" };
  if (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 6) return { error: "Choose the academic year" };
  if (!Number.isInteger(semester) || semester < 1 || semester > 3) return { error: "Choose the semester" };
  return { code, title, academicYear, semester };
}

contentRouter.post("/courses", requireAuth, editorsOnly, async (request, response) => {
  const input = readCourseBody(request.body);
  if ("error" in input) { response.status(400).json({ error: input.error }); return; }
  const existing = await prisma.course.findUnique({ where: { code: input.code } });
  if (existing) { response.status(409).json({ error: `Course code ${input.code} is already used by “${existing.title}”` }); return; }
  const course = await prisma.course.create({ data: input });
  response.status(201).json({ data: course });
});

contentRouter.put("/courses/:id", requireAuth, editorsOnly, async (request, response) => {
  const courseId = typeof request.params.id === "string" ? request.params.id : "";
  const input = readCourseBody(request.body);
  if ("error" in input) { response.status(400).json({ error: input.error }); return; }
  const [course, clash] = await Promise.all([prisma.course.findUnique({ where: { id: courseId } }), prisma.course.findUnique({ where: { code: input.code } })]);
  if (!course) { response.status(404).json({ error: "Course not found" }); return; }
  if (clash && clash.id !== courseId) { response.status(409).json({ error: `Course code ${input.code} is already used by “${clash.title}”` }); return; }
  response.json({ data: await prisma.course.update({ where: { id: courseId }, data: input }) });
});

// Sets the teaching order of a course's topics. Positions are unique per course, so move them out of the way first.
contentRouter.put("/courses/:id/order", requireAuth, editorsOnly, async (request, response) => {
  const courseId = typeof request.params.id === "string" ? request.params.id : "";
  const topicIds = (request.body as { topicIds?: unknown } | undefined)?.topicIds;
  if (!Array.isArray(topicIds) || !topicIds.every((id) => typeof id === "string")) { response.status(400).json({ error: "Send the topic ids in their new order" }); return; }
  const current = await prisma.topic.findMany({ where: { courseId }, select: { id: true } });
  const ids = topicIds as string[];
  if (current.length !== ids.length || !current.every((topic) => ids.includes(topic.id))) { response.status(400).json({ error: "The order must list every topic in this course once" }); return; }
  await prisma.$transaction([
    ...ids.map((id, index) => prisma.topic.update({ where: { id }, data: { position: -(index + 1) } })),
    ...ids.map((id, index) => prisma.topic.update({ where: { id }, data: { position: index + 1 } })),
  ]);
  response.json({ data: { topicIds: ids } });
});

contentRouter.post("/import", requireAuth, editorsOnly, async (request, response) => {
  const body = (request.body ?? {}) as { fileBase64?: unknown; fileName?: unknown };
  if (typeof body.fileBase64 !== "string" || typeof body.fileName !== "string" || !/\.docx$/i.test(body.fileName)) {
    response.status(400).json({ error: "Upload a Word .docx file" });
    return;
  }
  try {
    const { value: html, messages } = await mammoth.convertToHtml({ buffer: Buffer.from(body.fileBase64, "base64") }, { styleMap });
    const parsed = parseHtml(html);
    const warnings = [...parsed.warnings, ...messages.filter((message) => message.type === "error").map((message) => message.message)];
    response.json({ data: { ...parsed, warnings, sourceFile: body.fileName } });
  } catch {
    response.status(400).json({ error: "The Word document could not be read" });
  }
});

contentRouter.post("/topics", requireAuth, editorsOnly, async (request, response) => {
  const input = readTopicBody(request.body);
  if ("error" in input) { response.status(400).json({ error: input.error }); return; }
  const course = await prisma.course.findUnique({ where: { id: input.courseId } });
  if (!course) { response.status(400).json({ error: "That course no longer exists" }); return; }
  const saved = await prisma.$transaction(async (transaction) => {
    const topic = await transaction.topic.create({
      data: { courseId: input.courseId, title: input.title, status: input.status, position: await nextPosition(transaction, input.courseId), ...(input.sourceFile ? { sourceFile: input.sourceFile } : {}), sections: sectionCreates(input.sections) },
      include: topicInclude,
    });
    if (input.status === ContentStatus.PUBLISHED) await transaction.course.update({ where: { id: input.courseId }, data: { status: ContentStatus.PUBLISHED } });
    return topic;
  });
  response.status(201).json({ data: saved });
});

contentRouter.put("/topics/:id", requireAuth, editorsOnly, async (request, response) => {
  const topicId = typeof request.params.id === "string" ? request.params.id : "";
  const input = readTopicBody(request.body);
  if ("error" in input) { response.status(400).json({ error: input.error }); return; }
  const [existing, course] = await Promise.all([prisma.topic.findUnique({ where: { id: topicId } }), prisma.course.findUnique({ where: { id: input.courseId } })]);
  if (!existing) { response.status(404).json({ error: "Topic not found" }); return; }
  if (!course) { response.status(400).json({ error: "That course no longer exists" }); return; }
  const saved = await prisma.$transaction(async (transaction) => {
    const moving = existing.courseId !== input.courseId;
    await transaction.topicSection.deleteMany({ where: { topicId } });
    const topic = await transaction.topic.update({
      where: { id: topicId },
      data: { title: input.title, status: input.status, ...(moving ? { courseId: input.courseId, position: await nextPosition(transaction, input.courseId) } : {}), ...(input.sourceFile ? { sourceFile: input.sourceFile } : {}), sections: sectionCreates(input.sections) },
      include: topicInclude,
    });
    if (input.status === ContentStatus.PUBLISHED) await transaction.course.update({ where: { id: input.courseId }, data: { status: ContentStatus.PUBLISHED } });
    return topic;
  });
  response.json({ data: saved });
});

contentRouter.delete("/topics/:id", requireAuth, editorsOnly, async (request, response) => {
  const topicId = typeof request.params.id === "string" ? request.params.id : "";
  const existing = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } });
  if (!existing) { response.status(404).json({ error: "Topic not found" }); return; }
  await prisma.topic.delete({ where: { id: topicId } });
  response.json({ data: { id: topicId } });
});
