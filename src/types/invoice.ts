export interface InvoiceFields {
  invoiceNumber?: string;
  date?: string;
  store?: string;
  amount?: string;
}

export interface InvoiceRecord {
  id: string;
  filename: string;
  text: string;
  embedding: number[];
  fields: InvoiceFields;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}
