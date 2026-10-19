import { Router } from "express";
import mammoth from "mammoth";
import { ContentBlockType, ContentStatus } from "@prisma/client";
import { prisma } from "../auth.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

type DraftBlock = { type: ContentBlockType; text: string; citation?: string };
type DraftSection = { title: string; blocks: DraftBlock[] };

const sectionNames = new Set([
  "Concept",
  "Elements of the principle",
  "RELEVANCE OF PRINCIPLE OF LEGALITY",
  "Theoretical foundations",
]);

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#x2019;|&#8217;/gi, "’")
    .replace(/&#x201c;|&#8220;/gi, "“")
    .replace(/&#x201d;|&#8221;/gi, "”");
}

function cleanMarkup(value: string) {
  return decodeEntities(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function classify(text: string, tag: string): DraftBlock {
  const normalized = text.toLowerCase();
  if (/^article\s+\d|^section\s+\d/i.test(text)) return { type: ContentBlockType.STATUTE, text };
  if (/\bv\.?\s|\[\d{4}\]|criminal case|appeal no\./i.test(text)) return { type: ContentBlockType.CASE, text, citation: text };
  if (tag === "ul" || tag === "ol") return { type: ContentBlockType.BULLET_LIST, text };
  if (text.startsWith("“") || normalized.startsWith("the principle of legality means parliament")) return { type: ContentBlockType.QUOTE, text };
  return { type: tag.startsWith("h") ? ContentBlockType.HEADING : ContentBlockType.PARAGRAPH, text };
}

function parseHtml(html: string) {
  const sections: DraftSection[] = [];
  let current: DraftSection = { title: "Concept and overview", blocks: [] };
  let courseTitle = "Criminal Law";
  let topicTitle = "Principle of Legality";
  const matches = html.match(/<(h[1-6]|p|ul|ol)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi) ?? [];

  for (const match of matches) {
    const tag = (match.match(/^<(h[1-6]|p|ul|ol)/i)?.[1] ?? "p").toLowerCase();
    const text = cleanMarkup(match.replace(/^<(?:ul|ol)[^>]*>/i, "").replace(/<\/(?:ul|ol)>$/i, "").replace(/<li[^>]*>/gi, "• "));
    if (!text) continue;
    if (/^criminal law\s*-\s*\(course unit\)/i.test(text)) {
      courseTitle = "Criminal Law";
      continue;
    }
    if (/princip(?:al|le) of legality/i.test(text) && /topic/i.test(text)) {
      topicTitle = "Principle of Legality";
      continue;
    }
    if (sectionNames.has(text) || /^the four theoretical foundations/i.test(text)) {
      if (current.blocks.length) sections.push(current);
      current = { title: /^the four theoretical foundations/i.test(text) ? "Theoretical foundations" : text, blocks: [] };
      continue;
    }
    current.blocks.push(classify(text, tag));
  }
  if (current.blocks.length) sections.push(current);
  return { courseTitle, topicTitle, sections };
}

function parseBody(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.fileBase64 !== "string" || typeof body.fileName !== "string") return null;
  return { fileBase64: body.fileBase64, fileName: body.fileName };
}

export const contentRouter = Router();
const editorsOnly = requireRoles("CONTENT_EDITOR", "ADMIN", "SUPER_ADMIN");

contentRouter.get("/topics/:id", requireAuth, async (request, response) => {
  const topicId = typeof request.params.id === "string" ? request.params.id : undefined;
  if (!topicId) {
    response.status(400).json({ error: "A topic id is required" });
    return;
  }
  const topic = await prisma.topic.findUnique({ where: { id: topicId }, include: { course: true, sections: { orderBy: { position: "asc" }, include: { blocks: { orderBy: { position: "asc" } } } } } });
  if (!topic || (topic.status !== ContentStatus.PUBLISHED && !["CONTENT_EDITOR", "ADMIN", "SUPER_ADMIN"].includes(request.authUser!.role))) {
    response.status(404).json({ error: "Published topic not found" });
    return;
  }
  response.json({ data: topic });
});

contentRouter.post("/import", requireAuth, editorsOnly, async (request, response) => {
  const body = parseBody(request.body);
  if (!body || !/\.docx$/i.test(body.fileName)) {
    response.status(400).json({ error: "Upload a Word .docx file" });
    return;
  }
  try {
    const { value: html, messages } = await mammoth.convertToHtml({ buffer: Buffer.from(body.fileBase64, "base64") });
    response.json({ data: { ...parseHtml(html), sourceFile: body.fileName, warnings: messages.map((message) => message.message) } });
  } catch {
    response.status(400).json({ error: "The Word document could not be imported" });
  }
});

contentRouter.post("/topics", requireAuth, editorsOnly, async (request, response) => {
  const body = request.body as { topicId?: string; course?: { code?: string; title?: string; academicYear?: number; semester?: number }; topic?: { title?: string; position?: number; sourceFile?: string; status?: ContentStatus; sections?: DraftSection[] } };
  const course = body.course;
  const topic = body.topic;
  if (!course?.code || !course.title || !topic?.title || !Array.isArray(topic.sections)) {
    response.status(400).json({ error: "A course, topic title and structured sections are required" });
    return;
  }
  const courseCode = course.code;
  const courseTitle = course.title;
  const topicTitle = topic.title;
  const sectionsInput = topic.sections;
  const status = topic.status === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
  const saved = await prisma.$transaction(async (transaction) => {
    const savedCourse = await transaction.course.upsert({
      where: { code: courseCode },
      update: { title: courseTitle, academicYear: course.academicYear ?? 2, semester: course.semester ?? 1 },
      create: { code: courseCode, title: courseTitle, academicYear: course.academicYear ?? 2, semester: course.semester ?? 1 },
    });
    const sections = {
      create: sectionsInput.map((section, sectionIndex) => ({
        title: section.title,
        position: sectionIndex + 1,
        blocks: {
          create: section.blocks.map((block, blockIndex) => ({
            type: block.type,
            text: block.text,
            ...(block.citation ? { citation: block.citation } : {}),
            position: blockIndex + 1,
          })),
        },
      })),
    };
    const data = { title: topicTitle, position: topic.position ?? 1, status, ...(topic.sourceFile ? { sourceFile: topic.sourceFile } : {}) };
    if (body.topicId) {
      await transaction.topicSection.deleteMany({ where: { topicId: body.topicId } });
      return transaction.topic.update({ where: { id: body.topicId }, data: { ...data, sections } });
    }
    return transaction.topic.create({ data: { ...data, courseId: savedCourse.id, sections } });
  });
  response.status(body.topicId ? 200 : 201).json({ data: saved });
});
