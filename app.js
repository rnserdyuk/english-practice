function inlineText(node, text) {
  // Underscore emphasis needs a word boundary and text on both sides inside it.
  // This leaves answer blanks such as ___ intact, including multiple blanks per line.
  const pattern = /(\*{1,2})(\S(?:.*?\S)?)\1|(?<![\p{L}\p{N}_])(_{1,2})([^\s_](?:.*?[^\s_])?)\3(?![\p{L}\p{N}_])/gu;
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    node.append(text.slice(end, match.index));
    const delimiter = match[1] || match[3];
    const tag = document.createElement(delimiter.length === 2 ? "strong" : "em");
    tag.textContent = match[2] || match[4];
    node.append(tag);
    end = match.index + match[0].length;
  }
  node.append(text.slice(end));
}
function descriptionBlocks(parent, text) {
  let paragraph;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^(#{1,3})\s+(.+)/.exec(line);
    if (!line.trim() || heading) paragraph = null;
    if (heading) {
      const node = document.createElement("h" + heading[1].length);
      inlineText(node, heading[2]);
      parent.append(node);
    } else if (line.trim()) {
      if (!paragraph) { paragraph = document.createElement("p"); parent.append(paragraph); }
      else paragraph.append(document.createElement("br"));
      inlineText(paragraph, line);
    }
  }
}
const app = document.querySelector("#app");
const ANSWER_PATTERN = /^[A-Za-zА-Яа-яЁё0-9 .,?!'’«»—–“”"():;\-]+$/;
let stopListening = () => {};

function message(text, className = "") {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  return element;
}

function renderExercise(exercise) {
  stopListening();
  app.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = exercise.title || "Practice exercise";
  const reading = document.createElement("article");
  reading.append(title);
  app.append(reading);
  if (exercise.description) {
    descriptionBlocks(reading, exercise.description);
  }

  const form = document.createElement("form");
  const frame = document.createElement("section");
  frame.className = "questions";
  frame.setAttribute("aria-label", "Questions");
  form.append(frame);
  exercise.questions.forEach((question, index) => {
    const group = document.createElement("div");
    group.className = "question";
    const label = document.createElement("label");
    const inputId = `answer-${index}`;
    label.htmlFor = inputId;
    inlineText(label, question.prompt);
    const input = document.createElement("input");
    input.id = inputId;
    input.name = question.id;
    input.autocomplete = "off";
    input.required = true;
    input.maxLength = 500;
    input.addEventListener('input', () => input.setCustomValidity(''));
    input.placeholder = "Type your answer here";
    label.append(input);
    group.append(label);
    frame.append(group);
  });
  frame.append(message('Up to 500 characters per answer. Use English or Russian letters, numbers, spaces, and normal punctuation.', 'description'));

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit your answers";
  submit.setAttribute("aria-live", "polite");
  form.append(submit);
  app.append(form);
  stopListening = bindSubmission(form, submit, exercise);
}

async function loadExercises() {
  try {
    const exercises = await exerciseAPI.exercises();
    if (exercises && exercises.error) throw new Error(exercises.error);
    if (!Array.isArray(exercises) || exercises.length === 0) throw new Error("No published exercises are available.");
    const picker = document.createElement('section');
    picker.className = 'exercise-picker';
    const label = document.createElement('label');
    label.htmlFor = 'exercise-select';
    label.textContent = "Choose an exercise:";
    const select = document.createElement('select');
    select.id = 'exercise-select';
    exercises.forEach((exercise, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = exercise.title || exercise.id;
      select.append(option);
    });
    let selectedIndex = Math.max(0, exercises.findIndex(ex => ex.id === localStorage.getItem(storagePrefix + "selected")));
    select.value = String(selectedIndex);
    const control = document.createElement('div');
    control.className = 'picker-control';
    const caption = document.createElement('span');
    caption.setAttribute('aria-hidden', 'true');
    caption.textContent = select.options[selectedIndex].textContent;
    control.append(caption, select);
    select.addEventListener('change', () => {
      selectedIndex = Number(select.value);
      localStorage.setItem(storagePrefix + "selected", exercises[selectedIndex].id);
      caption.textContent = select.selectedOptions[0].textContent;
      renderExercise(exercises[selectedIndex]);
    });
    picker.append(label, control);
    app.before(picker);
    renderExercise(exercises[selectedIndex]);
  } catch (error) {
    app.replaceChildren(message(error.message || "Could not load the exercises.", "error"));
  }
}

loadExercises();
