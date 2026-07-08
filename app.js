const STORAGE_KEY = "gym-tracker-v1";

const state = {
  parsedWorkouts: [],
  program: null,
  selectedWorkout: 0,
};

const els = {
  resetApp: document.querySelector("#resetApp"),
  importSection: document.querySelector("#importSection"),
  previewSection: document.querySelector("#previewSection"),
  durationSection: document.querySelector("#durationSection"),
  workoutSection: document.querySelector("#workoutSection"),
  planText: document.querySelector("#planText"),
  fileInput: document.querySelector("#fileInput"),
  parsePlan: document.querySelector("#parsePlan"),
  previewList: document.querySelector("#previewList"),
  editImport: document.querySelector("#editImport"),
  confirmPreview: document.querySelector("#confirmPreview"),
  datesMode: document.querySelector("#datesMode"),
  weeksMode: document.querySelector("#weeksMode"),
  dateFields: document.querySelector("#dateFields"),
  weeksField: document.querySelector("#weeksField"),
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  weeksCount: document.querySelector("#weeksCount"),
  saveProgram: document.querySelector("#saveProgram"),
  workoutTabs: document.querySelector("#workoutTabs"),
  exerciseList: document.querySelector("#exerciseList"),
  programDates: document.querySelector("#programDates"),
  newImport: document.querySelector("#newImport"),
  historyTemplate: document.querySelector("#historyTemplate"),
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateISO) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateISO}T00:00:00`));
}

function normalizeExerciseName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createExerciseId(name) {
  return normalizeExerciseName(name) || crypto.randomUUID();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ program: state.program }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    state.program = saved.program;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function isWorkoutHeading(line) {
  const cleaned = line.trim().toLowerCase();
  return /^(allenamento|workout|giorno|day|sessione|scheda)\s*[:#-]?\s*([a-z]|\d+|uno|due|tre|quattro|cinque)?\b/.test(cleaned);
}

function workoutTitleFrom(line, index) {
  const cleaned = line.trim();
  const match = cleaned.match(/(allenamento|workout|giorno|day|sessione|scheda)\s*[:#-]?\s*([a-z]|\d+|uno|due|tre|quattro|cinque)?/i);
  const suffix = match?.[2] ? match[2].toUpperCase() : `${index + 1}`;
  return `Workout ${suffix}`;
}

function parseExerciseLine(line) {
  const withoutBullets = line.replace(/^[-*•\d.)\s]+/, "").trim();
  if (!withoutBullets || isWorkoutHeading(withoutBullets)) return null;

  const setRepMatch = withoutBullets.match(/(\d+)\s*(?:x|×|serie\s*da|sets?\s*of)\s*(\d+\+?|\d+\s*-\s*\d+|max)/i);
  if (!setRepMatch) return null;

  const restMatch = withoutBullets.match(/(?:rec(?:upero)?|rest|pausa)\s*[:.]?\s*(\d+\s*(?:sec|secondi|s|''|"|min|m)?)/i);
  const name = withoutBullets
    .slice(0, setRepMatch.index)
    .replace(/[:,-]+$/g, "")
    .trim();

  return {
    id: createExerciseId(name),
    name: name || "Esercizio",
    sets: setRepMatch[1],
    reps: setRepMatch[2].replace(/\s+/g, ""),
    rest: restMatch ? restMatch[1].replace(/''|"/g, " sec") : "Non indicato",
  };
}

function parseWorkoutText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const workouts = [];
  let current = null;

  lines.forEach((line) => {
    if (isWorkoutHeading(line)) {
      current = {
        title: workoutTitleFrom(line, workouts.length),
        exercises: [],
      };
      workouts.push(current);
      return;
    }

    const exercise = parseExerciseLine(line);
    if (!exercise) return;

    if (!current) {
      current = { title: "Workout 1", exercises: [] };
      workouts.push(current);
    }

    current.exercises.push(exercise);
  });

  return workouts.filter((workout) => workout.exercises.length > 0);
}

function showOnly(section) {
  [els.importSection, els.previewSection, els.durationSection].forEach((el) => el.classList.add("hidden"));
  els.workoutSection.classList.toggle("hidden", section !== "workouts");

  if (section === "import") els.importSection.classList.remove("hidden");
  if (section === "preview") els.previewSection.classList.remove("hidden");
  if (section === "duration") els.durationSection.classList.remove("hidden");
}

function renderPreview() {
  els.previewList.innerHTML = "";

  state.parsedWorkouts.forEach((workout) => {
    const card = document.createElement("article");
    card.className = "preview-day";
    card.innerHTML = `
      <h3>${workout.title}</h3>
      <ul>
        ${workout.exercises
          .map((exercise) => `<li>${exercise.name} · ${exercise.sets} x ${exercise.reps} · recupero ${exercise.rest}</li>`)
          .join("")}
      </ul>
    `;
    els.previewList.append(card);
  });
}

function setDurationMode(mode) {
  const useWeeks = mode === "weeks";
  els.weeksMode.classList.toggle("active", useWeeks);
  els.datesMode.classList.toggle("active", !useWeeks);
  els.weeksField.classList.toggle("hidden", !useWeeks);
  els.dateFields.classList.toggle("hidden", useWeeks);
}

function buildProgramDuration() {
  const useWeeks = els.weeksMode.classList.contains("active");
  const startDate = els.startDate.value || todayISO();

  if (useWeeks) {
    const weeks = Math.max(1, Number(els.weeksCount.value || 1));
    return {
      mode: "weeks",
      weeks,
      startDate,
      endDate: addDaysISO(startDate, weeks * 7 - 1),
    };
  }

  return {
    mode: "dates",
    startDate,
    endDate: els.endDate.value || addDaysISO(startDate, 55),
  };
}

function renderProgramSummary() {
  if (!state.program) return;
  const { startDate, endDate } = state.program.duration;
  els.programDates.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function renderWorkoutTabs() {
  els.workoutTabs.innerHTML = "";

  state.program.workouts.forEach((workout, index) => {
    const button = document.createElement("button");
    button.className = `workout-tab ${index === state.selectedWorkout ? "active" : ""}`;
    button.type = "button";
    button.textContent = workout.title;
    button.addEventListener("click", () => {
      state.selectedWorkout = index;
      renderWorkouts();
    });
    els.workoutTabs.append(button);
  });
}

function getExerciseHistory(exerciseId) {
  return state.program.history[exerciseId] || [];
}

function latestWeightLabel(exerciseId) {
  const history = getExerciseHistory(exerciseId);
  if (!history.length) return "Nessun peso salvato";
  return `Ultimo peso: ${history.at(-1).weight} kg il ${formatDate(history.at(-1).date)}`;
}

function renderHistory(exercise) {
  const historyNode = els.historyTemplate.content.firstElementChild.cloneNode(true);
  const chart = historyNode.querySelector(".history-chart");
  const list = historyNode.querySelector(".history-list");
  const history = getExerciseHistory(exercise.id);

  if (!history.length) {
    chart.innerHTML = "<p class=\"empty-state\">Aggiungi un peso per vedere la progressione.</p>";
    return historyNode;
  }

  const maxWeight = Math.max(...history.map((entry) => Number(entry.weight)));
  history.slice(-8).forEach((entry) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.title = `${entry.weight} kg`;
    bar.style.height = `${Math.max(14, (Number(entry.weight) / maxWeight) * 100)}%`;
    chart.append(bar);
  });

  history
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = `${formatDate(entry.date)} - ${entry.weight} kg`;
      list.append(item);
    });

  return historyNode;
}

function renderExerciseCard(exercise) {
  const card = document.createElement("article");
  card.className = "exercise-card";
  card.innerHTML = `
    <div class="exercise-header">
      <div>
        <h3>${exercise.name}</h3>
        <p class="last-weight">${latestWeightLabel(exercise.id)}</p>
      </div>
      <p class="exercise-meta">${exercise.sets} x ${exercise.reps}<br>Rec ${exercise.rest}</p>
    </div>
    <div class="weight-row">
      <label>
        <span>Peso usato (kg)</span>
        <input inputmode="decimal" type="number" min="0" step="0.5" placeholder="0" />
      </label>
      <button class="save-weight" type="button">Salva</button>
    </div>
  `;

  const input = card.querySelector("input");
  const button = card.querySelector(".save-weight");
  const latest = getExerciseHistory(exercise.id).at(-1);
  if (latest) input.value = latest.weight;

  button.addEventListener("click", () => {
    const weight = Number(input.value);
    if (!Number.isFinite(weight) || weight <= 0) {
      input.focus();
      return;
    }

    state.program.history[exercise.id] = [
      ...getExerciseHistory(exercise.id),
      { date: todayISO(), weight: Number(weight.toFixed(2)) },
    ];
    saveState();
    renderWorkouts();
  });

  card.append(renderHistory(exercise));
  return card;
}

function renderWorkouts() {
  if (!state.program) return;
  renderProgramSummary();
  renderWorkoutTabs();
  els.exerciseList.innerHTML = "";

  const workout = state.program.workouts[state.selectedWorkout];
  if (!workout) {
    els.exerciseList.innerHTML = "<p class=\"empty-state\">Nessun allenamento trovato.</p>";
    return;
  }

  workout.exercises.forEach((exercise) => {
    els.exerciseList.append(renderExerciseCard(exercise));
  });

  showOnly("workouts");
}

function startDurationStep() {
  const start = todayISO();
  els.startDate.value = start;
  els.endDate.value = addDaysISO(start, 55);
  setDurationMode("dates");
  showOnly("duration");
}

els.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  els.planText.value = await file.text();
});

els.parsePlan.addEventListener("click", () => {
  state.parsedWorkouts = parseWorkoutText(els.planText.value);
  if (!state.parsedWorkouts.length) {
    els.planText.focus();
    alert("Non ho trovato esercizi con formato tipo 4x8. Prova a incollare più testo della scheda.");
    return;
  }
  renderPreview();
  showOnly("preview");
});

els.editImport.addEventListener("click", () => showOnly("import"));
els.confirmPreview.addEventListener("click", startDurationStep);
els.datesMode.addEventListener("click", () => setDurationMode("dates"));
els.weeksMode.addEventListener("click", () => setDurationMode("weeks"));

els.saveProgram.addEventListener("click", () => {
  state.program = {
    createdAt: new Date().toISOString(),
    duration: buildProgramDuration(),
    workouts: state.parsedWorkouts,
    history: {},
  };
  state.selectedWorkout = 0;
  saveState();
  renderWorkouts();
});

els.newImport.addEventListener("click", () => {
  state.parsedWorkouts = [];
  showOnly("import");
});

els.resetApp.addEventListener("click", () => {
  if (!confirm("Vuoi cancellare scheda e progressi salvati in questo browser?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state.program = null;
  state.parsedWorkouts = [];
  state.selectedWorkout = 0;
  els.planText.value = "";
  showOnly("import");
});

loadState();
if (state.program) {
  renderWorkouts();
} else {
  showOnly("import");
}
