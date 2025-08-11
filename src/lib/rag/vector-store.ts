import type { InvoiceRecord } from "@/types/invoice";

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a: number[]) {
  return Math.sqrt(dot(a, a));
}
function cosineSim(a: number[], b: number[]) {
  const d = dot(a, b);
  const n = norm(a) * norm(b);
  return n === 0 ? 0 : d / n;
}

export class InMemoryVectorStore {
  private docs: InvoiceRecord[] = [];

  addDocuments(recs: InvoiceRecord[]) {
    this.docs.push(...recs);
  }

  all() {
    return this.docs;
  }

  similaritySearch(queryEmbedding: number[], k = 3) {
    const scored = this.docs.map((doc) => ({
      doc,
      score: cosineSim(queryEmbedding, doc.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }
}
