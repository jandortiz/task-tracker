const CONFIG = {
  appName: "Jandortiz's Task Tracker",
  apiBase: "/api",
  exportFileName: "task-tracker-progress.json",
  minYear: 1970,
  maxYear: 2100,
  daysPerWeek: 7,
  millisecondsPerDay: 24 * 60 * 60 * 1000,
  dayLabels: ["", "Lun", "", "Mié", "", "Vie", ""],
  dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  copy: {
    loadingTask: "Cargando tarea...",
    noChanges: "Sin cambios guardados",
    lastChange: "Último cambio",
    newTaskPrompt: "Nombre de la nueva tarea:",
    renameTaskPrompt: "Nuevo título del seguimiento:",
    currentPasswordPrompt: "Contraseña actual:",
    newPasswordPrompt: "Nueva contraseña:",
    onlyTaskResetConfirm: (taskName) =>
      `Solo existe la tarea "${taskName}". ¿Quieres borrar todo su progreso?`,
    deleteTaskConfirm: (taskName) => `¿Eliminar la tarea "${taskName}" y todo su progreso?`,
    resetYearConfirm: (taskName, year) => `¿Borrar el progreso de "${taskName}" durante ${year}?`,
    marked: "marcado",
    unmarked: "sin marcar",
  },
};

const DOM = {
  appTitle: document.querySelector("#appTitle"),
  activeTaskTitle: document.querySelector("#activeTaskTitle"),
  controls: document.querySelector("#controls"),
  accountBar: document.querySelector("#accountBar"),
  authPanel: document.querySelector("#authPanel"),
  loginView: document.querySelector("#loginView"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  registerButton: document.querySelector("#registerButton"),
  forgotPasswordButton: document.querySelector("#forgotPasswordButton"),
  authMessage: document.querySelector("#authMessage"),
  resetRequestView: document.querySelector("#resetRequestView"),
  resetRequestForm: document.querySelector("#resetRequestForm"),
  resetEmail: document.querySelector("#resetEmail"),
  resetRequestMessage: document.querySelector("#resetRequestMessage"),
  backToLoginButton: document.querySelector("#backToLoginButton"),
  resetConfirmView: document.querySelector("#resetConfirmView"),
  resetConfirmForm: document.querySelector("#resetConfirmForm"),
  resetNewPassword: document.querySelector("#resetNewPassword"),
  resetConfirmMessage: document.querySelector("#resetConfirmMessage"),
  cancelResetButton: document.querySelector("#cancelResetButton"),
  userEmail: document.querySelector("#userEmail"),
  statsPanel: document.querySelector("#statsPanel"),
  trackerPanel: document.querySelector("#trackerPanel"),
  taskSelect: document.querySelector("#taskSelect"),
  newTaskButton: document.querySelector("#newTaskButton"),
  renameTaskButton: document.querySelector("#renameTaskButton"),
  deleteTaskButton: document.querySelector("#deleteTaskButton"),
  previousYearButton: document.querySelector("#previousYearButton"),
  yearInput: document.querySelector("#yearInput"),
  nextYearButton: document.querySelector("#nextYearButton"),
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  resetButton: document.querySelector("#resetButton"),
  changePasswordButton: document.querySelector("#changePasswordButton"),
  logoutButton: document.querySelector("#logoutButton"),
  importFile: document.querySelector("#importFile"),
  monthLabels: document.querySelector("#monthLabels"),
  dayLabels: document.querySelector("#dayLabels"),
  daysGrid: document.querySelector("#daysGrid"),
  studiedDays: document.querySelector("#studiedDays"),
  activeWeeks: document.querySelector("#activeWeeks"),
  completedWeeks: document.querySelector("#completedWeeks"),
  currentStreak: document.querySelector("#currentStreak"),
  progressPercent: document.querySelector("#progressPercent"),
  rangeLabel: document.querySelector("#rangeLabel"),
  lastUpdated: document.querySelector("#lastUpdated"),
};

const TextUtils = {
  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  },

  normalizeTaskName(value) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  },
};

const DateUtils = {
  todayISO() {
    return this.toISODate(new Date());
  },

  toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  parseISODate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  },

  addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  },

  diffDays(start, end) {
    const startDate = this.parseISODate(this.toISODate(start));
    const endDate = this.parseISODate(this.toISODate(end));
    return Math.round((endDate.getTime() - startDate.getTime()) / CONFIG.millisecondsPerDay);
  },

  startOfWeekSunday(date) {
    return this.addDays(date, -date.getDay());
  },

  endOfWeekSaturday(date) {
    return this.addDays(date, 6 - date.getDay());
  },

  getWeekColumn(gridStart, date) {
    return Math.floor(this.diffDays(gridStart, date) / CONFIG.daysPerWeek);
  },

  getWeekKey(date) {
    return this.toISODate(this.startOfWeekSunday(date));
  },

  getCalendarYearRange(year) {
    const rangeStart = new Date(year, 0, 1);
    const rangeEnd = new Date(year, 11, 31);
    const gridStart = this.startOfWeekSunday(rangeStart);
    const gridEnd = this.endOfWeekSaturday(rangeEnd);
    const weekCount = Math.floor(this.diffDays(gridStart, gridEnd) / CONFIG.daysPerWeek) + 1;
    const visibleDates = [];

    for (let date = new Date(rangeStart); date <= rangeEnd; date = this.addDays(date, 1)) {
      visibleDates.push(new Date(date));
    }

    return { rangeStart, rangeEnd, gridStart, gridEnd, weekCount, visibleDates };
  },

  formatDate(date) {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  },

  formatDateTime(value) {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  },

  formatMonth(date) {
    return TextUtils.capitalize(
      new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date).replace(".", ""),
    );
  },

  normalizeYear(value) {
    const year = Number.parseInt(value, 10);
    if (!Number.isInteger(year)) return new Date().getFullYear();
    return Math.min(CONFIG.maxYear, Math.max(CONFIG.minYear, year));
  },
};

const UiPreferences = {
  load() {
    return { selectedYear: new Date().getFullYear(), activeTaskId: null };
  },

  save(state) {
    return state;
  },
};

const ApiService = {
  csrfToken: null,

  isUnsafeMethod(method) {
    return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  },

  async ensureCsrf() {
    if (this.csrfToken) return this.csrfToken;

    const response = await this.request("/auth/csrf", { skipCsrf: true });
    this.csrfToken = response.csrf_token;
    return this.csrfToken;
  },

  async request(path, options = {}, shouldRetry = true) {
    const method = options.method || "GET";
    const unsafe = this.isUnsafeMethod(method);
    const headers = options.body ? { "Content-Type": "application/json" } : {};

    if (unsafe && !options.skipCsrf) {
      headers["X-CSRF-Token"] = await this.ensureCsrf();
    }

    const response = await fetch(`${CONFIG.apiBase}${path}`, {
      method,
      credentials: "include",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 403 && unsafe && shouldRetry) {
      this.csrfToken = null;
      return this.request(path, options, false);
    }

    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(this.extractErrorMessage(data));
    }

    return data;
  },

  extractErrorMessage(data) {
    const detail = data && data.detail;
    if (typeof detail === "string") return detail;

    // FastAPI devuelve errores de validación (422) como una lista de objetos.
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => this.translateValidationError(item)).filter(Boolean);
      if (messages.length) return [...new Set(messages)].join(" ");
    }

    return "Error de comunicación con el servidor";
  },

  translateValidationError(item) {
    const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "";
    const type = item.type || "";

    if (field === "email") return "Introduce un email válido.";
    if (field === "password" || field === "new_password" || field === "current_password") {
      if (type.includes("too_short")) return "La contraseña debe tener al menos 8 caracteres.";
      if (type.includes("too_long")) return "La contraseña es demasiado larga (máximo 128 caracteres).";
    }
    return item.msg || "Datos inválidos.";
  },

  me() {
    return this.request("/auth/me");
  },

  login(email, password) {
    return this.request("/auth/login", { method: "POST", body: { email, password } });
  },

  register(email, password) {
    return this.request("/auth/register", { method: "POST", body: { email, password } });
  },

  requestPasswordReset(email) {
    return this.request("/auth/password-reset/request", { method: "POST", body: { email } });
  },

  confirmPasswordReset(token, newPassword) {
    return this.request("/auth/password-reset/confirm", {
      method: "POST",
      body: { token, new_password: newPassword },
    });
  },

  changePassword(currentPassword, newPassword) {
    return this.request("/auth/password/change", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    });
  },

  logout() {
    return this.request("/auth/logout", { method: "POST" });
  },

  listTasks() {
    return this.request("/tasks");
  },

  createTask(name) {
    return this.request("/tasks", { method: "POST", body: { name } });
  },

  updateTask(taskId, name) {
    return this.request(`/tasks/${taskId}`, { method: "PATCH", body: { name } });
  },

  deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, { method: "DELETE" });
  },

  listCompletions(taskId, year) {
    return this.request(`/tasks/${taskId}/completions?year=${year}`);
  },

  markCompletion(taskId, isoDate) {
    return this.request(`/tasks/${taskId}/completions/${isoDate}`, { method: "PUT" });
  },

  unmarkCompletion(taskId, isoDate) {
    return this.request(`/tasks/${taskId}/completions/${isoDate}`, { method: "DELETE" });
  },

  clearYear(taskId, year) {
    return this.request(`/tasks/${taskId}/completions?year=${year}`, { method: "DELETE" });
  },

  exportProgress(selectedYear) {
    return this.request(`/export?selected_year=${selectedYear}`);
  },

  importProgress(payload) {
    return this.request("/import", { method: "POST", body: payload });
  },
};

const TaskService = {
  getActiveTask(state) {
    return state.tasks.find((task) => task.id === state.activeTaskId) || state.tasks[0] || null;
  },

  setActiveTask(state, taskId) {
    if (state.tasks.some((task) => task.id === taskId)) {
      state.activeTaskId = taskId;
    }
  },
};

const TrackerUI = {
  render(state) {
    this.renderAuthState(state);
    this.renderHeader(state);

    if (!state.user) return;

    this.renderTaskSelect(state);
    this.renderDayLabels();
    this.renderTracker(state);
    this.renderStats(state);
  },

  renderAuthState(state) {
    const authenticated = Boolean(state.user);
    DOM.authPanel.classList.toggle("is-hidden", authenticated);
    DOM.controls.classList.toggle("is-hidden", !authenticated);
    DOM.statsPanel.classList.toggle("is-hidden", !authenticated);
    DOM.trackerPanel.classList.toggle("is-hidden", !authenticated);
    DOM.accountBar.classList.toggle("is-hidden", !authenticated);
    DOM.userEmail.textContent = authenticated ? `Sesión: ${state.user.email}` : "";
    this.renderAuthView(state);
  },

  renderAuthView(state) {
    DOM.loginView.classList.toggle("is-hidden", state.authView !== "login");
    DOM.resetRequestView.classList.toggle("is-hidden", state.authView !== "resetRequest");
    DOM.resetConfirmView.classList.toggle("is-hidden", state.authView !== "resetConfirm");
  },

  renderHeader(state) {
    const activeTask = TaskService.getActiveTask(state);
    DOM.appTitle.textContent = CONFIG.appName;
    DOM.activeTaskTitle.textContent = state.user
      ? activeTask?.name || CONFIG.copy.loadingTask
      : state.authView === "resetConfirm"
        ? "Restablecer contraseña"
        : "Acceso seguro";
    DOM.yearInput.value = String(state.selectedYear);
    document.title = CONFIG.appName;
  },

  renderTaskSelect(state) {
    DOM.taskSelect.innerHTML = "";

    for (const task of state.tasks) {
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = task.name;
      option.selected = task.id === state.activeTaskId;
      DOM.taskSelect.append(option);
    }
  },

  renderDayLabels() {
    DOM.dayLabels.innerHTML = "";

    for (const day of CONFIG.dayLabels) {
      const label = document.createElement("span");
      label.textContent = day;
      DOM.dayLabels.append(label);
    }
  },

  renderTracker(state) {
    const range = DateUtils.getCalendarYearRange(state.selectedYear);
    const completed = state.completedDates;
    const visibleDates = new Set(range.visibleDates.map((date) => DateUtils.toISODate(date)));

    DOM.monthLabels.innerHTML = "";
    DOM.daysGrid.innerHTML = "";
    DOM.daysGrid.style.gridTemplateColumns = `repeat(${range.weekCount}, var(--cell))`;
    DOM.monthLabels.style.gridTemplateColumns = `repeat(${range.weekCount}, var(--cell))`;
    DOM.rangeLabel.textContent = `${DateUtils.formatDate(range.rangeStart)} - ${DateUtils.formatDate(
      range.rangeEnd,
    )}`;

    this.renderMonthLabels(state, range);

    for (let column = 0; column < range.weekCount; column += 1) {
      for (let row = 0; row < CONFIG.daysPerWeek; row += 1) {
        const date = DateUtils.addDays(range.gridStart, column * CONFIG.daysPerWeek + row);
        const isoDate = DateUtils.toISODate(date);
        const isVisible = visibleDates.has(isoDate);
        const isDone = completed.has(isoDate);
        const isToday = isoDate === DateUtils.todayISO();

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "day-cell";
        cell.dataset.date = isoDate;
        cell.style.gridColumn = String(column + 1);
        cell.style.gridRow = String(row + 1);

        if (!isVisible) {
          cell.classList.add("is-outside");
          cell.disabled = true;
          cell.setAttribute("aria-hidden", "true");
        } else {
          cell.setAttribute("aria-pressed", String(isDone));
          cell.setAttribute("aria-label", this.buildCellLabel(state, date, isDone));
          cell.title = this.buildCellLabel(state, date, isDone);
          cell.addEventListener("click", () => App.toggleDate(isoDate));
        }

        if (isDone) cell.classList.add("is-done");
        if (isToday) cell.classList.add("is-today");

        DOM.daysGrid.append(cell);
      }
    }
  },

  renderMonthLabels(state, range) {
    for (let month = 0; month < 12; month += 1) {
      const monthDate = new Date(state.selectedYear, month, 1);
      const nextMonthDate =
        month === 11 ? new Date(state.selectedYear + 1, 0, 1) : new Date(state.selectedYear, month + 1, 1);
      const column = DateUtils.getWeekColumn(range.gridStart, monthDate);
      const nextColumn = Math.min(range.weekCount, DateUtils.getWeekColumn(range.gridStart, nextMonthDate));
      const span = Math.max(1, nextColumn - column);
      const label = document.createElement("span");

      label.className = "month-label";
      label.textContent = DateUtils.formatMonth(monthDate);
      label.style.gridColumn = `${column + 1} / span ${span}`;
      DOM.monthLabels.append(label);
    }
  },

  renderStats(state) {
    const range = DateUtils.getCalendarYearRange(state.selectedYear);
    const visibleDates = range.visibleDates.map((date) => DateUtils.toISODate(date));
    const weekCounts = new Map();

    for (const isoDate of state.completedDates) {
      const weekKey = DateUtils.getWeekKey(DateUtils.parseISODate(isoDate));
      weekCounts.set(weekKey, (weekCounts.get(weekKey) || 0) + 1);
    }

    const studiedDays = state.completedDates.size;
    const activeWeeks = [...weekCounts.values()].filter((count) => count > 0).length;
    const completedWeeks = [...weekCounts.values()].filter((count) => count >= 4).length;
    const currentStreak = this.calculateCurrentStreak(state, range);
    const progress = Math.round((studiedDays / visibleDates.length) * 100);

    DOM.studiedDays.textContent = String(studiedDays);
    DOM.activeWeeks.textContent = String(activeWeeks);
    DOM.completedWeeks.textContent = String(completedWeeks);
    DOM.currentStreak.textContent = `${currentStreak} ${currentStreak === 1 ? "día" : "días"}`;
    DOM.progressPercent.textContent = `${progress}%`;
    DOM.lastUpdated.textContent = CONFIG.copy.noChanges;
  },

  calculateCurrentStreak(state, range) {
    const today = DateUtils.parseISODate(DateUtils.todayISO());
    let cursor = state.selectedYear === today.getFullYear() ? today : new Date(state.selectedYear, 11, 31);
    let streak = 0;

    while (cursor >= range.rangeStart) {
      if (!state.completedDates.has(DateUtils.toISODate(cursor))) break;
      streak += 1;
      cursor = DateUtils.addDays(cursor, -1);
    }

    return streak;
  },

  buildCellLabel(state, date, isDone) {
    const dayName = CONFIG.dayNames[date.getDay()];
    const taskName = TaskService.getActiveTask(state)?.name || CONFIG.copy.loadingTask;
    const status = isDone ? CONFIG.copy.marked : CONFIG.copy.unmarked;
    return `${taskName}: ${TextUtils.capitalize(dayName)}, ${DateUtils.formatDate(date)}: ${status}`;
  },

  showAuthMessage(message) {
    DOM.authMessage.textContent = message;
  },

  showResetRequestMessage(message) {
    DOM.resetRequestMessage.textContent = message;
  },

  showResetConfirmMessage(message) {
    DOM.resetConfirmMessage.textContent = message;
  },
};

const App = {
  state: {
    user: null,
    selectedYear: UiPreferences.load().selectedYear,
    activeTaskId: UiPreferences.load().activeTaskId,
    tasks: [],
    completedDates: new Set(),
    authView: new URLSearchParams(window.location.search).has("reset_token") ? "resetConfirm" : "login",
    resetToken: new URLSearchParams(window.location.search).get("reset_token"),
  },

  async init() {
    this.bindEvents();
    await this.bootstrapSession();
  },

  bindEvents() {
    DOM.authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.login();
    });
    DOM.registerButton.addEventListener("click", () => this.register());
    DOM.forgotPasswordButton.addEventListener("click", () => this.showAuthView("resetRequest"));
    DOM.resetRequestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.requestPasswordReset();
    });
    DOM.backToLoginButton.addEventListener("click", () => this.showAuthView("login"));
    DOM.resetConfirmForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.confirmPasswordReset();
    });
    DOM.cancelResetButton.addEventListener("click", () => {
      this.clearResetTokenFromUrl();
      this.showAuthView("login");
    });
    DOM.logoutButton.addEventListener("click", () => this.logout());

    DOM.taskSelect.addEventListener("change", async () => {
      TaskService.setActiveTask(this.state, DOM.taskSelect.value);
      await this.loadCompletions();
      this.persistUiAndRender();
    });

    DOM.newTaskButton.addEventListener("click", () => this.createTask());
    DOM.renameTaskButton.addEventListener("click", () => this.renameTask());
    DOM.deleteTaskButton.addEventListener("click", () => this.deleteTask());

    DOM.previousYearButton.addEventListener("click", () => this.changeYear(this.state.selectedYear - 1));
    DOM.nextYearButton.addEventListener("click", () => this.changeYear(this.state.selectedYear + 1));
    DOM.yearInput.addEventListener("change", () => this.changeYear(DateUtils.normalizeYear(DOM.yearInput.value)));

    DOM.exportButton.addEventListener("click", () => this.exportProgress());
    DOM.importButton.addEventListener("click", () => DOM.importFile.click());
    DOM.importFile.addEventListener("change", (event) => this.importProgress(event));
    DOM.resetButton.addEventListener("click", () => this.resetVisibleYear());
    DOM.changePasswordButton.addEventListener("click", () => this.changePassword());
  },

  async bootstrapSession() {
    if (this.state.resetToken) {
      TrackerUI.render(this.state);
      return;
    }

    try {
      const response = await ApiService.me();
      this.state.user = response.user;
      await this.loadTasks();
    } catch (error) {
      this.state.user = null;
      TrackerUI.render(this.state);
    }
  },

  showAuthView(view) {
    this.state.authView = view;
    TrackerUI.showAuthMessage("");
    TrackerUI.showResetRequestMessage("");
    TrackerUI.showResetConfirmMessage("");
    TrackerUI.render(this.state);
  },

  clearResetTokenFromUrl() {
    this.state.resetToken = null;
    window.history.replaceState({}, document.title, window.location.pathname);
  },

  async login() {
    await this.authenticate(ApiService.login.bind(ApiService));
  },

  async register() {
    await this.authenticate(ApiService.register.bind(ApiService));
  },

  async authenticate(action) {
    try {
      TrackerUI.showAuthMessage("");
      const response = await action(DOM.authEmail.value, DOM.authPassword.value);
      this.state.user = response.user;
      this.state.authView = "login";
      DOM.authPassword.value = "";
      await this.loadTasks();
    } catch (error) {
      TrackerUI.showAuthMessage(error.message);
    }
  },

  async logout() {
    await ApiService.logout().catch(() => null);
    ApiService.csrfToken = null;
    this.state.user = null;
    this.state.tasks = [];
    this.state.activeTaskId = null;
    this.state.completedDates = new Set();
    this.state.authView = "login";
    TrackerUI.render(this.state);
  },

  async requestPasswordReset() {
    try {
      TrackerUI.showResetRequestMessage("");
      const response = await ApiService.requestPasswordReset(DOM.resetEmail.value);
      TrackerUI.showResetRequestMessage(response.message);
    } catch (error) {
      TrackerUI.showResetRequestMessage(error.message);
    }
  },

  async confirmPasswordReset() {
    if (!this.state.resetToken) return;

    try {
      TrackerUI.showResetConfirmMessage("");
      const response = await ApiService.confirmPasswordReset(this.state.resetToken, DOM.resetNewPassword.value);
      DOM.resetNewPassword.value = "";
      this.clearResetTokenFromUrl();
      this.showAuthView("login");
      TrackerUI.showAuthMessage(response.message);
    } catch (error) {
      TrackerUI.showResetConfirmMessage(error.message);
    }
  },

  async changePassword() {
    const currentPassword = prompt(CONFIG.copy.currentPasswordPrompt);
    if (!currentPassword) return;

    const newPassword = prompt(CONFIG.copy.newPasswordPrompt);
    if (!newPassword) return;

    try {
      await ApiService.changePassword(currentPassword, newPassword);
      alert("Contraseña actualizada.");
    } catch (error) {
      alert(error.message);
    }
  },

  async loadTasks() {
    this.state.tasks = await ApiService.listTasks();
    if (this.state.tasks.length === 0) {
      const task = await ApiService.createTask("FastAPI");
      this.state.tasks = [task];
    }

    if (!this.state.tasks.some((task) => task.id === this.state.activeTaskId)) {
      this.state.activeTaskId = this.state.tasks[0].id;
    }

    await this.loadCompletions();
    this.persistUiAndRender();
  },

  async loadCompletions() {
    const activeTask = TaskService.getActiveTask(this.state);
    if (!activeTask) {
      this.state.completedDates = new Set();
      return;
    }

    const response = await ApiService.listCompletions(activeTask.id, this.state.selectedYear);
    this.state.completedDates = new Set(response.completed_dates);
  },

  persistUiAndRender() {
    UiPreferences.save(this.state);
    TrackerUI.render(this.state);
  },

  async toggleDate(isoDate) {
    const task = TaskService.getActiveTask(this.state);
    if (!task) return;

    if (this.state.completedDates.has(isoDate)) {
      await ApiService.unmarkCompletion(task.id, isoDate);
      this.state.completedDates.delete(isoDate);
    } else {
      await ApiService.markCompletion(task.id, isoDate);
      this.state.completedDates.add(isoDate);
    }

    this.persistUiAndRender();
  },

  async createTask() {
    const name = prompt(CONFIG.copy.newTaskPrompt);
    const cleanName = TextUtils.normalizeTaskName(name);
    if (!cleanName) return;

    const task = await ApiService.createTask(cleanName);
    this.state.tasks.push(task);
    this.state.activeTaskId = task.id;
    await this.loadCompletions();
    this.persistUiAndRender();
  },

  async renameTask() {
    const task = TaskService.getActiveTask(this.state);
    if (!task) return;

    const name = prompt(CONFIG.copy.renameTaskPrompt, task.name);
    const cleanName = TextUtils.normalizeTaskName(name);
    if (!cleanName || cleanName === task.name) return;

    const updatedTask = await ApiService.updateTask(task.id, cleanName);
    this.state.tasks = this.state.tasks.map((candidate) => (candidate.id === updatedTask.id ? updatedTask : candidate));
    this.persistUiAndRender();
  },

  async deleteTask() {
    const task = TaskService.getActiveTask(this.state);
    if (!task) return;

    const message =
      this.state.tasks.length === 1
        ? CONFIG.copy.onlyTaskResetConfirm(task.name)
        : CONFIG.copy.deleteTaskConfirm(task.name);

    if (!confirm(message)) return;

    if (this.state.tasks.length === 1) {
      await ApiService.clearYear(task.id, this.state.selectedYear);
    } else {
      await ApiService.deleteTask(task.id);
    }

    await this.loadTasks();
  },

  async changeYear(year) {
    this.state.selectedYear = DateUtils.normalizeYear(year);
    await this.loadCompletions();
    this.persistUiAndRender();
  },

  async resetVisibleYear() {
    const task = TaskService.getActiveTask(this.state);
    if (!task || !confirm(CONFIG.copy.resetYearConfirm(task.name, this.state.selectedYear))) return;

    await ApiService.clearYear(task.id, this.state.selectedYear);
    await this.loadCompletions();
    this.persistUiAndRender();
  },

  async exportProgress() {
    const payload = await ApiService.exportProgress(this.state.selectedYear);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = CONFIG.exportFileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  importProgress(event) {
    const [file] = event.target.files;
    if (!file) return;

    const reader = new FileReader();

    reader.addEventListener("load", async () => {
      try {
        const imported = JSON.parse(String(reader.result));
        await ApiService.importProgress(imported);
        await this.loadTasks();
      } catch (error) {
        alert(error.message);
      } finally {
        DOM.importFile.value = "";
      }
    });

    reader.readAsText(file);
  },
};

App.init();
