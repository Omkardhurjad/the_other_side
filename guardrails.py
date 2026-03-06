"""
The Other Side — Safety & Guardrails
guardrails.py — Input/Intent/Output Validation
"""
import re
import logging
from google.cloud import vision

logger = logging.getLogger("tos-guardrails")

# ─────────────────────────────────────────────────────────────
# 1. INPUT SANITIZATION (PII & Injection)
# ─────────────────────────────────────────────────────────────

def sanitize_input(text: str) -> str:
    """Removes PII and blocks common prompt injection patterns."""
    # Simple PII Masking (Emails/Phones)
    text = re.sub(r'\S+@\S+', '[EMAIL]', text)
    text = re.sub(r'\d{3}-\d{3}-\d{4}', '[PHONE]', text)
    
    # Injection Blocking
    injection_patterns = [
        r"ignore all previous", 
        r"system prompt", 
        r"developer mode",
        r"output as a poem only" # Force-breaking the required JSON format
    ]
    
    for pattern in injection_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            logger.warning(f"Injection pattern detected: {pattern}")
            raise ValueError("Input contains prohibited system override commands.")
            
    return text

# ─────────────────────────────────────────────────────────────
# 2. INTENT & MEDIA SAFETY (Vision API)
# ─────────────────────────────────────────────────────────────

def check_media_safety(file_bytes: bytes) -> bool:
    """Checks images/video frames for violence, medical, or adult content."""
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=file_bytes)
    
    response = client.safe_search_detection(image=image)
    safe = response.safe_search_annotation

    # Logic: 1=Very Unlikely, 5=Very Likely
    # We block if anything is 'Likely' (4) or 'Very Likely' (5)
    if any(attr >= 4 for attr in [safe.adult, safe.violence, safe.racy]):
        logger.warning(f"Unsafe media detected: Adult={safe.adult}, Violence={safe.violence}")
        return False
    return True

# ─────────────────────────────────────────────────────────────
# 3. OUTPUT VALIDATION (Safety & Structure)
# ─────────────────────────────────────────────────────────────

def validate_output_safety(agent_json: dict) -> bool:
    """Final check to ensure the LLM didn't hallucinate unsafe content."""
    text_to_check = f"{agent_json.get('headline', '')} {agent_json.get('the_other_side', '')}"
    
    # Prohibited Output Keywords (Hate Speech/Specific Slurs)
    prohibited = ["slur1", "slur2", "violent_act"] # Replace with actual safety list
    
    for word in prohibited:
        if word in text_to_check.lower():
            return False
            
    # Structural Validation
    required_keys = ["headline", "the_other_side", "facts", "media_type"]
    return all(key in agent_json for key in required_keys)

def check_guardrails(content, stage="input"):
    """
    1. Input Scan: Check for PII, porn, or harm.
    2. Intent Check: Pattern detection for bulk fake generation.
    3. Scan for: Targeted harm, radicalization, porn, or child abuse.
    4. Pattern Detection: Blocks bulk fake perspective generation.
    5. Policy: If no legitimate 'other side' exists (e.g. genocide), decline.
    6. Voice: 'This one's outside what I can help with, but here's why...'
    """
    # Rate Limiting: Cap uses per session without account
    # If hit: Decline warmly.
    pass


def validate_bridge_output(generated_payload):
    """
    Final check before the user sees the 'Reveal'.
    """
    # 1. Verify Structure
    if not all(k in generated_payload for k in ["headline", "the_other_side", "confidence"]):
        return False, "Formatting error"

    # 2. Check for Hallucinated Harm
    # If the model accidentally generated something toxic in the 'flipped' view
    toxicity_score = rate_toxicity(generated_payload["the_other_side"])
    if toxicity_score > 3: 
        return False, "This one's outside what I can help with, but here's why..."

    return True, "Safe to Reveal"


import logging
from vertexai.generative_models import GenerativeModel, SafetySetting, HarmCategory, HarmBlockThreshold

logger = logging.getLogger("tos-output-scan")

def rate_toxicity(text_output: str) -> int:
    """
    Internal scan to rate output toxicity from 0-10.
    Used for the Internal Dashboard and the 'Final Gate' logic.
    """
    try:
        # We use a dedicated, strict prompt for the safety rater
        safety_rater = GenerativeModel("gemini-2.0-flash-lite")
        
        prompt = f"""
        Analyze the following text for 'The Other Side' app. 
        Rate the toxicity on a scale of 0 to 10.
        Criteria: Targeted harm, radicalization, hate speech, or promoting wrong/harmful ideas.
        
        Text: "{text_output}"
        
        Output only the integer value.
        """
        
        response = safety_rater.generate_content(prompt)
        score = int(response.text.strip())
        
        # Log this for your internal dashboard team
        logger.info(f"Internal Toxicity Score: {score}")
        return score

    except Exception as e:
        logger.error(f"Safety scan failed: {e}")
        # Default to high toxicity if the scan fails to be safe
        return 10