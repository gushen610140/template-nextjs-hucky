/**
 * 文件预览的类型判定。
 *
 * MIME 优先、扩展名兜底: 浏览器上传时给出的 MIME 并不可靠
 * (`text/plain` 的 `.md`、`application/octet-stream` 的 `.json` 很常见)。
 * 纯函数, 服务端和客户端都可以引用。
 */

export type PreviewKind =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "text"
  | "markdown"
  | "json"
  | "csv"
  | "docx"
  | "xlsx"
  | "unsupported";

export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "json"
  | "markdown"
  | "python"
  | "html"
  | "css"
  | "xml"
  | "sql"
  | "yaml";

export type FilePreviewInfo = {
  kind: PreviewKind;
  /** CodeMirror 语言; null 表示纯文本 */
  language: CodeLanguage | null;
  /** 可通过预签名 inline URL 直接交给浏览器渲染 */
  inline: boolean;
  /** 文本类: 可读取内容并编辑 */
  textual: boolean;
  /** 允许在预览页里编辑 */
  editable: boolean;
};

/** 文本内容单次读取 / 保存的上限 */
export const MAX_TEXT_BYTES = 1024 * 1024;

/** CSV 表格预览的行列上限 */
export const MAX_TABLE_ROWS = 200;
export const MAX_TABLE_COLUMNS = 30;

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

const VIDEO_EXTENSIONS = new Set(["m4v", "mkv", "mov", "mp4", "ogv", "webm"]);

const AUDIO_EXTENSIONS = new Set([
  "aac",
  "flac",
  "m4a",
  "mp3",
  "oga",
  "ogg",
  "opus",
  "wav",
]);

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** 常见源码扩展名 → 高亮语言; null 表示纯文本 */
const LANGUAGE_BY_EXTENSION: Record<string, CodeLanguage | null> = {
  bash: null,
  c: null,
  cc: null,
  cfg: null,
  cjs: "javascript",
  conf: null,
  cpp: null,
  cs: null,
  css: "css",
  csv: null,
  env: null,
  go: null,
  h: null,
  hpp: null,
  htm: "html",
  html: "html",
  ini: null,
  java: null,
  js: "javascript",
  json: "json",
  jsonc: "json",
  jsx: "javascript",
  kt: null,
  log: null,
  markdown: "markdown",
  md: "markdown",
  mdx: "markdown",
  mjs: "javascript",
  php: null,
  properties: null,
  py: "python",
  rb: null,
  rs: null,
  scss: "css",
  sh: null,
  sql: "sql",
  svg: "xml",
  toml: null,
  ts: "typescript",
  tsv: null,
  tsx: "typescript",
  txt: null,
  vue: "html",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zsh: null,
};

/** 明确按文本处理的扩展名; 不在表里且 MIME 也不是文本时按未知类型降级 */
const TEXT_EXTENSIONS = new Set([
  ...Object.keys(LANGUAGE_BY_EXTENSION),
  "dockerfile",
  "gitignore",
  "makefile",
  "npmrc",
]);

const TEXT_MIME_TYPES = new Set([
  "application/javascript",
  "application/json",
  "application/ld+json",
  "application/sql",
  "application/toml",
  "application/x-httpd-php",
  "application/x-sh",
  "application/x-yaml",
  "application/xml",
]);

function normalizeMime(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index + 1).toLowerCase();
}

function isTextMime(mime: string): boolean {
  return mime.startsWith("text/") || TEXT_MIME_TYPES.has(mime);
}

function languageFor(extension: string, mime: string): CodeLanguage | null {
  if (extension in LANGUAGE_BY_EXTENSION) {
    return LANGUAGE_BY_EXTENSION[extension] ?? null;
  }

  if (mime === "application/json" || mime === "application/ld+json") {
    return "json";
  }
  if (mime === "text/markdown") return "markdown";
  if (mime === "text/html") return "html";
  if (mime === "text/css") return "css";
  if (mime === "application/xml" || mime === "text/xml") return "xml";
  if (mime === "application/javascript") return "javascript";
  if (mime === "application/sql") return "sql";
  if (mime === "application/x-yaml") return "yaml";

  return null;
}

const INLINE_MIME_BY_EXTENSION: Record<string, string> = {
  aac: "audio/aac",
  avif: "image/avif",
  bmp: "image/bmp",
  flac: "audio/flac",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  m4a: "audio/mp4",
  m4v: "video/x-m4v",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  ogv: "video/ogg",
  opus: "audio/opus",
  png: "image/png",
  svg: "image/svg+xml",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
};

/**
 * 交给浏览器的 inline Content-Type。
 *
 * 存储里记录的 MIME 可能不可靠 (例如 `.pdf` 被标成 octet-stream),
 * 这里按最终判定结果归一化, 保证预览而不是触发下载。
 */
export function previewContentType(
  name: string,
  mimeType: string,
  kind: PreviewKind,
): string {
  if (kind === "pdf") return "application/pdf";

  const mapped = INLINE_MIME_BY_EXTENSION[extensionOf(name)];
  if (mapped) return mapped;

  const mime = normalizeMime(mimeType);
  if (kind === "image" && mime.startsWith("image/")) return mime;
  if (kind === "video" && mime.startsWith("video/")) return mime;
  if (kind === "audio" && mime.startsWith("audio/")) return mime;

  return "application/octet-stream";
}

const INLINE_KINDS: ReadonlySet<PreviewKind> = new Set([
  "image",
  "pdf",
  "video",
  "audio",
]);

const EDITABLE_KINDS: ReadonlySet<PreviewKind> = new Set([
  "text",
  "markdown",
  "json",
  "csv",
]);

export function describeFilePreview(
  name: string,
  mimeType: string,
): FilePreviewInfo {
  const mime = normalizeMime(mimeType);
  const extension = extensionOf(name);

  const build = (kind: PreviewKind): FilePreviewInfo => ({
    kind,
    language: languageFor(extension, mime),
    inline: INLINE_KINDS.has(kind),
    textual: EDITABLE_KINDS.has(kind),
    editable: EDITABLE_KINDS.has(kind),
  });

  // Office 与 PDF 先判, 避免扩展名落进通用文本分支
  if (mime === DOCX_MIME || extension === "docx") return build("docx");
  if (mime === XLSX_MIME || extension === "xlsx") return build("xlsx");
  if (mime === "application/pdf" || extension === "pdf") return build("pdf");

  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return build("image");
  }
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
    return build("video");
  }
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) {
    return build("audio");
  }

  // 注意: `text/html` 只当代码看, 永远不内联渲染
  if (extension === "md" || extension === "mdx" || extension === "markdown") {
    return build("markdown");
  }
  if (extension === "json" || extension === "jsonc") return build("json");
  if (extension === "csv" || extension === "tsv") return build("csv");
  if (mime === "text/markdown") return build("markdown");
  if (mime === "application/json" || mime === "application/ld+json") {
    return build("json");
  }
  if (mime === "text/csv" || mime === "text/tab-separated-values") {
    return build("csv");
  }

  if (isTextMime(mime) || TEXT_EXTENSIONS.has(extension)) {
    return build("text");
  }

  return {
    kind: "unsupported",
    language: null,
    inline: false,
    textual: false,
    editable: false,
  };
}
