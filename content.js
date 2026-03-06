/**
 * The Other Side — Chrome Extension
 * content.js — Content Script
 *
 * - In-page video pointer overlay
 * - Inline result panel showing The Bridge (headline + the_other_side + facts + closing)
 */

(function () {
  "use strict";

  // ── IN-PAGE VIDEO POINTER ──────────────────────────────────

  let overlay     = null;
  let targetVideo = null;

  function createOverlay() {
    const div = document.createElement("div");
    div.id = "__tos_overlay__";
    div.innerHTML = `<span style="font-size:15px">◐</span><span style="font-size:12px;font-weight:600;margin-left:7px">Flip this perspective</span>`;
    Object.assign(div.style, {
      position: "fixed", display: "none", zIndex: "2147483647",
      background: "linear-gradient(135deg,#1a0a2e,#0e0e1a)",
      border: "1.5px solid #a78bfa", borderRadius: "10px",
      padding: "7px 14px", cursor: "pointer", color: "#eeeaf8",
      fontFamily: "-apple-system,sans-serif", userSelect: "none",
      boxShadow: "0 4px 20px rgba(167,139,250,0.3)",
      backdropFilter: "blur(10px)",
    });
    div.addEventListener("click", () => {
      if (!targetVideo) return;
      const src = targetVideo.src || targetVideo.currentSrc || window.location.href;
      triggerFlip("video_url", src);
    });
    document.body.appendChild(div);
    return div;
  }

  function attachVideoListeners() {
    document.querySelectorAll("video").forEach(video => {
      if (video.dataset.tosAttached) return;
      video.dataset.tosAttached = "true";
      video.addEventListener("mouseenter", () => {
        targetVideo = video;
        if (!overlay) overlay = createOverlay();
        const r = video.getBoundingClientRect();
        overlay.style.top  = `${r.top + 8}px`;
        overlay.style.left = `${r.left + 8}px`;
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
      });
      video.addEventListener("mouseleave", e => {
        if (e.relatedTarget === overlay) return;
        if (overlay) overlay.style.display = "none";
        targetVideo = null;
      });
    });
  }

  const observer = new MutationObserver(attachVideoListeners);
  observer.observe(document.body, { childList: true, subtree: true });
  attachVideoListeners();

  document.addEventListener("mouseover", e => {
    if (overlay && !overlay.contains(e.target) && !e.target.closest("video")) {
      overlay.style.display = "none";
      targetVideo = null;
    }
  });

  // ── TRIGGER FLIP ──────────────────────────────────────────

  function triggerFlip(type, content) {
    if (overlay) overlay.style.display = "none";
    showLoadingToast();
    chrome.runtime.sendMessage(
      { type: "RUN_FLIP", payload: { type, content, angle: "empathy", sessionId: crypto.randomUUID() } },
      response => {
        if (chrome.runtime.lastError) { showErrorToast(chrome.runtime.lastError.message); return; }
        renderInlineResult(response);
      }
    );
  }

  // ── LOADING TOAST ─────────────────────────────────────────

  function showLoadingToast() {
    removeById("__tos_toast__");
    const t = document.createElement("div");
    t.id = "__tos_toast__";
    t.innerHTML = `<span style="font-size:16px">◐</span><span style="margin-left:8px">Looking at the other side…</span>`;
    Object.assign(t.style, {
      position: "fixed", bottom: "24px", right: "24px", zIndex: "2147483647",
      display: "flex", alignItems: "center",
      background: "#13131f", border: "1.5px solid #a78bfa44",
      borderRadius: "12px", padding: "12px 18px",
      color: "#eeeaf8", fontFamily: "-apple-system,sans-serif",
      fontSize: "13px", fontWeight: "600",
      boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
    });
    document.body.appendChild(t);
  }

  // ── INLINE RESULT PANEL ───────────────────────────────────

  function renderInlineResult(response) {
    removeById("__tos_toast__");
    removeById("__tos_panel__");

    if (!response || response.error) { showErrorToast(response?.error || "Something went wrong."); return; }
    if (response.declined) { showDeclinedPanel(response.message); return; }

    // Parse the bridge data from ADK response
    const raw = typeof response.result === "string" ? response.result : JSON.stringify(response.result || {});
    let data = null;
    try {
      const clean = raw.replace(/^```(?:json)?\s*/m,"").replace(/\s*```$/m,"").trim();
      const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
      if (s !== -1 && e !== -1) data = JSON.parse(clean.slice(s, e+1));
    } catch(_) {}

    const headline      = data?.headline      || "";
    const otherSide     = data?.the_other_side || "";
    const facts         = data?.facts         || [];
    const closingPrompt = data?.closing_prompt || "What shifted for you?";
    const angleLabel    = data?.angle_label    || "◐ The Other Side";

    const panel = document.createElement("div");
    panel.id = "__tos_panel__";

    const factsHTML = facts.slice(0,3).map(f => `
      <div style="background:#0d0d1e;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:11px;color:#c4c0d8;line-height:1.5">
        ${f.fact}
        <span style="display:inline-block;font-size:9px;padding:1px 5px;border-radius:4px;margin-left:5px;background:${f.confidence==="high"?"#4ade8018":f.confidence==="uncertain"?"#f8717118":"#f0c96a18"};color:${f.confidence==="high"?"#4ade80":f.confidence==="uncertain"?"#f87171":"#f0c96a"}">${f.confidence||"moderate"}</span>
        ${f.source_hint ? `<div style="font-size:9px;color:#52506a;margin-top:3px">Source: ${f.source_hint}</div>` : ""}
      </div>
    `).join("");

    panel.innerHTML = `
      <div style="
        position:fixed;bottom:24px;right:24px;width:360px;max-height:82vh;
        overflow-y:auto;background:#07070e;border:1.5px solid #a78bfa33;
        border-radius:16px;padding:18px;z-index:2147483647;
        box-shadow:0 8px 40px rgba(0,0,0,0.75);font-family:-apple-system,sans-serif;
        color:#eeeaf8;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:#a78bfa">${angleLabel}</div>
          <button id="__tos_close__" style="background:none;border:none;color:#52506a;cursor:pointer;font-size:16px;padding:0">✕</button>
        </div>

        ${headline ? `
          <div style="background:#0f0e06;border:1px solid #f0c96a33;border-radius:12px;padding:14px 16px;margin-bottom:12px">
            <div style="font-size:14px;font-weight:800;color:#f0c96a;margin-bottom:8px;line-height:1.4">${headline}</div>
            <div style="font-size:12px;color:#9a8850;line-height:1.65">${otherSide}</div>
          </div>
        ` : `<div style="font-size:12px;color:#52506a;margin-bottom:12px">Processing complete — check full result in popup.</div>`}

        ${factsHTML ? `
          <div style="font-size:9px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#52506a;margin-bottom:8px">Grounding facts</div>
          ${factsHTML}
        ` : ""}

        <div style="background:#0d060f;border:1px solid #e879f922;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:#e879f9;font-style:italic;line-height:1.6">
          ${closingPrompt}
        </div>

        <div style="display:flex;gap:8px">
          <button data-fb="true"  style="flex:1;background:#a78bfa18;border:1px solid #a78bfa44;border-radius:8px;color:#a78bfa;padding:8px;cursor:pointer;font-size:11px;font-family:-apple-system,sans-serif">Yes, new to me</button>
          <button data-fb="false" style="flex:1;background:#52506a18;border:1px solid #52506a44;border-radius:8px;color:#52506a;padding:8px;cursor:pointer;font-size:11px;font-family:-apple-system,sans-serif">Already knew this</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector("#__tos_close__").addEventListener("click", () => panel.remove());

    panel.querySelectorAll("[data-fb]").forEach(btn => {
      btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({
          type: "SUBMIT_FEEDBACK",
          payload: {
            session_id:      response.sessionId,
            perspective_new: btn.dataset.fb === "true",
            fairness_score:  4,
            quality_score:   4,
          },
        });
        panel.remove();
      });
    });
  }

  function showDeclinedPanel(message) {
    removeById("__tos_panel__");
    const p = document.createElement("div");
    p.id = "__tos_panel__";
    p.innerHTML = `
      <div style="position:fixed;bottom:24px;right:24px;width:300px;background:#120808;border:1.5px solid #f8717144;border-radius:14px;padding:18px;z-index:2147483647;font-family:-apple-system,sans-serif">
        <div style="font-size:13px;font-weight:700;color:#f87171;margin-bottom:8px">◐ Outside our range</div>
        <div style="font-size:12px;color:#8a5050;line-height:1.6;margin-bottom:12px">${message}</div>
        <button style="background:none;border:1px solid #f8717133;border-radius:8px;color:#f87171;padding:6px 12px;cursor:pointer;font-size:11px;font-family:-apple-system,sans-serif" onclick="this.closest('#__tos_panel__').remove()">Got it</button>
      </div>
    `;
    document.body.appendChild(p);
    setTimeout(() => p?.remove(), 8000);
  }

  function showErrorToast(msg) {
    const t = document.createElement("div");
    Object.assign(t.style, {
      position: "fixed", bottom: "24px", right: "24px", zIndex: "2147483647",
      background: "#120808", border: "1px solid #f8717133", borderRadius: "12px",
      padding: "12px 16px", color: "#f87171",
      fontFamily: "-apple-system,sans-serif", fontSize: "12px",
    });
    t.textContent = `◐ ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }

  function removeById(id) {
    document.getElementById(id)?.remove();
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "FLIP_RESULT") renderInlineResult(msg.payload);
  });
})();
