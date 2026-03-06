/** Popup script: handles login and quick-add task flows */

import { isLoggedIn, clearTokens, getUserTeams, getPendingTask, clearPendingTask, getAccessToken } from '../lib/auth';
import { extensionLogin, createTask } from '../lib/api';

// DOM Elements
const loginView = document.getElementById('login-view')!;
const taskView = document.getElementById('task-view')!;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginEmail = document.getElementById('login-email') as HTMLInputElement;
const loginPassword = document.getElementById('login-password') as HTMLInputElement;
const loginError = document.getElementById('login-error')!;
const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
const userEmailSpan = document.getElementById('user-email')!;
const logoutBtn = document.getElementById('logout-btn')!;
const taskForm = document.getElementById('task-form') as HTMLFormElement;
const taskTitle = document.getElementById('task-title') as HTMLTextAreaElement;
const taskSource = document.getElementById('task-source') as HTMLInputElement;
const taskHours = document.getElementById('task-hours') as HTMLInputElement;
const taskTeam = document.getElementById('task-team') as HTMLSelectElement;
const taskNotes = document.getElementById('task-notes') as HTMLTextAreaElement;
const taskStatus = document.getElementById('task-status')!;
const taskError = document.getElementById('task-error')!;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

/** Show a view, hide the other */
function showView(view: 'login' | 'task') {
  loginView.classList.toggle('hidden', view !== 'login');
  taskView.classList.toggle('hidden', view !== 'task');
}

/** Decode JWT payload to get user email (display only; not for auth) */
function getEmailFromToken(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email || 'User';
  } catch {
    return 'User';
  }
}

/** Today's date in YYYY-MM-DD format */
function todayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Populate team dropdown from stored teams */
async function loadTeams(): Promise<void> {
  const teams = await getUserTeams();
  // Clear existing options except placeholder
  taskTeam.innerHTML = '';

  if (teams.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No teams available';
    taskTeam.appendChild(opt);
    return;
  }

  if (teams.length === 1) {
    // Auto-select single team (no placeholder needed)
    const opt = document.createElement('option');
    opt.value = teams[0].id;
    opt.textContent = teams[0].name;
    taskTeam.appendChild(opt);
  } else {
    // Multiple teams: show picker
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select team';
    taskTeam.appendChild(placeholder);

    for (const team of teams) {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      taskTeam.appendChild(opt);
    }
  }
}

/** Load pending task data from context menu click */
async function loadPendingTask(): Promise<void> {
  const pending = await getPendingTask();
  if (pending) {
    taskTitle.value = pending.title;
    taskSource.value = pending.sourceLink;
    await clearPendingTask();
  }
}

/** Initialize the task view */
async function showTaskView(): Promise<void> {
  const token = await getAccessToken();
  if (token) {
    userEmailSpan.textContent = getEmailFromToken(token);
  }
  await loadTeams();
  await loadPendingTask();
  showView('task');
}

/** Show/hide error and status messages */
function showError(el: HTMLElement, msg: string) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(el: HTMLElement) {
  el.textContent = '';
  el.classList.add('hidden');
}

function showStatusMsg(msg: string) {
  taskStatus.textContent = msg;
  taskStatus.classList.remove('hidden');
}

function hideStatusMsg() {
  taskStatus.textContent = '';
  taskStatus.classList.add('hidden');
}

// --- Event Handlers ---

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(loginError);
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    await extensionLogin(loginEmail.value.trim(), loginPassword.value);
    await showTaskView();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    showError(loginError, msg);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  }
});

logoutBtn.addEventListener('click', async () => {
  await clearTokens();
  // Reset form
  taskForm.reset();
  hideError(taskError);
  hideStatusMsg();
  showView('login');
});

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(taskError);
  hideStatusMsg();

  const title = taskTitle.value.trim();
  const estimatedHours = parseFloat(taskHours.value);
  const teamId = taskTeam.value;
  const sourceLink = taskSource.value.trim() || undefined;
  const notes = taskNotes.value.trim() || undefined;
  const reportDate = todayDate();

  // Client-side validation
  if (!title) {
    showError(taskError, 'Task title is required.');
    return;
  }
  if (!estimatedHours || estimatedHours < 0.01 || estimatedHours > 24) {
    showError(taskError, 'Hours must be between 0.01 and 24.');
    return;
  }
  if (!teamId) {
    showError(taskError, 'Please select a team.');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    await createTask({ title, estimatedHours, sourceLink, notes, reportDate, teamId });
    showStatusMsg('Task added!');
    taskForm.reset();
    // Re-populate team dropdown after reset
    await loadTeams();
    // Auto-close popup after short delay
    setTimeout(() => window.close(), 1500);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save task';
    if (msg === 'Session expired') {
      await clearTokens();
      showView('login');
      showError(loginError, 'Session expired. Please log in again.');
    } else {
      showError(taskError, msg);
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Task';
  }
});

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await isLoggedIn();
  if (loggedIn) {
    await showTaskView();
  } else {
    showView('login');
  }
});
