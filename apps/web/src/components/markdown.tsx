import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// Preprocess [[title]] wiki-links into special-prefixed markdown links
// so the custom <a> renderer can style them as internal idea references
function preprocessWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_match, title: string) => {
    const trimmed = title.trim();
    return `[${trimmed}](spark-wiki:${encodeURIComponent(trimmed)})`;
  });
}

const components: Partial<Components> = {
  // Destructure `node` (react-markdown AST node) so it never leaks into the DOM as node="[object Object]"
  h1: ({ children, node, ...props }) => <h1 className="text-[17px] font-semibold text-[#171717] mt-5 mb-2 first:mt-0" {...props}>{children}</h1>,
  h2: ({ children, node, ...props }) => <h2 className="text-[15px] font-semibold text-[#171717] mt-4 mb-2 first:mt-0" {...props}>{children}</h2>,
  h3: ({ children, node, ...props }) => <h3 className="text-[14px] font-semibold text-[#171717] mt-3 mb-1.5 first:mt-0" {...props}>{children}</h3>,
  p: ({ children, node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>,
  a: ({ children, href, node, ...props }) => {
    if (href?.startsWith("spark-wiki:")) {
      const title = decodeURIComponent(href.replace("spark-wiki:", ""));
      return (
        <a
          href={`/?search=${encodeURIComponent(title)}`}
          className="text-amber-600 hover:text-amber-700 underline decoration-amber-300 decoration-dotted underline-offset-2 font-medium"
          {...props}
        >
          {children}
        </a>
      );
    }
    return (
      <a href={href} className="text-amber-600 hover:text-amber-700 underline underline-offset-2 decoration-amber-200" target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  },
  ul: ({ children, node, ...props }) => <ul className="mb-2 list-disc pl-5 space-y-1 last:mb-0" {...props}>{children}</ul>,
  ol: ({ children, node, ...props }) => <ol className="mb-2 list-decimal pl-5 space-y-1 last:mb-0" {...props}>{children}</ol>,
  li: ({ children, node, ...props }) => <li className="text-[13px] leading-relaxed text-[#171717]" {...props}>{children}</li>,
  strong: ({ children, node, ...props }) => <strong className="font-semibold text-[#171717]" {...props}>{children}</strong>,
  em: ({ children, node, ...props }) => <em className="italic" {...props}>{children}</em>,
  code: ({ children, className, node, ...props }) => {
    const isInline = !className;
    return isInline ? (
      <code className="rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[12px] font-mono text-[#d97706]" {...props}>{children}</code>
    ) : (
      <code className="block rounded-[8px] bg-[#171717] p-3 text-[12px] font-mono text-[#f5f5f5] leading-relaxed overflow-x-auto mb-2" {...props}>{children}</code>
    );
  },
  pre: ({ children, node, ...props }) => <pre className="mb-2 last:mb-0" {...props}>{children}</pre>,
  blockquote: ({ children, node, ...props }) => (
    <blockquote className="mb-2 border-l-3 border-amber-200 bg-amber-50/50 pl-3 py-1 text-[13px] text-[#737373] italic last:mb-0" {...props}>{children}</blockquote>
  ),
  hr: ({ node, ...props }) => <hr className="my-4 border-[#f0f0f0]" {...props} />,
  img: ({ alt, src, node, ...props }) => (
    <img alt={alt || ""} src={src} className="rounded-[8px] max-w-full my-2" {...props} />
  ),
  table: ({ children, node, ...props }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="min-w-full border-collapse text-[13px]" {...props}>{children}</table>
    </div>
  ),
  th: ({ children, node, ...props }) => <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-left font-semibold text-[#171717]" {...props}>{children}</th>,
  td: ({ children, node, ...props }) => <td className="border border-[#e5e5e5] px-3 py-1.5 text-[#171717]" {...props}>{children}</td>,
};

export function MarkdownPreview({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="text-[13px] text-[#171717] leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {preprocessWikiLinks(content)}
      </ReactMarkdown>
    </div>
  );
}
