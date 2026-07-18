const STORAGE_KEY = "gym-tracker-v2";
const LEGACY_KEY = "gym-tracker-v1";

const state = {
  parsedWorkouts: [],
  program: null,
  selectedWorkout: 0,
  selectedImages: [],
};

const els = {
  resetApp: document.querySelector("#resetApp"),
  importSection: document.querySelector("#importSection"),
  previewSection: document.querySelector("#previewSection"),
  durationSection: document.querySelector("#durationSection"),
  workoutSection: document.querySelector("#workoutSection"),
  planText: document.querySelector("#planText"),
  fileInput: document.querySelector("#fileInput"),
  imageInput: document.querySelector("#imageInput"),
  imagePreview: document.querySelector("#imagePreview"),
  readImages: document.querySelector("#readImages"),
  ocrStatus: document.querySelector("#ocrStatus"),
  parsePlan: document.querySelector("#parsePlan"),
  manualPlan: document.querySelector("#manualPlan"),
  previewList: document.querySelector("#previewList"),
  addPreviewWorkout: document.querySelector("#addPreviewWorkout"),
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

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  return normalizeExerciseName(name) || uid("exercise");
}

function emptyExercise() {
  return {
    id: uid("exercise"),
    name: "",
    sets: "",
    reps: "",
    rest: "",
  };
}

function emptyWorkout(index = 0) {
  return {
    id: uid("workout"),
    title: `Allenamento ${index + 1}`,
    exercises: [emptyExercise()],
  };
}

function cloneWorkouts(workouts) {
  return workouts.map((workout, index) => ({
    id: workout.id || uid("workout"),
    title: workout.title || `Allenamento ${index + 1}`,
    exercises: (workout.exercises || []).map((exercise) => ({
      id: exercise.id || createExerciseId(exercise.name),
      name: exercise.name || "",
      sets: exercise.sets || "",
      reps: exercise.reps || "",
      rest: exercise.rest || "",
    })),
  }));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ program: state.program }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    state.program = saved.program;
    if (state.program?.workouts) {
      state.program.workouts = cloneWorkouts(state.program.workouts);
      state.program.history = state.program.history || {};
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function isWorkoutHeading(line) {
  const cleaned = line.trim().toLowerCase();
  return /^(allenamento|workout|giorno|day|sessione|scheda)\s*[:#-]?\s*([a-z]|\d+|uno|due|tre|quattro|cinque)?\b/.test(cleaned);
}

function workoutTitleFrom(line, index) {
  const match = line.trim().match(/(allenamento|workout|giorno|day|sessione|scheda)\s*[:#-]?\s*([a-z]|\d+|uno|due|tre|quattro|cinque)?/i);
  const rawSuffix = match?.[2]?.toLowerCase();
  const words = { uno: "1", due: "2", tre: "3", quattro: "4", cinque: "5" };
  const suffix = words[rawSuffix] || rawSuffix?.toUpperCase() || `${index + 1}`;
  return `Allenamento ${suffix}`;
}

function ensureThreeWorkouts(workouts) {
  const next = cloneWorkouts(workouts);
  while (next.length < 3) {
    next.push(emptyWorkout(next.length));
  }

  return next.map((workout, index) => ({
    ...workout,
    title: workout.title?.trim() || `Allenamento ${index + 1}`,
  }));
}

function parseExerciseLine(line) {
  const withoutBullets = line.replace(/^[-*•\d.)\s]+/, "").trim();
  if (!withoutBullets || isWorkoutHeading(withoutBullets)) return null;

  const restMatch = withoutBullets.match(/(?:rec(?:upero)?|rest|pausa)\s*[:.]?\s*(\d+\s*(?:sec|secondi|s|''|"|min|m)?)/i);
  const compactMatch = withoutBullets.match(/(\d+)\s*(?:x|×|serie\s*da|sets?\s*of)\s*(\d+\+?|\d+\s*-\s*\d+|max)/i);

  if (compactMatch) {
    const name = withoutBullets
      .slice(0, compactMatch.index)
      .replace(/[:,-]+$/g, "")
      .trim();

    return {
      id: createExerciseId(name),
      name: name || "Esercizio",
      sets: compactMatch[1],
      reps: compactMatch[2].replace(/\s+/g, ""),
      rest: restMatch ? restMatch[1].replace(/''|"/g, " sec") : "",
    };
  }

  const lineWithoutRest = withoutBullets.replace(restMatch?.[0] || "", "").trim();
  const numberMatches = [...lineWithoutRest.matchAll(/\b\d+\+?(?:\s*-\s*\d+)?\b/g)];
  if (numberMatches.length < 2) return null;

  const setsMatch = numberMatches[0];
  const repsMatch = numberMatches[1];
  const name = lineWithoutRest
    .slice(0, setsMatch.index)
    .replace(/[:,-]+$/g, "")
    .trim();

  if (!name || name.length < 2) return null;

  return {
    id: createExerciseId(name),
    name,
    sets: setsMatch[0],
    reps: repsMatch[0].replace(/\s+/g, ""),
    rest: restMatch ? restMatch[1].replace(/''|"/g, " sec") : "",
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
        id: uid("workout"),
        title: workoutTitleFrom(line, workouts.length),
        exercises: [],
      };
      workouts.push(current);
      return;
    }

    const exercise = parseExerciseLine(line);
    if (!exercise) return;

    if (!current) {
      current = emptyWorkout(0);
      current.exercises = [];
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

function updatePreviewModelFromInputs() {
  const workoutCards = [...els.previewList.querySelectorAll(".preview-day")];
  state.parsedWorkouts = workoutCards.map((card, workoutIndex) => {
    const exercises = [...card.querySelectorAll(".preview-exercise")].map((row) => ({
      id: row.dataset.exerciseId || uid("exercise"),
      name: row.querySelector("[data-field='name']").value.trim(),
      sets: row.querySelector("[data-field='sets']").value.trim(),
      reps: row.querySelector("[data-field='reps']").value.trim(),
      rest: row.querySelector("[data-field='rest']").value.trim(),
    }));

    return {
      id: card.dataset.workoutId || uid("workout"),
      title: card.querySelector("[data-field='title']").value.trim() || `Allenamento ${workoutIndex + 1}`,
      exercises: exercises.filter((exercise) => exercise.name || exercise.sets || exercise.reps || exercise.rest),
    };
  });
}

function makePreviewExerciseRow(exercise = emptyExercise()) {
  const row = document.createElement("div");
  row.className = "preview-exercise";
  row.dataset.exerciseId = exercise.id || uid("exercise");
  row.innerHTML = `
    <label class="span-2">
      <span>Esercizio</span>
      <input data-field="name" type="text" value="${escapeHtml(exercise.name || "")}" placeholder="Panca piana" />
    </label>
    <label>
      <span>Serie</span>
      <input data-field="sets" type="number" min="1" value="${escapeHtml(exercise.sets || "")}" placeholder="4" />
    </label>
    <label>
      <span>Rip.</span>
      <input data-field="reps" type="text" value="${escapeHtml(exercise.reps || "")}" placeholder="8" />
    </label>
    <label class="span-2">
      <span>Recupero</span>
      <input data-field="rest" type="text" value="${escapeHtml(exercise.rest || "")}" placeholder="90 sec" />
    </label>
    <button class="remove-mini" type="button" aria-label="Togli esercizio">Togli</button>
  `;

  row.querySelector(".remove-mini").addEventListener("click", () => {
    row.remove();
    updatePreviewModelFromInputs();
  });

  row.addEventListener("input", updatePreviewModelFromInputs);
  return row;
}

function renderPreview() {
  els.previewList.innerHTML = "";

  state.parsedWorkouts.forEach((workout, workoutIndex) => {
    const card = document.createElement("article");
    card.className = "preview-day";
    card.dataset.workoutId = workout.id || uid("workout");
    card.innerHTML = `
      <div class="preview-day-head">
        <label>
          <span>Nome allenamento</span>
          <input data-field="title" type="text" value="${escapeHtml(workout.title || `Allenamento ${workoutIndex + 1}`)}" />
        </label>
        <button class="remove-day" type="button">Togli</button>
      </div>
      <div class="preview-exercises"></div>
      <button class="secondary-button compact add-exercise" type="button">Aggiungi esercizio</button>
    `;

    const list = card.querySelector(".preview-exercises");
    (workout.exercises.length ? workout.exercises : [emptyExercise()]).forEach((exercise) => {
      list.append(makePreviewExerciseRow(exercise));
    });

    card.querySelector("[data-field='title']").addEventListener("input", updatePreviewModelFromInputs);
    card.querySelector(".remove-day").addEventListener("click", () => {
      card.remove();
      updatePreviewModelFromInputs();
    });
    card.querySelector(".add-exercise").addEventListener("click", () => {
      list.append(makePreviewExerciseRow());
      updatePreviewModelFromInputs();
    });

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
    button.textContent = workout.title || `Allenamento ${index + 1}`;
    button.addEventListener("click", () => {
      state.selectedWorkout = index;
      renderWorkouts();
    });
    els.workoutTabs.append(button);
  });

  const addButton = document.createElement("button");
  addButton.className = "workout-tab add-tab";
  addButton.type = "button";
  addButton.textContent = "+ Allenamento";
  addButton.addEventListener("click", () => {
    state.program.workouts.push(emptyWorkout(state.program.workouts.length));
    state.selectedWorkout = state.program.workouts.length - 1;
    saveState();
    renderWorkouts();
  });
  els.workoutTabs.append(addButton);
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
    chart.innerHTML = '<p class="empty-state">Aggiungi un peso per vedere la progressione.</p>';
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

function updateExercise(exerciseId, patch) {
  const workout = state.program.workouts[state.selectedWorkout];
  const exercise = workout.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;
  Object.assign(exercise, patch);
  saveState();
}

function renderExerciseCard(exercise) {
  const card = document.createElement("article");
  card.className = "exercise-card";
  card.innerHTML = `
    <div class="exercise-header">
      <label class="exercise-name-field">
        <span>Nome esercizio</span>
        <input class="exercise-name-input" type="text" value="${escapeHtml(exercise.name)}" placeholder="Esercizio" />
      </label>
      <button class="remove-mini remove-exercise-live" type="button">Togli</button>
    </div>
    <div class="exercise-details-grid">
      <label>
        <span>Serie</span>
        <input class="sets-input" type="number" min="1" value="${escapeHtml(exercise.sets)}" placeholder="4" />
      </label>
      <label>
        <span>Rip.</span>
        <input class="reps-input" type="text" value="${escapeHtml(exercise.reps)}" placeholder="8" />
      </label>
      <label>
        <span>Rec.</span>
        <input class="rest-input" type="text" value="${escapeHtml(exercise.rest)}" placeholder="90 sec" />
      </label>
    </div>
    <p class="last-weight">${latestWeightLabel(exercise.id)}</p>
    <div class="weight-row">
      <label>
        <span>Carico oggi (kg)</span>
        <input class="weight-input" inputmode="decimal" type="number" min="0" step="0.5" placeholder="0" />
      </label>
      <button class="save-weight" type="button">Salva</button>
    </div>
  `;

  const latest = getExerciseHistory(exercise.id).at(-1);
  const weightInput = card.querySelector(".weight-input");
  if (latest) weightInput.value = latest.weight;

  card.querySelector(".exercise-name-input").addEventListener("change", (event) => {
    updateExercise(exercise.id, { name: event.target.value.trim() || "Esercizio" });
    renderWorkouts();
  });
  card.querySelector(".sets-input").addEventListener("change", (event) => updateExercise(exercise.id, { sets: event.target.value.trim() }));
  card.querySelector(".reps-input").addEventListener("change", (event) => updateExercise(exercise.id, { reps: event.target.value.trim() }));
  card.querySelector(".rest-input").addEventListener("change", (event) => updateExercise(exercise.id, { rest: event.target.value.trim() }));

  card.querySelector(".remove-exercise-live").addEventListener("click", () => {
    const workout = state.program.workouts[state.selectedWorkout];
    workout.exercises = workout.exercises.filter((item) => item.id !== exercise.id);
    saveState();
    renderWorkouts();
  });

  card.querySelector(".save-weight").addEventListener("click", () => {
    const weight = Number(weightInput.value);
    if (!Number.isFinite(weight) || weight <= 0) {
      weightInput.focus();
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

function renderWorkoutTools(workout) {
  const tools = document.createElement("article");
  tools.className = "workout-tools";
  tools.innerHTML = `
    <label>
      <span>Nome allenamento</span>
      <input id="currentWorkoutTitle" type="text" value="${escapeHtml(workout.title)}" />
    </label>
    <div class="action-row">
      <button class="secondary-button" id="addLiveExercise" type="button">Aggiungi esercizio</button>
      <button class="secondary-button danger-button" id="removeLiveWorkout" type="button">Togli allenamento</button>
    </div>
  `;

  tools.querySelector("#currentWorkoutTitle").addEventListener("change", (event) => {
    workout.title = event.target.value.trim() || `Allenamento ${state.selectedWorkout + 1}`;
    saveState();
    renderWorkouts();
  });

  tools.querySelector("#addLiveExercise").addEventListener("click", () => {
    workout.exercises.push(emptyExercise());
    saveState();
    renderWorkouts();
  });

  tools.querySelector("#removeLiveWorkout").addEventListener("click", () => {
    if (state.program.workouts.length === 1) return;
    state.program.workouts.splice(state.selectedWorkout, 1);
    state.selectedWorkout = Math.max(0, state.selectedWorkout - 1);
    saveState();
    renderWorkouts();
  });

  return tools;
}

function renderWorkouts() {
  if (!state.program) return;
  renderProgramSummary();
  renderWorkoutTabs();
  els.exerciseList.innerHTML = "";

  const workout = state.program.workouts[state.selectedWorkout];
  if (!workout) {
    els.exerciseList.innerHTML = '<p class="empty-state">Nessun allenamento trovato.</p>';
    return;
  }

  els.exerciseList.append(renderWorkoutTools(workout));

  if (!workout.exercises.length) {
    els.exerciseList.insertAdjacentHTML("beforeend", '<p class="empty-state">Aggiungi il primo esercizio di questo allenamento.</p>');
  }

  workout.exercises.forEach((exercise) => {
    els.exerciseList.append(renderExerciseCard(exercise));
  });

  showOnly("workouts");
}

function startDurationStep() {
  updatePreviewModelFromInputs();
  if (!state.parsedWorkouts.length) {
    state.parsedWorkouts = ensureThreeWorkouts([]);
    renderPreview();
    return;
  }

  const start = todayISO();
  els.startDate.value = start;
  els.endDate.value = addDaysISO(start, 55);
  setDurationMode("dates");
  showOnly("duration");
}

function preparePreviewFromText() {
  const parsed = parseWorkoutText(els.planText.value);
  state.parsedWorkouts = ensureThreeWorkouts(parsed);
  renderPreview();
  showOnly("preview");
}

function renderImagePreview(files) {
  els.imagePreview.innerHTML = "";
  state.selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  state.selectedImages = [...files].map((file) => ({
    file,
    previewUrl: URL.createObjectURL(file),
  }));

  state.selectedImages.forEach((image) => {
    const thumb = document.createElement("img");
    thumb.src = image.previewUrl;
    thumb.alt = image.file.name;
    els.imagePreview.append(thumb);
  });

  els.imagePreview.classList.toggle("hidden", !state.selectedImages.length);
  els.readImages.classList.toggle("hidden", !state.selectedImages.length);
}

async function readImagesWithOcr({ openPreview = true } = {}) {
  if (!state.selectedImages.length) return;
  if (!window.Tesseract) {
    els.ocrStatus.textContent = "OCR non caricato. Controlla internet e ricarica la pagina.";
    return;
  }

  els.readImages.disabled = true;
  els.ocrStatus.textContent = "Sto leggendo la foto...";
  const chunks = [];

  for (let index = 0; index < state.selectedImages.length; index += 1) {
    els.ocrStatus.textContent = `Lettura foto ${index + 1} di ${state.selectedImages.length}`;
    const result = await window.Tesseract.recognize(state.selectedImages[index].file, "ita+eng");
    chunks.push(result.data.text);
  }

  els.planText.value = chunks.join("\n\n").trim();
  els.ocrStatus.textContent = "Foto letta. Ho creato i box: controllali e modifica se serve.";
  els.readImages.disabled = false;

  if (openPreview) {
    preparePreviewFromText();
  }
}

els.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  els.planText.value = await file.text();
  preparePreviewFromText();
});

els.imageInput.addEventListener("change", (event) => {
  renderImagePreview(event.target.files || []);
  if (state.selectedImages.length) {
    readImagesWithOcr().catch(() => {
      els.ocrStatus.textContent = "Non sono riuscito a leggere la foto. Prova con una foto piu nitida.";
      els.readImages.disabled = false;
    });
  }
});

els.readImages.addEventListener("click", () => {
  readImagesWithOcr().catch(() => {
    els.ocrStatus.textContent = "Non sono riuscito a leggere la foto. Prova con una foto piu nitida.";
    els.readImages.disabled = false;
  });
});

els.parsePlan.addEventListener("click", preparePreviewFromText);
els.manualPlan.addEventListener("click", () => {
  state.parsedWorkouts = [emptyWorkout(0), emptyWorkout(1), emptyWorkout(2)];
  renderPreview();
  showOnly("preview");
});

els.addPreviewWorkout.addEventListener("click", () => {
  updatePreviewModelFromInputs();
  state.parsedWorkouts.push(emptyWorkout(state.parsedWorkouts.length));
  renderPreview();
});

els.editImport.addEventListener("click", () => showOnly("import"));
els.confirmPreview.addEventListener("click", startDurationStep);
els.datesMode.addEventListener("click", () => setDurationMode("dates"));
els.weeksMode.addEventListener("click", () => setDurationMode("weeks"));

els.saveProgram.addEventListener("click", () => {
  state.program = {
    createdAt: new Date().toISOString(),
    duration: buildProgramDuration(),
    workouts: cloneWorkouts(state.parsedWorkouts),
    history: state.program?.history || {},
  };
  state.selectedWorkout = 0;
  saveState();
  renderWorkouts();
});

els.newImport.addEventListener("click", () => {
  state.parsedWorkouts = cloneWorkouts(state.program?.workouts || []);
  renderPreview();
  showOnly("preview");
});

els.resetApp.addEventListener("click", () => {
  if (!confirm("Vuoi cancellare scheda e progressi salvati in questo browser?")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
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
