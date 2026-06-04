import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content?: string | null;
  className?: string;
  emptyText?: string;
}

export function Markdown({ content, className, emptyText = "No content provided." }: MarkdownProps) {
  if (!content || content.trim().length === 0) {
    return <p className="text-sm text-muted-foreground italic">{emptyText}</p>;
  }
  return (
    <div className={cn("prose-libhub", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
