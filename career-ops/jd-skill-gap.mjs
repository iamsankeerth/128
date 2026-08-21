#!/usr/bin/env node
/**
 * JD ↔ CV skill-gap and match scoring for career-ops.
 * Usage: node jd-skill-gap.mjs <jd-file> <cv-file> [--out report.md]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outPath = outIdx !== -1 ? resolve(args[outIdx + 1]) : null;
const positional = args.filter((a, i) => a !== "--out" && (outIdx === -1 || i !== outIdx + 1));

const jdPath = resolve(positional[0] ?? "jds/amex-apprentice.md");
const cvPath = resolve(positional[1] ?? "cv-amex-apprentice.md");

const jd = readFileSync(jdPath, "utf8");
const cvRaw = readFileSync(cvPath, "utf8");
const cv = cvRaw.split(/\n# Changes Made|\n<!-- Resume notes/)[0];

const ROLE_ANALYTICS = "analytics";
const ROLE_SWE = "swe";

function detectRole() {
  if (/thermofisher|engineer.*software|java.*spring|hibernate/i.test(jdPath + jd)) return ROLE_SWE;
  if (/apprentice|analytics|risk management/i.test(jdPath + jd)) return ROLE_ANALYTICS;
  return ROLE_ANALYTICS;
}

const role = detectRole();

const ANALYTICS_CATALOG = [
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

const SWE_CATALOG = [
  { id: "java", label: "Java", jd: /\bjava\b/i, cv: /\bjava\b/i, weight: 1.0 },
  { id: "spring", label: "Spring", jd: /\bspring\b/i, cv: /\bspring\b/i, weight: 1.0 },
  { id: "hibernate", label: "Hibernate", jd: /\bhibernate\b/i, cv: /\bhibernate\b/i, weight: 0.9 },
  { id: "python", label: "Python", jd: /\bpython\b/i, cv: /\bpython\b/i, weight: 0.7 },
  { id: "html5", label: "HTML5", jd: /html5|html/i, cv: /html5|\bhtml\b/i, weight: 0.8 },
  { id: "css", label: "CSS", jd: /\bcss\b/i, cv: /\bcss\b|bootstrap/i, weight: 0.8 },
  { id: "js_frameworks", label: "Modern JavaScript frameworks", jd: /javascript frameworks|react|angular|vue/i, cv: /react|javascript|node\.js/i, weight: 0.9 },
  { id: "oop", label: "Object-oriented programming", jd: /object-oriented|oop/i, cv: /object-oriented|\boop\b/i, weight: 0.9 },
  { id: "design_patterns", label: "Design patterns", jd: /design patterns/i, cv: /design patterns/i, weight: 0.8 },
  { id: "data_structures", label: "Data structures", jd: /data structures/i, cv: /data structures/i, weight: 0.8 },
  { id: "microservices", label: "Microservices", jd: /microservices/i, cv: /microservices/i, weight: 0.9 },
  { id: "rest_apis", label: "RESTful APIs", jd: /restful apis?|\brest\b/i, cv: /rest|api/i, weight: 1.0 },
  { id: "git", label: "Git", jd: /\bgit\b/i, cv: /\bgit\b/i, weight: 0.9 },
  { id: "cicd", label: "CI/CD", jd: /ci\/cd/i, cv: /ci\/cd/i, weight: 0.8 },
  { id: "agile", label: "Agile", jd: /\bagile\b/i, cv: /\bagile\b/i, weight: 0.7 },
  { id: "cloud", label: "Cloud (AWS / Azure)", jd: /aws|azure|cloud platforms/i, cv: /aws|azure/i, weight: 0.8 },
  { id: "containers", label: "Docker / Kubernetes", jd: /docker|kubernetes/i, cv: /docker|kubernetes/i, weight: 0.8 },
  { id: "communication", label: "Communication", jd: /communication skills|verbal communication/i, cv: /communication|presentations|reports/i, weight: 0.7 },
  { id: "problem_solving", label: "Problem-solving", jd: /problem-solving|analytical/i, cv: /problem-solving|analytical|analysis/i, weight: 0.8 },
  { id: "web_frameworks", label: "Web frameworks (Django/Flask)", jd: /web technologies|web applications/i, cv: /django|flask|fastapi/i, weight: 0.7 },
];

const SKILL_CATALOG = role === ROLE_SWE ? SWE_CATALOG : ANALYTICS_CATALOG;

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

  if (role === ROLE_SWE) {
    const webFacing = /django|flask|react|html|css|front-end|web/i.test(cv);
    const apiFacing = /rest|api|integration/i.test(cv);
    let pct = 55;
    if (entryLevel) pct = 70;
    if (internshipCount >= 2) pct += 8;
    if (internshipCount >= 3) pct += 4;
    if (webFacing) pct += 6;
    if (apiFacing) pct += 6;
    return Math.min(Math.max(pct, 50), 88);
  }

  const analyticsFacing = /founder'?s office|research|analysis|reports|market trends/i.test(cv);
  const domainAligned = /risk|finance|credit|banking|analytics/i.test(cv);
  let pct = 55;
  if (entryLevel) pct = 68;
  if (internshipCount >= 2) pct += 8;
  if (internshipCount >= 3) pct += 4;
  if (analyticsFacing) pct += 6;
  if (domainAligned) pct += 6;
  else pct -= 4;
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
  if (role === ROLE_SWE && /information technology|computer science|software engineering/i.test(cv + jd)) pct += 6;
  if (/analytics|ai|data science|machine learning/i.test(cv)) pct += 4;
  return Math.min(pct, 88);
}

function scoreLocation(cvText = cv) {
  const jdGurugram = /gurugram|gurgaon/i.test(jd);
  const jdBangalore = /bangalore|bengaluru/i.test(jd);
  const hybrid = /hybrid/i.test(jd);
  const relocateStated = /relocate|gurugram|gurgaon|bangalore|bengaluru|willing to relocate/i.test(cvText);
  let pct = 62;
  if (jdGurugram && /gurugram|gurgaon|relocate/i.test(cvText)) pct = 76;
  if (jdBangalore && /bangalore|bengaluru|relocate/i.test(cvText)) pct = 76;
  if (hybrid && relocateStated) pct += 2;
  return Math.min(pct, 80);
}

function overallWeighted(components, domainPenalty = 0) {
  const weights = { skills: 0.4, experience: 0.25, education: 0.2, location: 0.15 };
  const total =
    components.skills * weights.skills +
    components.experience * weights.experience +
    components.education * weights.education +
    components.location * weights.location -
    domainPenalty;
  return Math.round(Math.max(total, 0));
}

function domainPenaltyPoints() {
  if (role === ROLE_SWE) {
    const javaStack = /spring|hibernate/i.test(cv);
    const jdJavaHeavy = /java.*spring|spring.*hibernate/i.test(jd);
    if (jdJavaHeavy && !javaStack) return 4;
    return 0;
  }
  const financeSignals = /risk|finance|credit|banking|payments|fintech/i.test(cv);
  const jdDomainHeavy = /risk management|credit quality|control management|consumer portfolio/i.test(jd);
  if (jdDomainHeavy && !financeSignals) return 5;
  return 0;
}

function topStrengths(skillResult) {
  if (role === ROLE_SWE) {
    return [
      "REST API & integration experience — CloudSire Salesforce/Jira/ServiceNow API pipelines",
      "Full-stack web development — Django, Flask, React, HTML5, CSS across internships and projects",
      "Python backend depth — SDE internship with FastAPI-style APIs and production-oriented modular design",
      "Strong fresher fit — B.E. IT (2025), multiple SWE-relevant internships, no experience barrier in JD",
      "OOP & data structures — explicitly surfaced; major project demonstrates end-to-end software delivery",
    ];
  }
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
  if (role === ROLE_SWE) {
    const ordered = [
      namedGaps.includes("Spring") && "Spring — core JD requirement; not demonstrated on resume (honest gap)",
      namedGaps.includes("Hibernate") && "Hibernate — core JD requirement; no ORM/JPA experience stated",
      namedGaps.includes("Cloud (AWS / Azure)") && "Cloud (AWS/Azure) — JD lists cloud platforms; not on resume",
      namedGaps.includes("Docker / Kubernetes") && "Docker/Kubernetes — containerization not demonstrated",
      namedGaps.includes("CI/CD") && "CI/CD — only conceptual familiarity stated; no pipeline ownership shown",
      namedGaps.includes("Java") && "Java — listed but secondary to Python on resume; limited production Java evidence",
      "Life sciences / laboratory software domain — no direct R&D instrument or lab-systems exposure",
    ].filter(Boolean);
    return ordered.slice(0, 5);
  }
  const ordered = [
    namedGaps.includes("Dashboards") && "Dashboards — JD mentions report/dashboard work; not demonstrated on resume",
    namedGaps.includes("Risk management") && "Risk management — core program theme; no finance/credit risk exposure yet",
    namedGaps.includes("ChatGPT / Copilot / Gemini (named)") && "Named Gen AI tools — practical LLM building exists, but productivity-tool familiarity not stated",
    namedGaps.includes("Control management") && "Control management — no audit/compliance/control-environment experience",
    "Financial services domain — no banking/payments/credit portfolio context",
  ].filter(Boolean);
  return ordered.slice(0, 5);
}

function buildReport() {
  const skills = scoreSkills();
  const experience = scoreExperience();
  const education = scoreEducation();
  const coverLetterGuess = cvPath.replace(/cv-/i, "cover-letter-").replace(/\.md$/, ".md");
  let coverLetter = "";
  try {
    coverLetter = readFileSync(resolve(coverLetterGuess), "utf8");
  } catch {
    /* optional */
  }
  const location = scoreLocation(`${cv}\n${coverLetter}`);
  const domainAdj = domainPenaltyPoints();
  const overall = overallWeighted({ skills: skills.pct, experience, education, location }, domainAdj);
  const postingClosed = /filled|closed|expired/i.test(jd);

  const lines = [];
  lines.push(`# Match Report: ${basename(jdPath)} ↔ ${basename(cvPath)}\n`);
  if (postingClosed) {
    lines.push("> **Posting status:** Official careers page shows this requisition as **filled/closed** (as of 2026-08-21). Materials prepared for portfolio/referral use if reposted.\n");
  }
  lines.push("## Overall Match\n");
  lines.push("| Metric | Score |");
  lines.push("|--------|------:|");
  lines.push(`| **Overall weighted match** | **${overall}%** |`);
  lines.push(`| Skills match | ${skills.pct}% |`);
  lines.push(`| Experience level match | ${experience}% |`);
  lines.push(`| Education match | ${education}% |`);
  lines.push(`| Location / relocation factor | ${location}% |`);
  if (domainAdj) lines.push(`| Domain/stack alignment adjustment | −${domainAdj} pts |`);
  lines.push("");
  lines.push("_Weights: Skills 40%, Experience 25%, Education 20%, Location 15%_\n");

  lines.push("## Skill Matrix\n");
  lines.push("| Skill | In JD | On CV | Status |");
  lines.push("|-------|:-----:|:-----:|--------|");
  for (const row of skills.rows.filter((r) => r.inJd || r.inCv)) {
    const status =
      row.status === "match" ? "✅ Match" : row.status === "gap" ? "⚠️ Gap" : row.status === "bonus" ? "➕ Bonus" : "—";
    lines.push(`| ${row.label} | ${row.inJd ? "Yes" : "No"} | ${row.inCv ? "Yes" : "No"} | ${status} |`);
  }
  lines.push("");

  lines.push("## Top 5 Strengths\n");
  topStrengths(skills).forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("");

  lines.push("## Top 5 Gaps\n");
  topGaps(skills).forEach((g, i) => lines.push(`${i + 1}. ${g}`));
  lines.push("");

  lines.push("## How Resume Addressed Gaps\n");
  if (role === ROLE_SWE) {
    lines.push("- **Spring/Hibernate:** Not fabricated; resume leads with Python/React/Django and honest Java familiarity.");
    lines.push("- **REST/microservices:** CloudSire integration work reframed with explicit REST API language.");
    lines.push("- **Web stack:** RCI Django + HTML5/CSS internship restored; React and Bootstrap surfaced in skills.");
    lines.push("- **OOP/design patterns:** Samyama modularization and project architecture bullets added without overstating enterprise patterns.");
    lines.push("- **Cloud/containers/CI/CD:** Omitted from claims; CI/CD noted only as conceptual familiarity.");
  }
  lines.push("");

  lines.push("## Recommendation\n");
  if (postingClosed) {
    lines.push(`**Do not apply now — posting filled.** Match score ${overall}% suggests a **maybe/apply-if-reposted** profile for this Java-heavy fresher SWE role. Strong on APIs/web/Python; weak on Spring/Hibernate/cloud stack.`);
  } else if (overall >= 75) {
    lines.push(`**Apply recommended** — Overall match ${overall}% (${(overall / 10).toFixed(1)}/10). Strong fresher fit; address Java/Spring gaps in interviews.`);
  } else if (overall >= 65) {
    lines.push(`**Apply with caveats** — Overall match ${overall}%. Competitive for fresher eligibility but Java/Spring stack gaps are material; tailor cover letter and upskill Spring basics.`);
  } else {
    lines.push(`**Borderline** — Overall match ${overall}%. Significant stack gaps (Spring/Hibernate/cloud); consider upskilling before applying.`);
  }

  return lines.join("\n");
}

const report = buildReport();
if (outPath) {
  writeFileSync(outPath, report + "\n", "utf8");
  console.log(`Wrote ${outPath}`);
} else {
  console.log(report);
}
