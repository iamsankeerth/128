#!/usr/bin/env node
/**
 * JD ↔ CV skill-gap and match scoring for career-ops.
 * Usage: node jd-skill-gap.mjs <jd-file> <cv-file>
 */
import { readFileSync } from "node:fs";
import { resolve, basename } from "node:path";

const jdPath = resolve(process.argv[2] ?? "jds/amex-apprentice.md");
const cvPath = resolve(process.argv[3] ?? "cv-amex-apprentice.md");

const jd = readFileSync(jdPath, "utf8");
const cvRaw = readFileSync(cvPath, "utf8");
const cv = cvRaw.split(/\n# Changes Made|\n<!-- Resume notes/)[0];

const SKILL_CATALOG = [
  { id: "python", label: "Python", jd: /\bpython\b/i, cv: /\bpython\b/i, weight: 1.0 },
  { id: "sql", label: "SQL", jd: /\bsql\b/i, cv: /\bsql\b/i, weight: 0.9 },
  { id: "excel", label: "Microsoft Excel", jd: /\bexcel\b/i, cv: /\bexcel\b/i, weight: 1.0 },
  { id: "powerpoint", label: "Microsoft PowerPoint", jd: /\bpowerpoint\b/i, cv: /\bpowerpoint\b/i, weight: 1.0 },
  { id: "genai", label: "Generative AI / LLMs", jd: /generative ai|llm|chatgpt|copilot|gemini/i, cv: /generative ai|llm|language model|slm|transformers/i, weight: 1.0 },
  { id: "data_analysis", label: "Data analysis", jd: /data analysis|analyze business|trends|patterns|insights/i, cv: /analysis|analyz|dataset|data quality|market trends|research/i, weight: 1.0 },
  { id: "reports", label: "Reports", jd: /\breports?\b/i, cv: /\breports?\b/i, weight: 0.9 },
  { id: "presentations", label: "Presentations", jd: /\bpresentations?\b/i, cv: /\bpresentations?\b/i, weight: 0.9 },
  { id: "dashboards", label: "Dashboards", jd: /\bdashboards?\b/i, cv: /\bdashboards?\b/i, weight: 0.8 },
  { id: "risk", label: "Risk management", jd: /\brisk\b/i, cv: /\brisk\b/i, weight: 1.0 },
  { id: "business_rec", label: "Business recommendations", jd: /business recommendations|business problem/i, cv: /decision-making|strategic|business opportunities|growth strategies/i, weight: 0.8 },
  { id: "communication", label: "Communication", jd: /communication skills|present findings/i, cv: /presentations|leadership|reports/i, weight: 0.7 },
  { id: "teamwork", label: "Teamwork", jd: /team environment|collaborate/i, cv: /cross-functional|teams|coordinated/i, weight: 0.7 },
  { id: "problem_solving", label: "Problem-solving", jd: /problem-solving|business problem/i, cv: /problem|solving|analysis|automated/i, weight: 0.7 },
  { id: "ml_analytics", label: "ML / analytics projects", jd: /machine learning|data science|analytics/i, cv: /machine learning|data science|cnn-lstm|model/i, weight: 0.8 },
  { id: "ai_tools_named", label: "ChatGPT / Copilot / Gemini (named)", jd: /chatgpt|copilot|gemini/i, cv: /chatgpt|copilot|gemini/i, weight: 0.5 },
  { id: "process_improvement", label: "Process improvement", jd: /process improvement/i, cv: /streamline|automated|workflow|conversion/i, weight: 0.6 },
  { id: "control_mgmt", label: "Control management", jd: /control management|control environment/i, cv: /control/i, weight: 0.5 },
];

function scoreSkills() {
  const rows = SKILL_CATALOG.map((skill) => {
    const inJd = skill.jd.test(jd);
    const inCv = skill.cv.test(cv);
    let status = "not_required";
    if (inJd && inCv) status = "match";
    else if (inJd && !inCv) status = "gap";
    else if (!inJd && inCv) status = "bonus";
    return { ...skill, inJd, inCv, status };
  });

  const required = rows.filter((r) => r.inJd);
  const matched = required.filter((r) => r.inCv);
  const weightedRequired = required.reduce((s, r) => s + r.weight, 0);
  const weightedMatched = matched.reduce((s, r) => s + r.weight, 0);
  const pct = weightedRequired ? Math.round((weightedMatched / weightedRequired) * 100) : 0;

  return { rows, required, matched, gaps: required.filter((r) => !r.inCv), pct };
}

function scoreExperience() {
  const entryLevel = /entry-level|apprentice|fresher|no prior/i.test(jd);
  const internshipCount = (cv.match(/\bIntern\b/gi) ?? []).length;
  const analyticsFacing = /founder'?s office|research|analysis|reports|market trends/i.test(cv);
  const domainAligned = /risk|finance|credit|banking|analytics/i.test(cv);
  let pct = 55;
  if (entryLevel) pct = 68;
  if (internshipCount >= 2) pct += 8;
  if (internshipCount >= 3) pct += 4;
  if (analyticsFacing) pct += 6;
  if (domainAligned) pct += 6;
  else pct -= 4; // no direct finance/risk exposure
  return Math.min(Math.max(pct, 50), 85);
}

function scoreEducation() {
  const needsDegree = /bachelor|graduate|degree/i.test(jd);
  const hasDegree = /b\.?e\.?|bachelor|undergraduate/i.test(cv);
  const strongAcademics = /strong academic/i.test(jd);
  const cpiMatch = cv.match(/cpi[^\d]*(\d+\.?\d*)/i);
  const cpi = cpiMatch ? Number(cpiMatch[1]) : null;
  let pct = 0;
  if (needsDegree && hasDegree) pct += 68;
  else if (hasDegree) pct += 58;
  if (strongAcademics && cpi !== null) {
    if (cpi >= 8.5) pct += 22;
    else if (cpi >= 8) pct += 16;
    else if (cpi >= 7.5) pct += 12;
    else if (cpi >= 7) pct += 8;
    else pct += 4;
  } else {
    pct += 12;
  }
  if (/analytics|ai|data science|machine learning/i.test(cv)) pct += 8;
  return Math.min(pct, 88);
}

function scoreLocation(cvText = cv) {
  const jdCity = /gurugram|gurgaon/i.test(jd);
  const hybrid = /hybrid/i.test(jd);
  const relocateStated = /relocate|gurugram|gurgaon|willing to relocate/i.test(cvText);
  let pct = 62;
  if (jdCity && relocateStated) pct = 76;
  if (hybrid && relocateStated) pct += 2;
  return Math.min(pct, 80);
}

function overallWeighted(components, domainPenalty = 0) {
  const weights = {
    skills: 0.4,
    experience: 0.25,
    education: 0.2,
    location: 0.15,
  };
  const total =
    components.skills * weights.skills +
    components.experience * weights.experience +
    components.education * weights.education +
    components.location * weights.location -
    domainPenalty;
  return Math.round(Math.max(total, 0));
}

function domainPenaltyPoints() {
  const financeSignals = /risk|finance|credit|banking|payments|fintech/i.test(cv);
  const jdDomainHeavy = /risk management|credit quality|control management|consumer portfolio/i.test(jd);
  if (jdDomainHeavy && !financeSignals) return 5;
  return 0;
}

function topStrengths(skillResult) {
  return [
    "Python & SQL — listed on resume; preferred qualifications in JD",
    "Generative AI / LLM experience — Samyama.ai SLM fine-tuning on 35K+ record dataset",
    "Business-facing analytics — market research, reports, and PowerPoint/Excel deliverables at Poditivity",
    "ML & data project depth — CNN-LSTM project (93.7% accuracy) plus AI/ML bootcamp certification",
    "Strong apprentice fit — multiple internships and final-year graduate eligibility",
  ];
}

function topGaps(skillResult) {
  const namedGaps = skillResult.gaps.map((s) => s.label);
  const ordered = [
    namedGaps.includes("Dashboards") && "Dashboards — JD mentions report/dashboard work; not demonstrated on resume",
    namedGaps.includes("Risk management") && "Risk management — core program theme; no finance/credit risk exposure yet",
    namedGaps.includes("ChatGPT / Copilot / Gemini (named)") && "Named Gen AI tools (ChatGPT, Copilot, Gemini) — practical LLM building experience exists, but productivity-tool familiarity not stated",
    namedGaps.includes("Control management") && "Control management — no audit/compliance/control-environment experience",
    "Financial services domain — no banking/payments/credit portfolio context",
  ].filter(Boolean);
  return ordered.slice(0, 5);
}

function printReport() {
  const skills = scoreSkills();
  const experience = scoreExperience();
  const education = scoreEducation();
  let coverLetter = "";
  try {
    coverLetter = readFileSync(resolve("cover-letter-amex-apprentice.md"), "utf8");
  } catch {
    /* optional */
  }
  const location = scoreLocation(`${cv}\n${coverLetter}`);
  const domainAdj = domainPenaltyPoints();
  const overall = overallWeighted(
    {
      skills: skills.pct,
      experience,
      education,
      location,
    },
    domainAdj
  );

  console.log(`# Match Report: ${basename(jdPath)} ↔ ${basename(cvPath)}\n`);
  console.log("## Overall Match\n");
  console.log(`| Metric | Score |`);
  console.log(`|--------|------:|`);
  console.log(`| **Overall weighted match** | **${overall}%** |`);
  console.log(`| Skills match | ${skills.pct}% |`);
  console.log(`| Experience level match | ${experience}% |`);
  console.log(`| Education match | ${education}% |`);
  console.log(`| Location / relocation factor | ${location}% |`);
  if (domainAdj) {
    console.log(`| Domain alignment adjustment | −${domainAdj} pts |`);
  }
  console.log("");
  console.log("_Weights: Skills 40%, Experience 25%, Education 20%, Location 15%_\n");

  console.log("## Skill Matrix\n");
  console.log("| Skill | In JD | On CV | Status |");
  console.log("|-------|:-----:|:-----:|--------|");
  for (const row of skills.rows.filter((r) => r.inJd || r.inCv)) {
    const status =
      row.status === "match" ? "✅ Match" : row.status === "gap" ? "⚠️ Gap" : row.status === "bonus" ? "➕ Bonus" : "—";
    console.log(`| ${row.label} | ${row.inJd ? "Yes" : "No"} | ${row.inCv ? "Yes" : "No"} | ${status} |`);
  }
  console.log("");

  console.log("## Top 5 Strengths\n");
  topStrengths(skills).forEach((s, i) => console.log(`${i + 1}. ${s}`));
  console.log("");

  console.log("## Top 5 Gaps\n");
  topGaps(skills).forEach((g, i) => console.log(`${i + 1}. ${g}`));
  console.log("");

  console.log("## Recommendation\n");
  if (overall >= 75) {
    console.log(`**Apply recommended** — Overall match ${overall}% (${(overall / 10).toFixed(1)}/10). Strong fresher fit for an analytics-focused apprentice role; address domain gaps in interviews.`);
  } else if (overall >= 68) {
    console.log(`**Apply with caveats** — Overall match ${overall}%. Address key gaps in cover letter or application form.`);
  } else {
    console.log(`**Borderline** — Overall match ${overall}%. Consider upskilling on listed gaps before applying.`);
  }
}

printReport();
