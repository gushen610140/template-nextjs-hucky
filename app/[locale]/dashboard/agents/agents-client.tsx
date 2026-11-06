"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  AiAgentRow,
  AiModelOption,
  RagLibraryOption,
} from "@/lib/ai/types";
import { createAgent, deleteAgent, updateAgent } from "./actions";

type AgentsClientProps = {
  agents: AiAgentRow[];
  models: AiModelOption[];
  libraries: RagLibraryOption[];
};

export function AgentsClient({ agents, models, libraries }: AgentsClientProps) {
  const t = useTranslations("Ai");
  const [formTarget, setFormTarget] = useState<AiAgentRow | "create" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AiAgentRow | null>(null);
  const libraryNames = new Map(libraries.map((item) => [item.id, item.name]));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("agents.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("agents.description")}
          </p>
        </div>
        <Button
          onClick={() => setFormTarget("create")}
          disabled={models.length === 0}
        >
          <Plus />
          {t("agents.create")}
        </Button>
      </div>

      {models.length === 0 && (
        <Alert>
          <AlertDescription>{t("agents.needModel")}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("agents.agent")}</TableHead>
              <TableHead>{t("agents.model")}</TableHead>
              <TableHead>{t("agents.knowledgeBases")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.empty")}
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="grid">
                      <span className="font-medium">{agent.name}</span>
                      <span className="truncate text-muted-foreground text-xs">
                        {agent.description ?? t("agents.noDescription")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid">
                      <span className="text-sm">{agent.modelName}</span>
                      <span className="text-muted-foreground text-xs">
                        {agent.providerName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.knowledgeBaseIds.length === 0 ? (
                      <span className="text-muted-foreground text-xs">-</span>
                    ) : (
                      <div className="grid">
                        <Badge variant="outline">
                          {t("agents.libraryCount", {
                            count: agent.knowledgeBaseIds.length,
                          })}
                        </Badge>
                        <span className="max-w-48 truncate text-muted-foreground text-xs">
                          {agent.knowledgeBaseIds
                            .map((id) => libraryNames.get(id))
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={agent.isActive ? "secondary" : "destructive"}
                    >
                      {agent.isActive
                        ? t("common.active")
                        : t("common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setFormTarget(agent)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(agent)}
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
        <AgentFormDialog
          key={formTarget === "create" ? "create" : formTarget.id}
          agent={formTarget === "create" ? null : formTarget}
          models={models}
          libraries={libraries}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("agents.deleteTitle")}
          description={t("agents.deleteDescription", {
            name: deleteTarget.name,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pendingLabel={t("common.deleting")}
          onConfirm={async () => {
            const result = await deleteAgent(deleteTarget.id);
            return result.ok
              ? result
              : { ok: false, error: t(`errors.${result.error}`) };
          }}
        />
      )}
    </div>
  );
}

function AgentFormDialog({
  agent,
  models,
  libraries,
  onClose,
}: {
  agent: AiAgentRow | null;
  models: AiModelOption[];
  libraries: RagLibraryOption[];
  onClose: () => void;
}) {
  const t = useTranslations("Ai");
  const isEdit = agent !== null;
  const initialModelId =
    agent?.modelId ??
    models.find((model) => model.isActive)?.id ??
    models[0]?.id ??
    "";
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [modelId, setModelId] = useState(initialModelId);
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? "");
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<string[]>(
    agent?.knowledgeBaseIds ?? [],
  );
  const [isActive, setIsActive] = useState(agent?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(agent?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function toggleKnowledgeBase(id: string, checked: boolean) {
    setKnowledgeBaseIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      name,
      description,
      modelId,
      systemPrompt,
      knowledgeBaseIds,
      isActive,
      sortOrder: Number(sortOrder),
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateAgent({ id: agent.id, ...payload })
        : await createAgent(payload);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("agents.editTitle") : t("agents.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("agents.formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-agent-name">{t("common.name")}</Label>
              <Input
                id="ai-agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-agent-description">
                {t("agents.descriptionLabel")}
              </Label>
              <Input
                id="ai-agent-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
                placeholder={t("agents.descriptionPlaceholder")}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-agent-model">{t("agents.model")}</Label>
              <select
                id="ai-agent-model"
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                required
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.providerName} · {model.displayName}
                    {model.isActive ? "" : ` (${t("common.inactive")})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-agent-prompt">
                {t("agents.systemPrompt")}
              </Label>
              <Textarea
                id="ai-agent-prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                rows={8}
                maxLength={20_000}
                placeholder={t("agents.systemPromptPlaceholder")}
                className="min-h-40 resize-y"
              />
              <p className="text-muted-foreground text-xs">
                {t("agents.systemPromptHint")}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>{t("agents.knowledgeBases")}</Label>
              <p className="text-muted-foreground text-xs">
                {t("agents.knowledgeBasesHint")}
              </p>
              {libraries.length === 0 ? (
                <Alert>
                  <AlertDescription>{t("agents.noLibraries")}</AlertDescription>
                </Alert>
              ) : (
                <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border p-3">
                  {libraries.map((library) => (
                    <div key={library.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`ai-agent-library-${library.id}`}
                        checked={knowledgeBaseIds.includes(library.id)}
                        onCheckedChange={(checked) =>
                          toggleKnowledgeBase(library.id, checked === true)
                        }
                      />
                      <div className="grid gap-0.5">
                        <Label
                          htmlFor={`ai-agent-library-${library.id}`}
                          className="font-normal"
                        >
                          {library.name}
                        </Label>
                        <span className="text-muted-foreground text-xs">
                          {library.embeddingModelName} ·{" "}
                          {t("agents.readyFiles", {
                            count: library.readyFileCount,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ai-agent-active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="ai-agent-active">{t("common.active")}</Label>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ai-agent-sort" className="sr-only">
                  {t("common.sortOrder")}
                </Label>
                <Input
                  id="ai-agent-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  aria-label={t("common.sortOrder")}
                  className="w-24"
                />
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
            <Button type="submit" disabled={pending || !modelId}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
