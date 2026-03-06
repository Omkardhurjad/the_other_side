"""
The Other Side — FastAPI Server
main.py — wraps Google ADK agent, exposes all endpoints
"""

import base64
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.sessions import InMemorySessionService
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from agent import ANGLES, check_input_guardrail

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("the-other-side")

APP_NAME    = "the_other_side"
APP_VERSION = "1.0.0"

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/webm", "video/quicktime",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# ─────────────────────────────────────────────────────────────
# RATE LIMITER
# ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ─────────────────────────────────────────────────────────────
# SESSION SERVICE
# Swap InMemorySessionService → DatabaseSessionService for production
# ─────────────────────────────────────────────────────────────

session_service = InMemorySessionService()

# Production:
# from google.adk.sessions import DatabaseSessionService
# session_service = DatabaseSessionService(db_url=os.environ["DATABASE_URL"])

# ─────────────────────────────────────────────────────────────
# ADK APP
# ─────────────────────────────────────────────────────────────

adk_app = get_fast_api_app(
    agent_dir=".",
    session_service=session_service,
    allow_origins=["*"],
)

# ─────────────────────────────────────────────────────────────
# LIFESPAN
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"◐ The Other Side v{APP_VERSION} starting up")
    yield
    logger.info("◐ The Other Side shutting down")

# ─────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="The Other Side",
    description="Because clarity starts where your comfort zone ends.",
    version=APP_VERSION,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # lock down to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mounts /adk/run, /adk/run_sse, /adk/apps, /adk/users, /adk/sessions
app.mount("/adk", adk_app)

# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────

class FlipRequest(BaseModel):
    situation: str
    angle: str = "empathy"
    session_id: Optional[str] = None

class FeedbackRequest(BaseModel):
    session_id: str
    perspective_new: bool
    fairness_score: int         # 1–5
    quality_score: int          # 1–5
    quality_issue: Optional[str] = None
    what_shifted: Optional[str] = None

# ─────────────────────────────────────────────────────────────
# LOGGING HELPERS
# ─────────────────────────────────────────────────────────────

def log_session(entry: dict):
    """
    Production: write to BigQuery.
    from google.cloud import bigquery
    bigquery.Client().insert_rows_json("project.dataset.sessions", [entry])
    """
    logger.info(f"SESSION | {json.dumps(entry)}")

def log_feedback(entry: dict):
    """
    Production: write to Firestore.
    from google.cloud import firestore
    firestore.Client().collection('feedback').add(entry)
    """
    logger.info(f"FEEDBACK | {json.dumps(entry)}")

# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "The Other Side",
        "version": APP_VERSION,
        "tagline": "Because clarity starts where your comfort zone ends.",
        "endpoints": {
            "GET  /health":       "Liveness probe",
            "GET  /angles":       "List all lens angles",
            "POST /flip":         "Submit situation → guardrail check → route to ADK",
            "POST /upload-media": "Upload image/video/audio (base64, ephemeral, max 10MB)",
            "POST /feedback":     "Submit session feedback",
            "POST /adk/run":      "ADK agent pipeline (full)",
            "GET  /adk/run_sse":  "ADK agent pipeline (SSE streaming)",
        },
    }


@app.get("/health")
async def health():
    """Liveness probe for Cloud Run HEALTHCHECK."""
    return {"status": "ok", "ts": int(time.time())}


@app.get("/angles")
async def get_angles():
    """Return all available lens angles and their metadata."""
    return {
        "angles": [
            {
                "id":      key,
                "label":   cfg["label"],
                "desc":    cfg["desc"],
                "closing": cfg["closing"],
            }
            for key, cfg in ANGLES.items()
        ]
    }


@app.post("/upload-media")
@limiter.limit("20/minute")
async def upload_media(request: Request, file: UploadFile = File(...)):
    """
    Upload image, video, or audio for multimodal analysis.
    - MIME validated against explicit allowlist
    - 10 MB hard cap
    - Never written to disk — base64 in memory, discarded after response
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported media type '{file.content_type}'. "
                "Allowed: image (JPEG/PNG/WebP/GIF), video (MP4/WebM), audio (MP3/WAV/OGG)."
            ),
        )

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")

    guardrail = check_input_guardrail(file.filename or "")
    if not guardrail["safe"]:
        raise HTTPException(status_code=400, detail=guardrail["reason"])

    encoded = base64.b64encode(content).decode("utf-8")

    return {
        "media_type":  file.content_type,
        "filename":    file.filename,
        "size_bytes":  len(content),
        "base64_data": encoded,
        "privacy":     "Processed in memory and discarded. Nothing stored.",
    }


@app.post("/flip")
@limiter.limit("10/minute")
async def flip(request: Request, body: FlipRequest):
    """
    Main endpoint. Flow:
    1. Layer 1 guardrail (content scan)
    2. Log session start (anonymised, no input content stored)
    3. Return ADK run payload for client to POST to /adk/run
       (Layer 2 intent check runs inside the agent's system instruction)
    """
    session_id = body.session_id or str(uuid.uuid4())

    # ── Layer 1: content scan ──────────────────────────────
    guardrail = check_input_guardrail(body.situation)
    if not guardrail["safe"]:
        log_session({
            "session_id":          session_id,
            "guardrail_triggered": True,
            "guardrail_layer":     "layer_1",
            "lens_used":           body.angle,
            "ts":                  int(time.time()),
        })
        return JSONResponse(
            status_code=200,
            content={
                "session_id": session_id,
                "declined":   True,
                "message":    guardrail["reason"],
                "output":     None,
            },
        )

    # ── Log session start (no input content stored) ────────
    log_session({
        "session_id":          session_id,
        "guardrail_triggered": False,
        "lens_used":           body.angle,
        "ts":                  int(time.time()),
    })

    # ── Return ADK run payload ─────────────────────────────
    return {
        "session_id":       session_id,
        "declined":         False,
        "adk_run_endpoint": "/adk/run",
        "adk_run_payload":  {
            "app_name":   APP_NAME,
            "user_id":    "anon",
            "session_id": session_id,
            "new_message": {
                "role": "user",
                "parts": [{
                    "text": (
                        f"SITUATION:\n{body.situation}\n\n"
                        f"ANGLE: {body.angle}\n\n"
                        "Run the pipeline: describe_perspective → build_bridge. "
                        "Return the raw JSON from build_bridge."
                    )
                }],
            },
        },
    }


@app.post("/feedback")
@limiter.limit("30/minute")
async def submit_feedback(request: Request, body: FeedbackRequest):
    """
    Submit session feedback.
    Shift score = derived from fairness + quality + perspective_new.
    No user identity stored.
    """
    if not (1 <= body.fairness_score <= 5):
        raise HTTPException(status_code=400, detail="fairness_score must be 1–5")
    if not (1 <= body.quality_score <= 5):
        raise HTTPException(status_code=400, detail="quality_score must be 1–5")

    shift_score = round(
        (body.fairness_score / 5 * 4)
        + (body.quality_score  / 5 * 4)
        + (2 if body.perspective_new else 0),
        2,
    )

    log_feedback({
        "session_id":      body.session_id,
        "perspective_new": body.perspective_new,
        "fairness_score":  body.fairness_score,
        "quality_score":   body.quality_score,
        "quality_issue":   body.quality_issue,
        "what_shifted":    body.what_shifted,
        "shift_score":     shift_score,
        "ts":              int(time.time()),
    })

    return {
        "received":    True,
        "session_id":  body.session_id,
        "shift_score": shift_score,
    }


# ─────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8080)),
        reload=False,
        log_level="info",
    )
