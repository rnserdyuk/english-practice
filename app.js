// This endpoint exposes published questions only. It must never return answer keys.
const API_URL = "https://script.google.com/macros/s/AKfycbxXBTnSlJGlbRc6CITOGu3gQol7FSrYpi2Y1CAkz9WAyW82QOtQ9NonsCIUEkrIvr0/exec";
const app = document.querySelector("#app");
const ANSWER_PATTERN = /^[A-Za-z0-9 .,?!'’“”"():;\-]+$/;
const COOLDOWN_MS = 60000;
let lastAttempt = 0;
try { lastAttempt = Number(localStorage.getItem('english-last-attempt')) || 0; } catch {}

function message(text, className = "") {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  return element;
}

function renderExercise(exercise) {
  app.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = exercise.title || "Practice exercise";
  app.append(title);
  if (exercise.description) {
    const description = message(exercise.description, "description");
    app.append(description);
  }

  const form = document.createElement("form");
  exercise.questions.forEach((question, index) => {
    const group = document.createElement("div");
    group.className = "question";
    const label = document.createElement("label");
    const inputId = `answer-${index}`;
    label.htmlFor = inputId;
    label.textContent = question.prompt;
    const input = document.createElement("input");
    input.id = inputId;
    input.name = question.id;
    input.autocomplete = "off";
    input.required = true;
    input.maxLength = 500;
    input.addEventListener('input', () => input.setCustomValidity(''));
    input.setAttribute("aria-label", question.prompt);
    label.append(input);
    group.append(label);
    form.append(group);
  });
  form.append(message('Up to 500 characters per answer. Use English letters, numbers, spaces, and normal punctuation.', 'description'));

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Send answers";
  const status = message("", "status");
  status.setAttribute("role", "status");
  form.append(submit, status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (Date.now() - lastAttempt < COOLDOWN_MS) {
      status.textContent = 'Please wait one minute between submission attempts.';
      return;
    }
    for (const question of exercise.questions) {
      const input = form.elements.namedItem(question.id);
      const value = input.value.trim();
      if (!value || !ANSWER_PATTERN.test(value)) {
        input.setCustomValidity('Use English letters, numbers, spaces, and normal punctuation only.');
        input.reportValidity();
        return;
      }
    }
    lastAttempt = Date.now();
    try { localStorage.setItem('english-last-attempt', String(lastAttempt)); } catch {}
    submit.disabled = true;
    status.className = "status";
    status.textContent = "Sending your answers…";
    const answers = exercise.questions.map((question) => ({
      questionId: question.id,
      answer: form.elements.namedItem(question.id).value.trim()
    }));
    try {
      // text/plain keeps this a browser-safe simple request for Apps Script.
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ exerciseId: exercise.id, answers })
      });
      status.textContent = "Request sent. Your teacher must confirm it was saved. Please keep your answers until then.";
    } catch {
      status.className = "status error";
      status.textContent = "We could not send your answers. Please try again.";
      submit.disabled = false;
    } finally {
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastAttempt));
      setTimeout(() => { submit.disabled = false; }, remaining);
    }
  });
  app.append(form);
}

async function loadExercises() {
  try {
    const response = await fetch(API_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error("The exercise service is unavailable.");
    const exercises = await response.json();
    if (exercises && exercises.error) throw new Error(exercises.error);
    if (!Array.isArray(exercises) || exercises.length === 0) throw new Error("No published exercises are available.");
    const picker = document.createElement('section');
    picker.className = 'exercise-picker';
    const label = document.createElement('label');
    label.htmlFor = 'exercise-select';
    label.textContent = `Choose an exercise (${exercises.length} available)`;
    const select = document.createElement('select');
    select.id = 'exercise-select';
    exercises.forEach((exercise, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = exercise.title || exercise.id;
      select.append(option);
    });
    let selectedIndex = 0;
    select.addEventListener('change', () => {
      const hasAnswers = Array.from(app.querySelectorAll('input')).some(input => input.value.trim());
      if (hasAnswers && !window.confirm('Switch exercises? Answers on this page will be cleared.')) {
        select.value = String(selectedIndex);
        return;
      }
      selectedIndex = Number(select.value);
      renderExercise(exercises[selectedIndex]);
    });
    picker.append(label, select);
    app.before(picker);
    renderExercise(exercises[selectedIndex]);
  } catch (error) {
    app.replaceChildren(message(error.message || "Could not load the exercises.", "error"));
  }
}

loadExercises();
