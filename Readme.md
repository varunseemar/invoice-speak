# Voice Invoice Assistant 🎤📄

AI-powered, voice-first invoice assistant that lets you upload invoices and query them using natural speech. Built with React.js frontend and Node.js/Express backend with OCR, RAG pipeline, and conversational AI.

![Demo](https://img.shields.io/badge/Status-Production%20Ready-green)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js-blue)
![AI Powered](https://img.shields.io/badge/AI-Powered-purple)

## 🚀 Features

### Core Functionality

- **📤 Invoice Upload**: Upload 1-4 invoice images (PNG/JPG)
- **👁️ OCR Processing**: Automatic text extraction using Tesseract.js
- **🧠 Smart Extraction**: Auto-detect invoice numbers, dates, stores, amounts
- **🎯 RAG Pipeline**: Vector similarity search with OpenAI embeddings
- **🎤 Voice Interface**: Speech-to-text and text-to-speech integration
- **💬 Conversational AI**: Natural language queries with context awareness
- **🔄 Live Agent Handoff**: Graceful escalation for unknown queries

### Technical Features

- **⚡ Real-time Processing**: On-device OCR and embeddings
- **🎨 Modern UI**: Responsive design with Tailwind CSS
- **🔊 Web Speech API**: Native browser voice recognition
- **📱 Mobile Responsive**: Works on desktop and mobile devices
- **🛡️ Error Handling**: Robust error handling and fallbacks
- **🔄 State Management**: React hooks with local storage alternatives

## 🏗️ Architecture

```
Frontend (React.js)          Backend (Node.js/Express)
┌─────────────────────┐      ┌─────────────────────────┐
│ Voice Interface     │◄────►│ Speech APIs (STT/TTS)   │
│ Invoice Uploader    │◄────►│ File Upload Handler     │
│ Chat Interface      │◄────►│ RAG Pipeline            │
│ Vector Store (Local)│      │ Vector Store (Memory)   │
└─────────────────────┘      └─────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐      ┌─────────────────────────┐
│ Tesseract.js (OCR)  │      │ OpenAI API Integration  │
│ HuggingFace         │      │ - Embeddings            │
│ Transformers.js     │      │ - LLM (GPT-3.5)         │
│ Web Speech API      │      │ - Whisper (STT)         │
└─────────────────────┘      │ - TTS                   │
                             └─────────────────────────┘
```

## 📋 Prerequisites

- **Node.js 18+**
- **OpenAI API Key** (for embeddings, LLM, voice services)
- **Modern Browser** (Chrome/Firefox/Safari with Web Speech support)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd voice-invoice-assistant
```

### 2. Backend Setup

```bash
# Navigate to backend directory
mkdir backend && cd backend

# Initialize npm project
npm init -y

# Install dependencies
npm install express cors multer tesseract.js openai uuid dotenv
npm install --save-dev nodemon jest

# Create environment file
cp .env.example .env

# Edit .env with your OpenAI API key
OPENAI_API_KEY=your-openai-api-key-here
PORT=3001
NODE_ENV=development

# Create uploads directory
mkdir uploads

# Start backend server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (in new terminal)
cd frontend

# Install dependencies (if using existing React project)
npm install

# Or create new React project with Vite
npm create vite@latest . -- --template react-ts
npm install

# Install additional frontend dependencies
npm install @tanstack/react-query tesseract.js @huggingface/transformers lucide-react

# Start frontend development server
npm run dev
```

## 🔧 Configuration

### Backend Environment Variables (.env)

```bash
# Required
OPENAI_API_KEY=your-openai-api-key-here
PORT=3001

# Optional
NODE_ENV=development
MAX_FILE_SIZE=10485760  # 10MB
MAX_FILES=4
SIMILARITY_THRESHOLD=0.7
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment Variables

```bash
# Optional - if you want to use backend STT/TTS instead of Web Speech
VITE_API_BASE_URL=http://localhost:3001
VITE_USE_BACKEND_VOICE=false
```

## 🚀 Running the Application

### Development Mode

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

Navigate to: `http://localhost:3000`

### Production Mode

```bash
# Backend
cd backend
npm start

# Frontend (build and serve)
cd frontend
npm run build
npm run preview
```

## 📱 Usage Guide

### Step 1: Upload Invoices

1. Click "Choose files" in the Upload section
2. Select 1-4 invoice images (PNG/JPG)
3. Wait for OCR processing and embedding generation
4. See extracted invoice details in the UI

### Step 2: Start Voice Conversation

1. Click "Start Talking" button
2. Wait for microphone permission
3. Speak your query naturally

### Step 3: Example Queries

```
"Find invoice INV-000123"
"Show me receipts from Target"
"What was the total amount on my grocery receipt?"
"I didn't visit Rome Market on May 5th"
"Explain the charge from last Tuesday"
```

### Step 4: Voice Response

- AI analyzes your query using RAG pipeline
- Provides contextual response based on uploaded invoices
- Speaks response aloud using text-to-speech
- Escalates to live agent if query can't be resolved

## 🔄 API Documentation

### Backend Endpoints

| Method | Endpoint            | Description               |
| ------ | ------------------- | ------------------------- |
| GET    | `/api/health`       | Health check              |
| POST   | `/api/upload`       | Upload & process invoices |
| POST   | `/api/chat`         | Query invoices with RAG   |
| GET    | `/api/invoices`     | List all invoices         |
| GET    | `/api/invoices/:id` | Get specific invoice      |
| DELETE | `/api/invoices/:id` | Delete invoice            |
| POST   | `/api/tts`          | Text-to-speech conversion |
| POST   | `/api/stt`          | Speech-to-text conversion |

### Frontend Components

```typescript
// Main component
<VoiceInvoiceAssistant />

// Sub-components
<InvoiceUploader onIngested={handleIngested} />
<VoiceControls onUserFinalUtterance={answerWithRAG} />
<Transcript messages={messages} />
```

## 🧪 Example API Calls

### Upload Invoices

```javascript
const formData = new FormData();
files.forEach((file) => formData.append("invoices", file));

const response = await fetch("http://localhost:3001/api/upload", {
  method: "POST",
  body: formData,
});
```

### Query with Chat

```javascript
const response = await fetch("http://localhost:3001/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Find my receipt from Target",
    conversationId: "uuid-here",
  }),
});
```

## 🏗️ Project Structure

```
voice-invoice-assistant/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Environment variables
│   ├── uploads/               # Uploaded invoice files
│   └── README.md              # Backend documentation
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── assistant/
│   │   │   │   ├── VoiceInvoiceAssistant.tsx
│   │   │   │   ├── InvoiceUploader.tsx
│   │   │   │   ├── VoiceControls.tsx
│   │   │   │   └── Transcript.tsx
│   │   │   └── ui/             # UI components
│   │   ├── hooks/
│   │   │   └── use-voice.ts    # Voice interaction hook
│   │   ├── lib/
│   │   │   ├── ocr/
│   │   │   │   └── ocr.ts      # Tesseract.js integration
│   │   │   └── rag/
│   │   │       ├── embeddings.ts    # HuggingFace embeddings
│   │   │       └── vector-store.ts  # In-memory vector store
│   │   ├── types/
│   │   │   └── invoice.ts      # TypeScript interfaces
│   │   ├── pages/
│   │   │   └── Index.tsx       # Main page
│   │   └── App.tsx             # Root component
│   ├── package.json           # Frontend dependencies
│   └── README.md              # Frontend documentation
│
├── README.md                  # Main project documentation
└── .gitignore                 # Git ignore rules
```

## 🔍 Technology Stack

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Tesseract.js** - Client-side OCR
- **HuggingFace Transformers.js** - Client-side embeddings
- **Web Speech API** - Native voice recognition
- **React Query** - Data fetching

### Backend

- **Node.js** - Runtime
- **Express.js** - Web framework
- **Tesseract.js** - Server-side OCR
- **OpenAI API** - Embeddings, LLM, Voice services
- **Multer** - File upload handling
- **UUID** - Unique ID generation

### AI & ML Services

- **OpenAI GPT-3.5-turbo** - Conversational AI
- **OpenAI text-embedding-ada-002** - Text embeddings
- **OpenAI Whisper** - Speech-to-text
- **OpenAI TTS** - Text-to-speech
- **Tesseract.js** - OCR processing

## 🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy dist/ directory
```

### Backend (Railway/Heroku/DigitalOcean)

```bash
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production

```bash
# Backend
OPENAI_API_KEY=your-production-key
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.com

# Frontend
VITE_API_BASE_URL=https://your-backend-api.com
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Manual Testing Checklist

- [ ] Upload 2-3 different invoice images
- [ ] Verify OCR text extraction
- [ ] Test voice recognition with different queries
- [ ] Confirm TTS playback
- [ ] Test "live agent" escalation flow
- [ ] Verify mobile responsiveness

## 🐛 Troubleshooting

### Common Issues

**OCR not working:**

- Ensure images are clear and high contrast
- Check file size limits (10MB max)
- Verify image format (PNG/JPG only)

**Voice not working:**

- Enable microphone permissions
- Use HTTPS in production (required for Web Speech API)
- Try different browsers (Chrome recommended)

**API errors:**

- Check OpenAI API key and credits
- Verify CORS configuration
- Check network connectivity

**Embedding/search issues:**

- Ensure invoices were uploaded successfully
- Check similarity threshold (adjust if needed)
- Verify invoice text extraction quality

### Performance Optimization

**Frontend:**

- Lazy load components
- Implement response caching
- Optimize image uploads

**Backend:**

- Use Redis for caching
- Implement request queuing
- Add database persistence
- Scale with load balancers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

MIT License - see LICENSE file for details
