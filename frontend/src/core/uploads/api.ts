/**
 * API functions for file uploads
 */

import { fetchAuthApi } from "@/core/api/auth-client";

export interface UploadedFileInfo {
  attachment_id: string;
  filename: string;
  original_filename?: string;
  stored_filename?: string;
  is_derived?: boolean;
  source_filename?: string | null;
  source_attachment_id?: string | null;
  size: number;
  path: string;
  virtual_path: string;
  artifact_url: string;
  content_type?: string;
  derived_files?: UploadedDerivedFile[];
  extension?: string;
  modified?: number;
  markdown_file?: string;
  markdown_path?: string;
  markdown_virtual_path?: string;
  markdown_artifact_url?: string;
}

export interface UploadedDerivedFile {
  attachment_id: string;
  filename: string;
  virtual_path: string;
  artifact_url: string;
  content_type?: string;
  is_derived?: boolean;
  source_filename?: string;
  source_attachment_id?: string;
}

export interface DeleteUploadResponse {
  success: boolean;
  message: string;
  deleted_files?: string[];
  cascaded_deleted_files?: string[];
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFileInfo[];
  message: string;
}

export interface ListFilesResponse {
  files: UploadedFileInfo[];
  count: number;
}

async function readErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  const error = await response
    .json()
    .catch(() => ({ detail: fallback }));
  return error.detail ?? fallback;
}

/**
 * Upload files to a thread
 */
export async function uploadFiles(
  threadId: string,
  files: File[],
): Promise<UploadResponse> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetchAuthApi(`/api/threads/${threadId}/uploads`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Upload failed"));
  }

  return response.json();
}

/**
 * List all uploaded files for a thread
 */
export async function listUploadedFiles(
  threadId: string,
): Promise<ListFilesResponse> {
  const response = await fetchAuthApi(`/api/threads/${threadId}/uploads/list`);

  if (!response.ok) {
    throw new Error(
      await readErrorDetail(response, "Failed to list uploaded files"),
    );
  }

  return response.json();
}

/**
 * Delete an uploaded file
 */
export async function deleteUploadedFile(
  threadId: string,
  filename: string,
): Promise<DeleteUploadResponse> {
  const response = await fetchAuthApi(
    `/api/threads/${threadId}/uploads/${filename}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Failed to delete file"));
  }

  return response.json();
}

/**
 * Delete an uploaded file by stable attachment id
 */
export async function deleteUploadedFileByAttachmentId(
  threadId: string,
  attachmentId: string,
): Promise<DeleteUploadResponse> {
  const response = await fetchAuthApi(
    `/api/threads/${threadId}/uploads/by-attachment/${attachmentId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Failed to delete file"));
  }

  return response.json();
}
