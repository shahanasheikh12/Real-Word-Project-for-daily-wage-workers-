from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import wage, matching, fraud, voice

app = FastAPI(title="DailyWork AI Microservice", version="1.0.0")

# Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wage.router, prefix="/api", tags=["Wage"])
app.include_router(matching.router, prefix="/api", tags=["Matching"])
app.include_router(fraud.router, prefix="/api", tags=["Fraud"])
app.include_router(voice.router, prefix="/api", tags=["Voice"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "AI Microservice is running."}
