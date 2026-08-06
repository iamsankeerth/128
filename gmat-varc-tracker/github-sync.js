const GITHUB_KEY = 'gmat-varc-github-v1';
let syncTimer = null;

export function loadGithubSettings() {
  try {
    return JSON.parse(localStorage.getItem(GITHUB_KEY)) || {
      enabled: false,
      token: '',
      repo: 'iamsankeerth/128',
      branch: 'master',
      pathPrefix: 'gmat-varc-tracker/progress',
    };
  } catch {
    return { enabled: false, token: '', repo: 'iamsankeerth/128', branch: 'master', pathPrefix: 'gmat-varc-tracker/progress' };
  }
}

export function saveGithubSettings(settings) {
  localStorage.setItem(GITHUB_KEY, JSON.stringify(settings));
}

function base64Encode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildDailyPayload(date, { dayMap, questions, getQuestionProgress }) {
  const day = dayMap.get(date);
  if (!day) return null;

  const questionEntries = {};
  for (const no of day.questionNumbers) {
    const p = getQuestionProgress(no);
    if (!p.selectedAnswer && !p.completed && !p.elapsedMs) continue;
    const q = questions[String(no)] || questions[no];
    questionEntries[String(no)] = {
      selectedAnswer: p.selectedAnswer,
      result: p.result,
      correctAnswer: q?.correctAnswer || null,
      completed: p.completed,
      elapsedMs: p.elapsedMs,
      lastUpdated: p.lastUpdated,
    };
  }

  if (!Object.keys(questionEntries).length) return null;

  const answered = Object.values(questionEntries).filter((q) => q.selectedAnswer);
  const correct = answered.filter((q) => q.result === 'correct');

  return {
    date,
    label: day.label,
    updatedAt: new Date().toISOString(),
    summary: {
      total: day.questionNumbers.length,
      answered: answered.length,
      correct: correct.length,
      completed: Object.values(questionEntries).filter((q) => q.completed).length,
    },
    questions: questionEntries,
  };
}

export async function syncToGitHub(date, deps, settings = loadGithubSettings()) {
  if (!settings.enabled || !settings.token?.trim()) return { ok: false, reason: 'disabled' };

  const payload = buildDailyPayload(date, deps);
  if (!payload) return { ok: false, reason: 'empty' };

  const [owner, repo] = settings.repo.trim().split('/');
  if (!owner || !repo) return { ok: false, reason: 'bad-repo' };

  const path = `${settings.pathPrefix.replace(/\/$/, '')}/${date}.json`;
  const content = JSON.stringify(payload, null, 2);
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${settings.token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let sha = undefined;
  const existing = await fetch(`${apiBase}?ref=${encodeURIComponent(settings.branch)}`, { headers });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const response = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Update GMAT practice answers for ${date}`,
      content: base64Encode(content),
      branch: settings.branch,
      sha,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { ok: false, reason: err.message || response.statusText };
  }

  return { ok: true, path };
}

export function scheduleGithubSync(date, deps, onResult) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const result = await syncToGitHub(date, deps);
    if (onResult) onResult(result);
  }, 2500);
}
