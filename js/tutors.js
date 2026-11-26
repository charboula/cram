/* Cram "Find tutors": search real, approved tutors from the database, filter, see why each one matches,
   compare up to 3, and open a full tutor profile. */

const TUTOR_FIELDS = "user_id,headline,bio,hourly_rate_cents,offers_online,offers_in_person,levels,availability,verification_status," +
  "profiles(display_name,languages)," +
  "tutor_subjects(course_code,grade,subjects(name_en,name_fr),institutions(id,name,name_fr))," +
  "tutor_institutions(is_current,program,start_year,end_year,institutions(id,name,name_fr))";

const label = (list, value) => { const x = list.find(l => l[0] === value); return x ? t(x[1], x[2]) : value; };
const tutorName = x => (x.profiles && x.profiles.display_name) || t("Tutor", "Tuteur");
const rateOf = x => (x.hourly_rate_cents ? x.hourly_rate_cents / 100 : null);
const initials = n => n.split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
const avatar = (x, size = 52) => h("div", { class: "av", style: "width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size * 0.35) + "px;background:" + ["#7E1D3C", "#2F4B8F", "#1F7A6B", "#7A4B1F", "#5B3A8F"][[...x.user_id].reduce((a, c) => a + c.charCodeAt(0), 0) % 5] }, initials(tutorName(x)));
const verifyTag = v => v === "verified" ? h("span", { class: "tag ok" }, "✓ " + t(`Verified by ${BRAND}`, `Vérifié par ${BRAND}`))
  : h("span", { class: "tag gr" }, t("Self-reported, not verified", "Déclaré, non vérifié"));
const yearsText = s => s.is_current ? (s.start_year ? s.start_year + " – " : "") + t("now", "aujourd’hui") : [s.start_year, s.end_year].filter(Boolean).join(" – ");

// Approved, listed tutors (the database only returns those anyway). Kept for 1 minute to keep the site fast.
async function loadTutors() {
  if (loadTutors.cache && Date.now() - loadTutors.at < 60000) return { data: loadTutors.cache };
  const { data, error } = await SB.from("tutor_profiles").select(TUTOR_FIELDS).eq("is_listed", true).eq("approved", true).limit(300);
  if (!error) {
    const ratings = await loadRatings();
    (data || []).forEach(x => { x.rating = ratings[x.user_id]; });
    loadTutors.cache = data; loadTutors.at = Date.now();
  }
  return { data, error };
}

/* ===== Matching: every reason comes from real profile facts, never made up ===== */
function matchTutor(x, F) {
  const reasons = [];
  let score = 0, exact = null;
  const subs = x.tutor_subjects || [];
  const q = F.q.trim().toLowerCase(), squash = s => s.toLowerCase().replace(/[\s-]/g, "");
  if (q) {
    const hits = subs.filter(s => [s.subjects && s.subjects.name_en, s.subjects && s.subjects.name_fr, s.course_code].some(v => v && v.toLowerCase().includes(q)));
    // A known course code (e.g. 201-NYA-05): tutors who listed only the subject (Calculus) still count, just lower
    const course = !hits.length && courseByCode(q);
    const sameSubject = course && course.subject ? subs.filter(s => s.subjects && s.subjects.name_en === course.subject) : [];
    if (sameSubject.length) { score += 1; reasons.push(t("Teaches ", "Enseigne ") + subjectName(sameSubject[0].subjects) + t(" (not this exact course)", " (pas ce cours précis)")); }
    else if (!hits.length && !(x.headline || "").toLowerCase().includes(q)) return null;
    exact = hits.find(s => s.course_code && squash(s.course_code) === squash(q));
    if (exact) {
      score += 3;
      reasons.push(t("Took ", "A suivi ") + exact.course_code + (exact.institutions ? t(" at ", " à ") + schoolName(exact.institutions) : "") +
        (exact.grade ? " (" + exact.grade + t(", self-reported", ", déclaré") + ")" : ""));
    } else if (hits.length) {
      score += 2;
      reasons.push(t("Teaches ", "Enseigne ") + subjectName(hits[0].subjects) + (hits[0].course_code ? " · " + hits[0].course_code : ""));
    }
  }
  const rate = rateOf(x);
  if (F.budget) {
    if (!rate || rate > F.budget) return null;
    reasons.push(money(rate) + t(", within your $" + F.budget + " budget", ", dans ton budget de " + F.budget + " $"));
  }
  if (F.level) { if (!(x.levels || []).includes(F.level)) return null; reasons.push(t("Teaches ", "Niveau ") + label(LEVELS, F.level)); }
  if (F.lang) { if (!((x.profiles && x.profiles.languages) || []).includes(F.lang)) return null; reasons.push(t("Speaks ", "Parle ") + label(LANGS, F.lang)); }
  if (F.format === "online") { if (!x.offers_online) return null; reasons.push(t("Online", "En ligne")); }
  if (F.format === "in_person") { if (!x.offers_in_person) return null; reasons.push(t("In person", "En personne")); }
  if (F.slot) { if (!(x.availability || []).includes(F.slot)) return null; reasons.push(t("Usually free: ", "Généralement libre : ") + label(SLOTS, F.slot).toLowerCase()); }
  if (F.school) { // a preference, never a filter
    const at = (x.tutor_institutions || []).find(i => i.institutions && i.institutions.id === F.school.id) || subs.find(s => s.institutions && s.institutions.id === F.school.id);
    if (at) { score += 2; reasons.push(t("Same school: ", "Même école : ") + schoolName(F.school)); }
  }
  return { score, reasons, exact: !!exact };
}

/* ===== Find tutors page ===== */
const COMPARE = []; // up to 3 tutors picked for side-by-side comparison

async function findPage(arg) {
  const F = findPage.F || (findPage.F = { q: "", level: "", budget: "", lang: "", format: "", slot: "", school: null });
  if (arg) F.q = decodeURIComponent(arg);
  // First visit as a student: start from their own profile (level and school), which they can change
  if (ME && ME.mode === "student" && !findPage.prefilled) {
    findPage.prefilled = true;
    const { data } = await SB.from("student_profiles").select("level,institutions(id,name,name_fr)").eq("user_id", ME.id).maybeSingle();
    if (data) { F.level = F.level || data.level || ""; F.school = F.school || data.institutions || null; }
  }
  const out = h("div", { class: "res", style: "margin-top:8px" });
  const compareBar = h("div", { class: "row", style: "margin:8px 0" });
  let tutors = [];

  const sel = (key, placeholder, options) => h("select", { "aria-label": placeholder, onchange: e => { F[key] = e.target.value; draw(); } },
    h("option", { value: "" }, placeholder), ...options.map(([v, en, fr]) => h("option", { value: v, selected: F[key] === v }, t(en, fr))));
  const search = h("input", { type: "text", value: F.q, placeholder: t("Course code or subject, e.g. 201-NYA-05, MATH 140, Chemistry", "Code de cours ou matière, ex. 201-NYA-05, MATH 140, Chimie"),
    "aria-label": t("Search tutors", "Chercher un tuteur"), oninput: e => { F.q = e.target.value; clearTimeout(search.timer); search.timer = setTimeout(draw, 200); } });
  const budget = h("input", { type: "number", min: 5, max: 200, value: F.budget, placeholder: t("Any", "Tous"), "aria-label": t("Max $ per hour", "Max $ de l’heure"),
    oninput: e => { F.budget = e.target.value ? Number(e.target.value) : ""; draw(); } });
  const schoolLine = h("div", {});
  const drawSchool = () => schoolLine.replaceChildren(F.school
    ? h("div", { class: "row" }, h("span", {}, t("Preferring tutors from ", "Priorité aux tuteurs de ") + schoolName(F.school)), h("button", { class: "btn sm g", onclick: () => { F.school = null; drawSchool(); draw(); } }, t("Remove", "Retirer")))
    : schoolPicker(s => { F.school = s; drawSchool(); draw(); }, t("Prefer tutors from a school (optional)", "Priorité à une école (facultatif)")));
  drawSchool();

  function drawCompareBar() {
    compareBar.replaceChildren();
    if (!COMPARE.length) return;
    compareBar.append(...[h("button", { class: "btn sm", disabled: COMPARE.length < 2, onclick: showCompare }, t("Compare ", "Comparer ") + "(" + COMPARE.length + "/3)"),
      h("button", { class: "btn sm g", onclick: () => { COMPARE.length = 0; draw(); } }, t("Clear", "Effacer")),
      COMPARE.length < 2 ? h("span", { class: "mu" }, t("Pick at least 2 tutors.", "Choisis au moins 2 tuteurs.")) : null].filter(Boolean));
  }

  function draw() {
    out.replaceChildren();
    drawCompareBar();
    if (!tutors.length) {
      out.append(h("div", { class: "c" }, h("h3", {}, t("No tutors yet", "Aucun tuteur pour l’instant")),
        h("p", { class: "mu" }, t(`${BRAND} is just starting. Tutors appear here once they finish their profile and ${BRAND} approves them.`, `${BRAND} commence tout juste. Les tuteurs apparaissent ici une fois leur profil terminé et approuvé par ${BRAND}.`)),
        h("button", { class: "btn sm g", onclick: () => (ME ? go("#/dashboard") : authModal("signup", "tutor")) }, t("Become a tutor", "Devenir tuteur"))), requestNudge());
      return;
    }
    const list = tutors.map(x => ({ x, m: matchTutor(x, F) })).filter(r => r.m)
      .sort((a, b) => b.m.score - a.m.score || (rateOf(a.x) || 999) - (rateOf(b.x) || 999));
    out.append(h("h3", { style: "margin:12px 0 4px;grid-column:1/-1" }, list.length + " " + (list.length === 1 ? t("tutor", "tuteur") : t("tutors", "tuteurs"))));
    if (!list.length) out.append(h("div", { class: "c mu" }, t("No tutor matches all of these. Try removing a filter.", "Aucun tuteur ne correspond à tout ça. Essaie de retirer un filtre.")));
    list.forEach(({ x, m }) => out.append(tutorCard(x, m.reasons, draw, m.exact)));
    out.append(requestNudge());
  }

  V.replaceChildren(h("section", {},
    h("h2", {}, t("Find a tutor", "Trouver un tuteur")),
    h("p", { class: "sub" }, t(`Every tutor here was approved by ${BRAND}. Tutors from your school are shown first, but anyone qualified can help.`, `Chaque tuteur ici a été approuvé par ${BRAND}. Ceux de ton école passent en premier, mais toute personne qualifiée peut aider.`)),
    courseBox(search, c => { F.q = courseQuery(c); draw(); }, "sbox wide"),
    h("div", { class: "fil" },
      h("div", {}, h("label", { class: "f" }, t("Level", "Niveau")), sel("level", t("Any level", "Tout niveau"), LEVELS)),
      h("div", {}, h("label", { class: "f" }, t("Max $/hour", "Max $/heure")), budget),
      h("div", {}, h("label", { class: "f" }, t("Language", "Langue")), sel("lang", t("Any language", "Toute langue"), LANGS)),
      h("div", {}, h("label", { class: "f" }, t("Format", "Format")), sel("format", t("Online or in person", "En ligne ou en personne"), [["online", "Online", "En ligne"], ["in_person", "In person", "En personne"]])),
      h("div", {}, h("label", { class: "f" }, t("Free when", "Libre quand")), sel("slot", t("Any time", "N’importe quand"), SLOTS))),
    h("div", { class: "c", style: "padding:12px" }, schoolLine),
    compareBar, out));
  out.append(h("p", { class: "mu loading" }, t("Loading tutors…", "Chargement des tuteurs…")));
  const { data, error } = await loadTutors();
  if (error) { out.replaceChildren(h("div", { class: "c mu" }, t("Couldn’t load tutors right now. Please try again.", "Impossible de charger les tuteurs. Réessaie."))); return; }
  tutors = data || [];
  draw();
}

// Under the results: nobody right? Post a request so tutors come to you (instead of leaving the site empty-handed)
function requestNudge() {
  if (ME && ME.mode === "tutor") return "";
  const q = (findPage.F && findPage.F.q || "").trim();
  return h("div", { class: "c nudge", style: "grid-column:1/-1" },
    h("h3", {}, t("Didn’t find the right person?", "Pas trouvé la bonne personne?")),
    h("p", { class: "mu" }, t("Post a request" + (q ? " for " + q : "") + ". Tutors who took the course can offer to help, and you choose who to talk to. Your name stays hidden until then.",
      "Publie une demande" + (q ? " pour " + q : "") + ". Les tuteurs qui ont suivi le cours peuvent proposer leur aide, et tu choisis avec qui parler. Ton nom reste caché d’ici là.")),
    h("button", { class: "btn sm", onclick: () => { newRequestPage.prefill = q; ME ? go("#/requests/new") : authModal("signup", "student"); } }, t("Post a request", "Publier une demande")));
}

function tutorCard(x, reasons, redraw, exact) {
  const rate = rateOf(x);
  const subs = (x.tutor_subjects || []).map(s => subjectName(s.subjects) + (s.course_code ? " (" + s.course_code + ")" : ""));
  const schools = (x.tutor_institutions || []).map(i => schoolName(i.institutions)).filter(Boolean);
  const inCompare = COMPARE.some(c => c.user_id === x.user_id);
  return h("div", { class: "c h tc" },
    h("div", { class: "row", style: "flex-wrap:nowrap;align-items:flex-start" }, avatar(x),
      h("div", { style: "flex:1;min-width:0" }, h("h3", { style: "font-size:17px" }, tutorName(x)), h("div", { class: "mu" }, x.headline || "")),
      h("div", { style: "text-align:right" }, h("b", { style: "font-size:17px" }, rate ? money(rate) : t("Rate not set", "Tarif non fixé")))),
    // The reason they match comes right under the name: "Took 201-NYA-05 at Vanier (A)" is what students care about most
    reasons.length ? h("div", { class: exact ? "why hit" : "why" }, h("b", {}, exact ? "✓ " + t("Took your course: ", "A suivi ton cours : ") : t("Why this match: ", "Pourquoi ce choix : ")),
      (exact ? reasons.slice(0, 1).map(r => r.replace(/^(Took|A suivi) /, "")) : []).concat(reasons.slice(exact ? 1 : 0)).join(" · ")) : null,
    subs.length ? h("div", { class: "chips" }, ...subs.slice(0, 4).map(s => h("span", { class: "tag" }, s)), subs.length > 4 ? h("span", { class: "mu" }, "+" + (subs.length - 4)) : null) : null,
    h("div", { class: "mu" }, [schools.slice(0, 2).join(", "), [x.offers_online && t("Online", "En ligne"), x.offers_in_person && t("In person", "En personne")].filter(Boolean).join(" / "),
      ((x.profiles && x.profiles.languages) || []).map(l => label(LANGS, l)).join(", ")].filter(Boolean).join(" · ")),
    h("div", { class: "row sp" },
      h("div", { class: "row" }, h("a", { class: "btn sm", href: "#/tutor/" + x.user_id }, t("View profile", "Voir le profil")), verifyTag(x.verification_status), ratingTag(x.rating)),
      h("label", { class: "row", style: "cursor:pointer;font-size:14px" }, h("input", { type: "checkbox", checked: inCompare, onchange: e => {
        const i = COMPARE.findIndex(c => c.user_id === x.user_id);
        if (e.target.checked) { if (COMPARE.length >= 3) { e.target.checked = false; toast(t("You can compare up to 3 tutors.", "Tu peux comparer jusqu’à 3 tuteurs.")); return; } COMPARE.push(x); }
        else if (i >= 0) COMPARE.splice(i, 1);
        redraw();
      } }), t("Compare", "Comparer"))));
}

function showCompare() {
  const row = (name, fn) => h("tr", {}, h("th", {}, name), ...COMPARE.map(x => h("td", {}, fn(x) || "–")));
  modal(h("h3", { style: "margin-bottom:10px" }, t("Compare tutors", "Comparer les tuteurs")),
    h("div", { style: "overflow-x:auto" }, h("table", { class: "cmp" },
      h("tr", {}, h("th", {}), ...COMPARE.map(x => h("th", {}, h("a", { href: "#/tutor/" + x.user_id }, tutorName(x))))),
      row(t("Rate", "Tarif"), x => rateOf(x) ? money(rateOf(x)) : ""),
      row(t("Format", "Format"), x => [x.offers_online && t("Online", "En ligne"), x.offers_in_person && t("In person", "En personne")].filter(Boolean).join(", ")),
      row(t("Levels", "Niveaux"), x => (x.levels || []).map(l => label(LEVELS, l)).join(", ")),
      row(t("Languages", "Langues"), x => ((x.profiles && x.profiles.languages) || []).map(l => label(LANGS, l)).join(", ")),
      row(t("Usually free", "Généralement libre"), x => (x.availability || []).map(s => label(SLOTS, s)).join(", ")),
      row(t("Subjects", "Matières"), x => (x.tutor_subjects || []).map(s => subjectName(s.subjects) + (s.course_code ? " (" + s.course_code + ")" : "")).join(", ")),
      row(t("Schools", "Écoles"), x => (x.tutor_institutions || []).map(i => schoolName(i.institutions)).join(", ")),
      row(t("Verification", "Vérification"), x => x.verification_status === "verified" ? t(`Verified by ${BRAND}`, `Vérifié par ${BRAND}`) : t("Self-reported", "Déclaré")))),
    h("button", { class: "btn g", style: "margin-top:12px", onclick: () => modal.close() }, t("Close", "Fermer")));
  $("#modal .c").classList.add("wide");
}

/* ===== One tutor's full profile ===== */
async function tutorPage(id) {
  V.replaceChildren(loadingView());
  const { data: x, error } = await SB.from("tutor_profiles").select(TUTOR_FIELDS).eq("user_id", id).maybeSingle();
  if (error || !x) { nf(); return; }
  const rate = rateOf(x);
  const reviews = await reviewsBox(x.user_id);
  const box = (title, ...kids) => h("div", { class: "c" }, h("h3", { style: "margin-bottom:6px" }, title), ...kids);
  const line = (main, sub) => h("div", { style: "padding:9px 0;border-top:1px solid var(--ln)" }, h("b", {}, main), sub ? h("div", { class: "mu" }, sub) : null);
  V.replaceChildren(h("section", {},
    h("a", { href: "#/find", class: "bk" }, "‹ " + t("Back to search", "Retour à la recherche")),
    h("div", { class: "c", style: "margin-top:12px" },
      h("div", { class: "row", style: "flex-wrap:nowrap;align-items:flex-start" }, avatar(x, 64),
        h("div", { style: "flex:1;min-width:0" }, h("h2", { style: "margin:0" }, tutorName(x)), h("div", { class: "mu" }, x.headline || "")),
        h("div", { style: "text-align:right" }, h("b", { style: "font-size:19px" }, rate ? money(rate) : ""))),
      h("div", { class: "row", style: "margin-top:12px" }, verifyTag(x.verification_status),
        x.offers_online ? h("span", { class: "tag gr" }, t("Online", "En ligne")) : null, x.offers_in_person ? h("span", { class: "tag gr" }, t("In person", "En personne")) : null,
        ...((x.profiles && x.profiles.languages) || []).map(l => h("span", { class: "tag gr" }, label(LANGS, l)))),
      h("div", { class: "row", style: "margin-top:16px" },
        h("button", { class: "btn", disabled: !!ME && ME.id === x.user_id, onclick: () => contactTutor(x.user_id) }, t("Contact", "Contacter")),
        h("span", { class: "mu" }, !ME ? t("Log in to contact tutors.", "Connecte-toi pour contacter les tuteurs.")
          : ME.id === x.user_id ? t("This is your own profile.", "C’est ton propre profil.")
          : !ME.roles.student ? t("You need a student role to contact tutors.", "Il te faut un rôle élève pour contacter des tuteurs.") : ""),
        ME && ME.id !== x.user_id ? h("span", { style: "margin-left:auto" }, reportLink(x.user_id, null, tutorName(x))) : null)),
    h("div", { class: "g2", style: "margin-top:14px" },
      box(t("Subjects and skills", "Matières et compétences"), h("p", { class: "mu", style: "margin:0 0 6px" }, t("Grades are claimed by the tutor.", "Les notes sont déclarées par le tuteur.")),
        ...((x.tutor_subjects || []).length ? x.tutor_subjects.map(s => line(subjectName(s.subjects) + (s.course_code ? " · " + s.course_code : ""),
          [schoolName(s.institutions), s.grade ? t("grade ", "note ") + s.grade + t(" (self-reported)", " (déclarée)") : ""].filter(Boolean).join(" · "))) : [h("p", { class: "mu" }, "–")])),
      box(t("Schools", "Écoles"), ...((x.tutor_institutions || []).length ? x.tutor_institutions.map(i => line(schoolName(i.institutions), [i.program, yearsText(i)].filter(Boolean).join(" · "))) : [h("p", { class: "mu" }, "–")])),
      box(t("Levels taught", "Niveaux enseignés"), h("p", { class: "mu", style: "margin:0" }, (x.levels || []).map(l => label(LEVELS, l)).join(", ") || "–")),
      box(t("Usually free", "Généralement libre"), h("p", { class: "mu", style: "margin:0" }, (x.availability || []).map(s => label(SLOTS, s)).join(", ") || "–"))),
    x.bio ? h("div", { class: "c", style: "margin-top:14px" }, h("h3", {}, t("About", "À propos")), h("p", { style: "white-space:pre-line;margin:8px 0 0" }, x.bio)) : null,
    reviews,
    h("p", { class: "mu", style: "margin-top:14px" }, t(`“Verified” appears only after ${BRAND} checks an official document. Everything else is self-reported by the tutor.`, `« Vérifié » n’apparaît qu’après la vérification d’un document officiel par ${BRAND}. Le reste est déclaré par le tuteur.`))));
}

ROUTES.find = findPage;
ROUTES.tutor = tutorPage;
PAGE_TITLES.find = () => t("Find a tutor", "Trouver un tuteur");
PAGE_TITLES.tutor = () => t("Tutor profile", "Profil du tuteur");
