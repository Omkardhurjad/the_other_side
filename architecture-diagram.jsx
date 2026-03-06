import { useState } from "react";

const NODES = {
  web:       { title:"Web App", color:"#60a5fa", body:"Primary surface. React. All inputs, all outputs. Audio-first mode and high contrast available.", tags:["React","Web Speech API","Canvas API","Web Share API"] },
  mobile:    { title:"Mobile App", color:"#60a5fa", body:"React Native. Voice-first on mobile. Push notifications when video finishes.", tags:["React Native","Gemini Live","Push notifications"] },
  ext:       { title:"Chrome Extension", color:"#60a5fa", body:"Right-click any image on any webpage → Flip this. Manifest V3 service worker, popup renders full storyboard.", tags:["Manifest V3","Service Worker","Context Menu API"] },
  inpage:    { title:"In-Page Video Pointer ★", color:"#f0c96a", body:"Point at any video on any webpage. No copy-paste. The feature that makes this a daily habit.", tags:["Content Script","Video element detection","Chrome context menu"] },
  fastapi:   { title:"FastAPI Server", color:"#fb923c", body:"Wraps ADK via get_fast_api_app(). Routes: /run, /run_sse, /upload-media, /health, /angles.", tags:["FastAPI","get_fast_api_app()","uvicorn","CORS"] },
  text:      { title:"Text Input", color:"#a78bfa", body:"Free-form typed situation. No structure required.", tags:["Natural language"] },
  voice:     { title:"Voice Input", color:"#a78bfa", body:"Real-time voice via Gemini Live API. Transcribed identically to text.", tags:["Gemini Live API","Real-time transcription"] },
  image:     { title:"Image Input", color:"#a78bfa", body:"JPEG/PNG/WebP. Max 10MB. MIME validated. Base64 in memory. Discarded after processing.", tags:["Gemini Vision","MIME allowlist","10MB cap","Ephemeral"] },
  video:     { title:"Video Input", color:"#a78bfa", body:"MP4/WebM. Upload or point at with Chrome Extension. Audio + visual frames analysed.", tags:["Gemini multimodal","Video extraction"] },
  audio:     { title:"Audio Input", color:"#a78bfa", body:"MP3/WAV/OGG. Podcast clips, recorded speech, news audio.", tags:["Gemini audio","Audio transcription"] },
  url:       { title:"URL / Article", color:"#a78bfa", body:"Paste any URL. Fetches and extracts main content. News, YouTube, podcasts.", tags:["Web fetch","Content extraction"] },
  guard1:    { title:"Layer 1 — Content Scan", color:"#f87171", body:"Automated scan before ANY processing begins. Flagged = warm decline, zero output.", tags:["Vertex AI Content Safety","Gemini Safety Filters","Hard stop"] },
  guard2:    { title:"Layer 2 — Intent Check", color:"#f87171", body:"Is the goal genuine perspective-seeking — or wrapping harmful output in a 'perspective' label?", tags:["Intent classification","ADK system instruction"] },
  clear:     { title:"All Clear ✓", color:"#4ade80", body:"Both layers passed. Toxicity logged. Agent proceeds to 4-tool pipeline.", tags:["Proceed to agent","Toxicity logged"] },
  decline:   { title:"Warm Decline", color:"#f87171", body:"Zero output. Warm explanation: 'This one's outside what I can help with — not because the topic is off-limits, but because...'", tags:["Zero output","Human tone","No partial output"] },
  tool1:     { title:"① describe_perspective()", color:"#818cf8", body:"Step 1. Packages lens-specific prompt. Returns 2-3 sentence honest summary of submitter's view through chosen lens.", tags:["FunctionTool","ANGLES config dict","Lens-specific prompt"] },
  tool2:     { title:"② build_bridge()", color:"#818cf8", body:"Step 2. Grounded bridge. Rule enforced: 'Every fact MUST be publicly verifiable. If not — don't include it.' Returns headline, bridge, facts[], callToReflect.", tags:["FunctionTool","Search Grounding","Source citations","No invented facts"] },
  tool3:     { title:"③ build_poem_storyboard()", color:"#818cf8", body:"Step 3. 5-stanza poem as structured JSON. Per-lens tone brief (a person to inhabit, not rules). Scene arc per lens.", tags:["FunctionTool","Per-lens tone brief","5×4 lines JSON"] },
  tool4:     { title:"④ validate_poem_json()", color:"#818cf8", body:"QA gate. Strips fences. Checks 5 frames with sceneLabel + emoji + 4 lines. Retry once. Hard stop on 2nd failure.", tags:["FunctionTool","Schema enforcement","Hard stop"] },
  outtext:   { title:"The Bridge", color:"#f0c96a", body:"Punchy headline. 2-3 grounded sentences. 3 verified facts with source links and confidence levels (high/moderate/uncertain).", tags:["Search Grounding","Source links","Confidence levels"] },
  outaudio:  { title:"Audio Narration", color:"#60a5fa", body:"Tone, pace, pitch adapt to emotional weight AND lens personality. Devil's Advocate is smug. Empathy Mirror is unhurried.", tags:["Google TTS","Adaptive voice","Per-lens personality","Gemini Live"] },
  outvideo:  { title:"Generated Video", color:"#34d399", body:"5 scenes. Imagen 3 visuals per stanza. TTS voiceover. Assembled on Cloud Run. Stored in Cloud Storage.", tags:["Imagen 3","Google TTS","Cloud Run assembly","Cloud Storage"] },
  closing:   { title:"Conversational Closing Prompt", color:"#e879f9", body:"The most important 10 words in the product. Lens-specific. Not a survey question. The pause that makes this therapy, not content.", tags:["Lens-specific","Reflection-first","Not gamified"] },
  feedback:  { title:"Mandatory Feedback", color:"#6ee7b7", body:"Minimal but mandatory. Auto-triggers when audio/video ends. Text gets 10s delay. Was this new? Fairness 1-5. Quality 1-5. What shifted?", tags:["Format-aware timing","Firestore","Shift score","Minimal friction"] },
  cloudrun:  { title:"Cloud Run", color:"#fb923c", body:"Auto-scales 0→20. Non-root Docker. Multi-stage build. HEALTHCHECK. CI/CD via Cloud Build.", tags:["Auto-scale","Non-root Docker","multi-stage","HEALTHCHECK"] },
  vertex:    { title:"Vertex AI", color:"#fb923c", body:"Gemini 2.5 Flash for agent. Imagen 3 for scene visuals. Google TTS for narration. Content Safety API for Layer 1 guardrail.", tags:["Gemini 2.5 Flash","Imagen 3","Google TTS","Content Safety"] },
  armor:     { title:"Cloud Armor + Secrets", color:"#fb923c", body:"WAF for DDoS. Secret Manager for API keys (never in env vars). reCAPTCHA Enterprise at volume thresholds.", tags:["Cloud Armor WAF","Secret Manager","reCAPTCHA"] },
  storage:   { title:"Cloud SQL + Storage", color:"#fb923c", body:"PostgreSQL for anonymous ADK sessions. Cloud Storage for video assets and shareable links.", tags:["Cloud SQL","Cloud Storage","Anonymous sessions"] },
  antimisuse:{ title:"Anti-Misuse Layer", color:"#f87171", body:"Rate limiting per session. Bulk generation pattern detection. CAPTCHA at threshold. API auth + usage caps.", tags:["Rate limiting","Bulk detect","CAPTCHA","API caps"] },
  bq:        { title:"BigQuery", color:"#6ee7b7", body:"Session logs: topic, lens, toxicity 0-10, guardrail triggered, quality score, shift score, geo (country + state only). No identity.", tags:["Anonymised","No identity","No input content"] },
  firestore: { title:"Firestore", color:"#6ee7b7", body:"User feedback: was_new, fairness 1-5, quality 1-5, what_shifted (optional free text). Real-time writes. No user identity.", tags:["Real-time","No identity","Shift score source"] },
  looker:    { title:"Looker Studio", color:"#6ee7b7", body:"Internal team dashboard only. Shifts over time, lens usage, guardrail patterns, geo, quality trends.", tags:["Internal only","Team dashboard","No public data"] },
  never:     { title:"Never Collected", color:"#f87171", body:"Input content discarded. No user identity, no IP, no device fingerprint, no city geo, no training use. Ever.", tags:["Input discarded","No identity","No IP","No training use"] },
};

const Node = ({ id, emoji, title, sub, onClick, active, color, w = 160, children }) => (
  <div
    onClick={() => onClick(id)}
    style={{
      width: w, minHeight: 80, background: active ? `${color}12` : "#0d0d1e",
      border: `1.5px solid ${active ? color : color + "55"}`,
      borderRadius: 12, padding: "10px 12px", cursor: "pointer",
      position: "relative", overflow: "hidden", transition: "all .2s",
      boxShadow: active ? `0 0 20px ${color}30` : "none", flexShrink: 0,
    }}
  >
    <div style={{ height: 3, background: color, position: "absolute", top: 0, left: 0, right: 0, borderRadius: "12px 12px 0 0" }} />
    <div style={{ fontSize: 18, marginBottom: 4, marginTop: 2 }}>{emoji}</div>
    <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 12, color: "#eeeaf8", marginBottom: 3 }}>{title}</div>
    {sub && <div style={{ fontSize: 9, color: color, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{sub}</div>}
    {children && <div style={{ fontSize: 9, color: "#52506a", lineHeight: 1.5 }}>{children}</div>}
  </div>
);

const Arrow = ({ color = "#52506a", label, dir = "down", len = 28 }) => {
  if (dir === "right") return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0, position: "relative" }}>
      <svg width={len + 14} height={20}>
        <line x1={0} y1={10} x2={len} y2={10} stroke={color} strokeWidth={2} strokeDasharray="4,2"/>
        <polygon points={`${len},6 ${len+10},10 ${len},14`} fill={color}/>
      </svg>
      {label && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 8, color, whiteSpace: "nowrap" }}>{label}</div>}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <svg width={20} height={len + 12}>
        <line x1={10} y1={0} x2={10} y2={len} stroke={color} strokeWidth={2} strokeDasharray="4,2"/>
        <polygon points={`6,${len} 10,${len+10} 14,${len}`} fill={color}/>
      </svg>
      {label && <div style={{ position: "absolute", left: 14, top: "30%", fontSize: 8, color, whiteSpace: "nowrap" }}>{label}</div>}
    </div>
  );
};

const Lane = ({ label, color, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: color + "66", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
      {label}
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}33, transparent)` }} />
    </div>
    {children}
  </div>
);

const Tag = ({ children, color }) => (
  <span style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 8, padding: "2px 8px", fontSize: 9, marginRight: 4, marginBottom: 4, display: "inline-block" }}>{children}</span>
);

export default function App() {
  const [active, setActive] = useState(null);
  const toggle = (id) => setActive(active === id ? null : id);
  const info = active ? NODES[active] : null;

  return (
    <div style={{ background: "#07070e", minHeight: "100vh", color: "#eeeaf8", fontFamily: "monospace", padding: 24, overflowX: "auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 18, background: "linear-gradient(120deg,#eeeaf8,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ◐ The Other Side — End-to-End Architecture
        </div>
        <div style={{ fontSize: 10, color: "#52506a" }}>Click any node for details</div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        {[["#60a5fa","User"],["#a78bfa","Input"],["#f87171","Guardrails"],["#c084fc","ADK Agent"],["#818cf8","Tools"],["#34d399","Output"],["#fb923c","Infra"],["#6ee7b7","Data"]].map(([c,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#52506a" }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}
          </div>
        ))}
      </div>

      {/* ── ROW 1: USER SURFACES ── */}
      <Lane label="① User Surfaces" color="#60a5fa">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Node id="web"    emoji="🌐" title="Web App"               sub="React · Full experience"  color="#60a5fa" onClick={toggle} active={active==="web"}>All inputs · All outputs</Node>
          <Node id="mobile" emoji="📱" title="Mobile App"            sub="React Native · Voice-first" color="#60a5fa" onClick={toggle} active={active==="mobile"}>On-the-go · Push alerts</Node>
          <Node id="ext"    emoji="🧩" title="Chrome Extension"      sub="Manifest V3 · Any page"  color="#60a5fa" onClick={toggle} active={active==="ext"}>Right-click any image</Node>
          <Node id="inpage" emoji="🎯" title="In-Page Video Pointer" sub="★ The killer feature"     color="#f0c96a" onClick={toggle} active={active==="inpage"} w={190}>Point at any video on any page</Node>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <Arrow dir="right" color="#60a5fa" label="HTTP requests" len={40}/>
            <Node id="fastapi" emoji="⚡" title="FastAPI Server" sub="get_fast_api_app()" color="#fb923c" onClick={toggle} active={active==="fastapi"}>/run · /upload-media · /health</Node>
          </div>
        </div>
      </Lane>

      <Arrow color="#60a5fa" label="routes to input handlers"/>

      {/* ── ROW 2: INPUT ── */}
      <Lane label="② Input Layer — any format a human uses to form an opinion" color="#a78bfa">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[["text","✍️","Text","Free-form typed"],["voice","🎙","Voice","Gemini Live API"],["image","🖼","Image","JPEG PNG WebP 10MB"],["video","🎬","Video","MP4 · WebM"],["audio","🔊","Audio","MP3 WAV OGG"],["url","🔗","URL / Article","News · YouTube · Podcast"]].map(([id,em,ti,su]) => (
            <Node key={id} id={id} emoji={em} title={ti} color="#a78bfa" onClick={toggle} active={active===id} w={148}>{su}</Node>
          ))}
        </div>
      </Lane>

      <Arrow color="#f87171" label="all inputs pass through guardrails first"/>

      {/* ── ROW 3: GUARDRAILS ── */}
      <Lane label="③ Guardrails — two layers before any generation begins" color="#f87171">
        <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <Node id="guard1" emoji="🛡" title="Layer 1 — Content Scan" sub="Before ANY processing" color="#f87171" onClick={toggle} active={active==="guard1"} w={250}>
            CSAM · hate speech · porn · targeted harm<br/>Vertex AI Content Safety + Gemini filters
          </Node>
          <Arrow dir="right" color="#f87171" label="pass ▶" len={32}/>
          <Node id="guard2" emoji="🔍" title="Layer 2 — Intent Check" sub="After understanding input" color="#f87171" onClick={toggle} active={active==="guard2"} w={250}>
            Genuine perspective-seeking?<br/>Or harm wrapped in "perspective"?
          </Node>
          <Arrow dir="right" color="#4ade80" label="pass ▶" len={32}/>
          <Node id="clear" emoji="✓" title="All Clear" sub="Proceed to agent" color="#4ade80" onClick={toggle} active={active==="clear"} w={130}>
            Both layers passed.<br/>Generation begins.
          </Node>
          <div style={{ marginLeft: "auto" }}>
            <Node id="decline" emoji="🚫" title="Warm Decline" sub="On any flag — zero output" color="#f87171" onClick={toggle} active={active==="decline"} w={190}>
              Explains why. Warmly. No partial output.
            </Node>
            <div style={{ fontSize: 8, color: "#f8717166", marginTop: 4, fontStyle: "italic" }}>← triggered by either layer</div>
          </div>
        </div>
      </Lane>

      <Arrow color="#4ade80" label="validated input reaches agent"/>

      {/* ── ROW 4: ADK AGENT ── */}
      <Lane label="④ Google ADK Agent — LlmAgent · Gemini 2.5 Flash · google-adk ≥ 1.0" color="#c084fc">
        <div style={{ background: "#0b0718", border: "1.5px solid #c084fc44", borderRadius: 14, padding: "16px 16px 12px", position: "relative" }}>
          <div style={{ position: "absolute", top: 10, right: 16, fontSize: 9, color: "#c084fc33", fontFamily: "monospace" }}>Cloud Run · FastAPI</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Node id="tool1" emoji="" title="① describe_perspective()" sub="Step 1 · FunctionTool" color="#818cf8" onClick={toggle} active={active==="tool1"} w={210}>
              Packages lens-specific prompt<br/>Returns 2-3 sentence original view
            </Node>
            <Arrow dir="right" color="#818cf8" len={20}/>
            <Node id="tool2" emoji="" title="② build_bridge()" sub="Step 2 · FunctionTool" color="#818cf8" onClick={toggle} active={active==="tool2"} w={210}>
              Grounded headline + verified facts<br/>Source links + confidence levels
            </Node>
            <Arrow dir="right" color="#818cf8" len={20}/>
            <Node id="tool3" emoji="" title="③ build_poem_storyboard()" sub="Step 3 · FunctionTool" color="#818cf8" onClick={toggle} active={active==="tool3"} w={210}>
              5-stanza poem as JSON<br/>Per-lens tone brief · scene arc
            </Node>
            <Arrow dir="right" color="#818cf8" len={20}/>
            <Node id="tool4" emoji="" title="④ validate_poem_json()" sub="QA Gate · FunctionTool" color="#818cf8" onClick={toggle} active={active==="tool4"} w={185}>
              Schema enforcement<br/>Retry once · Hard stop on 2nd fail
            </Node>
          </div>
        </div>
      </Lane>

      <Arrow color="#c084fc" label="validated JSON output"/>

      {/* ── ROW 5: OUTPUT ── */}
      <Lane label="⑤ Output — three formats, one experience" color="#34d399">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Node id="outtext"  emoji="🌉" title="The Bridge"        sub="Text · Grounded"         color="#f0c96a" onClick={toggle} active={active==="outtext"}  w={290}>
            Punchy headline · Verified facts<br/>Source links · high/moderate/uncertain<br/>Lens-specific closing prompt
          </Node>
          <Node id="outaudio" emoji="🎙" title="Audio Narration"   sub="Audio · Adaptive"        color="#60a5fa" onClick={toggle} active={active==="outaudio"} w={290}>
            Tone · pace · pitch all adaptive<br/>Matches emotional weight + lens<br/>Per-lens voice personality
          </Node>
          <Node id="outvideo" emoji="🎬" title="Generated Video"   sub="Video · Fully Generated" color="#34d399" onClick={toggle} active={active==="outvideo"} w={310}>
            5 scenes · Imagen 3 visuals<br/>TTS voiceover assembled on Cloud Run<br/>Stored in Cloud Storage · shareable link
          </Node>
        </div>
      </Lane>

      <Arrow color="#e879f9" label="output delivered → reflection begins"/>

      {/* ── ROW 6: CLOSING + FEEDBACK ── */}
      <Lane label="⑥ Reflection + Mandatory Feedback" color="#e879f9">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Node id="closing" emoji="💬" title="Conversational Closing Prompt" sub="Lens-specific · Not a survey" color="#e879f9" onClick={toggle} active={active==="closing"} w={380}>
            🪞 "Anything feel different?"  ⚖️ "Still sure only one of you is right?"<br/>
            🔄 "Uncomfortable? Good."  😈 "Can't unsee it now, can you?"
          </Node>
          <Arrow dir="right" color="#e879f9" len={24}/>
          <Node id="feedback" emoji="⭐" title="Mandatory Feedback" sub="Format-aware timing" color="#6ee7b7" onClick={toggle} active={active==="feedback"} w={380}>
            📄 Text/Image → inline after 10s delay<br/>
            🎙 Audio → auto-triggers when narration ends<br/>
            🎬 Video → auto-triggers when video ends
          </Node>
        </div>
      </Lane>

      <Arrow color="#fb923c" label="session logged to infra"/>

      {/* ── ROW 7: INFRA ── */}
      <Lane label="⑦ Google Cloud Infrastructure" color="#fb923c">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Node id="cloudrun"   emoji="☁️" title="Cloud Run"          sub="Auto-scale 0→20"      color="#fb923c" onClick={toggle} active={active==="cloudrun"}   w={185}>Non-root Docker · multi-stage · HEALTHCHECK</Node>
          <Node id="vertex"     emoji="🧠" title="Vertex AI"           sub="Models + Safety"     color="#fb923c" onClick={toggle} active={active==="vertex"}     w={185}>Gemini 2.5 Flash · Imagen 3 · TTS · Content Safety</Node>
          <Node id="armor"      emoji="🛡" title="Cloud Armor + Secrets" sub="Security"           color="#fb923c" onClick={toggle} active={active==="armor"}      w={185}>WAF · DDoS · Secret Manager · reCAPTCHA</Node>
          <Node id="storage"    emoji="🗄" title="Cloud SQL + Storage" sub="Persistence"          color="#fb923c" onClick={toggle} active={active==="storage"}    w={185}>PostgreSQL (anon sessions) · Cloud Storage (videos)</Node>
          <Node id="antimisuse" emoji="🔒" title="Anti-Misuse"         sub="Rate limit · Detect"  color="#f87171" onClick={toggle} active={active==="antimisuse"} w={185}>Rate limit · Bulk detect · CAPTCHA · API caps</Node>
        </div>
      </Lane>

      <Arrow color="#6ee7b7" label="anonymised session data flows to data layer"/>

      {/* ── ROW 8: DATA ── */}
      <Lane label="⑧ Data Layer — anonymised · no personal data · internal only" color="#6ee7b7">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Node id="bq"       emoji="📊" title="BigQuery"       sub="Session logs"     color="#6ee7b7" onClick={toggle} active={active==="bq"}       w={220}>Topic · lens · toxicity 0-10 · shift score · geo (country+state only)</Node>
          <Node id="firestore" emoji="⚡" title="Firestore"     sub="User feedback"    color="#6ee7b7" onClick={toggle} active={active==="firestore"} w={220}>was_new · fairness 1-5 · quality 1-5 · what_shifted (optional)</Node>
          <Node id="looker"   emoji="📈" title="Looker Studio"  sub="Internal dashboard" color="#6ee7b7" onClick={toggle} active={active==="looker"}   w={220}>Team only · shifts · lens usage · guardrail patterns · quality trends</Node>
          <Node id="never"    emoji="🚫" title="Never Collected" sub="Privacy guarantee" color="#f87171" onClick={toggle} active={active==="never"}    w={220}>No input content · no identity · no IP · no city geo · no training use</Node>
        </div>
      </Lane>

      {/* ── DETAIL PANEL ── */}
      {info && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#13131f", border: `1.5px solid ${info.color}55`,
          borderRadius: 16, padding: "16px 24px", maxWidth: 520, width: "90%",
          boxShadow: `0 8px 40px ${info.color}22, 0 0 0 1px ${info.color}22`,
          zIndex: 100,
        }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 15, color: info.color, marginBottom: 6 }}>{info.title}</div>
          <div style={{ fontSize: 12, color: "#7a7894", lineHeight: 1.7, marginBottom: 10 }}>{info.body}</div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {info.tags.map(t => <Tag key={t} color={info.color}>{t}</Tag>)}
          </div>
          <div style={{ position: "absolute", top: 10, right: 14, fontSize: 10, color: "#52506a", cursor: "pointer" }} onClick={() => setActive(null)}>✕ close</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: "center", fontSize: 9, color: "#52506a33", letterSpacing: "0.2em" }}>
        ◐ THE OTHER SIDE — BECAUSE CLARITY STARTS WHERE YOUR COMFORT ZONE ENDS
      </div>
    </div>
  );
}
