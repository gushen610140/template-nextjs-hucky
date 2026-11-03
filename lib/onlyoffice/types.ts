import type { OfficeDocumentType } from "./documents";

/** 传给 DocsAPI 的配置; token 由服务端在最后写入 */
export type OfficeEditorConfig = {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
    };
  };
  documentType: OfficeDocumentType;
  editorConfig: {
    mode: "edit";
    lang: string;
    callbackUrl: string;
    user: { id: string; name: string };
    customization: {
      forcesave: boolean;
      compactHeader: boolean;
    };
  };
  type: "desktop";
  width: "100%";
  height: "100%";
  token: string;
};
