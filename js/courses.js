/* Course suggestions: the list that pops up under search boxes as you type ("ca" → Calculus, Calculus 1, Calculus 2…).
   It's a plain list kept in this file (no database), so it's fast and free. To add a course, add one line to COURSES.

   Each line: [code, English name, French name, school, subject]
   - code: the official course code ("" for a general subject)
   - school: where the code is used ("" for a general subject)
   - subject: the matching subject in the database's subject list (English name), so picking a course can fill the subject too
   Course names are copied from the schools' public course lists. McGill, Concordia and Université de Montréal publish
   in one language only, so the other-language name on those lines is our translation, used so both languages find them. */

const CEGEP_SCI = ["CEGEP Science (Vanier, Dawson, John Abbott…)", "Cégep, Sciences de la nature"];
const CEGEP_SOC = ["CEGEP Social Science", "Cégep, Sciences humaines"];

const COURSES = [
  // General subjects (match the database's subject list)
  ["", "Calculus", "Calcul différentiel et intégral", "", "Calculus"],
  ["", "Linear algebra", "Algèbre linéaire", "", "Linear algebra"],
  ["", "Statistics", "Statistiques", "", "Statistics"],
  ["", "Math (general)", "Mathématiques (général)", "", "Math (general)"],
  ["", "Physics", "Physique", "", "Physics"],
  ["", "Chemistry", "Chimie", "", "Chemistry"],
  ["", "Organic chemistry", "Chimie organique", "", "Organic chemistry"],
  ["", "Biology", "Biologie", "", "Biology"],
  ["", "Economics", "Économie", "", "Economics"],
  ["", "Accounting", "Comptabilité", "", "Accounting"],
  ["", "Finance", "Finance", "", "Finance"],
  ["", "Psychology", "Psychologie", "", "Psychology"],
  ["", "History", "Histoire", "", "History"],
  ["", "Philosophy", "Philosophie", "", "Philosophy"],
  ["", "English (school course)", "Anglais (cours)", "", "English (school course)"],
  ["", "French (school course)", "Français (cours)", "", "French (school course)"],
  ["", "Essay writing", "Rédaction", "", "Essay writing"],
  ["", "Programming (Python)", "Programmation (Python)", "", "Programming (Python)"],
  ["", "Programming (Java)", "Programmation (Java)", "", "Programming (Java)"],
  ["", "Data analysis", "Analyse de données", "", "Data analysis"],
  ["", "Excel", "Excel", "", "Excel"],

  // CEGEP: Science program courses. Same codes at every CEGEP in Quebec (Vanier, Dawson, John Abbott, Marianopolis, Ahuntsic…)
  ["201-NYA-05", "Calculus I", "Calcul différentiel", CEGEP_SCI, "Calculus"],
  ["201-NYB-05", "Calculus II", "Calcul intégral", CEGEP_SCI, "Calculus"],
  ["201-NYC-05", "Linear Algebra", "Algèbre linéaire et géométrie vectorielle", CEGEP_SCI, "Linear algebra"],
  ["202-NYA-05", "General Chemistry", "Chimie générale : la matière", CEGEP_SCI, "Chemistry"],
  ["202-NYB-05", "Chemistry of Solutions", "Chimie des solutions", CEGEP_SCI, "Chemistry"],
  ["203-NYA-05", "Mechanics", "Mécanique", CEGEP_SCI, "Physics"],
  ["203-NYB-05", "Electricity and Magnetism", "Électricité et magnétisme", CEGEP_SCI, "Physics"],
  ["203-NYC-05", "Waves, Optics and Modern Physics", "Ondes et physique moderne", CEGEP_SCI, "Physics"],
  ["101-NYA-05", "General Biology I", "Évolution et diversité du vivant", CEGEP_SCI, "Biology"],

  ["360-300-RE", "Quantitative Methods in the Social Sciences", "Méthodes quantitatives en sciences humaines", CEGEP_SOC, "Statistics"],

  // Vanier: Science electives (codes as printed on Vanier's Science program grid; French is our translation)
  ["101-HTK", "General Biology II", "Biologie générale II", "Vanier", "Biology"],
  ["101-HTP", "Human Physiology", "Physiologie humaine", "Vanier", "Biology"],
  ["202-HTJ", "Organic Chemistry I", "Chimie organique I", "Vanier", "Organic chemistry"],
  ["202-HTK", "Organic Chemistry II", "Chimie organique II", "Vanier", "Organic chemistry"],
  ["202-HTQ", "Physical Chemistry", "Chimie physique", "Vanier", "Chemistry"],
  ["202-HTF", "Food and Drugs", "Aliments et médicaments", "Vanier", "Chemistry"],
  ["202-HTG", "Health and Beauty", "Santé et beauté", "Vanier", "Chemistry"],
  ["203-HTJ", "Astrophysics", "Astrophysique", "Vanier", "Physics"],
  ["203-HTK", "Statics and Engineering Physics", "Statique et physique de l’ingénieur", "Vanier", "Physics"],
  ["201-HTH", "Probability and Statistics", "Probabilités et statistiques", "Vanier", "Statistics"],
  ["201-HTJ", "Calculus III", "Calcul III", "Vanier", "Calculus"],
  ["201-HTK", "Linear Algebra II", "Algèbre linéaire II", "Vanier", "Linear algebra"],
  ["201-HTL", "Differential Equations", "Équations différentielles", "Vanier", "Calculus"],
  ["360-HTA", "Biophysics", "Biophysique", "Vanier", "Physics"],
  ["420-HTX", "C++ Programming", "Programmation C++", "Vanier", ""],

  // Dawson (English titles from Dawson and McGill's CEGEP list; French is our translation)
  ["201-BZF-05", "Calculus III", "Calcul III", "Dawson", "Calculus"],
  ["201-BZS-05", "Probability and Statistics", "Probabilités et statistiques", "Dawson", "Statistics"],
  ["201-BZT-DW", "Discrete Math", "Mathématiques discrètes", "Dawson", "Math (general)"],
  ["202-BZF-05", "Organic Chemistry I", "Chimie organique I", "Dawson", "Organic chemistry"],
  ["202-BZG-05", "Organic Chemistry II", "Chimie organique II", "Dawson", "Organic chemistry"],
  ["360-300-DW", "Quantitative Methods", "Méthodes quantitatives", "Dawson", "Statistics"],

  // Cégep Édouard-Montpetit (official French titles; English is our translation)
  ["201-CFF-04", "Calculus III", "Calcul différentiel et intégral III", "Cégep Édouard-Montpetit", "Calculus"],
  ["201-CFG-04", "Probability and Statistics", "Probabilités et statistiques", "Cégep Édouard-Montpetit", "Statistics"],
  ["202-CFE-04", "Organic Chemistry I", "Chimie organique I", "Cégep Édouard-Montpetit", "Organic chemistry"],
  ["202-CFF-04", "Organic Chemistry II", "Chimie organique II", "Cégep Édouard-Montpetit", "Organic chemistry"],
  ["101-CFD-04", "Physiology of Living Things", "Physiologie du vivant", "Cégep Édouard-Montpetit", "Biology"],
  ["101-CFE-04", "Microbiology and Immunology", "Microbiologie et immunologie", "Cégep Édouard-Montpetit", "Biology"],

  // McGill (official English titles; French is our translation)
  ["MATH 122", "Calculus for Management", "Calcul pour la gestion", "McGill", "Calculus"],
  ["MATH 139", "Calculus 1 with Precalculus", "Calcul 1 avec précalcul", "McGill", "Calculus"],
  ["MATH 140", "Calculus 1", "Calcul 1", "McGill", "Calculus"],
  ["MATH 141", "Calculus 2", "Calcul 2", "McGill", "Calculus"],
  ["MATH 123", "Linear Algebra and Probability", "Algèbre linéaire et probabilités", "McGill", "Linear algebra"],
  ["MATH 133", "Linear Algebra and Geometry", "Algèbre linéaire et géométrie", "McGill", "Linear algebra"],
  ["MATH 134", "Enriched Linear Algebra and Geometry", "Algèbre linéaire et géométrie (enrichi)", "McGill", "Linear algebra"],
  ["CHEM 110", "General Chemistry 1", "Chimie générale 1", "McGill", "Chemistry"],
  ["CHEM 120", "General Chemistry 2", "Chimie générale 2", "McGill", "Chemistry"],
  ["PHYS 101", "Introductory Physics - Mechanics", "Physique d’introduction : mécanique", "McGill", "Physics"],
  ["PHYS 102", "Introductory Physics - Electromagnetism", "Physique d’introduction : électromagnétisme", "McGill", "Physics"],
  ["PHYS 131", "Mechanics and Waves", "Mécanique et ondes", "McGill", "Physics"],
  ["PHYS 142", "Electromagnetism and Optics", "Électromagnétisme et optique", "McGill", "Physics"],
  ["BIOL 111", "Principles: Organismal Biology", "Principes : biologie des organismes", "McGill", "Biology"],
  ["BIOL 112", "Cell and Molecular Biology", "Biologie cellulaire et moléculaire", "McGill", "Biology"],
  ["COMP 202", "Foundations of Programming", "Bases de la programmation", "McGill", "Programming (Python)"],
  ["PSYC 100", "Introduction to Psychology", "Introduction à la psychologie", "McGill", "Psychology"],
  ["MGCR 211", "Introduction to Financial Accounting", "Introduction à la comptabilité financière", "McGill", "Accounting"],
  ["MGCR 222", "Introduction to Organizational Behaviour", "Introduction au comportement organisationnel", "McGill", ""],
  ["MGCR 233", "Data Programming for Business", "Programmation de données pour les affaires", "McGill", "Data analysis"],
  ["MGCR 352", "Principles of Marketing", "Principes de marketing", "McGill", ""],

  // Concordia (official English titles; French is our translation)
  ["MATH 203", "Differential & Integral Calculus I", "Calcul différentiel et intégral I", "Concordia", "Calculus"],
  ["COMP 248", "Object-Oriented Programming I", "Programmation orientée objet I", "Concordia", "Programming (Java)"],
  ["ECON 201", "Introduction to Microeconomics", "Introduction à la microéconomie", "Concordia", "Economics"],
  ["ENGR 213", "Applied Ordinary Differential Equations", "Équations différentielles ordinaires appliquées", "Concordia", "Calculus"],
  ["ENGR 233", "Applied Advanced Calculus", "Calcul avancé appliqué", "Concordia", "Calculus"],
  ["ENGR 242", "Statics", "Statique", "Concordia", "Physics"],
  ["ENGR 243", "Dynamics", "Dynamique", "Concordia", "Physics"],
  ["ENGR 251", "Thermodynamics I", "Thermodynamique I", "Concordia", "Physics"],
  ["ENGR 371", "Probability and Statistics in Engineering", "Probabilités et statistiques en ingénierie", "Concordia", "Statistics"],

  // Université de Montréal (official French titles; English is our translation)
  ["MAT 1400", "Calculus 1", "Calcul 1", "Université de Montréal", "Calculus"],
  ["MAT 1600", "Linear Algebra", "Algèbre linéaire", "Université de Montréal", "Linear algebra"],
  ["IFT 1015", "Programming 1", "Programmation 1", "Université de Montréal", "Programming (Python)"]
];

/* ===== Searching the list ===== */
const plain = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); // "Différentiel" → "differentiel"
const squash = s => plain(s).replace(/[^a-z0-9]/g, "");                                              // "201-NYA-05" → "201nya05"
const ROMAN = { i: "1", ii: "2", iii: "3", iv: "4" }; // so "calculus 1" also finds "Calculus I"
const wordsOf = s => plain(s).split(/[^a-z0-9]+/).filter(Boolean).flatMap(w => (ROMAN[w] ? [w, ROMAN[w]] : [w]));

const courseName = c => (lang === "fr" ? c.fr || c.en : c.en || c.fr);
const courseSchool = c => (Array.isArray(c.school) ? t(c.school[0], c.school[1]) : c.school);
const COURSE_LIST = COURSES.map(([code, en, fr, school, subject]) => ({ code, en, fr, school, subject,
  words: [...wordsOf(en), ...wordsOf(fr), ...wordsOf(code), ...wordsOf(Array.isArray(school) ? school.join(" ") : school)] }));

// Best matches for what was typed, most relevant first
function findCourses(q, max = 8) {
  const tokens = wordsOf(q), sq = squash(q);
  if (!sq) return [];
  const scored = [];
  for (const c of COURSE_LIST) {
    let score;
    if (c.code && /\d/.test(sq) && squash(c.code).startsWith(sq)) score = 100; // typing a code: "201-ny", "math14"
    else if (tokens.every(tk => c.words.some(w => w.startsWith(tk)))) {      // every word typed starts a word of the course
      const mine = plain(courseName(c)), other = plain(lang === "fr" ? c.en : c.fr), pq = plain(q).trim();
      score = 10 + (mine.startsWith(pq) ? 30 : other.startsWith(pq) ? 20 : 0) + (c.code ? 0 : 15); // general subjects first
    } else continue;
    scored.push({ c, score });
  }
  return scored.sort((a, b) => b.score - a.score || courseName(a.c).length - courseName(b.c).length).slice(0, max).map(x => x.c);
}

// What the box shows once a suggestion is picked: the code if there is one, otherwise the name
const courseQuery = c => c.code || courseName(c);

// A catalogue course by its code, e.g. "201nya05" → Calculus I (used by Find tutors to also show tutors of that subject)
const courseByCode = q => { const sq = squash(q); return sq ? COURSE_LIST.find(c => c.code && squash(c.code) === sq) : null; };

/* ===== The drop-down under a search box =====
   courseBox(input, onPick) wraps an existing text box and adds suggestions. onPick(course) runs when one is chosen;
   if it returns text, the box shows that text instead.
   The last row is always "Other: use what I typed", for courses that aren't in the list. onOther(text) runs when it's chosen
   (if not given, the typed text simply stays in the box).
   Works with the mouse, a finger, or the keyboard (↓ ↑ to move, Enter to pick, Esc to close). */
function courseBox(inp, onPick, cls = "acwrap", onOther) {
  const res = h("div", { class: "sres", role: "listbox", hidden: true });
  const box = h("div", { class: cls }, inp, res);
  inp.setAttribute("autocomplete", "off");
  inp.setAttribute("role", "combobox");
  inp.setAttribute("aria-autocomplete", "list");
  inp.setAttribute("aria-expanded", "false");
  const show = open => { res.hidden = !open; inp.setAttribute("aria-expanded", String(open)); };
  const pick = c => { inp.value = courseQuery(c); show(false); const v = onPick(c); if (typeof v === "string") inp.value = v; inp.focus(); };
  const draw = () => {
    const list = findCourses(inp.value), typed = inp.value.trim();
    if (!typed || (!list.length && typed.length < 2)) { show(false); return; }
    const pq = plain(inp.value);
    res.replaceChildren(...list.map(c => {
      const otherName = lang === "fr" ? c.en : c.fr;
      const viaOther = otherName && otherName !== courseName(c) && plain(otherName).includes(pq) && !plain(courseName(c)).includes(pq);
      return h("button", { type: "button", role: "option", onmousedown: e => e.preventDefault(), onclick: () => pick(c) },
        h("b", {}, courseName(c)), viaOther ? h("span", { class: "mu" }, " · " + otherName) : null,
        c.code ? h("small", { class: "acmeta" }, h("span", { class: "code" }, c.code), " " + courseSchool(c)) : h("small", { class: "acmeta" }, t("Subject", "Matière")));
    }), h("button", { type: "button", role: "option", class: "acother", onmousedown: e => e.preventDefault(),
      onclick: () => { show(false); inp.focus(); if (onOther) onOther(typed); } },
      h("b", {}, t("Other: ", "Autre : ") + "“" + typed + "”"), h("small", { class: "acmeta" }, t("Not in the list? Use it as you typed it.", "Pas dans la liste? Utilise-le tel quel."))));
    show(true);
  };
  const oldInput = inp.oninput;
  inp.oninput = e => { if (oldInput) oldInput(e); draw(); };
  inp.addEventListener("blur", () => setTimeout(() => { if (!box.contains(document.activeElement)) show(false); }, 150));
  inp.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" && !res.hidden) { const b = res.querySelector("button"); if (b) { e.preventDefault(); b.focus(); } }
    else if (e.key === "Escape") show(false);
  });
  res.onkeydown = e => {
    const bs = [...res.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? bs[i - 1] : inp).focus(); }
    else if (e.key === "Escape") { show(false); inp.focus(); }
  };
  res.addEventListener("focusout", () => setTimeout(() => { if (!box.contains(document.activeElement)) show(false); }, 150));
  return box;
}
