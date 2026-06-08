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
        <span className="w-1.5 h-1.5 bg-bega-black rounded-full typing-dot-1" />
        <span className="w-1.5 h-1.5 bg-bega-black rounded-full typing-dot-2" />
        <span className="w-1.5 h-1.5 bg-bega-black rounded-full typing-dot-3" />
      </span>
    );
  }

  return (
    <div className="bega-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold text-bega-text-1 mt-3 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold text-bega-text-1 mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-bega-text-1 mt-2 mb-1 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="text-bega-text-1 text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-bega-black">{children}</strong>,
          em: ({ children }) => <em className="italic text-bega-text-2">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-1 text-sm text-bega-text-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-1 text-sm text-bega-text-1">{children}</ol>,
          li: ({ children }) => <li className="text-bega-text-1 leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            return isBlock
              ? <code className="block bg-bega-bg-1 border border-bega-border-1 rounded px-3 py-2 text-xs font-mono text-bega-text-1 overflow-x-auto my-2">{children}</code>
              : <code className="bg-bega-bg-2 border border-bega-border-1 rounded px-1.5 py-0.5 text-xs font-mono text-bega-text-1">{children}</code>;
          },
          pre: ({ children }) => <pre className="bg-bega-bg-1 border border-bega-border-1 rounded px-3 py-2 text-xs font-mono overflow-x-auto my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-bega-black pl-3 my-2 text-bega-text-2 italic text-sm">{children}</blockquote>
          ),
          hr: () => <hr className="border-bega-border-1 my-3" />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
               className="text-bega-black underline underline-offset-2 hover:text-bega-black-dark transition-colors">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded border border-bega-border-1">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-bega-bg-2">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-bega-border-1">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-bega-bg-1 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-bega-text-2 uppercase tracking-wide whitespace-nowrap border-b border-bega-border-2">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-bega-text-1 text-sm align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-bega-black ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  );
}
