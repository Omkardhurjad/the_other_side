/**
 * The Other Side — React Frontend
 * the-other-side.jsx
 *
 * Output: The Bridge (text) + Audio Narration + Generated Video
 * No poem. No storyboard.
 *
 * Replace API_BASE with your Cloud Run URL before deploying.
 */

import { useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://your-service-url.run.app"; // ← replace

const ANGLES = [
  { id: "empathy",  label: "🪞 Empathy Mirror",    desc: "Warm, unhurried — finds the feeling underneath." },
  { id: "conflict", label: "⚖️ Conflict Mediator",  desc: "Calm but pointed — cuts through ego." },
  { id: "bias",     label: "🔄 Bias Flipper",       desc: "Dry wit — your certainty was always a story." },
  { id: "history",  label: "📜 History Retold",     desc: "Measured fury — the part left out of the story." },
  { id: "devil",    label: "😈 Devil's Advocate",   desc: "Sharp, pleased with itself — argues for sport." },
];

// ─────────────────────────────────────────────────────────────
// COLOURS
// ─────────────────────────────────────────────────────────────

const C = {
  bg:      "#07070e",
  surface: "#111120",
  border:  "#1e1e32",
  muted:   "#52506a",
  text:    "#eeeaf8",
  dim:     "#c4c0d8",
  purple:  "#a78bfa",
  gold:    "#f0c96a",
  blue:    "#60a5fa",
  green:   "#34d399",
  pink:    "#e879f9",
  red:     "#f87171",
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function parseResult(raw) {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? {});

  // Strip possible markdown fences the model might add despite instructions
  const clean = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  // Find the outermost JSON object
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────────────────────

const CSS = `
@keyframes _tos_spin  { to { transform: rotate(360deg); } }
@keyframes _tos_pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
._tos_spin  { animation: _tos_spin  .8s linear infinite; }
._tos_pulse { animation: _tos_pulse 1.4s ease-in-out infinite; }
`;

function Spinner({ label = "Looking at the other side…" }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <style>{CSS}</style>
      <div className="_tos_spin" style={{
        display: "inline-block", width: 36, height: 36, borderRadius: "50%",
        border: `2px solid ${C.border}`, borderTopColor: C.purple,
      }}/>
      <div style={{ marginTop: 16, fontSize: 13, color: C.muted }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAR RATING
// ─────────────────────────────────────────────────────────────

function Stars({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          width: 32, height: 32, borderRadius: 7, fontSize: 16,
          border: `1px solid ${n <= value ? C.gold : C.border}`,
          background: n <= value ? `${C.gold}18` : C.bg,
          color: n <= value ? C.gold : C.muted,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>★</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONFIDENCE BADGE
// ─────────────────────────────────────────────────────────────

function ConfidenceBadge({ level }) {
  const map = {
    high:      [C.green, `${C.green}18`],
    moderate:  [C.gold,  `${C.gold}18`],
    uncertain: [C.red,   `${C.red}18`],
  };
  const [color, bg] = map[level] ?? map.moderate;
  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: 5,
      background: bg, color, marginLeft: 8, verticalAlign: "middle",
      border: `1px solid ${color}33`,
    }}>{level}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// OUTPUT TABS — Text / Audio / Video
// ─────────────────────────────────────────────────────────────

function OutputTabs({ data, sessionId }) {
  const [tab, setTab] = useState("text");

  const tabs = [
    { id: "text",  label: "🌉 The Bridge" },
    { id: "audio", label: "🎙 Listen"     },
    { id: "video", label: "🎬 Watch"      },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 16px", borderRadius: 10, fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
            border: `1.5px solid ${tab === t.id ? C.purple : C.border}`,
            background: tab === t.id ? `${C.purple}14` : C.surface,
            color: tab === t.id ? C.purple : C.muted,
            cursor: "pointer", transition: "all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Text tab */}
      {tab === "text" && (
        <div>
          {/* Headline */}
          <div style={{
            background: "#0f0e06", border: `1.5px solid ${C.gold}33`,
            borderRadius: 14, padding: "18px 20px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.gold, marginBottom: 10, lineHeight: 1.4 }}>
              {data.headline}
            </div>
            <div style={{ fontSize: 14, color: "#a89850", lineHeight: 1.75 }}>
              {data.the_other_side}
            </div>
          </div>

          {/* Facts */}
          {data.facts?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
                Grounding facts
              </div>
              {data.facts.map((f, i) => (
                <div key={i} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                }}>
                  <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 4 }}>
                    {f.fact}
                    <ConfidenceBadge level={f.confidence} />
                  </div>
                  {f.source_hint && (
                    <div style={{ fontSize: 10, color: C.muted }}>Source: {f.source_hint}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Closing prompt */}
          {data.closing_prompt && (
            <div style={{
              background: "#0d060f", border: `1px solid ${C.pink}22`,
              borderRadius: 12, padding: "16px 18px",
            }}>
              <div style={{ fontSize: 14, color: C.pink, fontStyle: "italic", lineHeight: 1.6 }}>
                {data.closing_prompt}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio tab */}
      {tab === "audio" && (
        <AudioPanel data={data} sessionId={sessionId} />
      )}

      {/* Video tab */}
      {tab === "video" && (
        <VideoPanel data={data} sessionId={sessionId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AUDIO PANEL
// Audio narration: sends bridge text to TTS endpoint.
// Replace /generate-audio with your actual Cloud Run TTS route.
// ─────────────────────────────────────────────────────────────

function AudioPanel({ data, sessionId }) {
  const [status, setStatus]   = useState("idle"); // idle | loading | ready | error
  const [audioUrl, setAudio]  = useState(null);
  const [errMsg, setErrMsg]   = useState(null);

  async function generate() {
    setStatus("loading");
    setErrMsg(null);
    try {
      // Narration script = headline + the_other_side + closing_prompt
      const script = [data.headline, data.the_other_side, data.closing_prompt]
        .filter(Boolean).join("\n\n");

      const res = await fetch(`${API_BASE}/generate-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text:       script,
          angle:      data.angle,
          session_id: sessionId,
        }),
      });

      if (!res.ok) throw new Error(`Audio generation failed: ${res.status}`);
      const blob = await res.blob();
      setAudio(URL.createObjectURL(blob));
      setStatus("ready");
    } catch (e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }

  return (
    <div style={{
      background: "#06080f", border: `1.5px solid ${C.blue}33`,
      borderRadius: 14, padding: "24px", textAlign: "center",
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎙</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 6 }}>
        Audio Narration
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
        Adaptive voice — tone, pace, and pitch shift with the topic and lens.
      </div>

      {status === "idle" && (
        <button onClick={generate} style={{
          padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: C.blue, border: "none", color: "#07070e", cursor: "pointer",
        }}>Generate narration</button>
      )}

      {status === "loading" && <Spinner label="Generating narration…" />}

      {status === "ready" && audioUrl && (
        <div>
          <audio controls style={{ width: "100%", marginBottom: 12 }} src={audioUrl} />
          <div style={{ fontSize: 11, color: C.muted }}>
            {data.closing_prompt}
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{ fontSize: 12, color: C.red }}>{errMsg}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VIDEO PANEL
// Generated video: sends bridge content to video generation endpoint.
// Replace /generate-video with your actual Cloud Run + Imagen 3 route.
// ─────────────────────────────────────────────────────────────

function VideoPanel({ data, sessionId }) {
  const [status,   setStatus]   = useState("idle"); // idle | loading | ready | error
  const [videoUrl, setVideo]    = useState(null);
  const [errMsg,   setErrMsg]   = useState(null);

  async function generate() {
    setStatus("loading");
    setErrMsg(null);
    try {
      const res = await fetch(`${API_BASE}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline:       data.headline,
          the_other_side: data.the_other_side,
          facts:          data.facts,
          closing_prompt: data.closing_prompt,
          angle:          data.angle,
          angle_label:    data.angle_label,
          session_id:     sessionId,
        }),
      });

      if (!res.ok) throw new Error(`Video generation failed: ${res.status}`);
      const json = await res.json();
      setVideo(json.video_url);
      setStatus("ready");
    } catch (e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }

  return (
    <div style={{
      background: "#060f08", border: `1.5px solid ${C.green}33`,
      borderRadius: 14, padding: "24px", textAlign: "center",
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 6 }}>
        Generated Video
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
        Imagen 3 visuals · TTS voiceover · assembled on Cloud Run.
      </div>

      {status === "idle" && (
        <button onClick={generate} style={{
          padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: C.green, border: "none", color: "#07070e", cursor: "pointer",
        }}>Generate video</button>
      )}

      {status === "loading" && <Spinner label="Generating video — this takes ~30 seconds…" />}

      {status === "ready" && videoUrl && (
        <div>
          <video controls style={{ width: "100%", borderRadius: 10, marginBottom: 12 }} src={videoUrl} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <a href={videoUrl} download style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 11,
              border: `1px solid ${C.green}44`, color: C.green,
              textDecoration: "none", background: `${C.green}18`,
            }}>⬇ Download</a>
            <button onClick={() => navigator.clipboard.writeText(videoUrl)} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 11,
              border: `1px solid ${C.border}`, color: C.muted,
              background: C.surface, cursor: "pointer",
            }}>🔗 Copy link</button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{ fontSize: 12, color: C.red }}>{errMsg}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FEEDBACK PANEL
// ─────────────────────────────────────────────────────────────

function FeedbackPanel({ sessionId }) {
  const [perspNew,  setPerspNew]  = useState(null);
  const [fairness,  setFairness]  = useState(null);
  const [quality,   setQuality]   = useState(null);
  const [shifted,   setShifted]   = useState("");
  const [done,      setDone]      = useState(false);
  const [submitting,setSubmitting]= useState(false);

  async function submit() {
    if (fairness === null || quality === null) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:      sessionId,
          perspective_new: perspNew ?? false,
          fairness_score:  fairness,
          quality_score:   quality,
          what_shifted:    shifted || null,
        }),
      });
    } catch (_) {}
    setDone(true);
  }

  if (done) return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "20px", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
      <div style={{ fontSize: 13, color: C.green }}>Feedback received.</div>
    </div>
  );

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "20px",
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
        Your reflection
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Was this a new perspective for you?</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["true","Yes, new to me"],["false","Already knew this"]].map(([val, label]) => (
          <button key={val} onClick={() => setPerspNew(val === "true")} style={{
            flex: 1, padding: "8px", borderRadius: 8, fontSize: 12,
            border: `1px solid ${perspNew === (val === "true") ? C.purple : C.border}`,
            background: perspNew === (val === "true") ? `${C.purple}18` : C.bg,
            color: perspNew === (val === "true") ? C.purple : C.muted,
            cursor: "pointer", fontWeight: perspNew === (val === "true") ? 700 : 400,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>How fair did the other side feel?</div>
      <div style={{ marginBottom: 16 }}><Stars value={fairness} onChange={setFairness} /></div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Output quality?</div>
      <div style={{ marginBottom: 16 }}><Stars value={quality} onChange={setQuality} /></div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>What shifted for you? (optional)</div>
      <textarea
        value={shifted}
        onChange={e => setShifted(e.target.value)}
        placeholder="Anything feel different?"
        style={{
          width: "100%", background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.text, fontSize: 12, padding: "10px 12px",
          resize: "none", outline: "none", fontFamily: "inherit",
          lineHeight: 1.5, minHeight: 60, marginBottom: 12,
        }}
      />

      <button
        onClick={submit}
        disabled={!fairness || !quality || submitting}
        style={{
          width: "100%", padding: "10px", borderRadius: 10,
          fontSize: 12, fontWeight: 600,
          border: `1px solid ${C.border}`,
          background: (!fairness || !quality) ? C.bg : `${C.purple}18`,
          color: (!fairness || !quality) ? C.muted : C.purple,
          cursor: (!fairness || !quality) ? "not-allowed" : "pointer",
          transition: "all .15s",
        }}
      >
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RESULT VIEW
// ─────────────────────────────────────────────────────────────

function ResultView({ raw, sessionId, angle, onReset }) {
  const data = parseResult(raw);
  const cfg  = ANGLES.find(a => a.id === angle) ?? ANGLES[0];

  if (!data) {
    return (
      <div>
        <div style={{
          background: "#120808", border: `1px solid ${C.red}33`,
          borderRadius: 12, padding: "16px", color: C.red, fontSize: 13, marginBottom: 16,
        }}>
          Something went wrong parsing the response. Raw output below.
        </div>
        <pre style={{ fontSize: 11, color: C.muted, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {typeof raw === "string" ? raw : JSON.stringify(raw, null, 2)}
        </pre>
        <button onClick={onReset} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 12 }}>
          ← Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: C.purple, fontWeight: 700 }}>
          {data.angle_label ?? cfg.label}
        </div>
        <button onClick={onReset} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
          color: C.muted, fontSize: 11, padding: "5px 10px", cursor: "pointer",
        }}>← New situation</button>
      </div>

      {/* Output tabs */}
      <div style={{ marginBottom: 24 }}>
        <OutputTabs data={data} sessionId={sessionId} />
      </div>

      {/* Feedback */}
      <FeedbackPanel sessionId={sessionId} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INPUT VIEW
// ─────────────────────────────────────────────────────────────

function InputView({ onResult }) {
  const [angle,     setAngle]     = useState("empathy");
  const [text,      setText]      = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const fileRef = useRef();

  async function handleFlip() {
    if (!text.trim() && !mediaFile) return;
    setLoading(true);
    setError(null);

    const sessionId = uuid();

    try {
      let situation = text.trim();

      if (mediaFile) {
        const fd = new FormData();
        fd.append("file", mediaFile);
        const upRes = await fetch(`${API_BASE}/upload-media`, { method: "POST", body: fd });
        if (!upRes.ok) throw new Error(`Upload failed: ${upRes.status}`);
        const up = await upRes.json();
        situation = situation
          ? `${situation}\n\n[Attached: ${mediaFile.name} — ${up.media_type}]`
          : `[Media: ${mediaFile.name} — ${up.media_type}]`;
      }

      const flipRes = await fetch(`${API_BASE}/flip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, angle, session_id: sessionId }),
      });
      if (!flipRes.ok) throw new Error(`Server error: ${flipRes.status}`);
      const flipData = await flipRes.json();

      if (flipData.declined) {
        onResult({ declined: true, message: flipData.message, sessionId });
        return;
      }

      const adkRes = await fetch(`${API_BASE}${flipData.adk_run_endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flipData.adk_run_payload),
      });
      if (!adkRes.ok) throw new Error(`Agent error: ${adkRes.status}`);
      const adkData = await adkRes.json();

      onResult({ declined: false, raw: adkData, sessionId, angle });
    } catch (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canFlip = (text.trim().length > 0 || !!mediaFile) && !loading;

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>◐</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
          See the other side.
        </div>
        <div style={{ fontSize: 14, color: C.muted, maxWidth: 420, margin: "0 auto", lineHeight: 1.7 }}>
          Describe any situation — a conflict, a news story, a strong opinion.
          Get a grounded perspective from the other side.
        </div>
      </div>

      {/* Lens selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>
          Choose a lens
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {ANGLES.map(a => (
            <button key={a.id} onClick={() => setAngle(a.id)} style={{
              padding: "8px 14px", borderRadius: 10, fontSize: 12,
              fontWeight: a.id === angle ? 700 : 400,
              border: `1.5px solid ${a.id === angle ? C.purple : C.border}`,
              background: a.id === angle ? `${C.purple}14` : C.surface,
              color: a.id === angle ? C.purple : C.muted,
              cursor: "pointer", transition: "all .15s",
            }}>{a.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>
          {ANGLES.find(a => a.id === angle)?.desc}
        </div>
      </div>

      {/* Input */}
      {error && (
        <div style={{ background: "#120808", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "12px 16px", color: C.red, fontSize: 12, marginBottom: 14 }}>
          {error}
        </div>
      )}
      <div style={{
        background: C.surface, border: `1.5px solid ${C.border}`,
        borderRadius: 14, overflow: "hidden", marginBottom: 10,
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleFlip(); }}
          placeholder={
            "Describe the situation, paste a URL, or attach a file…\n\n" +
            "e.g. 'My neighbour keeps parking in front of my house and it's infuriating.' " +
            "or paste a news article URL."
          }
          style={{
            width: "100%", background: "transparent", border: "none",
            color: C.text, fontSize: 14, padding: "16px 18px",
            resize: "none", outline: "none", fontFamily: "inherit",
            lineHeight: 1.6, minHeight: 110,
          }}
        />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 11, color: C.muted }}>⌘↵ to flip</div>
          <button
            onClick={handleFlip}
            disabled={!canFlip}
            style={{
              padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: "none", cursor: canFlip ? "pointer" : "not-allowed",
              background: canFlip ? C.purple : C.border,
              color: canFlip ? "#07070e" : C.muted,
              transition: "all .15s",
            }}
          >◐ Show me the other side</button>
        </div>
      </div>

      {/* Attach / URL */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" onChange={e => setMediaFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
        <button onClick={() => fileRef.current.click()} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer" }}>
          📎 Attach image / video / audio
        </button>
        <button onClick={() => setText(t => t + (t ? "\n" : "") + "URL: ")} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer" }}>
          🔗 Add URL
        </button>
      </div>

      {mediaFile && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", fontSize: 12, color: C.dim }}>
          <span>{mediaFile.type.startsWith("image") ? "🖼" : mediaFile.type.startsWith("video") ? "🎬" : "🔊"}</span>
          <span>{mediaFile.name}</span>
          <span style={{ fontSize: 10, color: C.muted }}>({(mediaFile.size/1024/1024).toFixed(1)} MB)</span>
          <button onClick={() => setMediaFile(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* How it works */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginTop: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 14 }}>
          How it works
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10 }}>
          {[
            ["◐",  "Submit any situation — text, image, video, audio, or URL."],
            ["🔍", "Grounded in publicly verifiable facts. Nothing fabricated."],
            ["🌉", "The other side. Human, not robotic. Adapted to your lens."],
            ["💬", "A closing question. Not a verdict. Just a different angle."],
          ].map(([icon, txt]) => (
            <div key={icon} style={{ background: C.surface, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{txt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DECLINED VIEW
// ─────────────────────────────────────────────────────────────

function DeclinedView({ message, onReset }) {
  return (
    <div style={{ background: "#120808", border: `1.5px solid ${C.red}33`, borderRadius: 14, padding: "28px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>◐</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.red, marginBottom: 10 }}>Outside our range</div>
      <div style={{ fontSize: 13, color: "#8a5050", lineHeight: 1.7, marginBottom: 20 }}>{message}</div>
      <button onClick={onReset} style={{
        padding: "9px 20px", borderRadius: 10, fontSize: 12,
        background: C.surface, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer",
      }}>← Try a different situation</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [view,      setView]      = useState("input");
  const [raw,       setRaw]       = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [angle,     setAngle]     = useState("empathy");
  const [declined,  setDeclined]  = useState(null);

  function handleResult({ declined, message, raw, sessionId, angle }) {
    if (declined) {
      setDeclined(message);
      setView("declined");
    } else {
      setRaw(raw);
      setSessionId(sessionId);
      setAngle(angle);
      setView("result");
    }
  }

  function reset() {
    setView("input");
    setRaw(null);
    setSessionId(null);
    setDeclined(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.6 }}>
      <style>{CSS}</style>

      {/* Header */}
      <header style={{
        padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
        background: `${C.bg}f8`, backdropFilter: "blur(12px)",
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, background: `linear-gradient(120deg,${C.text},${C.purple})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ◐ The Other Side
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          Because clarity starts where your comfort zone ends.
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        {view === "input"    && <InputView   onResult={handleResult} />}
        {view === "result"   && <ResultView  raw={raw} sessionId={sessionId} angle={angle} onReset={reset} />}
        {view === "declined" && <DeclinedView message={declined} onReset={reset} />}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "24px 0", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
        No personal data collected · Input discarded after processing · Not used for training
      </footer>
    </div>
  );
}
