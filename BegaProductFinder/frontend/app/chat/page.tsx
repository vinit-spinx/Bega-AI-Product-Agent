import type { Metadata } from 'next';
import ChatWindow from '@/components/chat/ChatWindow';

export const metadata: Metadata = {
  title: 'AI Product Advisor — BEGA',
  description: 'Find luminaires, furniture, and lighting solutions for your architectural project.',
};

export default function ChatPage() {
  return (
    <main className="h-full">
      <ChatWindow showSuggestions />
    </main>
  );
}
