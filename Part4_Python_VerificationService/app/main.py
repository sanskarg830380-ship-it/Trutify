from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import health, verify

app = FastAPI(
    title="Trutify Verification Service",
    description="Evidence Retrieval, Claim Analysis, Verdict Synthesis & News Correction Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health.router)
app.include_router(verify.router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Trutify Verification Microservice",
        "status": "operational",
        "docs": "/docs",
        "health": "/health"
    }
