import { useCallback, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { InvoiceUploader } from "./InvoiceUploader";
import { VoiceControls } from "./VoiceControls";
import { Transcript } from "./Transcript";
import { InMemoryVectorStore } from "@/lib/rag/vector-store";
import { embedText } from "@/lib/rag/embeddings";
import type { ChatMessage, InvoiceRecord } from "@/types/invoice";
import { Badge } from "@/components/ui/badge";

export const VoiceInvoiceAssistant = () => {
  const storeRef = useRef(new InMemoryVectorStore());
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback((role: ChatMessage["role"], content: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role, content, timestamp: Date.now() }]);
  }, []);

  const handleIngested = (recs: InvoiceRecord[]) => {
    storeRef.current.addDocuments(recs);
    setInvoices((prev) => [...prev, ...recs]);
  };

  const answerWithRAG = useCallback(async (question: string) => {
    addMessage("user", question);
    const qEmbed = await embedText(question);
    const top = storeRef.current.similaritySearch(qEmbed, 3);

    if (top.length === 0 || top[0].score < 0.25) {
      const fallback =
        "I couldn’t find that in your uploaded invoices. Transferring you to a live agent for further assistance.";
      addMessage("assistant", fallback);
      return fallback;
    }

    // Very simple templated reasoning over the best match
    const best = top[0].doc;
    const ctx = best.fields;
    let answer = "";
    if (ctx.invoiceNumber) {
      answer += `Invoice ${ctx.invoiceNumber}`;
    } else {
      answer += `One matching invoice`;
    }
    if (ctx.store) answer += ` from ${ctx.store}`;
    if (ctx.date) answer += ` dated ${ctx.date}`;
    if (ctx.amount) answer += ` totaling $${ctx.amount}`;
    answer += ". ";

    // Heuristic: if user asks about a charge, confirm
    if (/charge|transaction|amount|total/i.test(question) && ctx.store && ctx.date) {
      answer += `I see a transaction at "${ctx.store}" on ${ctx.date}. What would you like to verify?`;
    } else {
      answer += "How can I help you with this invoice?";
    }

    addMessage("assistant", answer);
    return answer;
  }, [addMessage]);

  const stats = useMemo(() => ({ count: invoices.length }), [invoices.length]);

  return (
    <section
      className="interactive-bg rounded-xl border p-6 md:p-8 space-y-6"
      onMouseMove={(e) => {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--pointer-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty("--pointer-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
      }}
    >
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Voice Invoice Assistant</h1>
        <p className="text-muted-foreground">Upload a few invoice images, then talk to your data in real time.</p>
        <div className="flex items-center gap-2 pt-2">
          <Badge variant="secondary">Local OCR</Badge>
          <Badge variant="secondary">On-device embeddings</Badge>
          <Badge variant="secondary">Web Speech Voice</Badge>
          <Badge variant="outline">Invoices: {stats.count}</Badge>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <InvoiceUploader onIngested={handleIngested} />
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Conversation</h2>
          <Transcript messages={messages} />
          <VoiceControls onUserFinalUtterance={answerWithRAG} />
        </Card>
      </div>

      <footer className="text-xs text-muted-foreground">
        Tip: Ask “Find invoice INV-000123” or “Explain the charge on my latest receipt”.
      </footer>
    </section>
  );
};
