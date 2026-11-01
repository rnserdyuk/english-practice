// This endpoint exposes published questions only. It must never return answer keys.
const API_URL = "https://script.google.com/macros/s/AKfycbz5ktDIVQw1zbPiewx18M3AGOy_MpHw23zHCTquw0BKWUmhm1RAz292MDI62g7FWg/exec";
const app = document.querySelector("#app");

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
    input.setAttribute("aria-label", question.prompt);
    label.append(input);
    group.append(label);
    form.append(group);
  });

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Send answers";
  const status = message("", "status");
  status.setAttribute("role", "status");
  form.append(submit, status);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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
      status.textContent = "Your answers were sent. Your teacher will review them.";
      form.reset();
    } catch {
      status.className = "status error";
      status.textContent = "We could not send your answers. Please try again.";
      submit.disabled = false;
    }
  });
  app.append(form);
}

async function loadExercises() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("The exercise service is unavailable.");
    const exercises = await response.json();
    if (!Array.isArray(exercises) || exercises.length === 0) throw new Error("No published exercises are available.");
    renderExercise(exercises[0]);
  } catch (error) {
    app.replaceChildren(message(error.message || "Could not load the exercises.", "error"));
  }
}

loadExercises();
