"use client";

import { Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "@/components/rbac/confirm-delete-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AI_MODALITIES,
  type AiModelRow,
  type AiProviderRow,
} from "@/lib/ai/types";
import type { AiModality, AiModelKind } from "@/lib/generated/prisma/enums";
import { createModel, deleteModel, testModel, updateModel } from "./actions";

type ModelsClientProps = {
  models: AiModelRow[];
  providers: AiProviderRow[];
};

type TestState = { ok: boolean; modelId: string } | null;

const INPUT_MODALITIES = AI_MODALITIES.filter(
  (modality): modality is Exclude<AiModality, "VECTOR"> =>
    modality !== "VECTOR",
);

export function ModelsClient({ models, providers }: ModelsClientProps) {
  const t = useTranslations("Ai");
  const [formTarget, setFormTarget] = useState<AiModelRow | "create" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AiModelRow | null>(null);
  const [testState, setTestState] = useState<TestState>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function handleTest(model: AiModelRow) {
    setTestState(null);
    setTestingId(model.id);
    startTransition(async () => {
      const result = await testModel(model.id);
      setTestingId(null);
      setTestState({ ok: result.ok, modelId: model.id });
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("models.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("models.description")}
          </p>
        </div>
        <Button
          onClick={() => setFormTarget("create")}
          disabled={providers.length === 0}
        >
          <Plus />
          {t("models.create")}
        </Button>
      </div>

      {providers.length === 0 && (
        <Alert>
          <AlertDescription>{t("models.needProvider")}</AlertDescription>
        </Alert>
      )}

      {testState && (
        <Alert variant={testState.ok ? "default" : "destructive"}>
          <AlertDescription>
            {testState.ok ? t("models.testOk") : t("models.testFailed")}
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("models.model")}</TableHead>
              <TableHead>{t("models.provider")}</TableHead>
              <TableHead>{t("models.contextWindow")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.empty")}
                </TableCell>
              </TableRow>
            ) : (
              models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div className="grid">
                      <span className="font-medium">{model.displayName}</span>
                      <span className="text-muted-foreground text-xs">
                        {model.modelId}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t(`modelKinds.${model.kind}`)}
                        {model.kind === "EMBEDDING" &&
                          model.embeddingDimension &&
                          ` · ${model.embeddingDimension}d`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid">
                      <span className="text-sm">{model.providerName}</span>
                      <span className="text-muted-foreground text-xs">
                        {t(`types.${model.providerType}`)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {model.contextWindow
                      ? model.contextWindow.toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={model.isActive ? "secondary" : "destructive"}
                      >
                        {model.isActive
                          ? t("common.active")
                          : t("common.inactive")}
                      </Badge>
                      {model.isDefault && (
                        <Badge variant="outline">{t("models.default")}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleTest(model)}
                        disabled={pending && testingId === model.id}
                        aria-label={t("models.test")}
                        title={t("models.test")}
                      >
                        <Play />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setFormTarget(model)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(model)}
                        aria-label={t("common.delete")}
                        title={t("common.delete")}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {formTarget && (
        <ModelFormDialog
          key={formTarget === "create" ? "create" : formTarget.id}
          model={formTarget === "create" ? null : formTarget}
          providers={providers}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("models.deleteTitle")}
          description={t("models.deleteDescription", {
            name: deleteTarget.displayName,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pendingLabel={t("common.deleting")}
          onConfirm={async () => {
            const result = await deleteModel(deleteTarget.id);
            return result.ok
              ? result
              : { ok: false, error: errorText(result.error) };
          }}
        />
      )}
    </div>
  );
}

function ModelFormDialog({
  model,
  providers,
  onClose,
}: {
  model: AiModelRow | null;
  providers: AiProviderRow[];
  onClose: () => void;
}) {
  const t = useTranslations("Ai");
  const isEdit = model !== null;
  const [providerId, setProviderId] = useState(
    model?.providerId ?? providers[0]?.id ?? "",
  );
  const [modelId, setModelId] = useState(model?.modelId ?? "");
  const [displayName, setDisplayName] = useState(model?.displayName ?? "");
  const [kind, setKind] = useState<AiModelKind>(model?.kind ?? "CHAT");
  const [inputModalities, setInputModalities] = useState<string[]>(
    model?.inputModalities ?? ["TEXT"],
  );
  const [embeddingDimension, setEmbeddingDimension] = useState(
    model?.embeddingDimension?.toString() ?? "",
  );
  const [contextWindow, setContextWindow] = useState(
    model?.contextWindow?.toString() ?? "",
  );
  const [maxTokens, setMaxTokens] = useState(
    model?.maxTokens?.toString() ?? "",
  );
  const [temperature, setTemperature] = useState(
    model?.temperature?.toString() ?? "",
  );
  const [isActive, setIsActive] = useState(model?.isActive ?? true);
  const [isDefault, setIsDefault] = useState(model?.isDefault ?? false);
  const [sortOrder, setSortOrder] = useState(String(model?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function handleKindChange(next: AiModelKind) {
    setKind(next);
    if (next === "EMBEDDING") {
      setInputModalities((current) =>
        current.length > 0 ? current : ["TEXT"],
      );
      return;
    }
    setEmbeddingDimension("");
  }

  function toggleInputModality(modality: string, checked: boolean) {
    setInputModalities((current) =>
      checked
        ? [...new Set([...current, modality])]
        : current.filter((item) => item !== modality),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      providerId,
      modelId,
      displayName,
      kind,
      inputModalities,
      outputModalities: kind === "EMBEDDING" ? ["VECTOR"] : ["TEXT"],
      embeddingDimension,
      contextWindow,
      maxTokens,
      temperature,
      isActive,
      isDefault,
      sortOrder: Number(sortOrder),
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateModel({ id: model.id, ...payload })
        : await createModel(payload);

      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }

      onClose();
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("models.editTitle") : t("models.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("models.formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-model-provider">{t("models.provider")}</Label>
              <select
                id="ai-model-provider"
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-model-id">{t("models.modelId")}</Label>
              <Input
                id="ai-model-id"
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                maxLength={160}
                placeholder="gpt-4.1-mini"
                required
              />
              <p className="text-muted-foreground text-xs">
                {t("models.modelIdHint")}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-model-name">{t("models.displayName")}</Label>
              <Input
                id="ai-model-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-model-kind">{t("models.kind")}</Label>
              <select
                id="ai-model-kind"
                value={kind}
                onChange={(event) =>
                  handleKindChange(event.target.value as AiModelKind)
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="CHAT">{t("modelKinds.CHAT")}</option>
                <option value="EMBEDDING">{t("modelKinds.EMBEDDING")}</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("models.inputModalities")}</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {INPUT_MODALITIES.map((modality) => (
                  <div key={modality} className="flex items-center gap-2">
                    <Checkbox
                      id={`ai-model-input-${modality}`}
                      checked={inputModalities.includes(modality)}
                      onCheckedChange={(checked) =>
                        toggleInputModality(modality, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`ai-model-input-${modality}`}
                      className="font-normal"
                    >
                      {t(`modalities.${modality}`)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("models.outputModalities")}</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {kind === "EMBEDDING"
                    ? t("modalities.VECTOR")
                    : t("modalities.TEXT")}
                </Badge>
              </div>
            </div>

            {kind === "EMBEDDING" && (
              <div className="grid gap-1.5">
                <Label htmlFor="ai-model-dimension">
                  {t("models.embeddingDimension")}
                </Label>
                <Input
                  id="ai-model-dimension"
                  type="number"
                  min={1}
                  value={embeddingDimension}
                  onChange={(event) =>
                    setEmbeddingDimension(event.target.value)
                  }
                  placeholder="1024"
                  required
                />
                <p className="text-muted-foreground text-xs">
                  {t("models.embeddingDimensionHint")}
                </p>
              </div>
            )}

            <div
              className={
                kind === "CHAT" ? "grid grid-cols-2 gap-3" : "grid gap-3"
              }
            >
              <div className="grid gap-1.5">
                <Label htmlFor="ai-model-context">
                  {t("models.contextWindow")}
                </Label>
                <Input
                  id="ai-model-context"
                  type="number"
                  min={1}
                  value={contextWindow}
                  onChange={(event) => setContextWindow(event.target.value)}
                  placeholder="128000"
                />
              </div>
              {kind === "CHAT" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="ai-model-max-tokens">
                    {t("models.maxTokens")}
                  </Label>
                  <Input
                    id="ai-model-max-tokens"
                    type="number"
                    min={1}
                    value={maxTokens}
                    onChange={(event) => setMaxTokens(event.target.value)}
                  />
                </div>
              )}
            </div>

            <div
              className={
                kind === "CHAT" ? "grid grid-cols-2 gap-3" : "grid gap-3"
              }
            >
              {kind === "CHAT" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="ai-model-temperature">
                    {t("models.temperature")}
                  </Label>
                  <Input
                    id="ai-model-temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onChange={(event) => setTemperature(event.target.value)}
                  />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="ai-model-sort">{t("common.sortOrder")}</Label>
                <Input
                  id="ai-model-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ai-model-active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="ai-model-active">{t("common.active")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ai-model-default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked === true)}
                />
                <Label htmlFor="ai-model-default">{t("models.default")}</Label>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
