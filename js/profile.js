/* Cram "My profile" page: shared details, the student profile, and the tutor profile
   (subjects, schools, rate, availability). Also the school search box used across the site. */

const LANGS = [["en", "English", "Anglais"], ["fr", "French", "Français"], ["es", "Spanish", "Espagnol"], ["ar", "Arabic", "Arabe"],
  ["zh", "Mandarin", "Mandarin"], ["pt", "Portuguese", "Portugais"], ["it", "Italian", "Italien"], ["other", "Other", "Autre"]];
const LEVELS = [["high_school", "High school", "Secondaire"], ["cegep", "CEGEP", "Cégep"], ["university", "University", "Université"], ["adult", "Adult learner", "Adulte"]];
const SLOTS = [["weekday_morning", "Weekday mornings", "Matins de semaine"], ["weekday_afternoon", "Weekday afternoons", "Après-midis de semaine"],
  ["weekday_evening", "Weekday evenings", "Soirs de semaine"], ["weekend_morning", "Weekend mornings", "Matins de fin de semaine"],
  ["weekend_afternoon", "Weekend afternoons", "Après-midis de fin de semaine"], ["weekend_evening", "Weekend evenings", "Soirs de fin de semaine"]];
const SCHOOL_TYPES = [["university", "University", "Université"], ["cegep", "CEGEP", "Cégep"], ["college", "College", "Collège"], ["high_school", "High school", "École secondaire"], ["other", "Other", "Autre"]];

const schoolName = s => (s ? (lang === "fr" && s.name_fr ? s.name_fr : s.name) : "");
const subjectName = s => (s ? (lang === "fr" ? s.name_fr : s.name_en) : "");

// Clickable chips for picking several values. `chosen` is an array that gets updated in place.
function chipPicker(options, chosen, label) {
  return h("div", { class: "chips", role: "group", "aria-label": label }, ...options.map(([value, en, fr]) =>
    h("button", { type: "button", class: "chip" + (chosen.includes(value) ? " on" : ""), "aria-pressed": String(chosen.includes(value)), onclick: e => {
      const i = chosen.indexOf(value);
      i < 0 ? chosen.push(value) : chosen.splice(i, 1);
      e.currentTarget.classList.toggle("on", i < 0);
      e.currentTarget.setAttribute("aria-pressed", String(i < 0));
    } }, t(en, fr))));
}

// Search box for schools, powered by the database (search_institutions). onPick(school) runs when one is chosen.
function schoolPicker(onPick, placeholder) {
  const box = h("div", { class: "sbox" });
  const res = h("div", { class: "sres", role: "listbox", hidden: true });
  const inp = h("input", { type: "text", autocomplete: "off", role: "combobox", "aria-expanded": "false", "aria-autocomplete": "list",
    placeholder: placeholder || t("Search your school, e.g. McGill", "Cherche ton école, ex. McGill"), "aria-label": t("School", "École") });
  const show = open => { res.hidden = !open; inp.setAttribute("aria-expanded", String(open)); };
  const suggest = h("button", { type: "button", onclick: () => { show(false); suggestSchool(inp.value.trim()); } },
    h("b", {}, t("Can’t find it? Suggest your school", "Introuvable? Suggère ton école")));
  let timer = null, last = "";
  inp.oninput = () => {
    clearTimeout(timer);
    const q = inp.value.trim();
    if (q.length < 2) { show(false); return; }
    timer = setTimeout(async () => { // wait until typing pauses, then ask the database
      last = q;
      const { data, error } = await SB.rpc("search_institutions", { q });
      if (q !== last) return; // a newer search started
      res.replaceChildren();
      if (error) res.append(h("div", { class: "mu", style: "padding:12px 16px" }, t("Search isn’t available right now.", "La recherche n’est pas disponible pour l’instant.")));
      (data || []).forEach(s => res.append(h("button", { type: "button", role: "option", onclick: () => { inp.value = ""; show(false); onPick(s); } },
        h("b", {}, schoolName(s)), h("br"), h("small", {}, [s.city, s.province].filter(Boolean).join(", ")))));
      res.append(suggest);
      show(true);
    }, 250);
  };
  inp.onkeydown = e => {
    if (e.key === "ArrowDown") { const b = res.querySelector("button"); if (b) { e.preventDefault(); b.focus(); } }
    else if (e.key === "Escape") show(false);
  };
  res.onkeydown = e => {
    const bs = [...res.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? bs[i - 1] : inp).focus(); }
    else if (e.key === "Escape") { show(false); inp.focus(); }
  };
  box.append(inp, res);
  return box;
}

// "My school isn't listed": saved as a pending suggestion that Cram reviews
function suggestSchool(prefill) {
  const f = { name: prefill || "", city: "", type: "university", website: "" };
  const er = h("p", { class: "err", role: "alert" });
  const input = (label, key, attrs = {}) => [h("label", { class: "f" }, label),
    h("input", { type: "text", value: f[key], "aria-label": label, oninput: e => { f[key] = e.target.value; }, ...attrs })];
  const type = h("select", { "aria-label": t("Type", "Type"), onchange: e => { f.type = e.target.value; } },
    ...SCHOOL_TYPES.map(([v, en, fr]) => h("option", { value: v }, t(en, fr))));
  const send = async () => {
    if (f.name.trim().length < 2) { er.textContent = t("Please enter the school’s name.", "Entre le nom de l’école."); return; }
    const { error } = await SB.from("institution_suggestions").insert({ name: f.name.trim().slice(0, 160), city: f.city.trim().slice(0, 100) || null,
      type: f.type, website: f.website.trim().slice(0, 200) || null });
    if (error) { er.textContent = /row-level security/i.test(error.message) ? t("You already have 5 suggestions waiting for review.", "Tu as déjà 5 suggestions en attente.") : error.message; return; }
    modal.close();
    toast(t("Thanks! We’ll review it soon.", "Merci! On la vérifiera bientôt."));
  };
  modal(h("h3", { style: "margin-bottom:10px" }, t("Suggest a school", "Suggérer une école")),
    h("p", { class: "mu" }, t(`${BRAND} reviews every suggestion before it appears in search.`, `${BRAND} vérifie chaque suggestion avant qu’elle apparaisse dans la recherche.`)),
    ...input(t("School name", "Nom de l’école"), "name"), ...input(t("City", "Ville"), "city"),
    h("label", { class: "f" }, t("Type", "Type")), type, ...input(t("Website (optional)", "Site Web (facultatif)"), "website"), er,
    h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" },
      h("button", { class: "btn g", onclick: () => modal.close() }, t("Cancel", "Annuler")), h("button", { class: "btn", onclick: send }, t("Send", "Envoyer"))));
}

// A Save button that shows "Saved" or the error
function saveButton(label, action) {
  const btn = h("button", { class: "btn sm", onclick: async () => {
    btn.disabled = true;
    try { const error = await action(); toast(error ? t("Couldn’t save: ", "Impossible d’enregistrer : ") + error.message : t("Saved", "Enregistré")); }
    finally { btn.disabled = false; }
  } }, label);
  return btn;
}

const field = (label, el, hint) => h("div", { style: "display:grid;gap:4px" }, h("label", { class: "f", style: "margin:0" }, label), el, hint ? h("span", { class: "mu", style: "font-size:13px" }, hint) : null);
const listRow = (main, sub, onRemove) => h("div", { class: "row sp", style: "padding:10px 0;border-top:1px solid var(--ln);flex-wrap:nowrap" },
  h("div", {}, h("b", {}, main), sub ? h("div", { class: "mu" }, sub) : null),
  h("button", { class: "btn sm no", onclick: onRemove, "aria-label": t("Remove ", "Retirer ") + main }, t("Remove", "Retirer")));

/* ===== The page ===== */
async function profilePage() {
  V.replaceChildren(loadingView());
  const one = q => q.maybeSingle();
  const [p, sp, tp, subs, schools, subjectList] = await Promise.all([
    one(SB.from("profiles").select("display_name,languages").eq("id", ME.id)),
    ME.roles.student ? one(SB.from("student_profiles").select("level,show_institution_publicly,institution_id,institutions(id,name,name_fr)").eq("user_id", ME.id)) : { data: null },
    ME.roles.tutor ? one(SB.from("tutor_profiles").select("headline,bio,hourly_rate_cents,offers_online,offers_in_person,levels,availability").eq("user_id", ME.id)) : { data: null },
    ME.roles.tutor ? SB.from("tutor_subjects").select("id,course_code,grade,subjects(name_en,name_fr),institutions(name,name_fr)").eq("tutor_id", ME.id).order("created_at") : { data: [] },
    ME.roles.tutor ? SB.from("tutor_institutions").select("id,is_current,program,start_year,end_year,institutions(name,name_fr)").eq("tutor_id", ME.id).order("start_year", { ascending: false }) : { data: [] },
    ME.roles.tutor ? SB.from("subjects").select("id,name_en,name_fr,category").order("name_en") : { data: [] }]);
  const failed = [p, sp, tp, subs, schools, subjectList].find(r => r && r.error);
  if (failed) {
    V.replaceChildren(h("section", {}, h("div", { class: "c" }, h("h3", {}, t("Profiles aren’t switched on yet", "Les profils ne sont pas encore activés")),
      h("p", { class: "mu" }, t(`${BRAND}’s database needs its latest update. Please try again later.`, `La base de données de ${BRAND} doit être mise à jour. Réessaie plus tard.`)),
      h("p", { class: "mu", style: "font-size:12px" }, t("Technical detail: ", "Détail technique : ") + (failed.error.message || String(failed.error))))));
    return;
  }
  // Forms with editable fields: one Save button at the bottom saves all of them at once
  const forms = [aboutSection(p.data || {})];
  if (ME.mode === "student" && sp.data) forms.push(studentSection(sp.data));
  if (ME.mode === "tutor" && tp.data) forms.push(tutorSection(tp.data));
  const sections = forms.map(x => x.el);
  // Lists (subjects, schools) save each item as soon as you add it, so they stay separate
  if (ME.mode === "tutor" && tp.data) sections.push(tutorSubjectsSection(subs.data || [], subjectList.data || []), tutorSchoolsSection(schools.data || []));
  const saveAll = saveButton(t("Save changes", "Enregistrer les changements"), async () => {
    const hadBirthDate = !!ME.birthDate;
    for (const x of forms) { const error = await x.save(); if (error) return error; } // stops at the first problem and shows it
    if (!hadBirthDate && ME.birthDate) setTimeout(() => { if (cur.startsWith("#/profile")) profilePage(); }, 800); // date of birth is saved for good: redraw without it
    return null;
  });
  saveAll.className = "btn";
  const otherRole = ME.mode === "tutor" ? ME.roles.student : ME.roles.tutor;
  V.replaceChildren(h("section", { class: "narrow" },
    h("h2", {}, t("My profile", "Mon profil")),
    h("p", { class: "sub" }, ME.mode === "tutor"
      ? t(`This is what students see once ${BRAND} approves you. Grades and schools are shown as self-reported.`, `C’est ce que les élèves voient une fois que ${BRAND} t’a approuvé. Les notes et écoles sont indiquées comme déclarées.`)
      : t("Only you see this. Your school is shown to tutors only if you choose.", "Toi seul vois ceci. Ton école est montrée aux tuteurs seulement si tu le choisis.")),
    otherRole ? h("p", { class: "mu" }, ME.mode === "tutor" ? t("To edit your student profile, switch to student mode.", "Pour modifier ton profil élève, passe en mode élève.") : t("To edit your tutor profile, switch to tutor mode.", "Pour modifier ton profil tuteur, passe en mode tuteur.")) : null,
    h("div", { style: "display:grid;gap:14px" }, ...sections.slice(0, forms.length),
      h("div", { class: "savebar" }, saveAll, h("span", { class: "mu" }, t("Saves everything above in one go.", "Enregistre tout ce qui est au-dessus d’un coup."))),
      ...sections.slice(forms.length))));
}

function aboutSection(p) {
  const f = { name: p.display_name || "", languages: [...(p.languages || [])] };
  // Date of birth is asked once (it can't be changed later), so it only shows here until it's saved
  const dob = ME.birthDate ? null : datePicker(t("Date of birth", "Date de naissance"));
  const save = async () => {
    if (f.name.trim().length < 2) return { message: t("Please enter your name.", "Entre ton nom.") };
    if (dob && dob.getValue()) {
      const { error } = await SB.rpc("set_birth_date", { d: dob.getValue() });
      if (error) return error;
      ME.birthDate = dob.getValue();
    } else if (dob && dob.partly()) return { message: t("Finish your date of birth (day, month and year), or leave it empty.", "Complète ta date de naissance (jour, mois et année), ou laisse-la vide.") };
    const { error } = await SB.from("profiles").update({ display_name: f.name.trim(), languages: f.languages }).eq("id", ME.id);
    if (!error) { ME.name = f.name.trim(); renderChrome(); }
    return error;
  };
  return { save, el: h("div", { class: "c", style: "display:grid;gap:14px" }, h("h3", {}, t("About you", "À propos de toi")),
    field(t(`Name shown on ${BRAND}`, `Nom affiché sur ${BRAND}`), h("input", { type: "text", value: f.name, maxlength: 80, oninput: e => { f.name = e.target.value; } }),
      ME.mode === "tutor" ? t("Tip: first name and last initial, e.g. Maya C.", "Astuce : prénom et initiale du nom, ex. Maya C.") : null),
    field(t("Languages you speak", "Langues que tu parles"), chipPicker(LANGS, f.languages, t("Languages", "Langues"))),
    dob ? field(t("Date of birth", "Date de naissance"), dob,
      t(`Asked once, kept private. ${BRAND} uses it only for its safety rules for minors, and it can’t be changed later.`, `Demandée une fois, gardée privée. ${BRAND} s’en sert seulement pour ses règles de sécurité pour les mineurs, et elle ne peut pas être modifiée ensuite.`)) : null) };
}

function studentSection(sp) {
  const f = { level: sp.level || "", school: sp.institutions || null, show: !!sp.show_institution_publicly };
  const schoolLine = h("div", {});
  const drawSchool = () => schoolLine.replaceChildren(f.school
    ? h("div", { class: "row" }, h("b", {}, schoolName(f.school)), h("button", { type: "button", class: "btn sm g", onclick: () => { f.school = null; drawSchool(); } }, t("Remove", "Retirer")))
    : schoolPicker(s => { f.school = s; drawSchool(); }));
  drawSchool();
  const level = h("select", { onchange: e => { f.level = e.target.value; } }, h("option", { value: "" }, t("Choose…", "Choisis…")),
    ...LEVELS.map(([v, en, fr]) => h("option", { value: v, selected: f.level === v }, t(en, fr))));
  const save = async () => {
    const { error } = await SB.from("student_profiles").update({ level: f.level || null, institution_id: f.school ? f.school.id : null, show_institution_publicly: f.show }).eq("user_id", ME.id);
    return error;
  };
  return { save, el: h("div", { class: "c", style: "display:grid;gap:14px" }, h("h3", {}, ME.kind === "parent" ? t("Your child’s studies", "Les études de ton enfant") : t("Your studies", "Tes études")),
    field(t("Level", "Niveau"), level),
    field(t("School (optional)", "École (facultatif)"), schoolLine, t("Not in school? Leave this empty.", "Pas aux études? Laisse vide.")),
    h("label", { class: "row", style: "cursor:pointer;flex-wrap:nowrap" },
      h("input", { type: "checkbox", checked: f.show, onchange: e => { f.show = e.target.checked; } }), t("Show my school to tutors", "Montrer mon école aux tuteurs"))) };
}

function tutorSection(tp) {
  const f = { headline: tp.headline || "", bio: tp.bio || "", rate: tp.hourly_rate_cents ? tp.hourly_rate_cents / 100 : "",
    online: tp.offers_online, inPerson: tp.offers_in_person, levels: [...(tp.levels || [])], availability: [...(tp.availability || [])] };
  const save = async () => {
    const rate = Math.round(Number(f.rate));
    if (f.rate !== "" && !(rate >= 5 && rate <= 200)) return { message: t("Rate must be between $5 and $200.", "Le tarif doit être entre 5 $ et 200 $.") };
    if (!f.online && !f.inPerson) return { message: t("Choose online, in person, or both.", "Choisis en ligne, en personne ou les deux.") };
    const row = { headline: f.headline.trim() || null, bio: f.bio.trim() || null, hourly_rate_cents: f.rate === "" ? null : rate * 100,
      offers_online: f.online, offers_in_person: f.inPerson, levels: f.levels, availability: f.availability };
    const { error } = await SB.from("tutor_profiles").update(row).eq("user_id", ME.id);
    if (!error) Object.assign(ME.tutor || (ME.tutor = {}), row);
    return error;
  };
  return { save, el: h("div", { class: "c", style: "display:grid;gap:14px" }, h("h3", {}, t("Your tutoring", "Ton tutorat")),
    field(t("Headline", "Titre"), h("input", { type: "text", value: f.headline, maxlength: 120, placeholder: t("e.g. McGill math student, A in Calculus I", "ex. Étudiant en maths à McGill, A en Calcul I"), oninput: e => { f.headline = e.target.value; } })),
    field(t("About your tutoring", "À propos de ton tutorat"), h("textarea", { maxlength: 1000, oninput: e => { f.bio = e.target.value; } }, f.bio),
      t("Your experience and how you teach. Only real facts, please.", "Ton expérience et ta façon d’enseigner. Seulement des faits réels.")),
    field(t("Hourly rate (CAD)", "Tarif horaire ($ CA)"), h("input", { type: "number", min: 5, max: 200, step: 1, value: f.rate, style: "max-width:140px", oninput: e => { f.rate = e.target.value; } })),
    field(t("Format", "Format"), h("div", { class: "row" },
      h("label", { class: "row", style: "cursor:pointer" }, h("input", { type: "checkbox", checked: f.online, onchange: e => { f.online = e.target.checked; } }), t("Online", "En ligne")),
      h("label", { class: "row", style: "cursor:pointer" }, h("input", { type: "checkbox", checked: f.inPerson, onchange: e => { f.inPerson = e.target.checked; } }), t("In person", "En personne")))),
    field(t("Levels you teach", "Niveaux enseignés"), chipPicker(LEVELS, f.levels, t("Levels", "Niveaux"))),
    field(t("When you’re usually free", "Quand tu es généralement libre"), chipPicker(SLOTS, f.availability, t("Availability", "Disponibilités")))) };
}

// Picking a suggested course fills the course code and chooses the matching subject in the list
function pickCourseInto(c, f, select, subjectList) {
  f.code = c.code || "";
  const s = subjectList.find(x => x.name_en === c.subject);
  if (s) { f.subject = String(s.id); select.value = String(s.id); }
  return f.code; // what the course box shows (empty for a general subject, which has no code)
}

function tutorSubjectsSection(list, subjectList) {
  const wrap = h("div", { class: "c" });
  const f = { subject: "", code: "", grade: "", school: null };
  const er = h("p", { class: "err", role: "alert" });
  const cats = [["academic", "School subjects", "Matières scolaires"], ["language", "Languages", "Langues"], ["tech", "Tech and software", "Techno et logiciels"], ["arts", "Music and arts", "Musique et arts"], ["other", "Other", "Autre"]];
  const subjectSelect = h("select", { onchange: e => { f.subject = e.target.value; } }, h("option", { value: "" }, t("Choose a subject…", "Choisis une matière…")),
    ...cats.map(([c, en, fr]) => h("optgroup", { label: t(en, fr) }, ...subjectList.filter(s => s.category === c).map(s => h("option", { value: s.id }, subjectName(s))))));
  const schoolLine = h("div", {});
  const drawSchool = () => schoolLine.replaceChildren(f.school
    ? h("div", { class: "row" }, h("b", {}, schoolName(f.school)), h("button", { type: "button", class: "btn sm g", onclick: () => { f.school = null; drawSchool(); } }, t("Remove", "Retirer")))
    : schoolPicker(s => { f.school = s; drawSchool(); }, t("Where you took it (optional)", "Où tu l’as suivi (facultatif)")));
  drawSchool();
  const add = async () => {
    if (!f.subject) { er.textContent = t("Choose a subject.", "Choisis une matière."); return; }
    const { error } = await SB.from("tutor_subjects").insert({ tutor_id: ME.id, subject_id: Number(f.subject), course_code: f.code.trim().toUpperCase() || null,
      grade: f.grade.trim() || null, institution_id: f.school ? f.school.id : null });
    if (error) { er.textContent = /duplicate/i.test(error.message) ? t("You already listed this.", "Tu l’as déjà ajouté.") : error.message; return; }
    profilePage();
  };
  wrap.append(h("h3", {}, t("Subjects and skills you teach", "Matières et compétences enseignées")),
    h("p", { class: "mu" }, t("Add a course code if you took a specific course, so students in that course find you first.", "Ajoute un code de cours si tu as suivi un cours précis, pour que les élèves de ce cours te trouvent en premier.")),
    ...(list.length ? list.map(s => listRow(subjectName(s.subjects) + (s.course_code ? " · " + s.course_code : ""),
      [schoolName(s.institutions), s.grade ? t("grade (self-reported) ", "note (déclarée) ") + s.grade : ""].filter(Boolean).join(" · "),
      async () => { const { error } = await SB.from("tutor_subjects").delete().eq("id", s.id); if (error) toast(error.message); else profilePage(); }))
      : [h("p", { class: "mu" }, t("No subjects yet.", "Aucune matière pour l’instant."))]),
    h("div", { style: "display:grid;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--ln)" },
      h("b", {}, t("Add a subject", "Ajouter une matière")), subjectSelect,
      h("div", { class: "g2" },
        courseBox(h("input", { type: "text", maxlength: 30, placeholder: t("Course code or name (optional), e.g. 201-NYA-05", "Code ou nom du cours (facultatif), ex. 201-NYA-05"), "aria-label": t("Course code", "Code de cours"), oninput: e => { f.code = e.target.value; } }),
          c => pickCourseInto(c, f, subjectSelect, subjectList)),
        h("input", { type: "text", maxlength: 5, placeholder: t("Your grade (optional), e.g. A", "Ta note (facultatif), ex. A"), "aria-label": t("Grade", "Note"), oninput: e => { f.grade = e.target.value; } })),
      schoolLine, er, h("div", {}, h("button", { class: "btn sm", onclick: add }, t("Add subject", "Ajouter la matière")))));
  return wrap;
}

function tutorSchoolsSection(list) {
  const wrap = h("div", { class: "c" });
  const f = { school: null, program: "", start: "", end: "", current: false };
  const er = h("p", { class: "err", role: "alert" });
  const schoolLine = h("div", {});
  const drawSchool = () => schoolLine.replaceChildren(f.school
    ? h("div", { class: "row" }, h("b", {}, schoolName(f.school)), h("button", { type: "button", class: "btn sm g", onclick: () => { f.school = null; drawSchool(); } }, t("Change", "Changer")))
    : schoolPicker(s => { f.school = s; drawSchool(); }));
  drawSchool();
  const year = (key, label) => h("input", { type: "number", min: 1980, max: 2100, placeholder: label, "aria-label": label, oninput: e => { f[key] = e.target.value; } });
  const add = async () => {
    if (!f.school) { er.textContent = t("Choose a school.", "Choisis une école."); return; }
    const s = f.start ? Number(f.start) : null, e = f.end ? Number(f.end) : null;
    if ((s && (s < 1980 || s > 2100)) || (e && (e < 1980 || e > 2100)) || (s && e && e < s)) { er.textContent = t("Check the years.", "Vérifie les années."); return; }
    const { error } = await SB.from("tutor_institutions").insert({ tutor_id: ME.id, institution_id: f.school.id, program: f.program.trim() || null,
      start_year: s, end_year: f.current ? null : e, is_current: f.current });
    if (error) { er.textContent = /duplicate/i.test(error.message) ? t("You already listed this school.", "Tu as déjà ajouté cette école.") : error.message; return; }
    profilePage();
  };
  const years = s => s.is_current ? (s.start_year ? s.start_year + " – " : "") + t("now", "aujourd’hui") : [s.start_year, s.end_year].filter(Boolean).join(" – ");
  wrap.append(h("h3", {}, t("Schools, current and past", "Écoles, actuelles et passées")),
    ...(list.length ? list.map(s => listRow(schoolName(s.institutions), [s.program, years(s)].filter(Boolean).join(" · "),
      async () => { const { error } = await SB.from("tutor_institutions").delete().eq("id", s.id); if (error) toast(error.message); else profilePage(); }))
      : [h("p", { class: "mu" }, t("No schools yet. Optional, but it helps students trust you.", "Aucune école pour l’instant. Facultatif, mais ça aide les élèves à te faire confiance."))]),
    h("div", { style: "display:grid;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--ln)" },
      h("b", {}, t("Add a school", "Ajouter une école")), schoolLine,
      h("input", { type: "text", maxlength: 120, placeholder: t("Program (optional), e.g. Science", "Programme (facultatif), ex. Sciences"), "aria-label": t("Program", "Programme"), oninput: e => { f.program = e.target.value; } }),
      h("div", { class: "g2" }, year("start", t("Start year", "Année de début")), year("end", t("End year", "Année de fin"))),
      h("label", { class: "row", style: "cursor:pointer;flex-wrap:nowrap" }, h("input", { type: "checkbox", onchange: e => { f.current = e.target.checked; } }), t("I study here now", "J’étudie ici présentement")),
      er, h("div", {}, h("button", { class: "btn sm", onclick: add }, t("Add school", "Ajouter l’école")))));
  return wrap;
}

ROUTES.profile = profilePage;
PAGE_TITLES.profile = () => t("My profile", "Mon profil");
NEED_LOGIN.add("profile");
