const STORAGE_KEY = 'gmat-varc-progress-v1';
const REMINDER_KEY = 'gmat-varc-reminder-v1';

const state = {
  questions: {},
  dailyPlan: { days: [] },
  dayMap: new Map(),
  progress: loadProgress(),
  reminder: loadReminder(),
  selectedDate: null,
  activeTimer: null,
  tickInterval: null,
};

const els = {
  questionList: document.getElementById('questionList'),
  datePicker: document.getElementById('datePicker'),
  dayTitle: document.getElementById('dayTitle'),
  daySummary: document.getElementById('daySummary'),
  dayProgress: document.getElementById('dayProgress'),
  progressText: document.getElementById('progressText'),
  statTodayDone: document.getElementById('statTodayDone'),
  statTodayTime: document.getElementById('statTodayTime'),
  statOverall: document.getElementById('statOverall'),
  statStreak: document.getElementById('statStreak'),
  prevDay: document.getElementById('prevDay'),
  nextDay: document.getElementById('nextDay'),
  todayBtn: document.getElementById('todayBtn'),
  reminderBtn: document.getElementById('reminderBtn'),
  reminderDialog: document.getElementById('reminderDialog'),
  reminderForm: document.getElementById('reminderForm'),
  reminderTime: document.getElementById('reminderTime'),
  reminderEnabled: document.getElementById('reminderEnabled'),
  reminderStatus: document.getElementById('reminderStatus'),
  testReminder: document.getElementById('testReminder'),
};

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { questions: {}, days: {} };
  } catch {
    return { questions: {}, days: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function loadReminder() {
  try {
    return JSON.parse(localStorage.getItem(REMINDER_KEY)) || { enabled: false, time: '08:00' };
  } catch {
    return { enabled: false, time: '08:00' };
  }
}

function saveReminder() {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(state.reminder));
}

function getQuestionProgress(no) {
  return state.progress.questions[String(no)] || { elapsedMs: 0, completed: false, lastUpdated: null };
}

function setQuestionProgress(no, data) {
  state.progress.questions[String(no)] = { ...getQuestionProgress(no), ...data, lastUpdated: new Date().toISOString() };
  saveProgress();
}

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function findDayForDate(date) {
  return state.dayMap.get(date) || null;
}

function getDefaultDate() {
  const today = todayIso();
  if (findDayForDate(today)) return today;
  const days = state.dailyPlan.days;
  if (!days.length) return today;
  const first = days[0].date;
  const last = days[days.length - 1].date;
  if (today < first) return first;
  if (today > last) return last;
  return today;
}

function getDayTotals(date) {
  const day = findDayForDate(date);
  if (!day) return { done: 0, total: 0, timeMs: 0 };
  let done = 0;
  let timeMs = 0;
  for (const no of day.questionNumbers) {
    const p = getQuestionProgress(no);
    if (p.completed) done += 1;
    timeMs += p.elapsedMs || 0;
  }
  return { done, total: day.questionNumbers.length, timeMs };
}

function getOverallStats() {
  let done = 0;
  for (const key of Object.keys(state.progress.questions)) {
    if (state.progress.questions[key].completed) done += 1;
  }
  return { done, total: Object.keys(state.questions).length };
}

function getStreak() {
  const completedDays = new Set();
  for (const day of state.dailyPlan.days) {
    const totals = getDayTotals(day.date);
    if (totals.total > 0 && totals.done === totals.total) {
      completedDays.add(day.date);
    }
  }
  let streak = 0;
  const sorted = [...state.dailyPlan.days].map((d) => d.date).sort().reverse();
  for (const date of sorted) {
    if (date > todayIso()) continue;
    if (completedDays.has(date)) streak += 1;
    else break;
  }
  return streak;
}

function renderStats(date) {
  const dayTotals = getDayTotals(date);
  const overall = getOverallStats();
  els.statTodayDone.textContent = `${dayTotals.done}/${dayTotals.total}`;
  els.statTodayTime.textContent = formatMs(dayTotals.timeMs);
  els.statOverall.textContent = `${overall.done}/${overall.total}`;
  els.statStreak.textContent = `${getStreak()} day${getStreak() === 1 ? '' : 's'}`;
}

function renderDay(date) {
  state.selectedDate = date;
  els.datePicker.value = date;
  const day = findDayForDate(date);

  if (!day) {
    els.dayTitle.textContent = 'No study plan for this date';
    els.daySummary.textContent = 'Pick a date between Aug 6–31, 2026.';
    els.dayProgress.style.width = '0%';
    els.progressText.textContent = '0% complete';
    els.questionList.innerHTML = '<div class="empty-state"><p>No questions scheduled for this date.</p><p>Use the date picker to choose a study day from your Excel plan.</p></div>';
    renderStats(date);
    return;
  }

  els.dayTitle.textContent = day.label;
  els.daySummary.textContent = `${day.passageSets ? `Passages: ${day.passageSets} · ` : ''}${day.rcCount} RC + ${day.crCount} CR = ${day.total} questions`;

  const totals = getDayTotals(date);
  const pct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
  els.dayProgress.style.width = `${pct}%`;
  els.progressText.textContent = `${pct}% complete`;

  const cards = day.questionNumbers.map((no) => renderQuestionCard(no)).join('');
  els.questionList.innerHTML = cards;
  bindQuestionEvents();
  renderStats(date);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatQuestionBody(q) {
  const parts = [];

  if (q.passage) {
    parts.push(
      `<div class="question-passage">` +
        `<div class="content-label">Passage</div>` +
        `<div class="passage-text">${escapeHtml(q.passage)}</div>` +
      `</div>`
    );
  }

  if (q.stem) {
    parts.push(
      `<div class="question-prompt">` +
        `<div class="content-label">Question</div>` +
        `<div class="question-stem">${escapeHtml(q.stem)}</div>` +
      `</div>`
    );
  }

  const options = q.options || {};
  const letters = ['A', 'B', 'C', 'D', 'E'].filter((letter) => options[letter]);
  if (letters.length) {
    const items = letters
      .map((letter) => `<li><span class="opt-letter">${letter}.</span><span class="opt-text">${escapeHtml(options[letter])}</span></li>`)
      .join('');
    parts.push(`<div class="content-label options-label">Answer choices</div><ol class="question-options">${items}</ol>`);
  } else if (!q.stem && q.fullText) {
    parts.push(`<div class="question-stem">${escapeHtml(q.fullText)}</div>`);
  }

  if (!parts.length) {
    parts.push(`<p class="question-meta muted">Open PDF page ${q.pdfPage} in your Official Guide for the full question text.</p>`);
  }

  return parts.join('');
}

function renderQuestionCard(no) {
  const q = state.questions[no];
  const p = getQuestionProgress(no);
  const running = state.activeTimer?.questionNo === no;
  const elapsed = running ? p.elapsedMs + (Date.now() - state.activeTimer.startedAt) : p.elapsedMs;

  if (!q) {
    return `<article class="question-card" data-q="${no}"><div class="q-number">Q${no}</div><p class="question-meta">Question details not found.</p></article>`;
  }

  const sectionClass = q.section === 'Reading Comprehension' ? 'rc' : 'cr';
  const diffClass = (q.difficulty || 'easy').toLowerCase();

  return `
    <article class="question-card ${p.completed ? 'completed' : ''} ${running ? 'active' : ''}" data-q="${no}">
      <div class="question-top">
        <div class="question-title">
          <span class="q-number">Q${no}</span>
          <span class="badge ${sectionClass}">${sectionClass.toUpperCase()}</span>
          <span class="badge ${diffClass}">${q.difficulty || '—'}</span>
          ${p.completed ? '<span class="badge easy">Done</span>' : ''}
        </div>
      </div>
      <p class="question-meta">
        ${q.concept || ''}${q.subtype ? ` · ${q.subtype}` : ''}
        ${q.passageSet ? ` · ${q.passageSet}` : ''}
        · PDF p. ${q.pdfPage}
        ${q.explanationPage ? ` · Explanation p. ${q.explanationPage}` : ''}
      </p>
      <div class="question-body">${formatQuestionBody(q)}</div>
      <div class="timer-row">
        <div class="timer-display ${running ? 'running' : ''} ${p.completed ? 'done' : ''}" data-timer-display="${no}">${formatMs(elapsed)}</div>
        <button class="btn btn-primary btn-sm timer-start" data-action="start" data-q="${no}" type="button">${running ? 'Pause' : p.elapsedMs ? 'Resume' : 'Start'}</button>
        <button class="btn btn-secondary btn-sm" data-action="reset" data-q="${no}" type="button">Reset</button>
        <button class="btn ${p.completed ? 'btn-secondary' : 'btn-success'} btn-sm" data-action="complete" data-q="${no}" type="button">${p.completed ? 'Undo' : 'Mark Done'}</button>
      </div>
    </article>
  `;
}

function stopActiveTimer(save = true) {
  if (!state.activeTimer) return;
  const { questionNo, startedAt } = state.activeTimer;
  const p = getQuestionProgress(questionNo);
  const elapsedMs = p.elapsedMs + (Date.now() - startedAt);
  if (save) setQuestionProgress(questionNo, { elapsedMs });
  state.activeTimer = null;
}

function startTimer(questionNo) {
  if (state.activeTimer?.questionNo === questionNo) {
    stopActiveTimer(true);
    renderDay(state.selectedDate);
    return;
  }
  if (state.activeTimer) stopActiveTimer(true);
  state.activeTimer = { questionNo, startedAt: Date.now() };
  renderDay(state.selectedDate);
}

function resetTimer(questionNo) {
  if (state.activeTimer?.questionNo === questionNo) state.activeTimer = null;
  setQuestionProgress(questionNo, { elapsedMs: 0, completed: false });
  renderDay(state.selectedDate);
}

function toggleComplete(questionNo) {
  const p = getQuestionProgress(questionNo);
  if (state.activeTimer?.questionNo === questionNo) stopActiveTimer(true);
  setQuestionProgress(questionNo, { completed: !p.completed });
  renderDay(state.selectedDate);
}

function bindQuestionEvents() {
  els.questionList.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const no = Number(btn.dataset.q);
      const action = btn.dataset.action;
      if (action === 'start') startTimer(no);
      if (action === 'reset') resetTimer(no);
      if (action === 'complete') toggleComplete(no);
    });
  });
}

function shiftDate(days) {
  const current = new Date(state.selectedDate + 'T12:00:00');
  current.setDate(current.getDate() + days);
  renderDay(current.toISOString().slice(0, 10));
}

function updateTimerDisplays() {
  if (!state.activeTimer) return;
  const { questionNo, startedAt } = state.activeTimer;
  const p = getQuestionProgress(questionNo);
  const elapsed = p.elapsedMs + (Date.now() - startedAt);
  const display = document.querySelector(`[data-timer-display="${questionNo}"]`);
  if (display) display.textContent = formatMs(elapsed);
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js?v=3');
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    return reg;
  } catch (err) {
    console.warn('Service worker registration failed', err);
    return null;
  }
}

async function scheduleReminder() {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.periodicSync && !reg?.sync) {
    // Fallback: in-page check every minute
    return;
  }
}

function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: './icon.svg',
      badge: './icon.svg',
    });
  }
}

function checkDailyReminder() {
  if (!state.reminder.enabled) return;
  const now = new Date();
  const [h, m] = state.reminder.time.split(':').map(Number);
  const key = `${now.toISOString().slice(0, 10)}-${state.reminder.time}`;
  const last = state.reminder.lastFired;
  if (now.getHours() === h && now.getMinutes() === m && last !== key) {
    const day = findDayForDate(todayIso());
    const count = day?.total || 0;
    showNotification('GMAT VARC Study Reminder', count ? `You have ${count} questions scheduled today. Open the tracker and start!` : 'Time for your daily GMAT VARC practice!');
    state.reminder.lastFired = key;
    saveReminder();
  }
}

function openReminderDialog() {
  els.reminderTime.value = state.reminder.time;
  els.reminderEnabled.checked = state.reminder.enabled;
  els.reminderStatus.textContent = Notification.permission === 'denied'
    ? 'Notifications are blocked in your browser settings.'
    : state.reminder.enabled
      ? `Daily reminder set for ${state.reminder.time}`
      : 'Reminders are off.';
  els.reminderDialog.showModal();
}

async function init() {
  const [questionsRes, planRes] = await Promise.all([
    fetch('./data/questions.json?v=3'),
    fetch('./data/daily-plan.json?v=3'),
  ]);

  if (!questionsRes.ok || !planRes.ok) {
    throw new Error('Could not load study data. Check your connection and refresh.');
  }

  state.questions = await questionsRes.json();
  state.dailyPlan = await planRes.json();
  state.dayMap = new Map(state.dailyPlan.days.map((d) => [d.date, d]));

  const defaultDate = getDefaultDate();
  renderDay(defaultDate);
  renderStats(defaultDate);

  els.datePicker.min = state.dailyPlan.days[0]?.date;
  els.datePicker.max = state.dailyPlan.days.at(-1)?.date;

  els.datePicker.addEventListener('change', (e) => renderDay(e.target.value));
  els.prevDay.addEventListener('click', () => shiftDate(-1));
  els.nextDay.addEventListener('click', () => shiftDate(1));
  els.todayBtn.addEventListener('click', () => renderDay(getDefaultDate()));
  els.reminderBtn.addEventListener('click', openReminderDialog);

  els.testReminder.addEventListener('click', async () => {
    const ok = await requestNotificationPermission();
    if (ok) showNotification('GMAT VARC Tracker', 'Reminders are working! You will be notified daily at your chosen time.');
    else els.reminderStatus.textContent = 'Could not enable notifications.';
  });

  els.reminderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.reminder.time = els.reminderTime.value || '08:00';
    state.reminder.enabled = els.reminderEnabled.checked;
    if (state.reminder.enabled) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        els.reminderStatus.textContent = 'Enable notifications in your browser to use reminders.';
        state.reminder.enabled = false;
      }
    }
    saveReminder();
    await registerServiceWorker();
    els.reminderDialog.close();
  });

  await registerServiceWorker();
  state.tickInterval = setInterval(() => {
    updateTimerDisplays();
    checkDailyReminder();
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.activeTimer) {
      stopActiveTimer(true);
    }
  });
}

init().catch((err) => {
  els.questionList.innerHTML = `<div class="empty-state"><p>Failed to load study data.</p><p>${err.message}</p></div>`;
});
