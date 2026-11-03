import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OfficeEditor } from "@/components/files/office/office-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/authz";
import { getFileDetail } from "@/lib/files/queries";
import { getOfficeDocumentInfo } from "@/lib/onlyoffice/documents";
import { getOnlyOfficeSettings } from "@/lib/onlyoffice/env";
import { signOnlyOfficeToken } from "@/lib/onlyoffice/jwt";
import type { OfficeEditorConfig } from "@/lib/onlyoffice/types";
import { PERMISSIONS } from "@/lib/permissions";
import { createEditorDocumentUrl } from "@/lib/storage/presign";

type OfficeEditPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

/**
 * Office 在线编辑页。
 *
 * 权限和预览页一致; 配置与 callback token 都在服务端生成,
 * 浏览器只拿到已经签名的 config。
 */
export default async function OfficeEditPage({ params }: OfficeEditPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("OfficeEditor");
  const user = await requireUser();
  const permissions = await getUserPermissions(user.id);

  const canManage = permissions.has(PERMISSIONS.fileManage);
  const canOwn = permissions.has(PERMISSIONS.fileOwn);
  if (!canManage && !canOwn) notFound();

  const file = await getFileDetail(id);
  if (!file || file.status !== "READY") notFound();
  if (!canManage && file.ownerId !== user.id) notFound();

  const office = getOfficeDocumentInfo(file.name, file.mimeType);
  if (!office) notFound();

  const previewHref = `/${locale}/dashboard/files/${file.id}`;
  const settings = getOnlyOfficeSettings();
  if (!settings.ok) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Alert variant="destructive">
          <AlertDescription>
            {t("notConfigured", { missing: settings.missing.join(", ") })}
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild className="w-fit">
          <Link href={previewHref}>{t("back")}</Link>
        </Button>
      </div>
    );
  }

  let documentUrl: string;
  try {
    documentUrl = await createEditorDocumentUrl(
      file.key,
      file.mimeType,
      file.name,
    );
  } catch (error) {
    console.error("onlyoffice: failed to presign document:", error);
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Alert variant="destructive">
          <AlertDescription>{t("storageFailed")}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild className="w-fit">
          <Link href={previewHref}>{t("back")}</Link>
        </Button>
      </div>
    );
  }

  const documentKey = `${file.id}-${randomUUID()}`;
  const callbackUrl = settings.value.saveCallbackUrl
    ? new URL(settings.value.saveCallbackUrl)
    : null;

  if (callbackUrl) {
    const callbackToken = await signOnlyOfficeToken({
      kind: "callback",
      fileId: file.id,
    });
    callbackUrl.searchParams.set("token", callbackToken);
  }

  const baseConfig: Omit<OfficeEditorConfig, "token"> = {
    document: {
      fileType: office.fileType,
      key: documentKey,
      title: file.name,
      url: documentUrl,
      permissions: { edit: true, download: true, print: true },
    },
    documentType: office.documentType,
    editorConfig: {
      mode: "edit",
      lang: locale === "zh" ? "zh-CN" : "en",
      ...(callbackUrl ? { callbackUrl: callbackUrl.toString() } : {}),
      user: {
        id: user.id,
        name: user.name ?? user.email,
      },
      customization: {
        forcesave: true,
        compactHeader: false,
      },
    },
    type: "desktop",
    width: "100%",
    height: "100%",
  };

  const config: OfficeEditorConfig = {
    ...baseConfig,
    token: await signOnlyOfficeToken(baseConfig),
  };

  return (
    <OfficeEditor
      dsUrl={settings.value.dsUrl}
      config={config}
      fileName={file.name}
      previewHref={previewHref}
      saveDisabled={!callbackUrl}
    />
  );
}
