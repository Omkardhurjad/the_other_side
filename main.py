"""
The Other Side — FastAPI Production Server
main.py — Orchestrates Gemini (ADK), Imagen 4, and Cloud TTS.
"""

import os
import uuid
import logging
import asyncio
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Google Cloud & ADK Imports
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel
from google.cloud import texttospeech
from google.adk.cli.fast_api import get_fast_api_app

# Import your updated agent logic
from agent import root_agent, ANGLES

# ─────────────────────────────────────────────────────────────
# CONFIG & INITIALIZATION
# ─────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("the-other-side")

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "your-project-id")
vertexai.init(project=PROJECT_ID, location="us-central1")

app = FastAPI(title="The Other Side — Multimodal Engine")

# CORS for Extension and Web App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory Job Store (Replace with Firestore for production)
jobs = {}

# ─────────────────────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────────────────────

class FlipRequest(BaseModel):
    situation: str
    angle: str
    media_type: str  # 'text', 'image', 'audio', 'video'
    session_id: Optional[str] = None

# ─────────────────────────────────────────────────────────────
# MEDIA GENERATION UTILITIES
# ─────────────────────────────────────────────────────────────

def generate_visual_content(prompt: str, mode: str):
    """Triggers Imagen 4 or Veo 2 and stores the result."""
    if mode == "image":
        model = ImageGenerationModel.from_pretrained("imagen-4.0-generate-001")
        response = model.generate_images(prompt=prompt, number_of_images=1)
        
        # Get raw bytes from the first image
        img_bytes = response.generated_images[0]._image_bytes 
        return upload_to_gcs(img_bytes, "image/png", "png")
    
    elif mode == "video":
        # Logic for Veo 2 video generation goes here
        # result = veo_model.generate_video(prompt=prompt)
        # return upload_to_gcs(result.bytes, "video/mp4", "mp4")
        return "https://storage.googleapis.com/tos-output/sample-flip.mp4"
    return None

def generate_audio_content(text: str):
    """Triggers TTS and stores the MP3 result."""
    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(language_code="en-US", name="en-US-Studio-O")
    audio_config = texttospeech.AudioConfig(audio_encoding="MP3")
    
    response = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
    
    return upload_to_gcs(response.audio_content, "audio/mp3", "mp3")

# ─────────────────────────────────────────────────────────────
# BACKGROUND TASK: THE SYMMETRIC PIPELINE
# ─────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────
# BACKGROUND TASK: THE SYMMETRIC PIPELINE
# ─────────────────────────────────────────────────────────────

from guardrails import sanitize_input, validate_output_safety, check_media_safety

async def process_multimodal_flip(job_id: str, req: FlipRequest):
    try:
        # UPDATE 1: Input/Intent Guardrail
        # Blocks prompt injections and masks PII
        clean_situation = sanitize_input(req.situation)
        
        # 1. Run the ADK Agent (Gemini)
        # This determines the "Bridge" and creates prompts for Imagen/TTS
        agent_result = await root_agent.run(f"Situation: {clean_situation}, Lens: {req.angle}")
    
        # UPDATE 2: Output Guardrail & Structural Validation
        # Ensures Gemini didn't hallucinate unsafe content or break the JSON format
        if not validate_output_safety(agent_result):
            jobs[job_id] = {"status": "declined", "message": "Result failed safety validation."}
            return
        
        # THE OUTPUT SCAN (The 'Final Gate')
        toxicity_score = rate_toxicity(agent_result["the_other_side"])
        
        # Log to Firestore for your Internal Dashboard
        db.collection("internal_analytics").document(job_id).set({
            "toxicity_score": toxicity_score,
            "lens": req.angle,
            "category": agent_result.get("category", "unknown"),
            "status": "scanned"
        })
        
        if toxicity_score > 3:
            # Decline warmly in the voice of the product
            jobs[job_id] = {
                "status": "declined", 
                "message": "This one's outside what I can help with, but here's why: we aim to build bridges, not amplify harm."
            }
            return

        # 3. Generate Media (The "Expensive" Part)
        # We only spend tokens/compute once we know the text is safe
        payload = agent_result.get("generation_payload", {})
        media_url = None
        
        if req.media_type in ["image", "video"]:
            # If the original input was an image, you'd insert check_media_safety(bytes) here
            media_url = generate_visual_content(payload.get("prompt"), req.media_type)
        elif req.media_type == "audio":
            media_url = generate_audio_content(agent_result["the_other_side"])

        # 4. Final Job Update
        # This is what the frontend picks up when polling /status/{job_id}
        jobs[job_id] = {
            "status": "completed",
            "result": {
                **agent_result,
                "media_url": media_url,
                "original_type": req.media_type
            }
        }
        logger.info(f"Job {job_id} completed successfully for media type: {req.media_type}")

    except ValueError as e:
        logger.warning(f"Job {job_id} declined: {str(e)}")
        jobs[job_id] = {"status": "declined", "message": str(e)}
    except Exception as e:
        logger.error(f"Job {job_id} failed with system error: {str(e)}")
        jobs[job_id] = {"status": "failed", "error": "Internal Processing Error"}
                
# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.post("/flip/async")
async def create_flip_job(req: FlipRequest, background_tasks: BackgroundTasks):
    """Initiates a symmetric flip and returns a Job ID immediately."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "processing"}
    
    background_tasks.add_task(process_multimodal_flip, job_id, req)
    
    return {"job_id": job_id, "status_url": f"/status/{job_id}"}

@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Endpoint for the frontend to poll for results."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

@app.get("/angles")
async def get_angles():
    """Returns available perspective lenses for the UI."""
    return {"angles": [{"id": k, "label": v["label"]} for k, v in ANGLES.items()]}

# Integrate the standard ADK FastAPI app for direct text calls if needed
adk_app = get_fast_api_app(root_agent)
app.mount("/adk", adk_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
    
    from google.cloud import storage

def upload_to_gcs(content: bytes, content_type: str, extension: str):
    """Uploads bytes to GCS and returns a public URL."""
    # Pulls from the environment variable set in setup.sh
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    if not bucket_name:
        logger.error("GCS_BUCKET_NAME not set!")
        return None

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    
    file_name = f"outputs/{uuid.uuid4()}.{extension}"
    blob = bucket.blob(file_name)
    
    blob.upload_from_string(content, content_type=content_type)
    
    # Returns the public link for the extension/web app to render
    return f"https://storage.googleapis.com/{bucket_name}/{file_name}"


import os, uuid
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from google.cloud import firestore # For internal logging dashboard

app = FastAPI()
db = firestore.Client()

class Feedback(BaseModel):
    session_id: str
    new_perspective: bool
    fairness_score: int # 1-5
    what_shifted: str
    quality_score: int
    country: str # Geographic logging
    state: str

@app.post("/log-feedback")
async def log_user_feedback(fb: Feedback):
    # Mandatory feedback collection to ensure tool health
    doc_ref = db.collection("internal_dashboard").document(fb.session_id)
    doc_ref.update({
        "feedback": fb.dict(),
        "status": "completed"
    })
    return {"status": "thank_you"}

@app.post("/flip")
async def flip_content(req: dict):
    # Internal Logging
    session_id = str(uuid.uuid4())
    # Log: Toxicity Score (In/Out), Lens, Category, Guardrail Triggered
    # Trigger Media Generation (Imagen 3 for Video scenes, Lyria for Audio)
    return {"session_id": session_id, "output": "..."}
