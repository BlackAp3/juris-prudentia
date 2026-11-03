// Shared types and helpers for the topic writer.

export type BlockType = "HEADING" | "PARAGRAPH" | "BULLET_LIST" | "QUOTE" | "CASE" | "STATUTE" | "CITATION";
export type Status = "DRAFT" | "PUBLISHED";
export type Block = { key: string; type: BlockType; text: string; citation?: string | undefined; flagged?: string | undefined };
export type Section = { key: string; title: string; blocks: Block[] };
export type CourseOption = { id: string; code: string; title: string; academicYear: number; semester: number; topicCount: number; status?: string };
export type ServerBlock = { type: BlockType; text: string; citation?: string | null; flagged?: string };
export type ServerSection = { title: string; blocks: ServerBlock[] };
export type ServerTopic = { id: string; title: string; status: Status; position: number; courseId: string; sourceFile?: string | null; course?: { id: string; title: string; code: string }; sections: ServerSection[] };
export type ImportResult = { suggestedTitle: string; sections: ServerSection[]; warnings: string[]; sourceFile: string };

export const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const blockLabels: Record<BlockType, string> = { PARAGRAPH: "Paragraph", HEADING: "Sub-heading", BULLET_LIST: "List", QUOTE: "Quote", CASE: "Case", STATUTE: "Statute", CITATION: "Citation" };
export const blockHints: Record<BlockType, string> = {
  PARAGRAPH: "Commentary or explanation",
  HEADING: "A heading inside the section",
  BULLET_LIST: "Points, one per line",
  QUOTE: "A passage from a judgment or text",
  CASE: "Case name and citation",
  STATUTE: "A provision of an Act or the Constitution",
  CITATION: "A reference to a source",
};
export const addableTypes: BlockType[] = ["PARAGRAPH", "HEADING", "BULLET_LIST", "QUOTE", "CASE", "STATUTE"];

let counter = 0;
export const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;
export const emptyBlock = (type: BlockType = "PARAGRAPH"): Block => ({ key: newKey(), type, text: "" });
export const emptySection = (): Section => ({ key: newKey(), title: "", blocks: [emptyBlock()] });

function token() { return typeof window === "undefined" ? "" : localStorage.getItem("juris.accessToken") ?? ""; }

export async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) throw new Error(payload.error ?? "The request failed. Check your connection and try again.");
  return payload.data;
}

export function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The file could not be read"));
    reader.readAsDataURL(file);
  });
}

// Lists are stored as "• a • b" (the convention the mobile app reads); the writer shows one point per line.
const listToLines = (text: string) => text.split("•").map((item) => item.trim()).filter(Boolean).join("\n");
const linesToList = (text: string) => text.split("\n").map((item) => item.trim()).filter(Boolean).map((item) => `• ${item}`).join(" ");

export const fromServer = (sections: ServerSection[]): Section[] => sections.map((section) => ({
  key: newKey(),
  title: section.title === "Untitled section" ? "" : section.title,
  blocks: section.blocks.map((block) => ({ key: newKey(), type: block.type, text: block.type === "BULLET_LIST" ? listToLines(block.text) : block.text, ...(block.citation ? { citation: block.citation } : {}), ...(block.flagged ? { flagged: block.flagged } : {}) })),
}));

export const toServer = (sections: Section[]) => sections.map((section) => ({
  title: section.title,
  blocks: section.blocks.map((block) => ({ type: block.type, text: block.type === "BULLET_LIST" ? linesToList(block.text) : block.text, ...(block.citation ? { citation: block.citation } : {}) })),
}));

export const hasText = (block: Block) => block.text.trim().length > 0;

export type Authority = { key: string; kind: "case" | "statute"; name: string; detail: string; section: number; problem?: string };

/** Every case and statute in the topic, in reading order, with anything a student would trip over. */
export function authoritiesOf(sections: Section[]): Authority[] {
  const list: Authority[] = [];
  sections.forEach((section, index) => section.blocks.forEach((block) => {
    if (!hasText(block)) return;
    if (block.type === "CASE") list.push({ key: block.key, kind: "case", name: block.text.trim(), detail: block.citation?.trim() ?? "", section: index + 1, ...(block.citation?.trim() ? {} : { problem: "No citation yet" }) });
    if (block.type === "STATUTE") {
      const text = block.text.trim();
      const missing = /_{2,}|\[[^\]]*\]/.test(text) || !/\d/.test(text);
      list.push({ key: block.key, kind: "statute", name: text, detail: "", section: index + 1, ...(missing ? { problem: "No section or article number" } : {}) });
    }
  }));
  return list;
}

export function readingMinutes(sections: Section[]) {
  const words = sections.reduce((sum, section) => sum + section.blocks.reduce((inner, block) => inner + block.text.split(/\s+/).filter(Boolean).length, 0), 0);
  return Math.max(1, Math.round(words / 200));
}

export const importKey = (topicId: string) => `juris.import.${topicId}`;
