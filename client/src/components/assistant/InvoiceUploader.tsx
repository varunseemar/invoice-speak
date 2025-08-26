import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { ocrImage } from "@/lib/ocr/ocr";
import { embedText } from "@/lib/rag/embeddings";
import { InvoiceRecord, InvoiceFields } from "@/types/invoice";

interface Props {
  onIngested: (records: InvoiceRecord[]) => void;
}

export const InvoiceUploader = ({ onIngested }: Props) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).slice(0, 4); // limit to 4
    setIsLoading(true);

    try {
      const results: InvoiceRecord[] = [];
      for (const file of selected) {
        setProgressMap((p) => ({ ...p, [file.name]: 1 }));
        const text = await ocrImage(file, (p) =>
          setProgressMap((m) => ({ ...m, [file.name]: p }))
        );
        const embedding = await embedText(text);
        const fields = extractFields(text);
        results.push({
          id: crypto.randomUUID(),
          filename: file.name,
          text,
          embedding,
          fields,
        });
      }
      onIngested(results);
      toast({ title: "Invoices ingested", description: `Processed ${results.length} file(s).` });
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", variant: "destructive", description: "Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Upload invoices (images)</h2>
        <p className="text-sm text-muted-foreground">Up to 4 PNG/JPG receipts or invoices.</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          id="invoices"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Button asChild variant="secondary">
          <label htmlFor="invoices" className="cursor-pointer">Choose files</label>
        </Button>
      </div>
      <div className="space-y-3">
        {Object.entries(progressMap).map(([name, p]) => (
          <div key={name} className="space-y-1">
            <div className="flex justify-between text-sm"><span>{name}</span><span>{p}%</span></div>
            <Progress value={p} />
          </div>
        ))}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Running OCR & embeddings…</p>}
    </Card>
  );
};

function extractFields(text: string): InvoiceFields {
  const invoiceNumber = /(?:Invoice|Inv|INV)[#:\-\s]*([A-Z0-9\-]{5,})/i.exec(text)?.[1];
  const amount = /Total\s*[:\-]?\s*\$?([0-9]+(?:\.[0-9]{2})?)/i.exec(text)?.[1];
  const date = /(?:Date|Issued)\s*[:\-]?\s*([0-9]{1,2}[\-\/][A-Za-z]{3,}|[0-9]{4}[\-\/][0-9]{2}[\-\/][0-9]{2}|[0-9]{2}[\-\/][0-9]{2}[\-\/][0-9]{4})/i.exec(text)?.[1];
  const store = /(Store|Merchant|Vendor)\s*[:\-]?\s*([A-Za-z0-9\&\s]{3,})/i.exec(text)?.[2];
  return { invoiceNumber, amount, date, store };
}
