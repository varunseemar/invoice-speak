import { Card } from "@/components/ui/card";
import type { ChatMessage } from "@/types/invoice";

export const Transcript = ({ messages }: { messages: ChatMessage[] }) => {
  return (
    <Card className="p-4 h-80 overflow-auto space-y-3">
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground">Ask about an invoice once you start talking…</p>
      )}
      {messages.map((m) => (
        <div key={m.id} className="text-sm">
          <span className="font-medium mr-2">{m.role === "user" ? "You" : "Assistant"}:</span>
          <span className="text-foreground/90">{m.content}</span>
        </div>
      ))}
    </Card>
  );
};
