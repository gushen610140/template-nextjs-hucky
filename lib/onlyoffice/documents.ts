/**
 * OnlyOffice 只负责编辑 Office 文档; 文件归属、权限、预览仍由本系统管理。
 * 这个模块保持纯函数, 客户端也用它判断文件是否可进入在线编辑。
 */

export type OfficeDocumentType = "word" | "cell" | "slide";

export type OfficeDocumentInfo = {
  fileType: "docx" | "xlsx" | "pptx";
  documentType: OfficeDocumentType;
};

const OFFICE_MIME: Record<
  string,
  { fileType: OfficeDocumentInfo["fileType"]; documentType: OfficeDocumentType }
> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    fileType: "docx",
    documentType: "word",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    fileType: "xlsx",
    documentType: "cell",
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    fileType: "pptx",
    documentType: "slide",
  },
};

/** 仅支持 OOXML 三种格式; 旧版 .doc/.xls/.ppt 暂不开放 */
export function getOfficeDocumentInfo(
  name: string,
  mimeType: string,
): OfficeDocumentInfo | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "docx") return { fileType: "docx", documentType: "word" };
  if (extension === "xlsx") return { fileType: "xlsx", documentType: "cell" };
  if (extension === "pptx") return { fileType: "pptx", documentType: "slide" };

  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const byMime = OFFICE_MIME[normalized];
  return byMime
    ? { fileType: byMime.fileType, documentType: byMime.documentType }
    : null;
}
