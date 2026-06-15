from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class FraudRequest(BaseModel):
    description: str
    pay_offered: int

class FraudResponse(BaseModel):
    fraud_score: float
    is_suspicious: bool
    reasons: list[str]

@router.post("/check-fraud", response_model=FraudResponse)
def check_fraud(req: FraudRequest):
    desc = req.description.lower()
    score = 0.0
    reasons = []
    
    # 1. Keyword heuristics
    suspicious_keywords = ["pay upfront", "registration fee", "security deposit", "bank details", "send money"]
    for kw in suspicious_keywords:
        if kw in desc:
            score += 0.4
            reasons.append(f"Suspicious phrase detected: '{kw}'")
            
    # 2. Unrealistic pay heuristic
    if req.pay_offered > 5000:
        score += 0.3
        reasons.append("Unusually high daily wage offered")
        
    # Cap score at 1.0
    score = min(score, 1.0)
    
    return FraudResponse(
        fraud_score=score,
        is_suspicious=score >= 0.5,
        reasons=reasons
    )
