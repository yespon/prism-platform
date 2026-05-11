import type { FileInMessage } from "@/core/messages/utils";

function normalizeAttachmentKey(item: {
  attachment_id?: string;
  filename: string;
}): string {
  return item.attachment_id ?? `legacy:${item.filename}`;
}

type AdditionalKwargsLike = {
  attachments?: unknown;
  files?: unknown;
};

export function filesFromAdditionalKwargs(
  additional_kwargs: AdditionalKwargsLike | undefined,
  availableAttachmentKeys?: Set<string>,
): FileInMessage[] | null {
  const attachments = additional_kwargs?.attachments;
  if (Array.isArray(attachments) && attachments.length > 0) {
    return attachments
      .filter(
        (file): file is Record<string, unknown> =>
          typeof file === "object" && file !== null,
      )
      .map((file) => {
        const attachment_id =
          typeof file.attachment_id === "string" ? file.attachment_id : undefined;
        const filename = typeof file.filename === "string" ? file.filename : "";
        const key = normalizeAttachmentKey({ attachment_id, filename });
        const exists =
          !availableAttachmentKeys || availableAttachmentKeys.has(key);
        const hasResolvableReference =
          (typeof file.virtual_path === "string" && file.virtual_path.length > 0) ||
          (typeof file.artifact_url === "string" && file.artifact_url.length > 0);
        // Avoid false negatives for history items: only mark invalid when we have
        // a concrete key miss and no resolvable artifact reference.
        const status = !exists && !hasResolvableReference
          ? ("invalid" as const)
          : ("referenced" as const);

        return {
          attachment_id,
          filename,
          original_filename:
            typeof file.original_filename === "string"
              ? file.original_filename
              : undefined,
          stored_filename:
            typeof file.stored_filename === "string"
              ? file.stored_filename
              : undefined,
          size:
            typeof file.size === "number" ? file.size : Number(file.size ?? 0),
          path:
            typeof file.virtual_path === "string" ? file.virtual_path : undefined,
          artifact_url:
            typeof file.artifact_url === "string" ? file.artifact_url : undefined,
          virtual_path:
            typeof file.virtual_path === "string" ? file.virtual_path : undefined,
          content_type:
            typeof file.content_type === "string" ? file.content_type : undefined,
          derived_files: Array.isArray(file.derived_files)
            ? file.derived_files.filter(
                (derived): derived is {
                  attachment_id?: string;
                  filename?: string;
                  path?: string;
                  virtual_path: string;
                  artifact_url: string;
                  content_type?: string;
                  mime_type?: string;
                } =>
                  typeof derived === "object" &&
                  derived !== null &&
                  typeof (derived as { virtual_path?: unknown }).virtual_path === "string" &&
                  typeof (derived as { artifact_url?: unknown }).artifact_url === "string",
              )
            : undefined,
          status,
        } satisfies FileInMessage;
      })
      .filter((file) => file.filename.length > 0);
  }

  const files = additional_kwargs?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return null;
  }

  return files as FileInMessage[];
}
