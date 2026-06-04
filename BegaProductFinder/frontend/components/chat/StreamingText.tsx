'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

export default function StreamingText({ content, isStreaming }: StreamingTextProps) {
  if (!content && isStreaming) {
    return (
      <span className="inline-flex items-center gap-1 py-1">
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full typing-dot-1" />
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full typing-dot-2" />
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full typing-dot-3" />
      </span>
    );
  }

  return (
    <div className="bega-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold text-zinc-100 mt-3 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-zinc-100 mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-200 mt-2 mb-1 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="text-zinc-100 text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-amber-300">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-1 text-sm text-zinc-200">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-1 text-sm text-zinc-200">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-200 leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            return isBlock
              ? <code className="block bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-xs font-mono text-amber-200 overflow-x-auto my-2">{children}</code>
              : <code className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs font-mono text-amber-200">{children}</code>;
          },
          pre: ({ children }) => <pre className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-xs font-mono overflow-x-auto my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-amber-500 pl-3 my-2 text-zinc-400 italic text-sm">{children}</blockquote>
          ),
          hr: () => <hr className="border-zinc-700 my-3" />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors">{children}</a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-zinc-700">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-700/60">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-zinc-700">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-zinc-700/30 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-amber-300 uppercase tracking-wide whitespace-nowrap border-b border-zinc-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-zinc-200 text-sm align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  );
}
