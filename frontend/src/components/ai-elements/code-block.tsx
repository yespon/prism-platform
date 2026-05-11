"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { codeToHtml, type ShikiTransformer } from "shiki";

import { Button } from "@/components/ui/button";
import { cn, copyToClipboard as utilCopyToClipboard } from "@/lib/utils";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

const LANGUAGE_ALIASES: Record<string, string> = {
  mer: "mermaid",
  plaintext: "text",
  plain: "text",
  txt: "text",
};

function normalizeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (!normalized) {
    return "text";
  }
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

async function renderWithTheme(
  code: string,
  language: string,
  theme: "one-light" | "one-dark-pro",
  transformers: ShikiTransformer[],
) {
  try {
    return await codeToHtml(code, {
      lang: normalizeLanguage(language),
      theme,
      transformers,
    });
  } catch {
    return await codeToHtml(code, {
      lang: "text",
      theme,
      transformers,
    });
  }
}

export async function highlightCode(
  code: string,
  language: string,
  showLineNumbers = false,
) {
  const transformers: ShikiTransformer[] = showLineNumbers
    ? [lineNumberTransformer]
    : [];

  return await Promise.all([
    renderWithTheme(code, language, "one-light", transformers),
    renderWithTheme(code, language, "one-dark-pro", transformers),
  ]);
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>("");
  const [darkHtml, setDarkHtml] = useState<string>("");
  const renderId = useRef(0);

  useEffect(() => {
    const id = ++renderId.current;
    void highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
      if (renderId.current === id) {
        setHtml(light);
        setDarkHtml(dark);
      }
    });
  }, [code, language, showLineNumbers]);

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          "group bg-background text-foreground relative size-full overflow-hidden rounded-md border",
          className,
        )}
        {...props}
      >
        <div className="relative size-full">
          <div
            className="[&>pre]:bg-transparent! [&>pre]:text-foreground! size-full overflow-auto dark:hidden [&_code]:font-mono [&_code]:text-[12px] [&>pre]:m-0 [&>pre]:text-[12px] [&>pre]:whitespace-pre-wrap"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="[&>pre]:bg-transparent! [&>pre]:text-foreground! hidden size-full overflow-auto dark:block [&_code]:font-mono [&_code]:text-[12px] [&>pre]:m-0 [&>pre]:text-[12px] [&>pre]:whitespace-pre-wrap"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    try {
      await utilCopyToClipboard(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
