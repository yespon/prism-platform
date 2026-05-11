import type { UploadedFileInfo } from "@/core/uploads";

export function buildAgentSelectedAttachments(
  threadAttachments: UploadedFileInfo[],
  selectedAttachmentIds: string[],
): UploadedFileInfo[] {
  return threadAttachments.filter((file) =>
    selectedAttachmentIds.includes(file.attachment_id || `legacy:${file.filename}`),
  );
}
