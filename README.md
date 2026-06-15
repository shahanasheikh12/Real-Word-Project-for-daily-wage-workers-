# DailyWork

**DailyWork** is a mobile-first, full-stack application designed to connect daily wage workers (plumbers, carpenters, domestic helpers) with local employers instantly. It solves the friction of informal employment by digitizing trust (reviews), availability (live beacons), and geographical matching.

## Tech Stack
- **Frontend**: React 18, Vite, React Router v7, Tailwind CSS v4.
- **Backend / Database**: Supabase (PostgreSQL, Auth, Storage, Realtime).
- **AI Microservice**: Python, FastAPI (Used for NLP-based voice onboarding, fraud detection, and wage estimation).

---

## 🚀 How to Run Locally

### 1. Supabase Setup
This project relies on Supabase for auth and database functionality.
1. Create a project on [Supabase](https://supabase.com).
2. Go to SQL Editor and run all the migration scripts located in `dailywork/supabase/migrations/` in order.
3. Obtain your `Project URL` and `anon public` API key from **Settings > API**.

### 2. Frontend Setup (React)
1. Navigate to the frontend directory: `cd dailywork`
2. Create an environment file: `cp .env.example .env`
3. Fill in your `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Install dependencies: `npm install`
5. Start the development server: `npm run dev`

### 3. AI Microservice Setup (FastAPI)
1. Navigate to the AI directory: `cd dailywork/ai`
2. Create a virtual environment: `python -m venv venv`
3. Activate the environment:
   - Windows: `.\venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `uvicorn main:app --port 8000`

---

## 📁 Folder Structure
```
dailywork/
├── ai/                 # Python FastAPI Microservice (NLP, matching, fraud)
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components (JobCards, Layouts, etc.)
│   ├── context/        # React context (AuthContext)
│   ├── pages/          # Route-level components (Home, Profile, Map, Admin)
│   └── utils/          # Helpers (distance calculation, skill metadata)
├── supabase/
│   └── migrations/     # SQL scripts to initialize DB schema and RLS policies
├── .env                # Secret keys (do not commit)
└── tailwind.config.js  # Tailwind theme definitions (now via @tailwindcss/vite)
```

---

## 🛡️ Setting up the Admin Account
To access the Admin Dashboard at `/admin`:
1. Register a new user account normally (or via the Supabase Auth Dashboard) with the email `admin@dailywork.com`.
2. Go to your Supabase SQL Editor and run:
   ```sql
   UPDATE public.users 
   SET role = 'admin' 
   WHERE email = 'admin@dailywork.com';
   ```
3. Log in to the application. You will be prompted to set a new secure password. Afterwards, you will have full access to manage users, flagged jobs, and overall platform health.
