import { FileIcon, FilesIcon, CheckIcon, DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
} from "@/components/workspace/tooltip";
import { useArtifactAccessToken } from "@/core/artifacts/hooks";
import { urlOfArtifact } from "@/core/artifacts/utils";
import { useI18n } from "@/core/i18n/hooks";
import { getFileName } from "@/core/utils/files";


import { useArtifacts } from "./context";

export const ArtifactTrigger = ({ threadId }: { threadId: string }) => {
  const { t } = useI18n();
  const artifactToken = useArtifactAccessToken();
  
  const { 
    artifacts, 
    setOpen: setArtifactsOpen, 
    select, 
    selectedArtifact 
  } = useArtifacts();

  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  const openArtifactsDrawer = () => {
    const target =
      selectedArtifact && artifacts.includes(selectedArtifact)
        ? selectedArtifact
        : artifacts[0];
    if (target) {
      select(target);
    }
    setArtifactsOpen(true);
  };


  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Button
          className="h-8 rounded-md gap-1.5 px-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          variant="ghost"
          size="sm"
          onClick={openArtifactsDrawer}
        >
          <FilesIcon className="size-4" />
          <span className="hidden md:inline">
            {artifacts.length} {t.common.artifacts}
          </span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        sideOffset={8}
        className="w-[min(640px,88vw)] p-2"
      >
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
          Output Files
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
        {artifacts.map((file) => {
          const name = getFileName(file);
          const isSelected = selectedArtifact === file;
          
          const downloadUrl = urlOfArtifact({
            filepath: file,
            threadId,
            isMock: false,
            token: artifactToken,
          });
          const isWriteFile = file.startsWith("write-file:") || file.startsWith("mcp-result:");
          const openArtifact = () => {
            select(file);
            setArtifactsOpen(true);
          };
          
          return (
            <button
              type="button"
              key={file}
              className="group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left font-mono text-[13px] hover:bg-muted/60"
              onPointerDown={(event) => {
                if (event.button !== 0) {
                  return;
                }
                openArtifact();
              }}
              onClick={(event) => {
                // Keyboard-triggered click has detail = 0; pointer clicks are handled above.
                if (event.detail === 0) {
                  openArtifact();
                }
              }}
            >
              <FileIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 whitespace-normal break-all leading-5">
                {name}
              </span>
              {!isWriteFile && (
                <a 
                  href={downloadUrl} 
                  download 
                  className="mt-0.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DownloadIcon className="size-3.5" />
                </a>
              )}
              {isSelected && <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />}
            </button>
          );
        })}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
