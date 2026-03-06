"""
The Other Side — Google ADK Agent
agent.py

Pipeline: describe_perspective → build_bridge → done.
Output: The Bridge (text) + Audio Narration + Generated Video (all from bridge content).
No poem. No storyboard.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# ─────────────────────────────────────────────────────────────
# LENS CONFIGURATION
# ─────────────────────────────────────────────────────────────

ANGLES = {
    "empathy": {
        "label":      "🪞 Empathy Mirror",
        "desc":       "Warm, quiet, unhurried. A therapist who sees straight through the situation — gently.",
        "tone_brief": (
            "You are warm, patient, and deeply curious about the human experience. "
            "You notice the emotion underneath the opinion. You never judge. "
            "You speak slowly, as if giving someone space to breathe. "
            "You find the vulnerability in both sides."
        ),
        "closing": "Sit with that for a second. Anything feel different?",
    },
    "conflict": {
        "label":      "⚖️ Conflict Mediator",
        "desc":       "Calm but pointed. Zero patience for ego. A judge who has heard this argument 400 times.",
        "tone_brief": (
            "You are even-handed and have no patience for posturing. "
            "You cut through the noise. Fair to both sides — not because you're soft, "
            "but because fairness is the only thing that works. "
            "Dry wit permitted when the situation earns it."
        ),
        "closing": "So. Still sure only one of you is right?",
    },
    "bias": {
        "label":      "🔄 Bias Flipper",
        "desc":       "Dry wit, slightly smug, always right. The 'well actually' friend you hate to love.",
        "tone_brief": (
            "You are incisive, slightly smug, and completely correct. "
            "You enjoy the moment when someone realises their certainty was a story. "
            "Not cruel — but precise. Wit like a scalpel, not a club."
        ),
        "closing": "Uncomfortable? Good. That's the feeling of something moving.",
    },
    "history": {
        "label":      "📜 History Retold",
        "desc":       "Dignified, measured, quiet fury. A historian tired of the same story told wrong.",
        "tone_brief": (
            "You are measured and precise. You have read the primary sources. "
            "Quiet fury about stories that get simplified or erased. "
            "You bring context, not lectures. You speak with the weight of time."
        ),
        "closing": "History didn't change. Just your angle on it. Notice anything?",
    },
    "devil": {
        "label":      "😈 Devil's Advocate",
        "desc":       "Sharp, provocative, pleased with itself. Argues the other side for sport — and wins.",
        "tone_brief": (
            "You are sharp, confident, and relish the argument. "
            "You take the opposing position because the best ideas survive challenge. "
            "Not mean — but not gentle either. "
            "You leave the person with something they cannot easily dismiss."
        ),
        "closing": "You don't have to agree. But you can't unsee it now, can you?",
    },
}

# ─────────────────────────────────────────────────────────────
# GUARDRAIL HELPER
# ─────────────────────────────────────────────────────────────

BLOCKED_PATTERNS = [
    "child abuse", "csam", "child sexual", "child exploitation",
    "genocide", "ethnic cleansing", "mass killing",
    "targeted harassment", "doxxing",
    "suicide methods", "self-harm instructions",
    "how to make a bomb", "weapon synthesis",
    "explicit sexual", "pornographic",
    "extremist recruitment", "radicalization manual",
]

def check_input_guardrail(text: str) -> dict:
    """Layer 1: content scan before any processing."""
    lower = text.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern in lower:
            return {
                "safe": False,
                "reason": (
                    "This one's outside what I can help with — not because the topic is off-limits, "
                    "but because the content touches on something that doesn't have another side worth generating. "
                    "Some things aren't up for debate."
                ),
            }
    return {"safe": True, "reason": None}


# ─────────────────────────────────────────────────────────────
# TOOL 1 — describe_perspective
# ─────────────────────────────────────────────────────────────

def describe_perspective(situation_text: str, angle: str) -> dict:
    """
    Step 1. Understands what the submitter believes through the chosen lens.

    Args:
        situation_text: The user's situation.
        angle: One of: empathy, conflict, bias, history, devil.

    Returns:
        dict with desc_prompt, angle config, closing prompt.
    """
    if angle not in ANGLES:
        angle = "empathy"
    cfg = ANGLES[angle]

    desc_prompt = f"""
Analyse this situation submitted by a user.

SITUATION:
{situation_text}

Write 2-3 honest, clear sentences describing the perspective the user is coming from.
- Do not judge them. Do not agree or disagree.
- Reflect what they seem to believe, feel, or assume.
- Be specific to their situation — no generic statements.
- Warm, human language.

Return only the 2-3 sentences. Nothing else.
""".strip()

    return {
        "desc_prompt": desc_prompt,
        "angle":       angle,
        "angle_label": cfg["label"],
        "angle_desc":  cfg["desc"],
        "tone_brief":  cfg["tone_brief"],
        "closing":     cfg["closing"],
    }


# ─────────────────────────────────────────────────────────────
# TOOL 2 — build_bridge
# ─────────────────────────────────────────────────────────────

def build_bridge(situation_text: str, original_description: str, angle: str) -> dict:
    """
    Step 2. Builds the complete other-side output.
    This JSON is the final product — rendered as text, narrated as audio,
    and used to generate the video on the frontend.

    Args:
        situation_text: The original situation.
        original_description: 2-3 sentence description from Step 1.
        angle: The chosen lens.

    Returns:
        dict with bridge_prompt and angle metadata.
    """
    if angle not in ANGLES:
        angle = "empathy"
    cfg = ANGLES[angle]

    bridge_prompt = f"""
Build the other side.

SITUATION:
{situation_text}

HOW THE SUBMITTER SEES IT:
{original_description}

YOUR LENS: {cfg['label']}
YOUR VOICE: {cfg['tone_brief']}

Return a JSON object with exactly this structure — no markdown fences, no preamble:

{{
  "headline": "10-15 word headline naming the real tension. Punchy. Newspaper front page.",
  "the_other_side": "3-4 sentences. The other perspective stated honestly and clearly. Not a rebuttal — a genuine account of how things look from the other side. Grounded in verifiable reality. Written in the voice of the lens. Human, not robotic.",
  "facts": [
    {{
      "fact": "A specific, verifiable fact that reframes the original view.",
      "source_hint": "Source type (e.g. 'UN data', 'Pew Research', 'peer-reviewed research'). Never fabricate.",
      "confidence": "high"
    }},
    {{
      "fact": "A second verifiable fact.",
      "source_hint": "Source type.",
      "confidence": "moderate"
    }},
    {{
      "fact": "A third verifiable fact.",
      "source_hint": "Source type.",
      "confidence": "high"
    }}
  ],
  "closing_prompt": "{cfg['closing']}",
  "angle": "{angle}",
  "angle_label": "{cfg['label']}"
}}

VOICE:
- Written in the voice of: {cfg['tone_brief'][:120]}
- Heavy topics (war, grief, injustice): serious, measured, no jokes.
- Everyday conflicts (neighbour, workplace): wry, a touch of wit where earned.
- Never preachy. Show, don't lecture. No "Certainly!" — ever.

GROUNDING:
- Every fact must be publicly verifiable. If you can't verify it — don't include it.
- Never fabricate statistics, studies, names, or events.
- Confidence levels: "high" | "moderate" | "uncertain"

Return ONLY the JSON object.
""".strip()

    return {
        "bridge_prompt": bridge_prompt,
        "angle":         angle,
        "angle_label":   cfg["label"],
        "closing":       cfg["closing"],
    }


# ─────────────────────────────────────────────────────────────
# SYSTEM INSTRUCTION
# ─────────────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = """
You are The Other Side — an AI agent that takes any situation and returns a grounded,
human perspective from the other side.

YOUR PIPELINE (two steps, always in order):
1. Call describe_perspective(situation_text, angle)
2. Call build_bridge(situation_text, original_description, angle)
3. Return the raw JSON from build_bridge as your final response. Nothing else.

The frontend handles display, audio narration, and video generation from that JSON.

VOICE RULES:
- No preamble. No "Certainly!" or "Great question!" — ever.
- Warm and human. Like a trusted friend who did the research.
- Heavy topics: serious, measured. Light conflicts: wry, conversational.
- Never moralize. Show, don't lecture.

GUARDRAIL RULES:
- CSAM, targeted personal harm, dehumanizing content, radicalization material → decline warmly, zero output.
- Decline: "This one's outside what I can help with — not because the topic is off-limits,
  but because [reason]. The Other Side works best when both input and output leave people better."
- No legitimate other side (genocide, child abuse):
  "This one doesn't have another side worth hearing. Some things aren't up for debate."

FACTUAL GROUNDING:
- Every fact must be publicly verifiable. Never fabricate.
""".strip()


# ─────────────────────────────────────────────────────────────
# ROOT AGENT
# ─────────────────────────────────────────────────────────────

root_agent = LlmAgent(
    name="the_other_side_agent",
    model="gemini-2.5-flash",
    description=(
        "Takes any situation — image, video, audio, text, or URL — "
        "and returns a grounded, human perspective from the other side."
    ),
    instruction=SYSTEM_INSTRUCTION,
    tools=[
        FunctionTool(func=describe_perspective),
        FunctionTool(func=build_bridge),
    ],
)
