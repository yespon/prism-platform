import type { UploadedFileInfo } from "@/core/uploads";

export function normalizeAttachmentId(file: UploadedFileInfo): string {
  return file.attachment_id ?? `legacy:${file.filename}`;
}

export type AttachmentSelectionState = {
  selectedIds: string[];
  knownIds: Set<string>;
  initialized: boolean;
};

export function selectPreferredReferencesForAddedIds(
  addedIds: string[],
  attachments: UploadedFileInfo[],
): string[] {
  const byId = new Map(attachments.map((file) => [normalizeAttachmentId(file), file]));
  const derivedIdSet = new Set<string>();
  const preferredDerivedBySource = new Map<string, string>();

  for (const file of attachments) {
    const sourceId = normalizeAttachmentId(file);
    const derived = Array.isArray(file.derived_files) ? file.derived_files : [];
    for (const d of derived) {
      if (!d.attachment_id) {
        continue;
      }
      derivedIdSet.add(d.attachment_id);
    }

    const preferred =
      derived.find((d) => {
        const ct = (d.content_type ?? "").toLowerCase();
        const name = (d.filename ?? "").toLowerCase();
        return ct.includes("markdown") || name.endsWith(".md");
      }) ?? derived[0];
    if (preferred?.attachment_id) {
      preferredDerivedBySource.set(sourceId, preferred.attachment_id);
    }
  }

  const normalizedAdded: string[] = [];
  for (const id of addedIds) {
    const file = byId.get(id);
    if (!file) {
      normalizedAdded.push(id);
      continue;
    }
    const preferredDerived = preferredDerivedBySource.get(id);
    if (preferredDerived) {
      normalizedAdded.push(preferredDerived);
      continue;
    }
    if (derivedIdSet.has(id)) {
      normalizedAdded.push(id);
      continue;
    }
    normalizedAdded.push(id);
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const id of normalizedAdded) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    deduped.push(id);
  }
  return deduped;
}

export function removeDeletedAttachmentSelections(
  previous: string[],
  file: UploadedFileInfo,
): string[] {
  const normalizedId = file.attachment_id ?? `legacy:${file.filename}`;
  const relatedDerivedIds = (file.derived_files ?? [])
    .map((derived) => derived.attachment_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  return previous.filter(
    (id) => id !== normalizedId && !relatedDerivedIds.includes(id),
  );
}

export function reconcileAttachmentSelection(
  prevState: AttachmentSelectionState,
  attachments: UploadedFileInfo[],
): AttachmentSelectionState {
  const allIds = attachments.map(normalizeAttachmentId).filter((id) => id.length > 0);
  const currentIdSet = new Set(allIds);

  if (currentIdSet.size === 0) {
    return {
      selectedIds: [],
      knownIds: currentIdSet,
      initialized: true,
    };
  }

  if (!prevState.initialized) {
    return {
      selectedIds: prevState.selectedIds.filter((id) => currentIdSet.has(id)),
      knownIds: currentIdSet,
      initialized: true,
    };
  }

  const addedIds = allIds.filter((id) => !prevState.knownIds.has(id));
  const pruned = prevState.selectedIds.filter((id) => currentIdSet.has(id));

  if (addedIds.length === 0) {
    return {
      selectedIds: pruned,
      knownIds: currentIdSet,
      initialized: true,
    };
  }

  const normalizedAdded = selectPreferredReferencesForAddedIds(addedIds, attachments);

  const existing = new Set(pruned);
  const appended: string[] = [];
  for (const id of normalizedAdded) {
    if (existing.has(id)) {
      continue;
    }
    existing.add(id);
    appended.push(id);
  }

  return {
    selectedIds: [...pruned, ...appended],
    knownIds: currentIdSet,
    initialized: true,
  };
}
