import { decryptSecret, secretLast4 } from "@/lib/ai/crypto";
import type { AiProviderRow } from "@/lib/ai/types";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ProvidersClient } from "./providers-client";

function readLast4(cipher: string): string | null {
  try {
    return secretLast4(decryptSecret(cipher));
  } catch {
    return null;
  }
}

export default async function ProvidersPage() {
  await requirePermission(PERMISSIONS.aiManage);

  const providers = await prisma.aiProvider.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      baseUrl: true,
      apiKeyCipher: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { models: true } },
    },
  });

  const rows: AiProviderRow[] = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    isActive: provider.isActive,
    sortOrder: provider.sortOrder,
    modelCount: provider._count.models,
    apiKeyLast4: readLast4(provider.apiKeyCipher),
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  }));

  return <ProvidersClient providers={rows} />;
}
