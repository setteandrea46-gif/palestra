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
  archivedPrograms: [],
  selectedWorkout: 0,
  selectedPreviewWorkout: 0,
  selectedImages: [],
  diet: { goal: "", notes: "" },
  progressPhotos: [],
  bodyMetrics: [],
  sessions: [],
  calendar: {},
  selectedCalendarStart: null,
  selectedCalendarDate: null,
  calendarOpen: false,
  activeEntryDate: null,
  completedExercises: {},
  activeTimer: null,
  timerInterval: null,
  lastWorkoutSummary: null,
};

const els = {
  loginSection: document.querySelector("#loginSection"),
  profileName: document.querySelector("#profileName"),
  profilePin: document.querySelector("#profilePin"),
  loginButton: document.querySelector("#loginButton"),
  loginStatus: document.querySelector("#loginStatus"),
  activeProfile: document.querySelector("#activeProfile"),
  appName: document.querySelector("#appName"),
  pageTitle: document.querySelector("#pageTitle"),
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
  bodyMapSection: document.querySelector("#bodyMapSection"),
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
  workoutSummary: document.querySelector("#workoutSummary"),
  programDates: document.querySelector("#programDates"),
  newImport: document.querySelector("#newImport"),
  prevCalendarWeek: document.querySelector("#prevCalendarWeek"),
  nextCalendarWeek: document.querySelector("#nextCalendarWeek"),
  calendarToggle: document.querySelector("#calendarToggle"),
  calendarBackdrop: document.querySelector("#calendarBackdrop"),
  calendarPanel: document.querySelector("#calendarPanel"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarStrip: document.querySelector("#calendarStrip"),
  calendarDayActions: document.querySelector("#calendarDayActions"),
  historyTemplate: document.querySelector("#historyTemplate"),
  dietGoal: document.querySelector("#dietGoal"),
  dietNotes: document.querySelector("#dietNotes"),
  saveDiet: document.querySelector("#saveDiet"),
  improvementsList: document.querySelector("#improvementsList"),
  statsList: document.querySelector("#statsList"),
  sessionHistory: document.querySelector("#sessionHistory"),
  exportBackup: document.querySelector("#exportBackup"),
  printReport: document.querySelector("#printReport"),
  backupFileInput: document.querySelector("#backupFileInput"),
  bodyWeight: document.querySelector("#bodyWeight"),
  bodyMeasures: document.querySelector("#bodyMeasures"),
  saveBodyMetrics: document.querySelector("#saveBodyMetrics"),
  bodyMapList: document.querySelector("#bodyMapList"),
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

  if (!pin) {
    els.loginStatus.textContent = "Inserisci un PIN per proteggere questo profilo.";
    els.profilePin.focus();
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
  state.archivedPrograms = [];
  state.parsedWorkouts = [];
  state.selectedWorkout = 0;
  state.selectedPreviewWorkout = 0;
  state.diet = { goal: "", notes: "" };
  state.progressPhotos = [];
  setLoggedLayout(false);
}

function todayISO() {
  return dateToLocalISO(new Date());
}

function dateFromISO(dateISO) {
  return new Date(`${dateISO}T00:00:00`);
}

function dateToLocalISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDaysISO(dateISO, days) {
  const date = dateFromISO(dateISO);
  date.setDate(date.getDate() + days);
  return dateToLocalISO(date);
}

function weekStartISO(dateISO) {
  const date = dateFromISO(dateISO);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return dateToLocalISO(date);
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

function formatMonth(dateISO) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(dateFromISO(dateISO));
}

function monthStartISO(dateISO) {
  const date = dateFromISO(dateISO);
  date.setDate(1);
  return dateToLocalISO(date);
}

function addMonthsISO(dateISO, months) {
  const date = dateFromISO(dateISO);
  date.setMonth(date.getMonth() + months, 1);
  return dateToLocalISO(date);
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

function activeLogDate() {
  return state.activeEntryDate || todayISO();
}

function completionKey(exerciseId, dateISO = activeLogDate()) {
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
      sessionWeights: Array.isArray(exercise.sessionWeights) ? exercise.sessionWeights : [],
      done: Boolean(exercise.done),
      muscle: exercise.muscle || "",
    })),
  }));
}

function saveState() {
  localStorage.setItem(
    profileKey(STORAGE_KEY),
    JSON.stringify({
      program: state.program,
      archivedPrograms: state.archivedPrograms,
      selectedWorkout: state.selectedWorkout,
      diet: state.diet,
      progressPhotos: state.progressPhotos,
      bodyMetrics: state.bodyMetrics,
      sessions: state.sessions,
      calendar: state.calendar,
      completedExercises: state.completedExercises,
      selectedCalendarStart: state.selectedCalendarStart,
      selectedCalendarDate: state.selectedCalendarDate,
      calendarOpen: state.calendarOpen,
      activeEntryDate: state.activeEntryDate,
      activeView: state.activeView,
      lastWorkoutSummary: state.lastWorkoutSummary,
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
  state.archivedPrograms = [];
  state.parsedWorkouts = [];
  state.selectedWorkout = 0;
  state.selectedPreviewWorkout = 0;
  state.diet = { goal: "", notes: "" };
  state.progressPhotos = [];
  state.bodyMetrics = [];
  state.sessions = [];
  state.calendar = {};
  state.completedExercises = {};
  state.selectedCalendarStart = monthStartISO(todayISO());
  state.selectedCalendarDate = null;
  state.calendarOpen = false;
  state.activeEntryDate = null;
  state.lastWorkoutSummary = null;
  state.activeView = "workouts";

  const raw = localStorage.getItem(profileKey(STORAGE_KEY)) || localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      state.program = saved.program;
      state.archivedPrograms = saved.archivedPrograms || [];
      state.selectedWorkout = saved.selectedWorkout ?? 0;
      state.activeView = saved.activeView || "workouts";
      state.diet = saved.diet || { goal: "", notes: "" };
      state.progressPhotos = saved.progressPhotos || [];
      state.bodyMetrics = saved.bodyMetrics || [];
      state.sessions = saved.sessions || [];
      state.calendar = saved.calendar || {};
      state.completedExercises = saved.completedExercises || {};
      state.selectedCalendarStart = saved.selectedCalendarStart || monthStartISO(todayISO());
      state.selectedCalendarDate = saved.selectedCalendarDate || null;
      state.calendarOpen = Boolean(saved.calendarOpen);
      state.activeEntryDate = saved.activeEntryDate || null;
      state.lastWorkoutSummary = saved.lastWorkoutSummary || null;
      if (state.program?.workouts) {
        state.program.workouts = cloneWorkouts(state.program.workouts);
        state.program.history = state.program.history || {};
        if (state.selectedWorkout !== null) {
          state.selectedWorkout = Math.min(state.selectedWorkout, Math.max(0, state.program.workouts.length - 1));
        }
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
      state.selectedPreviewWorkout = draft.selectedPreviewWorkout ?? 0;
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

function normalizeWorkoutWord(value) {
  return String(value || "")
    .replace(/[0οΟ]/g, "o")
    .replace(/w[o0]\s*r\s*k\s*[o0]\s*u\s*t/gi, "workout")
    .replace(/\s+/g, " ")
    .trim();
}

function workoutHeadingMatch(line) {
  const cleaned = normalizeWorkoutWord(line);
  return cleaned.match(/\b(allenamento|workout|work out|giorno|day|sessione)\s*[:#-]?\s*([a-c]|\d+|uno|due|tre|quattro|cinque)?\b/i);
}

function isWorkoutHeading(line) {
  return Boolean(workoutHeadingMatch(line));
}

function workoutNumberFrom(line) {
  const match = workoutHeadingMatch(line);
  const rawSuffix = match?.[2]?.toLowerCase();
  const words = { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, a: 1, b: 2, c: 3 };
  const number = words[rawSuffix] || Number(rawSuffix);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function workoutTitleFrom(line, index) {
  const match = workoutHeadingMatch(line);
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

function splitSingleWorkoutIntoThree(workouts) {
  if (workouts.length !== 1 || workouts[0].exercises.length < 9) return workouts;

  const exercises = workouts[0].exercises;
  const chunkSize = Math.ceil(exercises.length / 3);
  return [0, 1, 2].map((index) => ({
    id: index === 0 ? workouts[0].id : uid("workout"),
    title: `Allenamento ${index + 1}`,
    exercises: exercises.slice(index * chunkSize, (index + 1) * chunkSize),
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
    .replace(/[|]/g, "\n")
    .replace(/\b(W\s*[O0]\s*R\s*K\s*[O0]\s*U\s*T|WORK\s*OUT|W[O0]RK[O0]UT|Allenamento|Giorno|Day)\s*[:#-]?\s*([1-9A-C])\b/gi, "\nWORKOUT $2\n")
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
      const headingNumber = workoutNumberFrom(line);
      const targetIndex = headingNumber ? headingNumber - 1 : workouts.length;
      current = {
        id: workouts[targetIndex]?.id || uid("workout"),
        title: workoutTitleFrom(line, targetIndex),
        exercises: workouts[targetIndex]?.exercises || [],
      };
      workouts[targetIndex] = current;
      return;
    }

    const exercise = parseExerciseLine(line);
    if (!exercise) return;

    if (!current) {
      current = workouts[0] || emptyWorkout(0);
      current.exercises = [];
      workouts[0] = current;
    }

    current.exercises.push(exercise);
  });

  return workouts.filter((workout) => workout?.exercises?.length > 0);
}

function showOnly(section) {
  [
    els.importSection,
    els.previewSection,
    els.durationSection,
    els.dietSection,
    els.improvementsSection,
    els.statsSection,
    els.bodyMapSection,
    els.photosSection,
  ].forEach((el) => el.classList.add("hidden"));
  els.workoutSection.classList.toggle("hidden", section !== "workouts");

  if (section === "import") els.importSection.classList.remove("hidden");
  if (section === "preview") els.previewSection.classList.remove("hidden");
  if (section === "duration") els.durationSection.classList.remove("hidden");
  if (section === "diet") els.dietSection.classList.remove("hidden");
  if (section === "improvements") els.improvementsSection.classList.remove("hidden");
  if (section === "stats") els.statsSection.classList.remove("hidden");
  if (section === "bodymap") els.bodyMapSection.classList.remove("hidden");
  if (section === "photos") els.photosSection.classList.remove("hidden");
}

function setActiveView(view) {
  state.activeView = view;
  const titles = {
    workouts: "Allenamenti",
    diet: "Dieta",
    improvements: "Miglioramenti",
    stats: "Statistiche",
    bodymap: "Mappa corpo",
    photos: "Foto",
  };
  els.pageTitle.textContent = titles[view] || "Allenamenti";
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

  if (view === "bodymap") {
    renderBodyMap();
    showOnly("bodymap");
  }

  if (view === "photos") {
    renderProgressPhotos();
    showOnly("photos");
  }

  saveState();
}

function renderApp() {
  setLoggedLayout(true);
  const profileAppName = `Scheda ${state.activeProfile.name}`;
  document.title = profileAppName;
  els.appName.textContent = profileAppName;
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
      sessionWeights: [...row.querySelectorAll(".preview-set-weight-input")]
        .map((input) => Number(input.value))
        .filter((weight) => Number.isFinite(weight) && weight > 0),
      done: row.classList.contains("is-done"),
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
  if (state.selectedPreviewWorkout !== null) {
    state.selectedPreviewWorkout = Math.min(state.selectedPreviewWorkout, Math.max(0, state.parsedWorkouts.length - 1));
  }

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
        <button class="remove-day" type="button">${isOpen ? "Chiudi" : "Togli"}</button>
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
      if (isOpen) {
        updatePreviewModelFromInputs();
        state.selectedPreviewWorkout = null;
        saveDraft();
        renderPreview();
        return;
      }

      card.remove();
      updatePreviewModelFromInputs();
      if (state.selectedPreviewWorkout !== null) {
        state.selectedPreviewWorkout = Math.max(0, Math.min(state.selectedPreviewWorkout, state.parsedWorkouts.length - 1));
      }
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
  if (status === "planned") return "0";
  if (status === "done") return "V";
  return "";
}

function latestSessionByDate(dateISO) {
  return state.sessions
    .filter((session) => session.date === dateISO)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")))[0];
}

function setCalendarStatus(dateISO, status) {
  if (status) {
    state.calendar[dateISO] = status;
  } else {
    delete state.calendar[dateISO];
  }
  saveState();
  renderCalendar();
}

function openWorkoutForDate(dateISO, workoutIndex) {
  state.activeEntryDate = dateISO;
  state.selectedWorkout = workoutIndex;
  state.calendarOpen = false;
  saveState();
  renderWorkouts();
}

function renderCalendarDayActions(dateISO) {
  if (!els.calendarDayActions) return;
  if (!dateISO) {
    els.calendarDayActions.classList.add("hidden");
    els.calendarDayActions.innerHTML = "";
    return;
  }

  const session = latestSessionByDate(dateISO);
  els.calendarDayActions.classList.remove("hidden");
  els.calendarDayActions.innerHTML = `
    <strong>${formatDate(dateISO)}</strong>
    <div class="calendar-action-grid">
      <button type="button" data-status="done">V Fatto</button>
      <button type="button" data-status="planned">0 Da fare</button>
      <button type="button" data-status="">Vuoto</button>
    </div>
    ${session ? `<p>Gia salvato: ${escapeHtml(session.workoutTitle)}. Puoi riaprirlo o aggiungere pesi mancanti.</p>` : "<p>Scegli un allenamento da compilare per questa data.</p>"}
    <div class="calendar-workout-grid">
      ${(state.program?.workouts || [])
        .map((workout, index) => `<button type="button" data-workout-index="${index}">${escapeHtml(workout.title || `Allenamento ${index + 1}`)}</button>`)
        .join("")}
    </div>
  `;

  els.calendarDayActions.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => setCalendarStatus(dateISO, button.dataset.status));
  });
  els.calendarDayActions.querySelectorAll("[data-workout-index]").forEach((button) => {
    button.addEventListener("click", () => openWorkoutForDate(dateISO, Number(button.dataset.workoutIndex)));
  });
}

function renderCalendar() {
  if (!els.calendarStrip) return;
  els.calendarPanel.classList.toggle("collapsed", !state.calendarOpen);
  els.calendarBackdrop.classList.toggle("hidden", !state.calendarOpen);
  els.calendarToggle.setAttribute("aria-expanded", String(state.calendarOpen));
  els.calendarToggle.textContent = state.calendarOpen ? "X" : "Cal";
  const start = monthStartISO(state.selectedCalendarStart || todayISO());
  state.selectedCalendarStart = start;
  els.calendarTitle.textContent = formatMonth(start);
  els.calendarStrip.innerHTML = "";
  els.calendarStrip.classList.add("month-grid");
  ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"].forEach((label) => {
    const weekday = document.createElement("span");
    weekday.className = "calendar-weekday";
    weekday.textContent = label;
    els.calendarStrip.append(weekday);
  });

  const startDate = dateFromISO(start);
  const firstWeekday = startDate.getDay() || 7;
  const monthIndex = startDate.getMonth();
  const daysInMonth = new Date(startDate.getFullYear(), monthIndex + 1, 0).getDate();

  for (let index = 1; index < firstWeekday; index += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-spacer";
    els.calendarStrip.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateISO = `${start.slice(0, 8)}${String(day).padStart(2, "0")}`;
    const status = state.calendar[dateISO] || "";
    const session = latestSessionByDate(dateISO);
    const button = document.createElement("button");
    button.className = `calendar-day ${status ? `is-${status}` : ""} ${session ? "has-session" : ""} ${dateISO === state.selectedCalendarDate ? "selected" : ""} ${dateISO === todayISO() ? "today" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <strong>${day}</strong>
      <span>${calendarStatusLabel(status)}</span>
      ${session ? `<small>${escapeHtml(session.workoutTitle)}</small>` : ""}
    `;
    button.addEventListener("click", () => {
      state.selectedCalendarDate = dateISO;
      saveState();
      renderCalendar();
    });
    els.calendarStrip.append(button);
  }

  renderCalendarDayActions(state.selectedCalendarDate);
}

function getExerciseHistory(exerciseId) {
  return state.program.history[exerciseId] || [];
}

function setCountFromExercise(exercise) {
  const count = Number.parseInt(exercise.sets, 10);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 12) : 3;
}

function entryWeights(entry) {
  if (Array.isArray(entry.weights)) {
    return entry.weights.map(Number).filter((weight) => Number.isFinite(weight) && weight > 0);
  }

  const weight = Number(entry.weight);
  return Number.isFinite(weight) && weight > 0 ? [weight] : [];
}

function entryBestWeight(entry) {
  const weights = entryWeights(entry);
  return weights.length ? Math.max(...weights) : 0;
}

function entryWeightsLabel(entry) {
  const weights = entryWeights(entry);
  return weights.length ? weights.map((weight) => `${weight} kg`).join(" / ") : "senza peso";
}

function normaliseWeights(weights) {
  return weights.map(Number).filter((weight) => Number.isFinite(weight) && weight > 0);
}

function saveExerciseSession(exercise, weights, dateISO = activeLogDate()) {
  const cleanWeights = normaliseWeights(weights);
  if (!cleanWeights.length) return false;

  const key = completionKey(exercise.id, dateISO);
  state.completedExercises[key] = { date: dateISO, exerciseId: exercise.id };
  state.program.history[exercise.id] = [
    ...getExerciseHistory(exercise.id),
    {
      date: dateISO,
      weights: cleanWeights.map((weight) => Number(weight.toFixed(2))),
      weight: Number(Math.max(...cleanWeights).toFixed(2)),
      sets: exercise.sets || "",
      completedSets: cleanWeights.length,
      reps: exercise.reps || "",
    },
  ];
  exercise.sessionWeights = [];
  return true;
}

function resetWorkoutSession(workout, dateISO = activeLogDate()) {
  const exerciseIds = new Set((workout.exercises || []).map((exercise) => exercise.id));

  workout.exercises.forEach((exercise) => {
    exercise.sessionWeights = [];
    delete state.completedExercises[completionKey(exercise.id, dateISO)];
  });

  if (state.activeTimer && exerciseIds.has(state.activeTimer.exerciseId)) {
    stopExerciseTimer();
  }
}

function latestWeightLabel(exerciseId) {
  const history = getExerciseHistory(exerciseId);
  if (!history.length) return "Nessun peso salvato";
  const latest = history.at(-1);
  return `Ultima sessione: ${entryWeightsLabel(latest)} il ${formatDate(latest.date)}`;
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

  const maxWeight = Math.max(...history.map(entryBestWeight), 1);
  history.slice(-8).forEach((entry) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    const bestWeight = entryBestWeight(entry);
    bar.title = `${bestWeight} kg`;
    bar.style.height = `${Math.max(14, (bestWeight / maxWeight) * 100)}%`;
    chart.append(bar);
  });

  history
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = `${formatDate(entry.date)} - ${entryWeightsLabel(entry)}${entry.completedSets ? ` - ${entry.completedSets} serie` : ""}`;
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
      if (navigator.vibrate) navigator.vibrate([220, 90, 220]);
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

const MUSCLE_OPTIONS = ["Petto", "Dorso", "Gambe", "Spalle", "Bicipiti", "Tricipiti", "Addome", "Glutei", "Polpacci", "Altro"];

function detectMuscle(exercise) {
  if (exercise.muscle) return exercise.muscle;
  const name = normalizeExerciseName(exercise.name || "");
  const rules = [
    ["Petto", ["panca", "chest", "croci", "push-up", "pushup", "pectoral"]],
    ["Dorso", ["lat", "pulley", "rematore", "row", "trazioni", "pull-up", "pullup", "dorso"]],
    ["Gambe", ["squat", "press", "leg", "affondi", "lunge", "extension", "curl-seduto"]],
    ["Spalle", ["shoulder", "lento", "alzate", "deltoidi", "military"]],
    ["Bicipiti", ["curl", "bicipiti"]],
    ["Tricipiti", ["tricipiti", "push-down", "pushdown", "french"]],
    ["Addome", ["crunch", "plank", "addome", "russian", "sit-up", "situp"]],
    ["Glutei", ["glute", "hip-thrust", "abductor", "abduzioni"]],
    ["Polpacci", ["calf", "polpacci", "calf-raise"]],
  ];
  return rules.find(([, keys]) => keys.some((key) => name.includes(key)))?.[0] || "Altro";
}

function improvementRows() {
  return Object.entries(state.program?.history || {})
    .map(([exerciseId, entries]) => {
      if (!entries.length) return null;
      const weights = entries.map(entryBestWeight).filter((weight) => Number.isFinite(weight) && weight > 0);
      const first = weights[0] || 0;
      const best = Math.max(...weights, 0);
      const latest = weights.at(-1) || 0;
      const previous = weights.length > 1 ? weights.at(-2) : latest;
      const percent = first ? Number((((latest - first) / first) * 100).toFixed(1)) : 0;
      return {
        exerciseId,
        name: exerciseNameById(exerciseId),
        entries,
        first,
        best,
        latest,
        previous,
        trend: latest > previous ? "up" : latest < previous ? "down" : "same",
        gain: Number((best - first).toFixed(2)),
        percent,
        sessions: entries.length,
      };
    })
    .filter(Boolean);
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

function lineChartSvg(entries) {
  const points = entries.map((entry) => entryBestWeight(entry)).filter((weight) => weight > 0);
  if (!points.length) return '<div class="mini-line empty-state">Nessun dato</div>';
  const width = 280;
  const height = 110;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const coords = points.map((weight, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((weight - min) / range) * (height - 18) - 9;
    return [x, y];
  });
  const path = coords
    .map(([x, y], index) => {
      if (index === 0) return `M ${x} ${y}`;
      const [prevX, prevY] = coords[index - 1];
      const midX = (prevX + x) / 2;
      return `C ${midX} ${prevY}, ${midX} ${y}, ${x} ${y}`;
    })
    .join(" ");
  const lastDown = points.length > 1 && points.at(-1) < points.at(-2);
  const dots = coords.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"></circle>`).join("");
  return `
    <svg class="mini-line ${lastDown ? "down" : "up"}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico progressi">
      <path d="${path}"></path>
      ${dots}
    </svg>
  `;
}

function renderImprovementCard(row) {
  const card = document.createElement("article");
  card.className = `improvement-card trend-${row.trend}`;
  const detailRows = row.entries
    .slice()
    .reverse()
    .map((entry) => `<li>${formatDate(entry.date)} - ${entryWeightsLabel(entry)}${entry.completedSets ? ` - ${entry.completedSets} serie` : ""}${entry.reps ? ` - ${entry.reps} rip.` : ""}</li>`)
    .join("");
  card.innerHTML = `
    <button class="improvement-head" type="button">
      <span>${escapeHtml(row.name)}</span>
      <strong>${row.gain >= 0 ? "+" : ""}${row.gain} kg</strong>
      <small>${row.percent >= 0 ? "+" : ""}${row.percent}% · ultimo ${row.latest} kg</small>
    </button>
    ${lineChartSvg(row.entries)}
    <div class="improvement-detail hidden">
      <p>${row.trend === "down" ? "Ultima sessione più bassa della precedente." : "Andamento stabile o in crescita."}</p>
      <ol>${detailRows}</ol>
    </div>
  `;
  card.querySelector(".improvement-head").addEventListener("click", () => {
    card.querySelector(".improvement-detail").classList.toggle("hidden");
  });
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
    els.improvementsList.append(metricCard("Miglioramenti", "0 kg", "Salva almeno un allenamento per vedere i grafici."));
    return;
  }

  rows.forEach((row) => els.improvementsList.append(renderImprovementCard(row)));
}

function muscleOptionsMarkup(selected) {
  return MUSCLE_OPTIONS.map((muscle) => `<option value="${muscle}" ${muscle === selected ? "selected" : ""}>${muscle}</option>`).join("");
}

function renderBodyMap() {
  els.bodyMapList.innerHTML = "";

  if (!state.program?.workouts?.length) {
    els.bodyMapList.append(metricCard("Mappa corpo", "-", "Salva una scheda per vedere i gruppi muscolari."));
    return;
  }

  state.program.workouts.forEach((workout, workoutIndex) => {
    const counts = new Map(MUSCLE_OPTIONS.map((muscle) => [muscle, 0]));
    (workout.exercises || []).forEach((exercise) => {
      const muscle = detectMuscle(exercise);
      counts.set(muscle, (counts.get(muscle) || 0) + 1);
    });

    const activeMuscles = [...counts.entries()].filter(([, count]) => count > 0);
    const missingMuscles = MUSCLE_OPTIONS.filter((muscle) => muscle !== "Altro" && !counts.get(muscle));
    const card = document.createElement("article");
    card.className = "body-map-card";
    card.innerHTML = `
      <div class="body-map-head">
        <h3>${escapeHtml(workout.title || `Allenamento ${workoutIndex + 1}`)}</h3>
        <small>${workout.exercises.length || 0} esercizi</small>
      </div>
      <div class="muscle-chip-grid">
        ${
          activeMuscles.length
            ? activeMuscles.map(([muscle, count]) => `<span>${muscle}: <strong>${count}</strong> esercizi</span>`).join("")
            : "<span>Nessun esercizio</span>"
        }
      </div>
      <p class="missing-muscles">Mancano: ${missingMuscles.slice(0, 5).join(", ") || "nessun gruppo principale"}</p>
      <div class="muscle-editor"></div>
    `;

    const editor = card.querySelector(".muscle-editor");
    (workout.exercises || []).forEach((exercise) => {
      const selected = detectMuscle(exercise);
      const row = document.createElement("label");
      row.className = "muscle-row";
      row.innerHTML = `
        <span>${escapeHtml(exercise.name || "Esercizio")}</span>
        <select class="muscle-select" data-exercise-id="${escapeHtml(exercise.id)}">
          ${muscleOptionsMarkup(selected)}
        </select>
      `;
      row.querySelector("select").addEventListener("change", (event) => {
        exercise.muscle = event.target.value;
        saveState();
        renderBodyMap();
      });
      editor.append(row);
    });

    els.bodyMapList.append(card);
  });
}

function buildWorkoutSummary(workout, savedCount, skippedCount, savedExercises, dateISO = activeLogDate()) {
  const bestExercise = savedExercises
    .map((exercise) => {
      const latest = getExerciseHistory(exercise.id).at(-1);
      return {
        name: exercise.name || "Esercizio",
        weight: latest ? entryBestWeight(latest) : 0,
      };
    })
    .sort((a, b) => b.weight - a.weight)[0];

  return {
    date: dateISO,
    title: workout.title || "Allenamento",
    savedCount,
    skippedCount,
    bestExercise: bestExercise?.weight ? bestExercise : null,
  };
}

function createSessionRecord(workout, savedExercises, skippedCount, dateISO = activeLogDate()) {
  return {
    id: uid("session"),
    date: dateISO,
    savedAt: new Date().toISOString(),
    workoutId: workout.id,
    workoutTitle: workout.title || "Allenamento",
    skippedCount,
    bestExercise: buildWorkoutSummary(workout, savedExercises.length, skippedCount, savedExercises, dateISO).bestExercise,
    exercises: savedExercises.map((exercise) => {
      const latest = getExerciseHistory(exercise.id).at(-1);
      return {
        exerciseId: exercise.id,
        name: exercise.name || "Esercizio",
        muscle: detectMuscle(exercise),
        sets: latest?.sets || exercise.sets || "",
        reps: latest?.reps || exercise.reps || "",
        weights: latest?.weights || [],
      };
    }),
  };
}

function renderWorkoutSummary() {
  if (state.activeEntryDate) {
    els.workoutSummary.classList.remove("hidden");
    els.workoutSummary.innerHTML = `
      <div>
        <span>Registrazione data</span>
        <strong>Stai inserendo pesi per ${formatDate(state.activeEntryDate)}</strong>
      </div>
      <p>Compila l'allenamento e premi Manda a miglioramenti.</p>
      <small>Dopo l'invio questa pagina torna alla data di oggi.</small>
    `;
    return;
  }

  if (!state.lastWorkoutSummary) {
    els.workoutSummary.classList.add("hidden");
    els.workoutSummary.innerHTML = "";
    return;
  }

  const summary = state.lastWorkoutSummary;
  els.workoutSummary.classList.remove("hidden");
  els.workoutSummary.innerHTML = `
    <div>
      <span>Ultimo invio</span>
      <strong>${escapeHtml(summary.title)} - ${formatDate(summary.date)}</strong>
    </div>
    <p>${summary.savedCount} esercizi mandati a miglioramenti. ${summary.skippedCount} saltati.</p>
    <small>${summary.bestExercise ? `Carico piu alto: ${escapeHtml(summary.bestExercise.name)} ${summary.bestExercise.weight} kg.` : "Nessun peso inserito in questo invio."}</small>
  `;
}

function renderStats() {
  els.statsList.innerHTML = "";
  els.sessionHistory.innerHTML = "";
  const entries = historyEntries();
  const exercises = allExercises();
  const rows = improvementRows();
  const totalGain = rows.reduce((sum, row) => sum + Math.max(0, row.gain), 0);
  const best = rows.slice().sort((a, b) => b.gain - a.gain)[0];
  const lastDate = entries
    .map((entry) => entry.date)
    .sort()
    .at(-1);

  els.statsList.append(metricCard("Esercizi", exercises.length, "nella scheda salvata"));
  els.statsList.append(metricCard("Schede archiviate", state.archivedPrograms.length, "programmi precedenti salvati"));
  els.statsList.append(metricCard("Carichi salvati", entries.length, "sessioni registrate"));
  els.statsList.append(metricCard("Incremento totale", `+${Number(totalGain.toFixed(1))} kg`, "somma dei migliori aumenti"));
  els.statsList.append(metricCard("Migliore esercizio", best ? best.name : "-", best ? `+${best.gain} kg` : "Aggiungi carichi"));
  els.statsList.append(metricCard("Ultimo allenamento", lastDate ? formatDate(lastDate) : "-", "ultima data registrata"));

  const muscleCounts = new Map();
  state.sessions.flatMap((session) => session.exercises || []).forEach((exercise) => {
    muscleCounts.set(exercise.muscle || "Altro", (muscleCounts.get(exercise.muscle || "Altro") || 0) + 1);
  });
  const topMuscle = [...muscleCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  els.statsList.append(metricCard("Gruppo piu allenato", topMuscle ? topMuscle[0] : "-", topMuscle ? `${topMuscle[1]} esercizi salvati` : "Salva allenamenti"));

  const latestMetric = state.bodyMetrics[0];
  els.statsList.append(metricCard("Peso corpo", latestMetric?.weight ? `${latestMetric.weight} kg` : "-", latestMetric ? formatDate(latestMetric.date) : "Aggiungi peso"));
  els.statsList.append(metricCard("Misure", latestMetric?.measures || "-", latestMetric ? formatDate(latestMetric.date) : "Aggiungi misure"));

  if (state.bodyMetrics.length) {
    const metricsCard = document.createElement("article");
    metricsCard.className = "session-card";
    metricsCard.innerHTML = `
      <h3>Peso e misure</h3>
      <ol>
        ${state.bodyMetrics
          .slice(0, 8)
          .map((metric) => `<li>${formatDate(metric.date)} - ${metric.weight ? `${metric.weight} kg` : "peso n/d"}${metric.measures ? ` - ${escapeHtml(metric.measures)}` : ""}</li>`)
          .join("")}
      </ol>
    `;
    els.sessionHistory.append(metricsCard);
  }

  if (state.sessions.length) {
    const historyCard = document.createElement("article");
    historyCard.className = "session-card";
    historyCard.innerHTML = `
      <h3>Cronologia allenamenti</h3>
      <ol>
        ${state.sessions
          .slice(0, 12)
          .map((session) => `<li>${formatDate(session.date)} - ${escapeHtml(session.workoutTitle)} - ${session.exercises.length} esercizi salvati</li>`)
          .join("")}
      </ol>
    `;
    els.sessionHistory.append(historyCard);
  }
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

function downloadTextFile(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function currentBackupData() {
  return {
    exportedAt: new Date().toISOString(),
    profile: state.activeProfile,
    data: {
      program: state.program,
      archivedPrograms: state.archivedPrograms,
      selectedWorkout: state.selectedWorkout,
      diet: state.diet,
      progressPhotos: state.progressPhotos,
      bodyMetrics: state.bodyMetrics,
      sessions: state.sessions,
      calendar: state.calendar,
      completedExercises: state.completedExercises,
      selectedCalendarStart: state.selectedCalendarStart,
      selectedCalendarDate: state.selectedCalendarDate,
      calendarOpen: state.calendarOpen,
      activeEntryDate: state.activeEntryDate,
      activeView: state.activeView,
      lastWorkoutSummary: state.lastWorkoutSummary,
    },
  };
}

function applyBackupData(backup) {
  const data = backup?.data || backup;
  if (!data || typeof data !== "object") throw new Error("Backup non valido");
  state.program = data.program || null;
  state.archivedPrograms = data.archivedPrograms || [];
  if (state.program?.workouts) {
    state.program.workouts = cloneWorkouts(state.program.workouts);
    state.program.history = state.program.history || {};
  }
  state.selectedWorkout = data.selectedWorkout ?? 0;
  state.diet = data.diet || { goal: "", notes: "" };
  state.progressPhotos = data.progressPhotos || [];
  state.bodyMetrics = data.bodyMetrics || [];
  state.sessions = data.sessions || [];
  state.calendar = data.calendar || {};
  state.completedExercises = data.completedExercises || {};
  state.selectedCalendarStart = data.selectedCalendarStart || monthStartISO(todayISO());
  state.selectedCalendarDate = data.selectedCalendarDate || null;
  state.calendarOpen = Boolean(data.calendarOpen);
  state.activeEntryDate = data.activeEntryDate || null;
  state.activeView = data.activeView || "workouts";
  state.lastWorkoutSummary = data.lastWorkoutSummary || null;
  saveState();
  renderApp();
}

function reportHtml() {
  const rows = improvementRows();
  const metrics = state.bodyMetrics || [];
  const sessions = state.sessions || [];
  return `
    <!doctype html>
    <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <title>Report progressi ${escapeHtml(state.activeProfile?.name || "")}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 28px; }
          h1, h2 { margin-bottom: 8px; }
          section { margin: 22px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          li { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <h1>Report progressi - ${escapeHtml(state.activeProfile?.name || "Profilo")}</h1>
        <p>Generato il ${formatDate(todayISO())}</p>
        <section>
          <h2>Miglioramenti esercizi</h2>
          <table>
            <thead><tr><th>Esercizio</th><th>Primo</th><th>Ultimo</th><th>Best</th><th>Progresso</th><th>Sessioni</th></tr></thead>
            <tbody>
              ${
                rows.length
                  ? rows
                      .map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${row.first} kg</td><td>${row.latest} kg</td><td>${row.best} kg</td><td>${row.gain >= 0 ? "+" : ""}${row.gain} kg / ${row.percent >= 0 ? "+" : ""}${row.percent}%</td><td>${row.sessions}</td></tr>`)
                      .join("")
                  : '<tr><td colspan="6">Nessun miglioramento salvato</td></tr>'
              }
            </tbody>
          </table>
        </section>
        <section>
          <h2>Peso e misure</h2>
          <ol>${metrics.length ? metrics.map((metric) => `<li>${formatDate(metric.date)} - ${metric.weight || "-"} kg - ${escapeHtml(metric.measures || "")}</li>`).join("") : "<li>Nessun dato salvato</li>"}</ol>
        </section>
        <section>
          <h2>Cronologia allenamenti</h2>
          <ol>${sessions.length ? sessions.map((session) => `<li>${formatDate(session.date)} - ${escapeHtml(session.workoutTitle)} - ${session.exercises.length} esercizi</li>`).join("") : "<li>Nessun allenamento salvato</li>"}</ol>
        </section>
      </body>
    </html>
  `;
}

function printProgressReport() {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("Il browser ha bloccato il report. Permetti i popup per questa pagina.");
    return;
  }
  reportWindow.document.write(reportHtml());
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
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
  const setCount = setCountFromExercise(exercise);
  const isDone = Boolean(state.completedExercises[completionKey(exercise.id)]);
  const timerActive = state.activeTimer?.exerciseId === exercise.id;
  const timerLabel = timerActive ? formatTimer(Math.max(0, state.activeTimer.remaining)) : formatTimer(restSeconds);
  const currentWeights = Array.isArray(exercise.sessionWeights) ? exercise.sessionWeights : [];
  const setWeightInputs = Array.from({ length: setCount }, (_, index) => `
    <label>
      <span>Serie ${index + 1}</span>
      <input class="set-weight-input" inputmode="decimal" type="number" min="0" step="0.5" value="${escapeHtml(currentWeights[index] || "")}" placeholder="kg" />
    </label>
  `).join("");

  card.innerHTML = `
    <div class="exercise-header">
      <button class="done-button ${isDone ? "done" : ""}" type="button" aria-label="Segna esercizio fatto">${isDone ? "✓" : ""}</button>
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
        <span>Ripetizioni</span>
        <input class="reps-input" type="text" value="${escapeHtml(exercise.reps)}" placeholder="8" />
      </label>
    </div>
    <div class="exercise-actions">
      <label class="rest-field">
        <span>Recupero</span>
        <input class="rest-input" type="text" value="${escapeHtml(exercise.rest)}" placeholder="90 sec" />
      </label>
      <span class="timer-stopwatch" aria-hidden="true"></span>
      <strong class="timer-readout">${timerLabel}</strong>
      <button class="timer-play ${timerActive ? "running" : ""}" type="button" aria-label="Avvia timer recupero"></button>
      <button class="timer-reset" type="button" aria-label="Reset timer"></button>
    </div>
    <p class="last-weight">${latestWeightLabel(exercise.id)}</p>
    <div class="set-weights">
      <div class="set-weight-grid">${setWeightInputs}</div>
      <button class="save-weight" type="button">Fatto</button>
    </div>
  `;

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

  card.querySelector(".timer-play").addEventListener("click", () => {
    startExerciseTimer(exercise.id, restSeconds);
  });

  card.querySelector(".timer-reset").addEventListener("click", () => {
    if (state.activeTimer?.exerciseId === exercise.id) {
      stopExerciseTimer();
      renderWorkouts();
    }
  });

  card.querySelector(".exercise-name-input").addEventListener("change", (event) => {
    updateExercise(exercise.id, { name: event.target.value.trim() || "Esercizio" });
    renderWorkouts();
  });
  card.querySelector(".sets-input").addEventListener("change", (event) => updateExercise(exercise.id, { sets: event.target.value.trim() }));
  card.querySelector(".reps-input").addEventListener("change", (event) => updateExercise(exercise.id, { reps: event.target.value.trim() }));
  card.querySelector(".rest-input").addEventListener("change", (event) => updateExercise(exercise.id, { rest: event.target.value.trim() }));

  card.querySelector(".set-weight-grid").addEventListener("input", () => {
    exercise.sessionWeights = [...card.querySelectorAll(".set-weight-input")].map((input) => input.value.trim());
    saveState();
  });

  card.querySelector(".remove-exercise-live").addEventListener("click", () => {
    const workout = state.program.workouts[state.selectedWorkout];
    workout.exercises = workout.exercises.filter((item) => item.id !== exercise.id);
    saveState();
    renderWorkouts();
  });

  card.querySelector(".save-weight").addEventListener("click", () => {
    const inputs = [...card.querySelectorAll(".set-weight-input")];
    const weights = inputs.map((input) => input.value);
    if (!saveExerciseSession(exercise, weights)) {
      inputs[0]?.focus();
      return;
    }

    saveState();
    renderWorkouts();
  });

  card.append(renderHistory(exercise));
  return card;
}

function workoutCompletionCount(workout) {
  return (workout.exercises || []).filter((exercise) => state.completedExercises[completionKey(exercise.id)]).length;
}

function renderWorkoutSquares(workout) {
  const total = Math.max(1, workout.exercises.length || 1);
  const done = workoutCompletionCount(workout);
  return Array.from({ length: total }, (_, index) => `<i class="${index < done ? "done" : ""}"></i>`).join("");
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
      <button class="secondary-button" id="closeLiveWorkout" type="button">Chiudi</button>
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

  tools.querySelector("#closeLiveWorkout").addEventListener("click", () => {
    state.selectedWorkout = null;
    saveState();
    renderWorkouts();
  });

  return tools;
}

function renderWorkoutFooter(workoutIndex) {
  const workout = state.program.workouts[workoutIndex];
  const footer = document.createElement("div");
  footer.className = "workout-footer";
  footer.innerHTML = `
    <button class="primary-button send-workout" type="button">Manda a miglioramenti</button>
    <button class="secondary-button danger-button" type="button">Togli allenamento</button>
  `;

  footer.querySelector(".send-workout").addEventListener("click", () => {
    const targetDate = activeLogDate();
    const savedExercises = [];
    workout.exercises.forEach((exercise) => {
      if (saveExerciseSession(exercise, exercise.sessionWeights || [], targetDate)) {
        savedExercises.push(exercise);
      }
    });

    const skippedCount = Math.max(0, workout.exercises.length - savedExercises.length);
    state.calendar[targetDate] = "done";
    state.lastWorkoutSummary = buildWorkoutSummary(
      workout,
      savedExercises.length,
      skippedCount,
      savedExercises,
      targetDate,
    );
    if (savedExercises.length) {
      state.sessions.unshift(createSessionRecord(workout, savedExercises, skippedCount, targetDate));
    }
    resetWorkoutSession(workout, targetDate);
    state.activeEntryDate = null;
    saveState();
    renderWorkouts();
    renderImprovements();
  });

  footer.querySelector(".danger-button").addEventListener("click", () => {
    if (state.program.workouts.length === 1) return;
    state.program.workouts.splice(workoutIndex, 1);
    state.selectedWorkout = state.program.workouts.length ? Math.min(workoutIndex, state.program.workouts.length - 1) : null;
    saveState();
    renderWorkouts();
  });

  return footer;
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
    <small>${workoutCompletionCount(workout)}/${workout.exercises.length || 0} fatti</small>
    <em class="workout-squares" aria-hidden="true">${renderWorkoutSquares(workout)}</em>
  `;
  header.addEventListener("click", () => {
    state.selectedWorkout = isOpen ? null : workoutIndex;
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

  content.append(renderWorkoutFooter(workoutIndex));
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
  renderWorkoutSummary();
  els.exerciseList.innerHTML = "";

  if (!state.program.workouts.length) {
    state.program.workouts = ensureThreeWorkouts([]);
  }

  if (state.selectedWorkout !== null) {
    state.selectedWorkout = Math.min(state.selectedWorkout, Math.max(0, state.program.workouts.length - 1));
  }

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
  state.parsedWorkouts = ensureThreeWorkouts(splitSingleWorkoutIntoThree(parsed));
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
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    els.ocrStatus.textContent = "Import PDF diretto non ancora attivo: per ora carica screenshot/foto del PDF o copia il testo.";
    event.target.value = "";
    return;
  }
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

els.calendarToggle.addEventListener("click", () => {
  state.calendarOpen = !state.calendarOpen;
  saveState();
  renderCalendar();
});

els.calendarBackdrop.addEventListener("click", () => {
  state.calendarOpen = false;
  saveState();
  renderCalendar();
});

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

els.saveBodyMetrics.addEventListener("click", () => {
  const weight = Number(els.bodyWeight.value);
  const measures = els.bodyMeasures.value.trim();
  if (!Number.isFinite(weight) && !measures) {
    els.bodyWeight.focus();
    return;
  }

  state.bodyMetrics.unshift({
    id: uid("metric"),
    date: todayISO(),
    weight: Number.isFinite(weight) && weight > 0 ? Number(weight.toFixed(1)) : "",
    measures,
  });
  els.bodyWeight.value = "";
  els.bodyMeasures.value = "";
  saveState();
  renderStats();
});

els.exportBackup.addEventListener("click", () => {
  const profileName = normalizeExerciseName(state.activeProfile?.name || "profilo");
  downloadTextFile(`scheda-${profileName}-backup.json`, JSON.stringify(currentBackupData(), null, 2));
});

els.printReport.addEventListener("click", printProgressReport);

els.backupFileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    applyBackupData(JSON.parse(await file.text()));
  } catch {
    alert("Backup non valido. Carica un file JSON esportato da questa app.");
  } finally {
    event.target.value = "";
  }
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
  const current = monthStartISO(state.selectedCalendarStart || todayISO());
  state.selectedCalendarStart = addMonthsISO(current, -1);
  saveState();
  renderCalendar();
});

els.nextCalendarWeek.addEventListener("click", () => {
  const current = monthStartISO(state.selectedCalendarStart || todayISO());
  state.selectedCalendarStart = addMonthsISO(current, 1);
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
  if (state.program) {
    state.archivedPrograms.unshift({
      ...state.program,
      archivedAt: new Date().toISOString(),
    });
  }

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
  state.archivedPrograms = [];
  state.parsedWorkouts = [];
  state.selectedWorkout = 0;
  state.diet = { goal: "", notes: "" };
  state.progressPhotos = [];
  state.bodyMetrics = [];
  state.sessions = [];
  state.calendar = {};
  state.completedExercises = {};
  state.selectedCalendarDate = null;
  state.calendarOpen = false;
  state.activeEntryDate = null;
  state.lastWorkoutSummary = null;
  els.planText.value = "";
  state.activeView = "workouts";
  setActiveView("workouts");
});

loadActiveProfile();
