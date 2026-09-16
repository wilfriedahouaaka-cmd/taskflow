/*
  =====================================================
  TASK FLOW — SCRIPT GLOBAL (version finale)
  =====================================================
*/

const STORAGE_KEYS = {
  profile: "taskflow-profile",
  tasks: "taskflow-tasks",
  history: "taskflow-history",
  theme: "taskflow-theme",
  tempTasks: "taskflow-temp-tasks"
};

/* =====================================================
   STOCKAGE LOCAL
   ===================================================== */

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value);
  } catch (error) {
    console.error("Erreur de lecture localStorage :", error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Erreur d'écriture localStorage :", error);
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Erreur de suppression localStorage :", error);
  }
}

/* =====================================================
   UTILITAIRES DOM
   ===================================================== */

function select(selector) {
  return document.querySelector(selector);
}

function selectAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function setText(selector, value, fallback = "") {
  const element = select(selector);
  if (!element) return;
  element.textContent = value || fallback;
}

function addListener(selector, eventName, handler) {
  const element = select(selector);
  if (!element) return;
  element.addEventListener(eventName, handler);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =====================================================
   THÈME
   ===================================================== */

function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", selectedTheme);

  const themeButton = select("#themeButton");
  if (themeButton) {
    themeButton.textContent = selectedTheme === "dark" ? "☀" : "◐";
    themeButton.setAttribute(
      "aria-label",
      selectedTheme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"
    );
  }

  writeStorage(STORAGE_KEYS.theme, selectedTheme);
}

function initializeTheme() {
  const savedTheme = readStorage(STORAGE_KEYS.theme, "light");
  applyTheme(savedTheme);

  addListener("#themeButton", "click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });
}

/* =====================================================
   MENU MOBILE
   ===================================================== */

function initializeMobileMenu() {
  const button = select("#mobileMenuButton");
  const nav = select("#mainNav");
  if (!button || !nav) return;

  button.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
  });
}

/* =====================================================
   PROFIL
   ===================================================== */

function emptyProfile() {
  return {
    name: "",
    email: "",
    bio: "",
    photo: "",
    country: "",
    language: "",
    currency: ""
  };
}

function getProfile() {
  const profile = readStorage(STORAGE_KEYS.profile, {});
  return { ...emptyProfile(), ...(profile || {}) };
}

function saveProfile(profile) {
  return writeStorage(STORAGE_KEYS.profile, { ...emptyProfile(), ...profile });
}

function hasProfile() {
  const profile = getProfile();
  return Boolean(profile.name && profile.name.trim());
}

function getInitials(name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "?";
  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function updateAvatar(imageSelector, initialsSelector, profile) {
  const image = select(imageSelector);
  const initials = select(initialsSelector);
  if (!image || !initials) return;

  if (profile.photo) {
    image.src = profile.photo;
    image.alt = `Photo de ${profile.name || "profil"}`;
    image.hidden = false;
    initials.hidden = true;
    return;
  }

  image.removeAttribute("src");
  image.hidden = true;
  initials.textContent = getInitials(profile.name);
  initials.hidden = false;
}

function renderProfileEverywhere() {
  const profile = getProfile();

  setText("#profileName", profile.name, "Aucun nom");
  setText("#profileEmail", profile.email, "Aucun e-mail");
  setText("#profileBio", profile.bio, "Aucune présentation.");
  setText("#profileCountry", profile.country, "Non renseigné");
  setText("#profileLanguage", profile.language, "Non renseignée");
  setText("#profileCurrency", profile.currency, "Non renseignée");

  setText("#settingsPreviewName", profile.name, "Aucun nom");
  setText("#settingsPreviewEmail", profile.email, "Aucun e-mail");
  setText("#settingsPreviewBio", profile.bio, "Aucune présentation");

  updateAvatar("#profileAvatarImage", "#profileAvatar", profile);
  updateAvatar("#settingsAvatarImage", "#settingsAvatar", profile);
}

function loadProfileInForm() {
  const profile = getProfile();
  const fields = {
    "#profileNameInput": profile.name,
    "#profileEmailInput": profile.email,
    "#profileBioInput": profile.bio,
    "#profileCountryInput": profile.country,
    "#profileLanguageInput": profile.language,
    "#profileCurrencyInput": profile.currency
  };

  Object.entries(fields).forEach(([selector, value]) => {
    const input = select(selector);
    if (input) input.value = value;
  });
}

/* =====================================================
   PHOTO
   ===================================================== */

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error("Veuillez sélectionner une image."));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("Impossible de lire cette image.")));
    reader.readAsDataURL(file);
  });
}

function initializePhotoInput() {
  const input = select("#profilePhotoInput");
  if (input) {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const photo = await readImageFile(file);
        const profile = getProfile();
        updateAvatar("#settingsAvatarImage", "#settingsAvatar", { ...profile, photo });
        setText("#profileFormStatus", "Photo chargée. Enregistrez pour confirmer.");
      } catch (error) {
        setText("#profileFormStatus", error.message);
      }
    });
  }

  const createInput = select("#createPhotoInput");
  if (createInput) {
    createInput.addEventListener("change", async () => {
      const file = createInput.files?.[0];
      if (!file) return;
      try {
        const photo = await readImageFile(file);
        updateAvatar("#createAvatarImage", "#createAvatar", {
          name: select("#createNameInput")?.value || "",
          photo
        });
        setText("#createProfileStatus", "Photo chargée.");
      } catch (error) {
        setText("#createProfileStatus", error.message);
      }
    });
  }
}

/* =====================================================
   CRÉATION DU PROFIL (Mon espace)
   ===================================================== */

function initializeCreateProfileForm() {
  const form = select("#createProfileForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = select("#createNameInput")?.value.trim() || "";
    if (!name) {
      setText("#createProfileStatus", "Le nom est obligatoire.");
      return;
    }

    let photo = "";
    const file = select("#createPhotoInput")?.files?.[0];
    try {
      if (file) photo = await readImageFile(file);
    } catch (error) {
      setText("#createProfileStatus", error.message);
      return;
    }

    const profile = {
      name,
      email: select("#createEmailInput")?.value.trim() || "",
      bio: select("#createBioInput")?.value.trim() || "",
      photo,
      country: select("#createCountryInput")?.value || "",
      language: select("#createLanguageInput")?.value || "",
      currency: select("#createCurrencyInput")?.value || ""
    };

    saveProfile(profile);
    renderProfileEverywhere();
    showAccountView();
  });
}

/* =====================================================
   MODIFICATION DU PROFIL (Paramètres)
   ===================================================== */

function initializeProfileForm() {
  const form = select("#profileForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentProfile = getProfile();
    let photo = currentProfile.photo;
    const file = select("#profilePhotoInput")?.files?.[0];

    try {
      if (file) photo = await readImageFile(file);

      const profile = {
        name: select("#profileNameInput")?.value.trim() || "",
        email: select("#profileEmailInput")?.value.trim() || "",
        bio: select("#profileBioInput")?.value.trim() || "",
        photo,
        country: select("#profileCountryInput")?.value || "",
        language: select("#profileLanguageInput")?.value || "",
        currency: select("#profileCurrencyInput")?.value || ""
      };

      if (!profile.name) {
        setText("#profileFormStatus", "Le nom est obligatoire.");
        return;
      }

      saveProfile(profile);
      renderProfileEverywhere();

      const status = select("#profileFormStatus");
      if (status) {
        status.innerHTML = `
          Modifications enregistrées.
          <br><br>
          <a href="account.html" class="button button-primary button-small">
            Voir mon espace
          </a>
        `;
      }
    } catch (error) {
      setText("#profileFormStatus", error.message);
    }
  });
}

function initializeClearProfileForm() {
  addListener("#clearProfileButton", "click", () => {
    select("#profileForm")?.reset();
    setText("#profileFormStatus", "Le formulaire a été vidé.");
  });
}

/* =====================================================
   AFFICHAGE CONDITIONNEL (Mon espace)
   ===================================================== */

function showAccountView() {
  const createHeader = select("#createProfileSection");
  const createForm = select("#createProfileFormSection");
  if (createHeader) createHeader.hidden = true;
  if (createForm) createForm.hidden = true;

  const viewHero = select("#viewProfileSection");
  const viewDetails = select("#viewProfileDetails");
  if (viewHero) viewHero.hidden = false;
  if (viewDetails) viewDetails.hidden = false;

  renderProfileEverywhere();
  renderAccountHistory(); // Affiche l'historique dans Mon espace
}

function showCreateForm() {
  const createHeader = select("#createProfileSection");
  const createForm = select("#createProfileFormSection");
  if (createHeader) createHeader.hidden = false;
  if (createForm) createForm.hidden = false;

  const viewHero = select("#viewProfileSection");
  const viewDetails = select("#viewProfileDetails");
  if (viewHero) viewHero.hidden = true;
  if (viewDetails) viewDetails.hidden = true;
}

function initializeAccountPage() {
  if (!select("#createProfileForm") && !select("#viewProfileSection")) return;

  if (hasProfile()) {
    showAccountView();
  } else {
    showCreateForm();
  }
}

/* =====================================================
   MODAL PHOTO
   ===================================================== */

function initializePhotoModal() {
  const modal = select("#photoModal");
  const modalImage = select("#photoModalImage");
  const closeButton = select("#closePhotoModalButton");
  const backdrop = modal?.querySelector(".photo-modal-backdrop");
  const openButtons = selectAll("#profilePhotoButton, #settingsPhotoButton");

  if (!modal || !modalImage) return;

  function openModal() {
    const profile = getProfile();
    if (!profile.photo) return;
    modalImage.src = profile.photo;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    modalImage.removeAttribute("src");
    document.body.style.overflow = "";
  }

  openButtons.forEach((button) => button.addEventListener("click", openModal));
  closeButton?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

/* =====================================================
   TÂCHES
   ===================================================== */

function createTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function normalizeTask(task) {
  return {
    id: task.id || createTaskId(),
    title: task.title || task.name || "",
    description: task.description || "",
    category: task.category || "",
    priority: task.priority || "normal",
    duration: task.duration || "",
    period: task.period || "",
    when: task.when || "",
    date: task.date || "",
    moment: task.moment || "",
    completed: Boolean(task.completed),
    selected: Boolean(task.selected),
    createdAt: task.createdAt || new Date().toISOString()
  };
}

function getTasks() {
  const tasks = readStorage(STORAGE_KEYS.tasks, []);
  return Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
}

function saveTasks(tasks) {
  return writeStorage(STORAGE_KEYS.tasks, tasks);
}

function getTempTasks() {
  const tasks = readStorage(STORAGE_KEYS.tempTasks, []);
  return Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
}

function saveTempTasks(tasks) {
  return writeStorage(STORAGE_KEYS.tempTasks, tasks);
}

function getHistory() {
  const history = readStorage(STORAGE_KEYS.history, []);
  return Array.isArray(history) ? history : [];
}

function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift({
    id: createTaskId(),
    message: entry,
    at: new Date().toISOString()
  });
  writeStorage(STORAGE_KEYS.history, history.slice(0, 50));
}

function categoryLabel(value) {
  const map = { work: "Affaires", personal: "Personnel", study: "Études", other: "Autre" };
  return map[value] || value || "";
}

function priorityLabel(value) {
  const map = { normal: "Normale", high: "Importante", medium: "Normale" };
  return map[value] || value || "";
}

function momentLabel(value) {
  const map = { matin: "Matin", "apres-midi": "Après-midi", soir: "Soir" };
  return map[value] || value || "";
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDateFromWhen(whenValue) {
  const today = new Date();
  const target = new Date(today);
  if (whenValue === "tomorrow") target.setDate(today.getDate() + 1);
  else if (whenValue === "after") target.setDate(today.getDate() + 2);
  else if (whenValue === "week") target.setDate(today.getDate() + 7);
  return formatDateISO(target);
}

function initializeWhenSelector() {
  const whenSelect = select("#taskWhen");
  const customField = select("#customDateField");
  const dateInput = select("#taskDate");
  if (!whenSelect) return;

  whenSelect.addEventListener("change", () => {
    const value = whenSelect.value;
    if (value === "custom") {
      if (customField) customField.hidden = false;
      if (dateInput) dateInput.required = true;
    } else {
      if (customField) customField.hidden = true;
      if (dateInput) {
        dateInput.required = false;
        dateInput.value = "";
      }
    }
  });
}

function renderTempTaskList() {
  const container = select("#taskList");
  if (!container) return;

  const tasks = getTempTasks();

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state" id="taskEmptyState">
        <span class="empty-state-icon" aria-hidden="true">◇</span>
        <h3>Aucune tâche ajoutée</h3>
        <p>Remplissez le formulaire pour ajouter votre première tâche.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map((task) => {
    const selectedClass = task.selected ? "is-selected" : "";
    const checked = task.selected ? "checked" : "";
    return `
      <article class="task-card ${selectedClass}" data-temp-id="${task.id}">
        <label class="task-check">
          <input type="checkbox" data-temp-select="${task.id}" ${checked}>
          <span></span>
        </label>
        <div class="task-card-content">
          <h3>${escapeHtml(task.title)}</h3>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
          <div class="task-meta">
            ${task.category ? `<span>${escapeHtml(categoryLabel(task.category))}</span>` : ""}
            <span>${escapeHtml(priorityLabel(task.priority))}</span>
            ${task.date ? `<span>${escapeHtml(task.date)}</span>` : ""}
            ${task.moment ? `<span>${escapeHtml(momentLabel(task.moment))}</span>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");

  container.querySelectorAll("[data-temp-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.tempSelect;
      const tasks = getTempTasks().map((task) => {
        if (task.id !== id) return task;
        return { ...task, selected: checkbox.checked };
      });
      saveTempTasks(tasks);
      renderTempTaskList();
    });
  });
}

function initializeTaskForm() {
  const form = select("#taskForm");
  if (!form) return;

  initializeWhenSelector();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = select("#taskTitle")?.value.trim() || "";
    if (!title) {
      setText("#taskFormStatus", "Le nom de la tâche est obligatoire.");
      return;
    }

    const whenValue = select("#taskWhen")?.value || "";
    let finalDate = "";

    if (whenValue === "custom") {
      finalDate = select("#taskDate")?.value || "";
      if (!finalDate) {
        setText("#taskFormStatus", "Veuillez choisir une date.");
        return;
      }
    } else if (whenValue) {
      finalDate = getDateFromWhen(whenValue);
    }

    const task = normalizeTask({
      title,
      description: select("#taskDescription")?.value.trim() || "",
      category: select("#taskCategory")?.value || "",
      priority: select("#taskPriority")?.value || "normal",
      duration: select("#taskDuration")?.value || "",
      period: select("#taskPeriod")?.value || "",
      when: whenValue,
      date: finalDate,
      moment: select("#taskMoment")?.value || "",
      selected: true
    });

    const tasks = getTempTasks();
    tasks.push(task);
    saveTempTasks(tasks);
    form.reset();

    const customField = select("#customDateField");
    if (customField) customField.hidden = true;

    setText("#taskFormStatus", "Tâche ajoutée à la liste temporaire.");
    renderTempTaskList();
  });

  addListener("#clearTaskFormButton", "click", () => {
    form.reset();
    const customField = select("#customDateField");
    if (customField) customField.hidden = true;
    setText("#taskFormStatus", "Formulaire effacé.");
  });
}

function initializeSaveTasksButton() {
  addListener("#saveTasksButton", "click", () => {
    const tempTasks = getTempTasks();
    const selected = tempTasks.filter((t) => t.selected);

    if (!selected.length) {
      setText("#saveTasksStatus", "Sélectionnez au moins une tâche à enregistrer.");
      return;
    }

    const permanent = getTasks();
    selected.forEach((task) => {
      permanent.push(normalizeTask({ ...task, selected: false, completed: false }));
    });

    saveTasks(permanent);
    const remaining = tempTasks.filter((t) => !t.selected);
    saveTempTasks(remaining);

    addHistoryEntry(`${selected.length} tâche(s) enregistrée(s).`);
    setText("#saveTasksStatus", `${selected.length} tâche(s) enregistrée(s) avec succès.`);
    renderTempTaskList();
  });
}

/* =====================================================
   DASHBOARD
   ===================================================== */

let currentFilter = "all";

function filterTasks(tasks, filter) {
  // Par défaut on n'affiche que les tâches NON terminées
  // sauf si on demande explicitement "completed"
  switch (filter) {
    case "work":
      return tasks.filter((t) => t.category === "work" && !t.completed);
    case "completed":
      return tasks.filter((t) => t.completed);
    case "high":
      return tasks.filter((t) => t.priority === "high" && !t.completed);
    default: // "all" = tâches à faire
      return tasks.filter((t) => !t.completed);
  }
}

function renderDashboardStats() {
  const tasks = getTasks();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  setText("#totalTasks", String(total), "0");
  setText("#completedTasks", String(completed), "0");
  setText("#globalProgress", `${progress}%`, "0%");
  setText("#successRate", `${progress}%`, "0%");

  const bar = select("#globalProgressBar");
  if (bar) bar.style.width = `${progress}%`;
}

function renderDashboardTaskList() {
  const container = select("#dashboardTaskList");
  if (!container) return;

  const tasks = filterTasks(getTasks(), currentFilter);

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon" aria-hidden="true">◇</span>
        <h3>${currentFilter === "completed" ? "Aucune tâche terminée" : "Aucune tâche à faire"}</h3>
        <p>${currentFilter === "completed" ? "Les tâches terminées apparaîtront ici." : "Ajoutez une tâche depuis la page de saisie."}</p>
        ${currentFilter !== "completed" ? `<a class="button button-primary button-small" href="tasks.html">Ajouter une tâche</a>` : ""}
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map((task) => {
    const completedClass = task.completed ? "is-completed" : "";
    const checked = task.completed ? "checked" : "";
    return `
      <article class="dashboard-task-item ${completedClass}">
        <label class="task-check">
          <input type="checkbox" data-task-complete="${task.id}" ${checked}>
          <span></span>
        </label>
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
          <div class="task-meta">
            ${task.category ? `<span>${escapeHtml(categoryLabel(task.category))}</span>` : ""}
            <span>${escapeHtml(priorityLabel(task.priority))}</span>
            ${task.date ? `<span>${escapeHtml(task.date)}</span>` : ""}
            ${task.moment ? `<span>${escapeHtml(momentLabel(task.moment))}</span>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");

  container.querySelectorAll("[data-task-complete]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.taskComplete;
      const isCompleted = checkbox.checked;

      updateTask(id, { completed: isCompleted });

      if (isCompleted) {
        const task = getTasks().find((t) => t.id === id);
        addHistoryEntry(`Tâche terminée : ${task?.title || ""}`);
      }

      // Re-render pour faire disparaître la tâche des listes "à faire"
      renderDashboard();
      renderAccountHistory();
    });
  });
}

function renderPriorityList() {
  const container = select("#priorityTaskList");
  if (!container) return;

  // Seulement les prioritaires NON terminées
  const tasks = getTasks().filter((t) => t.priority === "high" && !t.completed);

  if (!tasks.length) {
    container.innerHTML = `<p class="empty-text">Aucune tâche prioritaire.</p>`;
    return;
  }

  container.innerHTML = tasks.map((task) => `
    <div class="priority-item">
      <strong>${escapeHtml(task.title)}</strong>
      <div class="task-meta">
        ${task.date ? `<span>${escapeHtml(task.date)}</span>` : ""}
      </div>
    </div>
  `).join("");
}

function renderHistoryList() {
  const container = select("#historyList");
  if (!container) return;

  const history = getHistory();
  if (!history.length) {
    container.innerHTML = `<p class="empty-text">Aucun historique disponible.</p>`;
    return;
  }

  container.innerHTML = history.slice(0, 8).map((item) => {
    const date = item.at ? new Date(item.at).toLocaleString("fr-FR") : "";
    return `
      <div class="history-item">
        <strong>${escapeHtml(item.message)}</strong>
        <span style="color: var(--text-faint); font-size: 0.8rem;">${escapeHtml(date)}</span>
      </div>
    `;
  }).join("");
}

function renderDashboard() {
  renderDashboardStats();
  renderDashboardTaskList();
  renderPriorityList();
  renderHistoryList();
}

function updateTask(id, changes) {
  const tasks = getTasks().map((task) => {
    if (task.id !== id) return task;
    return { ...task, ...changes };
  });
  saveTasks(tasks);
}

function initializeDashboardFilters() {
  selectAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectAll(".filter-button").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.filter || "all";
      renderDashboardTaskList();
    });
  });
}

function initializeDashboardActions() {
  addListener("#refreshTasksButton", "click", () => renderDashboard());
  addListener("#downloadTasksButton", "click", () => {
    const tasks = getTasks();
    if (!tasks.length) {
      alert("Aucune tâche à télécharger.");
      return;
    }
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taskflow-tasks.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

/* =====================================================
   HISTORIQUE DANS MON ESPACE
   ===================================================== */

function renderAccountHistory() {
  const container = select("#accountHistoryList");
  if (!container) return;

  const history = getHistory();
  if (!history.length) {
    container.innerHTML = `<p class="empty-text">Aucun historique pour le moment.</p>`;
    return;
  }

  container.innerHTML = history.map((item) => {
    const date = item.at ? new Date(item.at).toLocaleString("fr-FR") : "";
    return `
      <div class="history-item">
        <strong>${escapeHtml(item.message)}</strong>
        <span style="color: var(--text-faint); font-size: 0.8rem;">${escapeHtml(date)}</span>
      </div>
    `;
  }).join("");
}

/* =====================================================
   RÉINITIALISATION
   ===================================================== */

function initializeResetButton() {
  addListener("#resetAppButton", "click", () => {
    const confirmed = window.confirm("Supprimer toutes les données locales ?");
    if (!confirmed) return;

    Object.values(STORAGE_KEYS).forEach(removeStorage);
    applyTheme("light");
    loadProfileInForm();
    renderProfileEverywhere();
    saveTempTasks([]);
    renderTempTaskList();
    renderDashboard();

    if (select("#createProfileForm")) {
      showCreateForm();
    }

    setText("#profileFormStatus", "Toutes les données ont été supprimées.");
  });
}

/* =====================================================
   INITIALISATION
   ===================================================== */

function initializeApplication() {
  initializeTheme();
  initializeMobileMenu();

  initializeCreateProfileForm();
  initializeProfileForm();
  initializePhotoInput();
  initializeClearProfileForm();
  initializePhotoModal();
  initializeAccountPage();

  initializeTaskForm();
  initializeSaveTasksButton();
  renderTempTaskList();

  initializeDashboardFilters();
  initializeDashboardActions();
  renderDashboard();

  initializeResetButton();

  loadProfileInForm();
  renderProfileEverywhere();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  initializeApplication();
}