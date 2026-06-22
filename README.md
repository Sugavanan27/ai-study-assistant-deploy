# Athena: AI Academic Assistant (Production RAG)

Athena is a modern, production-ready, containerized Retrieval-Augmented Generation (RAG) web application built for colleges. It provides grounded answers, notice boards, FAQ lookup, and study helper modules using **FastAPI**, **Next.js**, **PostgreSQL**, **ChromaDB**, and configurable **Gemini/OpenAI** LLM clients.

## 🚀 Key Features

* **Authenticated Admin Dashboard**: Multi-tenant login for managing document uploads, notices, and FAQs.
* **Multipart Document Processor**: Instantly uploads, extracts, chunks, and indexes **PDF**, **DOCX**, **TXT**, and **Markdown** files.
* **Rich Text Editor**: Manually compose and insert knowledge entries directly via text inputs.
* **Relational Chunks & Metadata**: Stores document configurations, chat histories, and chunk segments in **PostgreSQL** via **SQLAlchemy**.
* **Semantic Vector Storage**: Indexes chunks and metadata in a local persistent **ChromaDB** database.
* **Configurable LLM Support**: Supports switching between Google Gemini and OpenAI models using environment variables.
* **Grounded Citations**: Responses list the exact sources and PDF page numbers used during retrieval.
* **Strict Hallucination Prevention**: Returns `"I couldn't find relevant information in the uploaded college documents."` if semantic match thresholds are not met.
* **Knowledge Management Panel**: Live database metrics tracking total documents, chunks, Chroma vectors, last uploaded file, and total storage usage.
* **Non-AI Search**: Includes a dedicated keyword-based search tool querying document segments directly in SQL.
* **Premium Design**: CSS variables, responsive layout, glassmorphism containers, and smooth slide animations (Framer Motion).
* **Docker Orchestration**: Complete Docker Compose support for deploying databases, backends, and frontends in one step.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 15 (React), TypeScript, Tailwind CSS v4, Lucide Icons, Framer Motion.
* **Backend**: FastAPI (Python), SQLAlchemy ORM, Uvicorn.
* **Vector Store**: ChromaDB (integrated persistent local database).
* **Database & Auth**: PostgreSQL (relational tables, user chats) + JWT Auth.
* **LLM Models**: Gemini 1.5 Flash (via `langchain-google-genai`) / OpenAI GPT-4o-mini (via `langchain-openai`).

---

## 📁 Project Directory Structure

```
├── backend/                   # FastAPI backend services
│   ├── api/                   # REST API routes (auth, chat, admin, etc.)
│   ├── database/              # PostgreSQL SQLAlchemy ORM session & models
│   ├── seed_data/             # Raw text data for initial seeding
│   ├── services/              # Core RAG, ChromaDB, and LLM providers
│   ├── utils/                 # Document text extraction (page-by-page PDF parser)
│   ├── main.py                # Server entrypoint & routing
│   ├── seed.py                # Database initial populator script
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Docker instructions for backend container
├── frontend/                  # Next.js frontend client
│   ├── src/app/               # Next.js App Router (login, search, admin, dashboard)
│   ├── src/services/          # Frontend API fetch clients
│   └── Dockerfile             # Docker instructions for frontend container
├── docker-compose.yml         # Container configuration for PostgreSQL, Backend, Frontend
└── README.md                  # Deployment, installation, and project guide
```

---

## ⚙️ Running the Application

### Method 1: Docker Compose (Recommended & Production-ready)

The easiest way to run the entire system is through Docker. Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

1. Configure your environment variables. Create a `.env` file in the root directory (where `docker-compose.yml` resides) and add:
   ```ini
   LLM_PROVIDER=gemini # Or "openai"
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   ```
2. Build and launch all containers:
   ```bash
   docker-compose up --build
   ```
3. This spins up three services:
   * **db**: PostgreSQL running on port `5432`.
   * **backend**: FastAPI server running on port `8000`.
   * **frontend**: Next.js client running on port `3000`.
4. The database tables will be migrated and seeded automatically. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Method 2: Local Development Setup

If you prefer to run the services locally without Docker:

#### 1. Setup PostgreSQL Database
Make sure you have a running PostgreSQL database. Create a database named `academic_assistant`.

#### 2. Backend Setup
1. Open a terminal and navigate to the root directory:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install Python requirements:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Set your environment variables in a `backend/.env` file:
   ```ini
   DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/academic_assistant
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Run the seed script to create tables and load sample documents:
   ```bash
   python backend/seed.py
   ```
5. Start the FastAPI backend server:
   ```bash
   python -m uvicorn backend.main:app --port 8000 --reload
   ```

#### 3. Frontend Setup
1. Open a new terminal window, navigate to the `frontend` folder:
   ```bash
   cd frontend
   npm install
   ```
2. Set your API URL in `frontend/.env.local`:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web app at [http://localhost:3000](http://localhost:3000).

---

## 🔒 Authentication Credentials
Athena is configured with default seed credentials for quick evaluation:
* **Admin Login**: Username `admin` & Password `password123`
* **Student Login**: Username `qq489815@gmail.com` & Password `student123`
