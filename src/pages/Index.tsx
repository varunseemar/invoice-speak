import { VoiceInvoiceAssistant } from "@/components/assistant/VoiceInvoiceAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container py-12 space-y-10">
        <section className="space-y-4">
          <p className="text-lg text-muted-foreground max-w-2xl">
            Talk to your invoices: upload a few images, ask questions, and get instant answers.
          </p>
        </section>
        <VoiceInvoiceAssistant />
      </main>
    </div>
  );
};

export default Index;
