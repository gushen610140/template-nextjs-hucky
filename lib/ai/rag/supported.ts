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

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/yaml",
  "text/xml",
]);

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** 与 extract.ts 保持一致的可解析类型判断; 客户端和服务端共用。 */
export function isRagFileSupported(name: string, mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  const extension = getFileExtension(name);

  if (mime === "application/pdf" || extension === "pdf") return true;
  if (mime === DOCX_MIME_TYPE || extension === "docx") return true;
  if (mime.startsWith("text/")) return true;
  if (TEXT_MIME_TYPES.has(mime)) return true;
  if (mime === "application/octet-stream") {
    return TEXT_EXTENSIONS.has(extension);
  }
  return false;
}

export function isTextLikeRagFile(name: string, mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  return (
    mime.startsWith("text/") ||
    TEXT_MIME_TYPES.has(mime) ||
    (mime === "application/octet-stream" &&
      TEXT_EXTENSIONS.has(getFileExtension(name)))
  );
}

export function isDocxRagFile(name: string, mimeType: string): boolean {
  return (
    mimeType.toLowerCase() === DOCX_MIME_TYPE ||
    getFileExtension(name) === "docx"
  );
}

export function isPdfRagFile(name: string, mimeType: string): boolean {
  return (
    mimeType.toLowerCase() === "application/pdf" ||
    getFileExtension(name) === "pdf"
  );
}
