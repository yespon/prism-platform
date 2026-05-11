import {
  Code2Icon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  LoaderIcon,
  PackageIcon,
  SquareArrowOutUpRightIcon,
} from "lucide-react";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";

import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,

} from "@/components/ai-elements/artifact";
import { Select, SelectItem } from "@/components/ui/select";
import {
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CodeEditor } from "@/components/workspace/code-editor";
import { fetchAuthApi } from "@/core/api/auth-client";
import { useArtifactContent } from "@/core/artifacts/hooks";
import { urlOfArtifact } from "@/core/artifacts/utils";
import { useI18n } from "@/core/i18n/hooks";
import { installSkill } from "@/core/skills/api";
import { streamdownPlugins } from "@/core/streamdown";
import { useCurrentTenant } from "@/core/tenants/hooks";
import { checkCodeFile, getFileName, getFileExtensionDisplayName, isPreviewableInBrowser } from "@/core/utils/files";
import { env } from "@/env";
import { cn, copyToClipboard } from "@/lib/utils";
import { getAuthToken } from "@/core/auth/auth-api";

import { ArtifactLink } from "../citations/artifact-link";
import { useThread } from "../messages/context";
import { Tooltip } from "../tooltip";

import { useArtifacts } from "./context";

function artifactDisplayPath(filepath: string) {
  if (filepath.startsWith("write-file:") || filepath.startsWith("mcp-result:")) {
    try {
      const pathname = decodeURIComponent(new URL(filepath).pathname);
      return pathname
        .replace(/^\/?mnt\/user-data\/(outputs|workspace)\//, "")
        .replace(/^\/+/, "");
    } catch {
      return filepath;
    }
  }

  return filepath
    .replace(/^\/?mnt\/user-data\/(outputs|workspace)\//, "")
    .replace(/^\/+/, "");
}

export function ArtifactFileDetail({
  className,
  filepath: filepathFromProps,
  threadId,
}: {
  className?: string;
  filepath: string;
  threadId: string;
}) {
  const { t } = useI18n();
  const { artifacts, select, setOpen } = useArtifacts();
  const { data: currentTenant } = useCurrentTenant();
  const isWriteFile = useMemo(() => {
    return filepathFromProps.startsWith("write-file:") || filepathFromProps.startsWith("mcp-result:");
  }, [filepathFromProps]);
  const canInstallSkill = currentTenant?.role === "tenant_admin";
  const filepath = useMemo(() => {
    if (isWriteFile) {
      const url = new URL(filepathFromProps);
      return decodeURIComponent(url.pathname);
    }
    return filepathFromProps;
  }, [filepathFromProps, isWriteFile]);
  const isSkillFile = useMemo(() => {
    return filepath.endsWith(".skill") || filepath.endsWith(".zip");
  }, [filepath]);
  const currentArtifactLabel = useMemo(() => {
    return artifactDisplayPath(filepathFromProps);
  }, [filepathFromProps]);
  const { isCodeFile, language } = useMemo(() => {
    if (isWriteFile) {
      const language = checkCodeFile(filepath).language;
      return { isCodeFile: true, language };
    }
    // Treat .skill files as markdown (they contain SKILL.md)
    if (filepath.endsWith(".skill")) {
      return { isCodeFile: true, language: "markdown" };
    }
    return checkCodeFile(filepath);
  }, [filepath, isWriteFile]);
  const isSupportPreview = useMemo(() => {
    return language === "html" || language === "markdown";
  }, [language]);
  const { content, isLoading } = useArtifactContent({
    threadId,
    filepath: filepathFromProps,
    enabled: isCodeFile && !isWriteFile,
  });

  const displayContent = content ?? "";

  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const [isInstalling, setIsInstalling] = useState(false);
  const [binaryPreviewUrl, setBinaryPreviewUrl] = useState<string | null>(null);
  const { isMock } = useThread();
  useEffect(() => {
    if (isSupportPreview) {
      setViewMode("preview");
    } else {
      setViewMode("code");
    }
  }, [isSupportPreview]);

  useEffect(() => {
    if (isCodeFile || isWriteFile || isMock) {
      setBinaryPreviewUrl(null);
      return;
    }

    let revokedUrl: string | null = null;
    let cancelled = false;

    const loadPreview = async () => {
      try {
        const response = await fetchAuthApi(
          `/api/threads/${threadId}/artifacts${filepath}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        revokedUrl = objectUrl;
        if (!cancelled) {
          setBinaryPreviewUrl(objectUrl);
        }
      } catch (error) {
        console.error("Failed to load artifact preview:", error);
        if (!cancelled) {
          setBinaryPreviewUrl(null);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [filepath, isCodeFile, isMock, isWriteFile, threadId]);

  const handleDownloadWriteFile = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (displayContent) {
        const blob = new Blob([displayContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = getFileName(filepath);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, [displayContent, filepath]);

  const handleDownloadArtifact = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      if (isMock) {
        const a = document.createElement("a");
        a.href = urlOfArtifact({ filepath, threadId, isMock, download: true });
        a.download = getFileName(filepath);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const response = await fetchAuthApi(
        `/api/threads/${threadId}/artifacts${filepath}?download=true`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFileName(filepath);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download artifact:", error);
      toast.error(t.common.downloadFailed);
    }
  }, [filepath, isMock, threadId]);

  const handleInstallSkill = useCallback(async () => {
    if (isInstalling) return;

    setIsInstalling(true);
    try {
      const result = await installSkill({
        thread_id: threadId,
        path: filepath,
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message ?? "Failed to install skill");
      }
    } catch (error) {
      console.error("Failed to install skill:", error);
      toast.error("Failed to install skill");
    } finally {
      setIsInstalling(false);
    }
  }, [threadId, filepath, isInstalling]);

  const handleOpenInNewWindow = useCallback(async () => {
    const baseUrl = urlOfArtifact({ filepath, threadId, isMock });
    const openedWindow = window.open("", "_blank");
    if (!openedWindow) {
      toast.error(t.common.openWindowFailed);
      return;
    }
    openedWindow.opener = null;

    try {
      const token = getAuthToken();
      const artifactUrl = token
        ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
        : baseUrl;
      openedWindow.location.href = artifactUrl;
    } catch (error) {
      console.error("Failed to open artifact in new window:", error);
      openedWindow.location.href = baseUrl;
    }
  }, [filepath, isMock, threadId]);

  return (
    <Artifact className={cn(className)}>
      <ArtifactHeader className="h-14 shrink-0 px-4 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <ArtifactTitle>
            <div className="flex items-center">
              <Select value={filepathFromProps} onValueChange={select}>
                <SelectTrigger className="h-8 border-none bg-transparent! shadow-none select-none focus:outline-0 active:outline-0 focus:ring-0 max-w-[300px] hover:bg-muted/50 rounded-md truncate">
                  <SelectValue placeholder="Select an artifact">
                    {currentArtifactLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="select-none">
                  <SelectGroup>
                    {(artifacts ?? []).map((file) => (
                      <SelectItem key={file} value={file} className="font-mono text-xs">
                        {artifactDisplayPath(file)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </ArtifactTitle>
        </div>
        <div className="flex min-w-0 grow items-center justify-center">
          {isSupportPreview && (
            <ToggleGroup
              className="mx-auto"
              type="single"
              variant="outline"
              size="sm"
              value={viewMode}
              onValueChange={(value) => {
                if (value) {
                  setViewMode(value as "code" | "preview");
                }
              }}
            >
              <ToggleGroupItem value="code">
                <Code2Icon />
              </ToggleGroupItem>
              <ToggleGroupItem value="preview">
                <EyeIcon />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ArtifactActions>
            {!isWriteFile && isSkillFile && canInstallSkill && (
              <Tooltip content={t.toolCalls.skillInstallTooltip}>
                <ArtifactAction
                  icon={isInstalling ? LoaderIcon : PackageIcon}
                  label={t.common.install}
                  tooltip={t.common.install}
                  disabled={
                    isInstalling ||
                    env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true"
                  }
                  onClick={handleInstallSkill}
                />
              </Tooltip>
            )}
            {!isWriteFile && (
              <ArtifactAction
                icon={SquareArrowOutUpRightIcon}
                label={t.common.openInNewWindow}
                tooltip={t.common.openInNewWindow}
                onClick={() => {
                  void handleOpenInNewWindow();
                }}
              />
            )}
            {isCodeFile && (
              <ArtifactAction
                icon={CopyIcon}
                label={t.clipboard.copyToClipboard}
                disabled={!content}
                onClick={async () => {
                  try {
                    await copyToClipboard(displayContent ?? "");
                    toast.success(t.clipboard.copiedToClipboard);
                  } catch (error) {
                    toast.error(t.clipboard.failedToCopyToClipboard || "Failed to copy");
                    console.error(error);
                  }
                }}
                tooltip={t.clipboard.copyToClipboard}
              />
            )}
            {isWriteFile ? (
              <ArtifactAction
                icon={DownloadIcon}
                label={t.common.download}
                tooltip={t.common.download}
                onClick={handleDownloadWriteFile}
              />
            ) : (
              <ArtifactAction
                icon={DownloadIcon}
                label={t.common.download}
                tooltip={t.common.download}
                onClick={handleDownloadArtifact}
              />
            )}
            <ArtifactAction
              icon={XIcon}
              label={t.common.close}
              tooltip={t.common.close}
              onClick={() => setOpen(false)}
            />
          </ArtifactActions>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        {isCodeFile && !isWriteFile && isLoading && (
          <div className="flex size-full items-center justify-center">
            <LoaderIcon className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && isSupportPreview &&
          viewMode === "preview" &&
          (language === "markdown" || language === "html") && (
            <ArtifactFilePreview
              content={displayContent}
              language={language ?? "text"}
            />
          )}
        {!isLoading && isCodeFile && viewMode === "code" && (
          <CodeEditor
            className="size-full resize-none rounded-none border-none"
            value={displayContent ?? ""}
            readonly
          />
        )}
        {!isCodeFile && !isLoading && isPreviewableInBrowser(filepath) && (
          <iframe
            className="size-full"
            src={isMock ? urlOfArtifact({ filepath, threadId, isMock }) : (binaryPreviewUrl ?? undefined)}
          />
        )}
        {!isCodeFile && !isLoading && !isPreviewableInBrowser(filepath) && (
          <div className="flex size-full items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <FileIcon className="size-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{getFileExtensionDisplayName(filepath)}</p>
                <p className="text-xs text-muted-foreground mt-1">{getFileName(filepath)}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t.common.downloadHint}</p>
              <Button variant="default" size="sm" onClick={handleDownloadArtifact}>
                <DownloadIcon className="mr-2 size-4" />
                {t.common.downloadFile}
              </Button>
            </div>
          </div>
        )}
      </ArtifactContent>
    </Artifact>
  );
}

export function ArtifactFilePreview({
  content,
  language,
}: {
  content: string;
  language: string;
}) {
  if (language === "markdown") {
    return (
      <div className="w-full px-6 py-8 md:px-10 max-w-3xl mx-auto">
        <Streamdown
          className="size-full"
          {...streamdownPlugins}
          components={{ a: ArtifactLink }}
        >
          {content ?? ""}
        </Streamdown>
      </div>
    );
  }
  if (language === "html") {
    return (
      <iframe
        className="size-full"
        title="Artifact preview"
        srcDoc={content}
        sandbox="allow-scripts allow-forms"
      />
    );
  }
  return null;
}
