from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from core.config import supabase

router = APIRouter()

class MatchRequest(BaseModel):
    job_id: str

class MatchedWorker(BaseModel):
    worker_id: str
    name: str
    match_score: float

@router.post("/match-workers", response_model=List[MatchedWorker])
def match_workers(req: MatchRequest):
    # Lightweight matching logic: fetch open workers with the requested skill
    # (In a real system, this would use embeddings/distance calculations)
    
    try:
        # 1. Get job details
        job_res = supabase.table("jobs").select("*").eq("id", req.job_id).single().execute()
        job = job_res.data
        if not job:
            return []
            
        req_skill = job.get("skill_required")
        
        # 2. Get available workers with this skill
        # (Filtering by skill and availability='today')
        workers_res = supabase.table("worker_profiles").select("user_id, skills, availability").eq("availability", "today").execute()
        workers = workers_res.data
        
        matches = []
        for w in workers:
            skills = w.get("skills", [])
            if req_skill in skills:
                # Get worker name from users table
                user_res = supabase.table("users").select("name").eq("id", w["user_id"]).single().execute()
                name = user_res.data.get("name", "Unknown") if user_res.data else "Unknown"
                
                matches.append(MatchedWorker(
                    worker_id=w["user_id"],
                    name=name,
                    match_score=95.0 # Mock score
                ))
                
        return matches[:5]
    except Exception as e:
        print(f"Matching error: {e}")
        return []
