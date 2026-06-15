from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class WageRequest(BaseModel):
    skill: str
    city: str

class WageResponse(BaseModel):
    min_wage: int
    max_wage: int
    confidence: float

@router.post("/suggest-wage", response_model=WageResponse)
def suggest_wage(req: WageRequest):
    # Phase 5: Lightweight heuristic for wage suggestion
    # Baseline for general labor in typical Indian cities
    base_wage = 400
    
    # Skill multipliers
    skill_multipliers = {
        "plumbing": 1.5,
        "electrical": 1.6,
        "painting": 1.3,
        "carpentry": 1.4,
        "construction": 1.2,
        "cleaning": 1.0,
        "gardening": 1.1,
        "delivery": 1.2,
        "domestic": 1.0,
    }
    
    # City multipliers (cost of living adjustments)
    city_multipliers = {
        "mumbai": 1.4,
        "delhi": 1.3,
        "bengaluru": 1.35,
        "pune": 1.2,
        "hyderabad": 1.2,
        "chennai": 1.2,
    }
    
    skill_key = req.skill.lower()
    city_key = req.city.lower()
    
    # Calculate modifiers
    s_mod = skill_multipliers.get(skill_key, 1.1)
    
    # Simple substring matching for city
    c_mod = 1.0
    for ck, cm in city_multipliers.items():
        if ck in city_key:
            c_mod = cm
            break
            
    calculated_base = base_wage * s_mod * c_mod
    
    # Create a realistic range
    min_wage = int(calculated_base)
    max_wage = int(calculated_base * 1.3)
    
    # Round to nearest 50
    min_wage = round(min_wage / 50) * 50
    max_wage = round(max_wage / 50) * 50
    
    return WageResponse(
        min_wage=min_wage,
        max_wage=max_wage,
        confidence=0.85
    )
