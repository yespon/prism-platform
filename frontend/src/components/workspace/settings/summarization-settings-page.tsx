"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fetchAuthApi } from "@/core/api/auth-client";
import { useI18n } from "@/core/i18n/hooks";

import { SettingsSection } from "./settings-section";

interface SummarizationSettings {
  enabled: boolean;
  trigger_tokens: number;
  trigger_messages: number;
  keep_messages: number;
  trim_tokens_to_summarize: number | null;
}

const labelClass = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

async function fetchSettings(): Promise<SummarizationSettings> {
  const res = await fetchAuthApi("/api/tenant-admin/settings/summarization");
  if (!res.ok) throw new Error("Failed to fetch summarization settings");
  return res.json();
}

async function updateSettings(
  body: Partial<SummarizationSettings>,
): Promise<SummarizationSettings> {
  const res = await fetchAuthApi("/api/tenant-admin/settings/summarization", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update summarization settings");
  return res.json();
}

export function SummarizationSettingsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<SummarizationSettings>({
    queryKey: ["summarization-settings"],
    queryFn: fetchSettings,
  });

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["summarization-settings"], updated);
    },
  });

  const [form, setForm] = useState<SummarizationSettings | null>(null);

  if (data && !form) {
    setForm(data);
  }

  if (isLoading) {
    return (
      <SettingsSection
        title={t.settings.summarization.title}
        description={t.settings.summarization.description}
      >
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      </SettingsSection>
    );
  }

  if (error || !form) {
    return (
      <SettingsSection
        title={t.settings.summarization.title}
        description={t.settings.summarization.description}
      >
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : "加载失败"}
        </div>
      </SettingsSection>
    );
  }

  const handleSave = () => {
    mutation.mutate({
      enabled: form.enabled,
      trigger_tokens: form.trigger_tokens,
      trigger_messages: form.trigger_messages,
      keep_messages: form.keep_messages,
      trim_tokens_to_summarize: form.trim_tokens_to_summarize,
    });
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(data);

  return (
    <SettingsSection
      title={t.settings.summarization.title}
      description={t.settings.summarization.description}
      action={
        <Button
          onClick={handleSave}
          disabled={!isDirty || mutation.isPending}
          size="sm"
        >
          {mutation.isPending ? t.common.loading : t.common.save}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Enabled toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label htmlFor="summarization-enabled" className={labelClass}>
              {t.settings.summarization.enabled}
            </label>
            <p className="text-xs text-muted-foreground">
              {t.settings.summarization.enabledDescription}
            </p>
          </div>
          <Switch
            id="summarization-enabled"
            checked={form.enabled}
            onCheckedChange={(checked) =>
              setForm({ ...form, enabled: checked })
            }
          />
        </div>

        <hr className="border-border" />

        {/* Trigger tokens */}
        <div className="space-y-2">
          <label htmlFor="summarization-trigger-tokens" className={labelClass}>
            {t.settings.summarization.triggerTokens}
          </label>
          <p className="text-xs text-muted-foreground">
            {t.settings.summarization.triggerTokensDescription}
          </p>
          <Input
            id="summarization-trigger-tokens"
            type="number"
            min={1000}
            max={100000}
            value={form.trigger_tokens}
            onChange={(e) =>
              setForm({ ...form, trigger_tokens: Number(e.target.value) || 0 })
            }
            className="max-w-xs"
          />
        </div>

        {/* Trigger messages */}
        <div className="space-y-2">
          <label htmlFor="summarization-trigger-messages" className={labelClass}>
            {t.settings.summarization.triggerMessages}
          </label>
          <p className="text-xs text-muted-foreground">
            {t.settings.summarization.triggerMessagesDescription}
          </p>
          <Input
            id="summarization-trigger-messages"
            type="number"
            min={5}
            max={200}
            value={form.trigger_messages}
            onChange={(e) =>
              setForm({
                ...form,
                trigger_messages: Number(e.target.value) || 0,
              })
            }
            className="max-w-xs"
          />
        </div>

        {/* Keep messages */}
        <div className="space-y-2">
          <label htmlFor="summarization-keep-messages" className={labelClass}>
            {t.settings.summarization.keepMessages}
          </label>
          <p className="text-xs text-muted-foreground">
            {t.settings.summarization.keepMessagesDescription}
          </p>
          <Input
            id="summarization-keep-messages"
            type="number"
            min={1}
            max={100}
            value={form.keep_messages}
            onChange={(e) =>
              setForm({ ...form, keep_messages: Number(e.target.value) || 0 })
            }
            className="max-w-xs"
          />
        </div>

        {/* Trim tokens */}
        <div className="space-y-2">
          <label htmlFor="summarization-trim-tokens" className={labelClass}>
            {t.settings.summarization.trimTokens}
          </label>
          <p className="text-xs text-muted-foreground">
            {t.settings.summarization.trimTokensDescription}
          </p>
          <Input
            id="summarization-trim-tokens"
            type="number"
            min={1000}
            max={100000}
            value={form.trim_tokens_to_summarize ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setForm({
                ...form,
                trim_tokens_to_summarize:
                  val === "" ? null : Number(val) || 0,
              });
            }}
            className="max-w-xs"
          />
        </div>

        {mutation.isError && (
          <div className="text-destructive text-sm">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "保存失败"}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
