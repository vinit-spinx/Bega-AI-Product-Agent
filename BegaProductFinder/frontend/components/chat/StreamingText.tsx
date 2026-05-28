'use client';

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
    <span className="whitespace-pre-wrap leading-relaxed">
      {content}
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}
