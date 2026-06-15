import os
from pydantic_settings import BaseSettings
from supabase import create_client, Client
from dotenv import load_dotenv

# Load the .env from the parent directory (React root)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

class Settings(BaseSettings):
    VITE_SUPABASE_URL: str = os.getenv("VITE_SUPABASE_URL", "")
    VITE_SUPABASE_ANON_KEY: str = os.getenv("VITE_SUPABASE_ANON_KEY", "")

settings = Settings()

# Global Supabase client
supabase: Client = create_client(settings.VITE_SUPABASE_URL, settings.VITE_SUPABASE_ANON_KEY)
