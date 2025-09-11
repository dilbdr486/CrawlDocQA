# CrawlDocQA - Document Question Answering System

A comprehensive document question-answering system that allows users to upload PDFs, crawl web content, and ask questions about the documents using AI-powered retrieval-augmented generation (RAG).

**Live Frontend Only:** https://dil-crawl-doc-qa-final-project.vercel.app/

## 🏗️ Architecture

This project consists of four main components:

- **Frontend** - React-based web application with Material-UI and Tailwind CSS
- **Backend** - Node.js/Express API server with MongoDB for user management
- **RAG Service** - Document processing and vector storage using Weaviate
- **NLP Pipeline** - Python-based text preprocessing and ChromaDB integration

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- MongoDB
- Docker and Docker Compose

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CrawlDocQA-FinalProject
```

### 2. Start Vector Databases

```bash
# Start Weaviate (for RAG Service)
cd ragService
docker-compose up -d

# Start ChromaDB (for NLP Pipeline)
cd ../nlp-pipeline
docker-compose up -d
```

### 3. Set Up Environment Variables

Create `.env` files in each component directory:

**Backend/.env:**

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/crawldocqa
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

**Frontend/.env:**

```env
VITE_API_URL=http://localhost:8000
VITE_RAG_SERVICE_URL=http://localhost:4000
VITE_NLP_SERVICE_URL=http://localhost:8001
```

**ragService/.env:**

```env
PORT=4000
WEAVIATE_SCHEME=http
WEAVIATE_HOST=localhost:8080
GOOGLE_API_KEY=your_google_api_key
```

**nlp-pipeline/.env:**

```env
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

### 4. Install Dependencies and Run Services

```bash
# Backend
cd Backend
npm install
npm start

# Frontend (in new terminal)
cd Frontend
npm install
npm run dev

# RAG Service (in new terminal)
cd ragService
npm install
npm start

# NLP Pipeline (in new terminal)
cd nlp-pipeline
pip install -r requirements.txt
uvicorn api:app --reload --port 8001
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- RAG Service: http://localhost:4000
- NLP Pipeline: http://localhost:8001

## 📁 Project Structure

```
CrawlDocQA-FinalProject/
├── Backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Authentication & file upload
│   │   └── utils/          # Utility functions
│   └── server.js
├── Frontend/               # React web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # State management
│   │   └── assets/         # Static assets
│   └── package.json
├── nlp-pipeline/           # Python text processing
│   ├── api.py             # FastAPI server
│   ├── preprocess.py      # PDF preprocessing
│   └── requirements.txt
└── ragService/            # Document processing & RAG
    ├── src/
    │   ├── splitter.js    # Document splitting
    │   ├── model.js       # AI model integration
    │   └── tools.js       # Query processing
    └── server.js
```

## 🔧 Features

- **User Authentication**: JWT-based auth with Google OAuth integration
- **Document Upload**: PDF processing and text extraction
- **Web Crawling**: Extract content from web URLs
- **Vector Search**: Semantic search using Weaviate and ChromaDB
- **AI Chat**: Question-answering using Google's Gemini AI
- **Real-time Chat**: Interactive chat interface with conversation history

## 🛠️ Technology Stack

- **Frontend**: React 19, Material-UI, Tailwind CSS, Vite
- **Backend**: Node.js, Express, MongoDB, JWT, Passport.js
- **Vector Databases**: Weaviate, ChromaDB
- **AI/ML**: Google Gemini AI, LangChain, Tesseract.js
- **Document Processing**: PDF-lib, pdf-parse, pdf2pic
- **NLP**: NLTK, Gensim, scikit-learn, FAISS

## 📖 Usage

1. **Register/Login**: Create an account or sign in with Google
2. **Upload Documents**: Upload PDF files or provide web URLs
3. **Ask Questions**: Use the chat interface to ask questions about your documents
4. **View History**: Access your conversation history and uploaded documents

## 🔒 Security

- JWT token-based authentication
- CORS protection
- File upload validation
- Environment variable configuration

## 📝 API Endpoints

### Backend API (Port 8000)

- `POST /api/v1/register` - User registration
- `POST /api/v1/login` - User login
- `POST /api/v1/chat` - Chat operations

### RAG Service (Port 4000)

- `POST /api/v1/upload` - Upload PDF documents
- `POST /api/load-data` - Load web content
- `POST /api/v1/query` - Query documents

### NLP Pipeline (Port 8001)

- `POST /upload_pdf/` - Process PDF with NLP
- `GET /get_data/` - Retrieve processed data

## 🐳 Docker Support

Both vector databases (Weaviate and ChromaDB) can be run using Docker Compose for easy setup and deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please open an issue in the repository.
