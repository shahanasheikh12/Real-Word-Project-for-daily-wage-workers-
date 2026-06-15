import re
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class VoiceInput(BaseModel):
    transcript: str

class VoiceOutput(BaseModel):
    skill: str | None = None
    experience_years: int | None = None
    daily_wage_expectation: int | None = None

# Predefined skills mapping
SKILL_KEYWORDS = {
    'construction': ['construction', 'builder', 'mason', 'labor'],
    'plumbing': ['plumbing', 'plumber', 'pipe'],
    'electrical': ['electrical', 'electrician', 'wiring'],
    'painting': ['painting', 'painter', 'paint'],
    'carpentry': ['carpentry', 'carpenter', 'wood'],
    'cleaning': ['cleaning', 'cleaner', 'sweep', 'janitor', 'maid'],
    'gardening': ['gardening', 'gardener', 'plants', 'landscaping'],
    'delivery': ['delivery', 'driver', 'courier', 'deliver'],
    'domestic': ['domestic', 'cook', 'nanny', 'housekeeper', 'house help']
}

@router.post("/voice-onboard", response_model=VoiceOutput)
def voice_onboard(data: VoiceInput):
    transcript = data.transcript.lower()
    
    output = VoiceOutput()

    # 1. Extract skill
    for skill_key, keywords in SKILL_KEYWORDS.items():
        if any(keyword in transcript for keyword in keywords):
            output.skill = skill_key
            break

    # 2. Extract experience years
    # Matches "5 years", "5 yrs", "five years", etc.
    # Simple regex for digit followed by year/yr
    exp_match = re.search(r'(\d+)\s*(?:years?|yrs?)(?:\s*of)?\s*experience', transcript)
    if not exp_match:
        # Fallback to look for number right before "years" or "yrs"
        exp_match = re.search(r'(\d+)\s*(?:years?|yrs?)', transcript)
    
    if exp_match:
        output.experience_years = int(exp_match.group(1))

    # 3. Extract daily wage
    # Matches "500 rupees", "500 rs", "500 per day", "wage 500"
    wage_match = re.search(r'(\d+)\s*(?:rupees|rs|inr|bucks)', transcript)
    if not wage_match:
        wage_match = re.search(r'(?:wage|pay|want|expect|get)\s*(?:of\s*)?(?:rs\s*|rupees\s*)?(\d+)', transcript)
    if not wage_match:
        wage_match = re.search(r'(\d+)\s*(?:per\s*day|a\s*day|\/day)', transcript)

    if wage_match:
        output.daily_wage_expectation = int(wage_match.group(1))

    return output
