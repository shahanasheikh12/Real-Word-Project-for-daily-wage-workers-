# 🛠️ DailyWork

**DailyWork** is a mobile-first, full-stack platform designed to connect daily wage workers (plumbers, carpenters, domestic helpers) with local employers instantly. It solves the friction of informal employment by digitizing trust (reviews), availability (live beacons), and geographical matching.

![DailyWork Banner](https://via.placeholder.com/1200x400/0f172a/fde047?text=DailyWork+Platform)

---
## Live Deployed :-https://real-word-project-for-daily-wage-wo.vercel.app/worker/profile

## ✨ Key Features

- **📍 Geographic Matching**: Calculates distances between workers and open jobs using the Haversine formula to surface the most relevant local opportunities.
- **🟢 Live Availability Beacons**: Workers can toggle their status (`Today`, `Tomorrow`, `Unavailable`), allowing employers to hire talent that is immediately ready to work.
- **🎙️ AI Voice Onboarding**: An innovative, accessible profile creation tool. Workers can simply speak their experience (e.g., *"I am a carpenter with 3 years experience, I want 500 rupees a day"*), and the Python NLP microservice automatically extracts and populates their profile.
- **💬 Real-Time Chat**: Integrated Supabase Realtime web-sockets enable seamless, instant messaging between employers and workers once an application is confirmed.
- **⭐ Trust & Safety Ecosystem**: Post-job rating system generates aggregate Trust Scores. An Admin Dashboard monitors platform health, verifies worker IDs, and flags potentially fraudulent job postings based on AI heuristics.

---

## 💻 Tech Stack

### Frontend
- **Framework**: React 18 & Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 (Mobile-first design)
- **State Management**: React Context API
- **Hosting**: Vercel

### Backend & Database
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (WebSockets)
- **Storage**: Supabase Storage Buckets (ID & Profile photos)

### AI Microservice
- **Framework**: Python & FastAPI
- **NLP**: Regex & Keyword extraction pipelines
- **Hosting**: Render

---

## 🚀 Local Development Setup

### 1. Supabase Initialization
1. Create a project on [Supabase](https://supabase.com).
2. Go to the SQL Editor and execute all migration scripts located in `supabase/migrations/` in numerical order to establish the schema, RLS policies, and triggers.
3. Obtain your `Project URL` and `anon public` API key from **Settings > API**.

### 2. Frontend Setup (React)
1. Clone the repository and navigate to the root directory.
2. Create an environment file: `cp .env.example .env`
3. Fill in your `.env` with your Supabase credentials and AI URL:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_AI_API_URL=http://localhost:8000
   Install dependencies: npm install
   ****
Start the development server: npm run dev <br>

# 3. AI Microservice Setup (FastAPI)<br>
Navigate to the AI directory: cd ai<br>

Create and activate a virtual environment:<br>
Windows: python -m venv venv then .\venv\Scripts\activate<br>
Mac/Linux: python3 -m venv venv then source venv/bin/activate<br>
Install dependencies: pip install -r requirements.txt<br>
Run the server: uvicorn main:app --port 8000 --reload<br>

# 🛡️ Admin Account Initialization <br>
To access the secure Admin Dashboard (/admin):<br>

Register a standard user account with the email admin@dailywork.com.<br>
Go to your Supabase SQL Editor and elevate the privileges:
sql<br>


# UPDATE public.users <br>
SET role = 'admin', must_change_password = true <br>
WHERE email = 'admin@dailywork.com';<br>
Log in to the application to set a secure password and access the management interface.<br>

📁 Repository Structure
text


dailywork/
├── ai/                 # Python FastAPI Microservice (NLP, matching, fraud)
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components (JobCards, Layouts, etc.)
│   ├── context/        # React context (AuthContext)
│   ├── pages/          # Route-level components (Home, Profile, Map, Admin)
│   └── utils/          # Helpers (distance calculation, skill metadata)
├── supabase/
│   └── migrations/     # SQL scripts defining DB schema and RLS policies
└── .env.example        # Environment variable template
