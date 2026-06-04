import React from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Split the response by code blocks: ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-sm text-slate-800">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          // It's a code block
          const lines = part.split("\n");
          // Extract language from first line (e.g. ```javascript)
          const firstLine = lines[0].replace("```", "").trim();
          const language = firstLine || "kod";
          // Joined code block body omitting first and last (```) line
          const code = lines.slice(1, lines.length - 1).join("\n");

          return (
            <React.Fragment key={index}>
              <CodeBlock code={code} language={language} />
            </React.Fragment>
          );
        } else {
          // It's regular text, parse headings, lists, bold elements, paragraphs
          return (
            <React.Fragment key={index}>
              <RichTextSection text={part} />
            </React.Fragment>
          );
        }
      })}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code block:", err);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-slate-200/80 overflow-hidden bg-slate-900 font-mono text-xs shadow-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/40 border-b border-slate-800 text-slate-400 font-sans font-bold uppercase tracking-wider text-[10px]">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-cyan-400 transition-colors duration-150 p-1 rounded-md cursor-pointer"
          title="Panoya Kopyala"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              <span className="text-emerald-400 font-medium">Kopyalandı!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      </div>

      {/* Code Wrapper Body */}
      <pre className="p-4 overflow-x-auto whitespace-pre leading-normal block text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function RichTextSection({ text }: { text: string }) {
  if (!text) return null;

  // Split lines to handle bullets, headers, etc.
  const lines = text.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // 1. Headers: ###, ##, #
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="text-sm font-bold text-slate-900 mt-4 mb-1">
              {parseInlineStyles(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="text-base font-bold text-slate-900 mt-5 mb-2">
              {parseInlineStyles(trimmed.substring(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={i} className="text-lg font-bold text-slate-900 mt-6 mb-2">
              {parseInlineStyles(trimmed.substring(2))}
            </h2>
          );
        }

        // 2. Ordered lists digit markers e.g., "1. "
        if (/^\d+\.\s/.test(trimmed)) {
          const matchNum = trimmed.match(/^(\d+)\.\s(.*)/);
          if (matchNum) {
            return (
              <div key={i} className="flex gap-2 pl-2 text-slate-705">
                <span className="text-indigo-600 font-bold shrink-0">{matchNum[1]}.</span>
                <span className="flex-1">{parseInlineStyles(matchNum[2])}</span>
              </div>
            );
          }
        }

        // 3. Bullet lists e.g., "- " or "* "
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const rawItem = trimmed.startsWith("- ") ? trimmed.substring(2) : trimmed.substring(2);
          return (
            <div key={i} className="flex gap-2 pl-4 text-slate-705">
              <span className="text-indigo-650 select-none shrink-0 font-extrabold">•</span>
              <span className="flex-1">{parseInlineStyles(rawItem)}</span>
            </div>
          );
        }

        // 4. Blockquotes e.g., "> "
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote key={i} className="border-l-4 border-indigo-500 pl-4 py-2 my-2 bg-indigo-50/50 rounded-r-lg italic text-slate-600">
              {parseInlineStyles(trimmed.substring(2))}
            </blockquote>
          );
        }

        // Standard paragraph
        return (
          <p key={i} className="leading-relaxed text-slate-750">
            {parseInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
}

// Simple parser for inline styles: **bold**, *italic*, `inline code`
function parseInlineStyles(text: string): React.ReactNode[] {
  // Regex pattern matching keys: **bold** OR *italic* OR `inline_code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-extrabold text-slate-900">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.substring(1, part.length - 1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded font-mono text-xs bg-slate-100 border border-slate-200/60 text-indigo-600 font-semibold">
          {part.substring(1, part.length - 1)}
        </code>
      );
    }
    return part;
  });
}
