/**
 * The Other Side — Chrome Extension
 * background.js — Service Worker (Manifest V3)
 */

const API_BASE = "https://your-service-url.run.app"; // ← replace with Cloud Run URL

// ─────────────────────────────────────────────────────────────
// CONTEXT MENUS
// ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "flip-image",     title: "◐ The Other Side — Flip this image",       contexts: ["image"] });
  chrome.contextMenus.create({ id: "flip-video",     title: "◐ The Other Side — Flip this video",       contexts: ["video"] });
  chrome.contextMenus.create({ id: "flip-selection", title: "◐ The Other Side — Flip this perspective", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "flip-link",      title: "◐ The Other Side — Flip this article",     contexts: ["link"] });
  chrome.contextMenus.create({ id: "flip-page",      title: "◐ The Other Side — Flip this page",        contexts: ["page"] });
});

// ─────────────────────────────────────────────────────────────
// CONTEXT MENU CLICK
// ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let type, content;

  switch (info.menuItemId) {
    case "flip-image":     type = "image_url"; content = info.srcUrl;      break;
    case "flip-video":     type = "video_url"; content = info.srcUrl || info.pageUrl; break;
    case "flip-selection": type = "text";      content = info.selectionText; break;
    case "flip-link":      type = "url";       content = info.linkUrl;     break;
    case "flip-page":      type = "url";       content = info.pageUrl;     break;
    default: return;
  }

  const { preferredAngle } = await chrome.storage.local.get(["preferredAngle"]);

  await chrome.storage.local.set({
    pendingFlip: { type, content, angle: preferredAngle || "empathy", sessionId: crypto.randomUUID() },
    flipStatus: "pending",
  });

  await chrome.action.openPopup();
});

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RUN_FLIP") {
    runFlip(message.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === "GET_ANGLES") {
    fetchAngles().then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === "SUBMIT_FEEDBACK") {
    submitFeedback(message.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

// ─────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────

async function runFlip({ type, content, angle, sessionId }) {
  let situation = content;
  if (type === "image_url" || type === "video_url") {
    situation = `[${type.toUpperCase()}] ${content}`;
  }

  // Layer 1 guardrail + route
  const flipRes = await fetch(`${API_BASE}/flip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ situation, angle, session_id: sessionId }),
  });
  if (!flipRes.ok) throw new Error(`API error: ${flipRes.status}`);
  const flipData = await flipRes.json();

  if (flipData.declined) {
    return { declined: true, message: flipData.message, sessionId };
  }

  // Run ADK agent
  const adkRes = await fetch(`${API_BASE}${flipData.adk_run_endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(flipData.adk_run_payload),
  });
  if (!adkRes.ok) throw new Error(`ADK error: ${adkRes.status}`);
  const adkData = await adkRes.json();

  return { declined: false, result: adkData, sessionId };
}

async function fetchAngles() {
  const res = await fetch(`${API_BASE}/angles`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function submitFeedback(payload) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Feedback error: ${res.status}`);
  return res.json();
}
