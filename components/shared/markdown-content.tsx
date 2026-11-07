"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-slate-900 mt-5 mb-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-slate-800 mt-3 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-slate-800 mt-3 mb-1 first:mt-0">
      {children}
    </h4>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="text-slate-700 text-sm leading-relaxed mb-3 last:mb-0">
      {children}
    </p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-sm text-slate-700">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-sm text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Bold & italic
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-700">{children}</em>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#ff5100]/40 pl-4 py-1 my-3 text-slate-600 italic text-sm bg-orange-50/50 rounded-r-lg">
      {children}
    </blockquote>
  ),

  // Code
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-slate-800">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 last:mb-0">{children}</pre>
  ),

  // Table (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-100">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-slate-50/80 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-slate-700">{children}</td>
  ),

  // Horizontal rule
  hr: () => <hr className="border-slate-200 my-4" />,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#ff5100] underline underline-offset-2 hover:text-orange-700 transition-colors"
    >
      {children}
    </a>
  ),
};

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/** Renderiza texto Markdown com estilos adequados ao design do Meeplix. */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
