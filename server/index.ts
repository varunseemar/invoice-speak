import express from "express";
import cors from "cors";
import multer from "multer";
import { createWorker } from "tesseract.js";
import OpenAI from "openai";
import fs from "fs/promises";
import fsSync from "fs";
import { createReadStream } from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize services
const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here"
});

// In-memory storage (replace with database in production)
type InvoiceRecord = {
  id: string;
  filename: string;
  filepath: string;
  text: string;
  embedding: number[];
  fields: {
    invoiceNumber: string | null;
    amount: string | null;
    date: string | null;
    store: string | null;
  };
  uploadedAt: string;
};

const invoiceStore = new Map<string, InvoiceRecord>();
const vectorStore: InvoiceRecord[] = [];

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use('/uploads', express.static('uploads'));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Ensure uploads directory exists
try {
  await fs.mkdir('./uploads', { recursive: true });
} catch (error) {
  console.log('Uploads directory ready');
}

// Utility functions
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

function extractInvoiceFields(text) {
  const invoiceNumber = /(?:Invoice|Inv|INV)[#:\-\s]*([A-Z0-9\-]{5,})/i.exec(text)?.[1];
  const amount = /(?:Total|Amount)[:\-\s]*\$?([0-9]+(?:\.[0-9]{2})?)/i.exec(text)?.[1];
  const date = /(?:Date|Issued)[:\-\s]*([0-9]{1,2}[\-\/][A-Za-z]{3,}[\-\/][0-9]{2,4}|[0-9]{2,4}[\-\/][0-9]{1,2}[\-\/][0-9]{2,4})/i.exec(text)?.[1];
  const store = /(?:Store|Merchant|Vendor|From)[:\-\s]*([A-Za-z0-9\&\s]{3,})/i.exec(text)?.[1]?.trim();
  
  return {
    invoiceNumber: invoiceNumber || null,
    amount: amount || null,
    date: date || null,
    store: store || null
  };
}

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    // Fallback: create a simple hash-based embedding
    const hash = text.split('').reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    return Array(1536).fill(0).map((_, i) => Math.sin(hash + i) * 0.1);
  }
}

async function performOCR(imagePath) {
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(imagePath);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

// Routes
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Upload and process invoices
app.post("/api/upload", upload.array('invoices', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const processedInvoices: Array<{
      id: string;
      filename: string;
      fields: {
        invoiceNumber: string | null;
        amount: string | null;
        date: string | null;
        store: string | null;
      };
      textLength: number;
    }> = [];

    for (const file of req.files as Express.Multer.File[]) {
      try {
        console.log(`Processing file: ${file.filename}`);
        
        // Perform OCR
        const ocrText = await performOCR(file.path);
        
        if (!ocrText || ocrText.length < 10) {
          console.warn(`Low quality OCR for ${file.filename}`);
          continue;
        }

        // Extract structured fields
        const fields = extractInvoiceFields(ocrText);
        
        // Generate embeddings
        const embedding = await generateEmbedding(ocrText);
        
        // Create invoice record
        const invoiceRecord = {
          id: uuidv4(),
          filename: file.originalname,
          filepath: file.path,
          text: ocrText,
          embedding: embedding,
          fields: fields,
          uploadedAt: new Date().toISOString()
        };

        // Store in memory (replace with database in production)
        invoiceStore.set(invoiceRecord.id, invoiceRecord);
        vectorStore.push(invoiceRecord);
        
        processedInvoices.push({
          id: invoiceRecord.id,
          filename: invoiceRecord.filename,
          fields: invoiceRecord.fields,
          textLength: ocrText.length
        });

      } catch (fileError) {
        console.error(`Error processing ${file.filename}:`, fileError);
        // Continue with other files
      }
    }

    res.json({
      success: true,
      processedCount: processedInvoices.length,
      invoices: processedInvoices
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: "Upload processing failed", 
      details: error.message 
    });
  }
});

// Chat/Query endpoint with RAG
app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Message is required" });
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(message);

    // Perform similarity search
    const similarities = vectorStore.map(invoice => ({
      invoice,
      similarity: cosineSimilarity(queryEmbedding, invoice.embedding)
    }));

    // Sort by similarity and get top 3
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topMatches = similarities.slice(0, 3);

    // Check if we have relevant results
    const relevanceThreshold = 0.7;
    const hasRelevantResults = topMatches.length > 0 && topMatches[0].similarity > relevanceThreshold;

    let responseText;

    if (!hasRelevantResults) {
      responseText = "I couldn't find that information in your uploaded invoices. Let me transfer you to a live agent who can help you further.";
    } else {
      // Generate contextual response using the best match
      const bestMatch = topMatches[0].invoice;
      const context = bestMatch.fields;
      
      // Build context-aware response
      let response = "";
      
      if (context.invoiceNumber) {
        response += `Found Invoice ${context.invoiceNumber}`;
      } else {
        response += `Found a matching invoice`;
      }
      
      if (context.store) response += ` from ${context.store}`;
      if (context.date) response += ` dated ${context.date}`;
      if (context.amount) response += ` with total amount $${context.amount}`;
      
      response += ". ";

      // Intent-based responses
      if (/charge|transaction|amount|total|cost|price/i.test(message)) {
        if (context.store && context.date) {
          response += `I can see a transaction at "${context.store}" on ${context.date}. `;
          if (context.amount) {
            response += `The amount was $${context.amount}. `;
          }
          response += "What would you like to verify about this charge?";
        }
      } else if (/invoice|number|reference/i.test(message)) {
        if (context.invoiceNumber) {
          response += `The invoice number is ${context.invoiceNumber}. `;
        }
        response += "What else would you like to know about this invoice?";
      } else if (/date|when|time/i.test(message)) {
        if (context.date) {
          response += `This invoice is dated ${context.date}. `;
        }
        response += "Is there anything specific about the timing you'd like to discuss?";
      } else if (/store|shop|merchant|vendor|where/i.test(message)) {
        if (context.store) {
          response += `This was from ${context.store}. `;
        }
        response += "Do you have questions about this merchant?";
      } else {
        response += "How can I help you with this invoice?";
      }

      responseText = response;
    }

    // Advanced LLM response (if OpenAI key is available and we have context)
    if (hasRelevantResults && process.env.OPENAI_API_KEY) {
      try {
        const systemPrompt = `You are a helpful invoice assistant. Use the following invoice context to answer the user's question accurately and concisely.

Invoice Context:
${JSON.stringify(topMatches[0].invoice.fields, null, 2)}

Original Invoice Text Preview:
${topMatches[0].invoice.text.substring(0, 500)}...

Guidelines:
- Be specific and reference actual invoice details
- If asked about charges you cannot verify, offer to escalate to a live agent
- Keep responses conversational and helpful
- If the question cannot be answered from the invoice data, say so clearly`;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          max_tokens: 150,
          temperature: 0.7
        });

        if (completion.choices[0]?.message?.content) {
          responseText = completion.choices[0].message.content.trim();
        }
      } catch (llmError) {
        console.error('LLM response failed:', llmError);
        // Fall back to the manually constructed response
      }
    }

    res.json({
      success: true,
      response: responseText,
      conversationId: conversationId || uuidv4(),
      relevantInvoices: hasRelevantResults ? [topMatches[0].invoice.id] : [],
      confidence: hasRelevantResults ? topMatches[0].similarity : 0
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: "Chat processing failed",
      details: error.message 
    });
  }
});

// Get all uploaded invoices
app.get("/api/invoices", (req, res) => {
  const invoices = Array.from(invoiceStore.values()).map(invoice => ({
    id: invoice.id,
    filename: invoice.filename,
    fields: invoice.fields,
    uploadedAt: invoice.uploadedAt,
    textLength: invoice.text.length
  }));

  res.json({
    success: true,
    count: invoices.length,
    invoices
  });
});

// Get specific invoice details
app.get("/api/invoices/:id", (req, res) => {
  const invoice = invoiceStore.get(req.params.id);
  
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  res.json({
    success: true,
    invoice: {
      id: invoice.id,
      filename: invoice.filename,
      fields: invoice.fields,
      text: invoice.text,
      uploadedAt: invoice.uploadedAt
    }
  });
});

// Delete invoice
app.delete("/api/invoices/:id", async (req, res) => {
  const invoice = invoiceStore.get(req.params.id);
  
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  try {
    // Remove file from disk
    await fs.unlink(invoice.filepath);
    
    // Remove from stores
    invoiceStore.delete(req.params.id);
    const vectorIndex = vectorStore.findIndex(item => item.id === req.params.id);
    if (vectorIndex > -1) {
      vectorStore.splice(vectorIndex, 1);
    }

    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

// Text-to-Speech endpoint (using OpenAI)
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "TTS service not configured" });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: "Text-to-speech conversion failed" });
  }
});

// Speech-to-Text endpoint (using OpenAI Whisper)
app.post("/api/stt", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Audio file is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "STT service not configured" });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fsSync.createReadStream(req.file.path),
      model: "whisper-1",
    });

    // Clean up uploaded audio file
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      transcription: transcription.text
    });

  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: "Speech-to-text conversion failed" });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: "Internal server error",
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Invoice Assistant API running on port ${port}`);
  console.log(`Upload endpoint: http://localhost:${port}/api/upload`);
  console.log(`Chat endpoint: http://localhost:${port}/api/chat`);
});

export default app;
