const STORAGE_KEY = "gym-tracker-v2";
const LEGACY_KEY = "gym-tracker-v1";
const DRAFT_KEY = "gym-tracker-draft-v1";
const ACTIVE_PROFILE_KEY = "gym-tracker-active-profile-v1";
const PROFILES_KEY = "gym-tracker-profiles-v1";

const state = {
  activeProfile: null,
  activeView: "workouts",
  parsedWorkouts: [],
  program: null,
  selectedWorkout: 0,
  selectedPreviewWorkout: 0,
  selectedImages: [],
  diet: { goal: "", notes: "" },
  progressPhotos: [],
  calendar: {},
  selectedCalendarStart: null,
  completedExercises: {},
  activeTimer: null,
  timerInterval: null,
};

const els = {
  loginSection: document.querySelector("#loginSection"),
  profileName: document.querySelector("#profileName"),
  profilePin: document.querySelector("#profilePin"),
  loginButton: document.querySelector("#loginButton"),
  loginStatus: document.querySelector("#loginStatus"),
  activeProfile: document.querySelector("#activeProfile"),
  logoutApp: document.querySelector("#logoutApp"),
  featureNav: document.querySelector("#featureNav"),
  resetApp: document.querySelector("#resetApp"),
  importSection: document.querySelector("#importSection"),
  previewSection: document.querySelector("#previewSection"),
  durationSection: document.querySelector("#durationSection"),
  workoutSection: document.querySelector("#workoutSection"),
  dietSection: document.querySelector("#dietSection"),
  improvementsSection: document.querySelector("#improvementsSection"),
  statsSection: document.querySelector("#statsSection"),
  photosSection: document.querySelector("#photosSection"),
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
  exerciseList: document.querySelector("#exerciseList"),
  programDates: document.querySelector("#programDates"),
  newImport: document.querySelector("#newImport"),
  prevCalendarWeek: document.querySelector("#prevCalendarWeek"),
  nextCalendarWeek: document.querySelector("#nextCalendarWeek"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarStrip: document.querySelector("#calendarStrip"),
  historyTemplate: document.querySelector("#historyTemplate"),
  dietGoal: document.querySelector("#dietGoal"),
  dietNotes: document.querySelector("#dietNotes"),
  saveDiet: document.querySelector("#saveDiet"),
  improvementsList: document.querySelector("#improvementsList"),
  statsList: document.querySelector("#statsList"),
  progressPhotoInput: document.querySelector("#progressPhotoInput"),
  progressPhotoGrid: document.querySelector("#progressPhotoGrid"),
};

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function profileIdFromName(name) {
  return normalizeExerciseName(name.trim()) || "utente";
}

function profileKey(baseKey) {
  return state.activeProfile ? `${baseKey}-${state.activeProfile.id}` : baseKey;
}

function readProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function setLoggedLayout(isLogged) {
  document.body.classList.toggle("auth-locked", !isLogged);
  els.loginSection.classList.toggle("hidden", isLogged);
  els.featureNav.classList.toggle("hidden", !isLogged);
  document.querySelector(".topbar").classList.toggle("hidden", !isLogged);
}

function loginProfile() {
  const name = els.profileName.value.trim();
  const pin = els.profilePin.value.trim();

  if (!name) {
    els.loginStatus.textContent = "Inserisci un nome profilo.";
    els.profileName.focus();
    return;
  }

  const id = profileIdFromName(name);
  const profiles = readProfiles();
  const existing = profiles[id];

  if (existing?.pin && existing.pin !== pin) {
    els.loginStatus.textContent = "PIN non corretto per questo profilo.";
    els.profilePin.focus();
    return;
  }

  profiles[id] = {
    id,
    name: existing?.name || name,
    pin: existing?.pin || pin,
    updatedAt: new Date().toISOString(),
  };
  writeProfiles(profiles);

  state.activeProfile = profiles[id];
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  els.loginStatus.textContent = "";
  hydrateProfileState();
  renderApp();
}

function logoutProfile() {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
  state.activeProfile = null;
  state.program = null;
  state.parsedWorkouts = [];
  state.selectedWorkout = 0;
  state.selectedPreviewWorkout = 0;
  state.diet = { goal: "", notes: "" };
  state.progressPhotos = [];
  setLoggedLayout(false);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dateFromISO(dateISO) {
  return new Date(`${dateISO}T00:00:00`);
}

function addDaysISO(dateISO, days) {
  const date = dateFromISO(dateISO);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekStartISO(dateISO) {
  const date = dateFromISO(dateISO);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateISO) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateISO}T00:00:00`));
}

function formatShortDay(dateISO) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
  }).format(dateFromISO(dateISO));
}

function parseRestSeconds(rest) {
  const raw = String(rest || "").toLowerCase();
  const match = raw.match(/(\d+)/);
  if (!match) return 60;
  const value = Number(match[1]);
  if (raw.includes("min")) return value * 60;
  return value;
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function completionKey(exerciseId, dateISO = todayISO()) {
  return `${dateISO}:${exerciseId}`;
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
    exercises: [],
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
  localStorage.setItem(
    profileKey(STORAGE_KEY),
    JSON.stringify({
      program: state.program,
      selectedWorkout: state.selectedWorkout,
      diet: state.diet,
      progressPhotos: state.progressPhotos,
      calendar: state.calendar,
      completedExercises: state.completedExercises,
      selectedCalendarStart: state.selectedCalendarStart,
      activeView: state.activeView,
    }),
  );
}

function saveDraft() {
  localStorage.setItem(
    profileKey(DRAFT_KEY),
    JSON.stringify({
      parsedWorkouts: state.parsedWorkouts,
      selectedPreviewWorkout: state.selectedPreviewWorkout,
    }),
  );
}

function clearDraft() {
  localStorage.removeItem(profileKey(DRAFT_KEY));
}

function hydrateProfileState() {
  state.program = null;
  state.parsedWorkouts = [];
  state.selectedWorkout = 0;
  state.selectedPreviewWorkout = 0;
  state.diet = { goal: "", notes: "" };
  state.progressPhotos = [];
  state.calendar = {};
  state.completedExercises = {};
  state.selectedCalendarStart = weekStartISO(todayISO());
  state.activeView = "workouts";

  const raw = localStorage.getItem(profileKey(STORAGE_KEY)) || localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      state.program = saved.program;
      state.selectedWorkout = saved.selectedWorkout || 0;
      state.activeView = saved.activeView || "workouts";
      state.diet = saved.diet || { goal: "", notes: "" };
      state.progressPhotos = saved.progressPhotos || [];
      state.calendar = saved.calendar || {};
      state.completedExercises = saved.completedExercises || {};
      state.selectedCalendarStart = saved.selectedCalendarStart || weekStartISO(todayISO());
      if (state.program?.workouts) {
        state.program.workouts = cloneWorkouts(state.program.workouts);
        state.program.history = state.program.history || {};
        state.selectedWorkout = Math.min(state.selectedWorkout, Math.max(0, state.program.workouts.length - 1));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const draftRaw = localStorage.getItem(profileKey(DRAFT_KEY));
  if (!state.program && draftRaw) {
    try {
      const draft = JSON.parse(draftRaw);
      state.parsedWorkouts = cloneWorkouts(draft.parsedWorkouts || []);
      state.selectedPreviewWorkout = draft.selectedPreviewWorkout || 0;
    } catch {
      clearDraft();
    }
  }
}

function loadActiveProfile() {
  const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  const profiles = readProfiles();
  if (!activeId || !profiles[activeId]) {
    setLoggedLayout(false);
    return;
  }

  state.activeProfile = profiles[activeId];
  hydrateProfileState();
  renderApp();
}

function isWorkoutHeading(line) {
  const cleaned = line.trim().toLowerCase();
  return /\b(allenamento|workout|giorno|day|sessione)\s*[:#-]?\s*([a-z]|\d+|uno|due|tre|quattro|cinque)?\b/.test(cleaned);
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

function normalizeOcrText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\b(WORKOUT|Allenamento|Giorno|Day)\s*([1-9A-C])\b/gi, "\n$1 $2\n")
    .replace(/\b(SET|RPT|REP|REC|Esercizio)\b/gi, "\n$1 ")
    .replace(/\n{2,}/g, "\n");
}

function parseWorkoutText(text) {
  const lines = normalizeOcrText(text)
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
  [
    els.importSection,
    els.previewSection,
    els.durationSection,
    els.dietSection,
    els.improvementsSection,
    els.statsSection,
    els.photosSection,
  ].forEach((el) => el.classList.add("hidden"));
  els.workoutSection.classList.toggle("hidden", section !== "workouts");

  if (section === "import") els.importSection.classList.remove("hidden");
  if (section === "preview") els.previewSection.classList.remove("hidden");
  if (section === "duration") els.durationSection.classList.remove("hidden");
  if (section === "diet") els.dietSection.classList.remove("hidden");
  if (section === "improvements") els.improvementsSection.classList.remove("hidden");
  if (section === "stats") els.statsSection.classList.remove("hidden");
  if (section === "photos") els.photosSection.classList.remove("hidden");
}

function setActiveView(view) {
  state.activeView = view;
  els.featureNav.querySelectorAll(".feature-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  if (view === "workouts") {
    if (state.program) {
      renderWorkouts();
    } else if (state.parsedWorkouts.length) {
      renderPreview();
      showOnly("preview");
    } else {
      showOnly("import");
    }
  }

  if (view === "diet") {
    renderDiet();
    showOnly("diet");
  }

  if (view === "improvements") {
    renderImprovements();
    showOnly("improvements");
  }

  if (view === "stats") {
    renderStats();
    showOnly("stats");
  }

  if (view === "photos") {
    renderProgressPhotos();
    showOnly("photos");
  }

  saveState();
}

function renderApp() {
  setLoggedLayout(true);
  els.activeProfile.textContent = `Profilo: ${state.activeProfile.name}`;
  els.dietGoal.value = state.diet.goal || "";
  els.dietNotes.value = state.diet.notes || "";
  setActiveView(state.activeView || "workouts");
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
  saveDraft();
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
  state.selectedPreviewWorkout = Math.min(state.selectedPreviewWorkout, Math.max(0, state.parsedWorkouts.length - 1));

  state.parsedWorkouts.forEach((workout, workoutIndex) => {
    const isOpen = workoutIndex === state.selectedPreviewWorkout;
    const card = document.createElement("article");
    card.className = `preview-day ${isOpen ? "active" : "collapsed"}`;
    card.dataset.workoutId = workout.id || uid("workout");
    card.innerHTML = `
      <div class="preview-day-head">
        <label>
          <span>Nome allenamento</span>
          <input data-field="title" type="text" value="${escapeHtml(workout.title || `Allenamento ${workoutIndex + 1}`)}" />
        </label>
        <button class="open-day" type="button">${isOpen ? "Aperto" : "Apri"}</button>
        <button class="remove-day" type="button">Togli</button>
      </div>
      <div class="preview-summary">${workout.exercises.length || 0} esercizi</div>
      <div class="preview-exercises ${isOpen ? "" : "hidden"}"></div>
      <button class="secondary-button compact add-exercise" type="button">Aggiungi esercizio</button>
    `;

    const list = card.querySelector(".preview-exercises");
    (workout.exercises.length ? workout.exercises : [emptyExercise()]).forEach((exercise) => {
      list.append(makePreviewExerciseRow(exercise));
    });

    card.querySelector("[data-field='title']").addEventListener("input", updatePreviewModelFromInputs);
    card.querySelector(".open-day").addEventListener("click", () => {
      updatePreviewModelFromInputs();
      state.selectedPreviewWorkout = workoutIndex;
      saveDraft();
      renderPreview();
    });
    card.querySelector(".remove-day").addEventListener("click", () => {
      card.remove();
      updatePreviewModelFromInputs();
      state.selectedPreviewWorkout = Math.max(0, Math.min(state.selectedPreviewWorkout, state.parsedWorkouts.length - 1));
      saveDraft();
      renderPreview();
    });
    card.querySelector(".add-exercise").addEventListener("click", () => {
      state.selectedPreviewWorkout = workoutIndex;
      list.append(makePreviewExerciseRow());
      updatePreviewModelFromInputs();
      renderPreview();
    });

    if (!isOpen) {
      card.querySelector(".add-exercise").classList.add("hidden");
    }

    els.previewList.append(card);
  });
  saveDraft();
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

function calendarStatusLabel(status) {
  if (status === "planned") return "P";
  if (status === "done") return "F";
  return "";
}

function nextCalendarStatus(status) {
  if (!status) return "planned";
  if (status === "planned") return "done";
  return "";
}

function renderCalendar() {
  if (!els.calendarStrip) return;
  const start = state.selectedCalendarStart || weekStartISO(todayISO());
  state.selectedCalendarStart = start;
  els.calendarTitle.textContent = `${formatDate(start)} - ${formatDate(addDaysISO(start, 6))}`;
  els.calendarStrip.innerHTML = "";

  for (let index = 0; index < 7; index += 1) {
    const dateISO = addDaysISO(start, index);
    const status = state.calendar[dateISO] || "";
    const button = document.createElement("button");
    button.className = `calendar-day ${status ? `is-${status}` : ""} ${dateISO === todayISO() ? "today" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span>${formatShortDay(dateISO)}</span>
      <strong>${calendarStatusLabel(status) || "-"}</strong>
    `;
    button.addEventListener("click", () => {
      const next = nextCalendarStatus(state.calendar[dateISO]);
      if (next) {
        state.calendar[dateISO] = next;
      } else {
        delete state.calendar[dateISO];
      }
      saveState();
      renderCalendar();
    });
    els.calendarStrip.append(button);
  }
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

function stopExerciseTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  state.timerInterval = null;
  state.activeTimer = null;
}

function startExerciseTimer(exerciseId, seconds) {
  stopExerciseTimer();
  state.activeTimer = {
    exerciseId,
    remaining: Math.max(1, seconds),
  };
  renderWorkouts();

  state.timerInterval = setInterval(() => {
    if (!state.activeTimer) return;
    state.activeTimer.remaining -= 1;

    if (state.activeTimer.remaining <= 0) {
      stopExerciseTimer();
    }

    renderWorkouts();
  }, 1000);
}

function allExercises() {
  return state.program?.workouts?.flatMap((workout) => workout.exercises || []) || [];
}

function historyEntries() {
  return Object.entries(state.program?.history || {}).flatMap(([exerciseId, entries]) =>
    entries.map((entry) => ({ exerciseId, ...entry })),
  );
}

function exerciseNameById(exerciseId) {
  return allExercises().find((exercise) => exercise.id === exerciseId)?.name || "Esercizio";
}

function improvementRows() {
  return Object.entries(state.program?.history || {})
    .map(([exerciseId, entries]) => {
      if (!entries.length) return null;
      const weights = entries.map((entry) => Number(entry.weight)).filter(Number.isFinite);
      const first = weights[0] || 0;
      const best = Math.max(...weights, 0);
      const latest = weights.at(-1) || 0;
      return {
        exerciseId,
        name: exerciseNameById(exerciseId),
        first,
        best,
        latest,
        gain: Number((best - first).toFixed(2)),
        sessions: entries.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain);
}

function metricCard(label, value, detail = "") {
  const card = document.createElement("article");
  card.className = "metric-card";
  card.innerHTML = `
    <span>${label}</span>
    <strong>${value}</strong>
    <small>${detail}</small>
  `;
  return card;
}

function renderDiet() {
  els.dietGoal.value = state.diet.goal || "";
  els.dietNotes.value = state.diet.notes || "";
}

function renderImprovements() {
  els.improvementsList.innerHTML = "";
  const rows = improvementRows();

  if (!rows.length) {
    els.improvementsList.append(metricCard("Miglioramenti", "0 kg", "Salva almeno due carichi per vedere l'aumento."));
    return;
  }

  rows.slice(0, 8).forEach((row) => {
    els.improvementsList.append(
      metricCard(row.name, `+${row.gain} kg`, `Massimo ${row.best} kg · ultimo ${row.latest} kg · ${row.sessions} sessioni`),
    );
  });
}

function renderStats() {
  els.statsList.innerHTML = "";
  const entries = historyEntries();
  const exercises = allExercises();
  const rows = improvementRows();
  const totalGain = rows.reduce((sum, row) => sum + Math.max(0, row.gain), 0);
  const best = rows[0];
  const lastDate = entries
    .map((entry) => entry.date)
    .sort()
    .at(-1);

  els.statsList.append(metricCard("Esercizi", exercises.length, "nella scheda salvata"));
  els.statsList.append(metricCard("Carichi salvati", entries.length, "sessioni registrate"));
  els.statsList.append(metricCard("Incremento totale", `+${Number(totalGain.toFixed(1))} kg`, "somma dei migliori aumenti"));
  els.statsList.append(metricCard("Migliore esercizio", best ? best.name : "-", best ? `+${best.gain} kg` : "Aggiungi carichi"));
  els.statsList.append(metricCard("Ultimo allenamento", lastDate ? formatDate(lastDate) : "-", "ultima data registrata"));
}

function renderProgressPhotos() {
  els.progressPhotoGrid.innerHTML = "";

  if (!state.progressPhotos.length) {
    els.progressPhotoGrid.innerHTML = '<p class="empty-state">Aggiungi la prima foto per iniziare il confronto.</p>';
    return;
  }

  state.progressPhotos.forEach((photo) => {
    const card = document.createElement("article");
    card.className = "progress-photo-card";
    card.innerHTML = `
      <img src="${photo.dataUrl}" alt="Foto progresso" />
      <div>
        <strong>${formatDate(photo.date)}</strong>
        <button class="remove-mini" type="button">Togli</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => {
      state.progressPhotos = state.progressPhotos.filter((item) => item.id !== photo.id);
      saveState();
      renderProgressPhotos();
    });
    els.progressPhotoGrid.append(card);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
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
  const restSeconds = parseRestSeconds(exercise.rest);
  const isDone = Boolean(state.completedExercises[completionKey(exercise.id)]);
  const timerActive = state.activeTimer?.exerciseId === exercise.id;
  const timerLabel = timerActive ? formatTimer(Math.max(0, state.activeTimer.remaining)) : formatTimer(restSeconds);
  card.innerHTML = `
    <div class="exercise-header">
      <label class="exercise-name-field">
        <span>Nome esercizio</span>
        <input class="exercise-name-input" type="text" value="${escapeHtml(exercise.name)}" placeholder="Esercizio" />
      </label>
      <button class="done-button ${isDone ? "done" : ""}" type="button" aria-label="Segna esercizio fatto">${isDone ? "✓" : "V"}</button>
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
    <div class="exercise-actions">
      <button class="timer-button ${timerActive ? "running" : ""}" type="button">
        Timer ${timerLabel}
      </button>
      <span>Recupero: ${exercise.rest || `${restSeconds} sec`}</span>
    </div>
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

  card.querySelector(".done-button").addEventListener("click", () => {
    const key = completionKey(exercise.id);
    if (state.completedExercises[key]) {
      delete state.completedExercises[key];
    } else {
      state.completedExercises[key] = { date: todayISO(), exerciseId: exercise.id };
    }
    saveState();
    renderWorkouts();
  });

  card.querySelector(".timer-button").addEventListener("click", () => {
    startExerciseTimer(exercise.id, restSeconds);
  });

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

function renderWorkoutTools(workout, workoutIndex) {
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
    workout.title = event.target.value.trim() || `Allenamento ${workoutIndex + 1}`;
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
    state.program.workouts.splice(workoutIndex, 1);
    state.selectedWorkout = Math.max(0, state.selectedWorkout - 1);
    saveState();
    renderWorkouts();
  });

  return tools;
}

function renderWorkoutBox(workout, workoutIndex) {
  const isOpen = workoutIndex === state.selectedWorkout;
  const box = document.createElement("article");
  box.className = `workout-box ${isOpen ? "active" : ""}`;

  const header = document.createElement("button");
  header.className = "workout-box-header";
  header.type = "button";
  header.innerHTML = `
    <span>${escapeHtml(workout.title || `Allenamento ${workoutIndex + 1}`)}</span>
    <small>${workout.exercises.length || 0} esercizi</small>
  `;
  header.addEventListener("click", () => {
    state.selectedWorkout = workoutIndex;
    saveState();
    renderWorkouts();
  });
  box.append(header);

  if (!isOpen) return box;

  const content = document.createElement("div");
  content.className = "workout-box-content";
  content.append(renderWorkoutTools(workout, workoutIndex));

  if (!workout.exercises.length) {
    content.insertAdjacentHTML("beforeend", '<p class="empty-state">Aggiungi il primo esercizio di questo allenamento.</p>');
  }

  workout.exercises.forEach((exercise) => {
    content.append(renderExerciseCard(exercise));
  });

  box.append(content);
  return box;
}

function renderAddWorkoutButton() {
  const button = document.createElement("button");
  button.className = "secondary-button full-button add-workout-box";
  button.type = "button";
  button.textContent = "Aggiungi allenamento";
  button.addEventListener("click", () => {
    state.program.workouts.push(emptyWorkout(state.program.workouts.length));
    state.selectedWorkout = state.program.workouts.length - 1;
    saveState();
    renderWorkouts();
  });
  return button;
}

function renderWorkouts() {
  if (!state.program) return;
  renderProgramSummary();
  renderCalendar();
  els.exerciseList.innerHTML = "";

  if (!state.program.workouts.length) {
    state.program.workouts = ensureThreeWorkouts([]);
  }

  state.selectedWorkout = Math.min(state.selectedWorkout, Math.max(0, state.program.workouts.length - 1));

  state.program.workouts.forEach((workout, workoutIndex) => {
    els.exerciseList.append(renderWorkoutBox(workout, workoutIndex));
  });

  els.exerciseList.append(renderAddWorkoutButton());

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
  state.selectedPreviewWorkout = 0;
  saveDraft();
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

els.loginButton.addEventListener("click", loginProfile);
els.profileName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginProfile();
});
els.profilePin.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginProfile();
});

els.logoutApp.addEventListener("click", logoutProfile);

els.featureNav.addEventListener("click", (event) => {
  const button = event.target.closest(".feature-card");
  if (!button) return;
  setActiveView(button.dataset.view);
});

els.saveDiet.addEventListener("click", () => {
  state.diet = {
    goal: els.dietGoal.value.trim(),
    notes: els.dietNotes.value.trim(),
  };
  saveState();
});

els.progressPhotoInput.addEventListener("change", async (event) => {
  const files = [...(event.target.files || [])];
  if (!files.length) return;

  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    state.progressPhotos.unshift({
      id: uid("photo"),
      date: todayISO(),
      dataUrl,
    });
  }

  event.target.value = "";
  saveState();
  renderProgressPhotos();
});

els.prevCalendarWeek.addEventListener("click", () => {
  state.selectedCalendarStart = addDaysISO(state.selectedCalendarStart || weekStartISO(todayISO()), -7);
  saveState();
  renderCalendar();
});

els.nextCalendarWeek.addEventListener("click", () => {
  state.selectedCalendarStart = addDaysISO(state.selectedCalendarStart || weekStartISO(todayISO()), 7);
  saveState();
  renderCalendar();
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
  clearDraft();
  renderWorkouts();
});

els.newImport.addEventListener("click", () => {
  state.parsedWorkouts = cloneWorkouts(state.program?.workouts || []);
  state.selectedPreviewWorkout = 0;
  saveDraft();
  renderPreview();
  showOnly("preview");
});

els.resetApp.addEventListener("click", () => {
  if (!confirm("Vuoi cancellare scheda e progressi salvati in questo profilo?")) return;
  localStorage.removeItem(profileKey(STORAGE_KEY));
  localStorage.removeItem(profileKey(DRAFT_KEY));
  clearDraft();
  state.program = null;
  state.parsedWorkouts = [];
  state.selectedWorkout = 0;
  state.diet = { goal: "", notes: "" };
  state.progressPhotos = [];
  els.planText.value = "";
  state.activeView = "workouts";
  setActiveView("workouts");
});

loadActiveProfile();
