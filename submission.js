const API_URL = "https://script.google.com/macros/s/AKfycbxXBTnSlJGlbRc6CITOGu3gQol7FSrYpi2Y1CAkz9WAyW82QOtQ9NonsCIUEkrIvr0/exec";
const storagePrefix = "english-practice-v1:";

async function requestAPI(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {cache: "no-store", ...options, signal: controller.signal});
    if (options.method === "POST") return;
    if (!response.ok) throw Error("Exercise service unavailable");
    return await response.json();
  } finally { clearTimeout(timer); }
}

const exerciseAPI = {
  async exercises() {
    const source = document.getElementById("exercise-source");
    const key = storagePrefix + "exercises";
    try {
      const data = await requestAPI(API_URL);
      if (Array.isArray(data)) {
        source.textContent = "English practice";
        try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
      } else {
        source.textContent = "English practice · Exercises unavailable";
      }
      return data;
    } catch (error) {
      const cached = localStorage.getItem(key);
      if (cached) {
        source.textContent = "English practice · Saved exercises";
        return JSON.parse(cached);
      }
      source.textContent = "English practice · Exercises unavailable";
      throw error;
    }
  },
  async post(payload) {
    return requestAPI(API_URL, {
      method: "POST", mode: "no-cors", headers: {"Content-Type":"text/plain"},
      body: JSON.stringify(payload)
    });
  },
  async status(payload) {
    if (!navigator.onLine) throw Error("Offline");
      const url = new URL(API_URL);
      url.searchParams.set("receipt", payload.receipt);
      url.searchParams.set("digest", await payloadDigest(payload));
      return (await requestAPI(url)).state;
  }
};

async function payloadDigest(payload) {
  const content = JSON.stringify([payload.exerciseId, payload.answers.map(a => [a.questionId, a.answer])]);
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

function bindSubmission(form, button, exercise) {
  const key = storagePrefix + "draft:" + JSON.stringify([exercise.id, exercise.questions.map(q => q.id)]);
  const inputs = [...form.querySelectorAll("input")];
  let draft = JSON.parse(localStorage.getItem(key) || '{"values":[],"receipt":null}');
  inputs.forEach((input, index) => { input.value = draft.values[index] || ""; });
  let busy = false;
  let active = true;
  const labels = {
    empty: "Submit your answers", ready: "Submit your answers", busy: "Please wait…",
    verified: "✓ Submitted successfully", unknown: "Submission not confirmed — Retry",
    rejected: "Submission rejected — Review answers and retry"
  };
  function draw() {
    const full = inputs.length && inputs.every(input => input.value.trim());
    const state = busy ? "busy" : draft.state || (full ? "ready" : "empty");
    button.dataset.state = state;
    button.disabled = ["busy","empty","verified"].includes(state);
    button.textContent = labels[state];
    inputs.forEach(input => { input.readOnly = busy; });
  }
  const save = () => localStorage.setItem(key, JSON.stringify(draft));
  form.addEventListener("input", () => {
    draft = {values: inputs.map(input => input.value), receipt: null};
    save();
    draw();
  });
  async function attempt(send) {
    if (busy || !active || draft.state === "verified") return;
    busy = true;
    draft.receipt ||= crypto.randomUUID();
    draft.state = "unknown";
    save();
    draw();
    const payload = {receipt: draft.receipt, exerciseId: exercise.id,
      answers: exercise.questions.map((q,i) => ({questionId:q.id, answer:inputs[i].value.trim()}))};
    try {
      let result = await exerciseAPI.status(payload);
      if (send && (result === "unknown" || result === "rejected")) {
        try { await exerciseAPI.post(payload); } catch { /* The write may have completed. */ }
        result = await exerciseAPI.status(payload);
      }
      if (result === "verified" || result === "rejected") draft.state = result;
    } catch { draft.state = "unknown"; }
    finally {
      busy = false;
      if (active) { save(); draw(); }
    }
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (button.disabled) return;
    for (const input of inputs) {
      if (!ANSWER_PATTERN.test(input.value.trim())) {
        input.setCustomValidity("Use English or Russian letters, numbers, spaces, and common punctuation.");
        input.reportValidity();
        return;
      }
    }
    void attempt(true);
  });
  const reconnect = () => { if (draft.receipt && draft.state === "unknown") void attempt(false); };
  window.addEventListener("online", reconnect);
  draw();
  reconnect();
  return () => { active = false; window.removeEventListener("online", reconnect); };
}
