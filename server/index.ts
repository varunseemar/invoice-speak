// Minimal Express API scaffold for future deployment
// Note: This backend is not executed in the Lovable preview. Deploy separately.

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// TODO: Implement /api/upload (ingest invoices), /api/chat (RAG+LLM)
// You can plug providers like Deepgram (STT), OpenAI/Gemini (LLM), ElevenLabs (TTS) here.

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API running on :${port}`));
