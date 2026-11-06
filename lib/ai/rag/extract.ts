import mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";
import { readObjectBytes } from "@/lib/storage/objects";

/** 单个文件解析上限; 超过上限让管理员先拆分或压缩。 */
export const MAX_RAG_FILE_BYTES = 25 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 2_000_000;

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/yaml",
  "text/xml",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "yaml",
  "yml",
  "html",
  "htm",
  "log",
  "ini",
  "toml",
]);

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isTextFile(name: string, mimeType: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  if (TEXT_MIME_TYPES.has(mimeType)) return true;
  if (mimeType === "application/octet-stream") {
    return TEXT_EXTENSIONS.has(fileExtension(name));
  }
  return false;
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replaceAll("\u0000", "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * 从文件对象提取纯文本。
 *
 * 首版支持文本类、PDF、DOCX; 扫描版 PDF 没有文本层时返回空串,
 * 由调用方标记为不可向量化。
 */
export async function extractFileText(file: {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}): Promise<string> {
  if (file.size > MAX_RAG_FILE_BYTES) {
    throw new Error("file_too_large");
  }

  const bytes = await readObjectBytes(file.key, MAX_RAG_FILE_BYTES);
  const mimeType = file.mimeType.toLowerCase();
  const extension = fileExtension(file.name);

  let text: string;
  if (mimeType === "application/pdf" || extension === "pdf") {
    const result = await extractPdfText(bytes, { mergePages: true });
    text = result.text;
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });
    text = result.value;
  } else if (isTextFile(file.name, mimeType)) {
    text = decodeText(bytes);
    if (
      mimeType === "text/html" ||
      extension === "html" ||
      extension === "htm"
    ) {
      text = stripHtml(text);
    }
  } else {
    throw new Error("unsupported_file_type");
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    throw new Error("empty_text");
  }
  return normalized;
}
