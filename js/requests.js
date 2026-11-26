/* Cram tutoring requests.
   Students: "My requests" (post what you need, see which tutors offered to help, accept or decline).
   Tutors: "Find students" (browse requests from adults and parents, recommended first, offer to help).
   Privacy rules live in the database (supabase-update-5.sql); this page only shows what the database allows. */

const FORMATS = [["either", "Online or in person", "En ligne ou en personne"], ["online", "Online", "En ligne"], ["in_person", "In person", "En personne"]];
const isAdultOrParent = () => ME && (ME.kind === "parent" || (ME.birthDate && ageFrom(ME.birthDate) >= 18));
const dateText = d => d ? new Date(d + (d.length === 10 ? "T12:00" : "")).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" }) : "";
const requestTitle = r => subjectName(r.subjects) + (r.course_code ? " · " + r.course_code : "");
function requestFacts(r) {
  return [
    r.level && label(LEVELS, r.level),
    r.budget_cents && t("Budget ", "Budget ") + money(r.budget_cents / 100),
    label(FORMATS, r.format),
    (r.languages || []).map(l => label(LANGS, l)).join(", "),
    (r.availability || []).map(s => label(SLOTS, s)).join(", "),
    r.needed_by && t("Needed by ", "Pour le ") + dateText(r.needed_by),
    r.institutions && schoolName(r.institutions)].filter(Boolean).join(" · ");
}

/* ===== Student: My requests ===== */
async function requestsPage(arg) {
  if (ME.mode !== "student") return V.replaceChildren(h("section", {}, h("div", { class: "c" }, h("p", {}, t("Switch to student mode to see your requests.", "Passe en mode élève pour voir tes demandes."))) ));
  if (arg === "new") return newRequestPage();
  V.replaceChildren(loadingView());
  const { data, error } = await SB.from("tutor_requests")
    .select("*,subjects(name_en,name_fr),institutions(id,name,name_fr),request_interests(id,note,status,created_at,tutor_id,tutor_profiles(user_id,headline,hourly_rate_cents,profiles(display_name)))")
    .eq("student_id", ME.id).order("created_at", { ascending: false });
  if (error) return V.replaceChildren(h("section", {}, h("div", { class: "c mu" }, t("Requests aren’t switched on yet. Please try again later.", "Les demandes ne sont pas encore activées. Réessaie plus tard."))));
  const list = data || [];
  V.replaceChildren(h("section", {},
    h("div", { class: "row sp" }, h("h2", {}, t("My requests", "Mes demandes")), h("a", { class: "btn", href: "#/requests/new" }, t("New request", "Nouvelle demande"))),
    h("p", { class: "sub" }, t("Describe what you need. If you let tutors find it, approved tutors can offer to help, and you decide who to connect with.", "Décris ton besoin. Si tu laisses les tuteurs la trouver, des tuteurs approuvés peuvent proposer leur aide, et tu choisis avec qui te connecter.")),
    list.length ? h("div", { class: "tc" }, ...list.map(myRequestCard))
      : h("div", { class: "c mu" }, t("No requests yet.", "Aucune demande pour l’instant."))));
}

function myRequestCard(r) {
  const offers = (r.request_interests || []).sort((a, b) => a.created_at < b.created_at ? 1 : -1);
  const update = async (row, msg) => { const { error } = await SB.from("tutor_requests").update(row).eq("id", r.id); if (error) toast(error.message); else { toast(msg); requestsPage(); } };
  const visibility = !r.can_be_listed
    ? h("p", { class: "mu" }, t("Tutors can’t browse this request because the account holder is under 18. You can still contact tutors from Find tutors, or a parent can post a request for you.", "Les tuteurs ne peuvent pas parcourir cette demande parce que le titulaire du compte a moins de 18 ans. Tu peux quand même contacter des tuteurs depuis Trouver un tuteur, ou un parent peut publier une demande pour toi."))
    : h("label", { class: "row", style: "cursor:pointer;flex-wrap:nowrap" },
      h("input", { type: "checkbox", checked: r.discoverable, disabled: r.status !== "open", onchange: e => update({ discoverable: e.target.checked }, e.target.checked ? t("Tutors can now find this request", "Les tuteurs peuvent maintenant trouver cette demande") : t("Hidden from tutors", "Masquée des tuteurs")) }),
      t("Let approved tutors find this request", "Laisser les tuteurs approuvés trouver cette demande"));
  return h("div", { class: "c", style: "display:grid;gap:10px" },
    h("div", { class: "row sp" }, h("h3", {}, requestTitle(r)),
      r.status === "open" ? h("span", { class: "tag ok" }, t("Open", "Ouverte")) : h("span", { class: "tag gr" }, t("Closed", "Fermée"))),
    h("p", { style: "margin:0;white-space:pre-line" }, r.details),
    h("div", { class: "mu" }, requestFacts(r)),
    visibility,
    h("div", {}, h("b", {}, t("Tutors who offered to help", "Tuteurs qui proposent leur aide") + " (" + offers.length + ")"),
      ...(offers.length ? offers.map(o => offerRow(o)) : [h("p", { class: "mu", style: "margin:4px 0 0" }, r.discoverable ? t("None yet. We’ll show them here.", "Aucun pour l’instant. Ils apparaîtront ici.") : t("Turn on “Let approved tutors find this request” to receive offers.", "Active « Laisser les tuteurs approuvés trouver cette demande » pour recevoir des offres."))])),
    h("div", { class: "row" },
      r.status === "open"
        ? h("button", { class: "btn sm g", onclick: () => update({ status: "closed", discoverable: false }, t("Request closed", "Demande fermée")) }, t("Close request", "Fermer la demande"))
        : h("button", { class: "btn sm g", onclick: () => update({ status: "open" }, t("Request reopened", "Demande rouverte")) }, t("Reopen", "Rouvrir")),
      h("button", { class: "btn sm no", onclick: async () => {
        if (!confirm(t("Delete this request and its offers? This can’t be undone.", "Supprimer cette demande et ses offres? C’est définitif."))) return;
        const { error } = await SB.from("tutor_requests").delete().eq("id", r.id);
        if (error) toast(error.message); else { toast(t("Deleted", "Supprimée")); requestsPage(); }
      } }, t("Delete", "Supprimer"))));
}

function offerRow(o) {
  const tp = o.tutor_profiles;
  const name = tp && tp.profiles ? tp.profiles.display_name : t("A tutor", "Un tuteur");
  const answer = async status => { const { error } = await SB.from("request_interests").update({ status }).eq("id", o.id); if (error) toast(error.message); else requestsPage(); };
  return h("div", { style: "padding:10px 0;border-top:1px solid var(--ln);display:grid;gap:6px" },
    h("div", { class: "row sp" },
      h("div", {}, tp ? h("a", { href: "#/tutor/" + tp.user_id, style: "font-weight:700" }, name) : h("b", {}, name),
        h("span", { class: "mu" }, [tp && tp.headline, tp && tp.hourly_rate_cents && money(tp.hourly_rate_cents / 100)].filter(Boolean).map(x => " · " + x).join(""))),
      o.status === "accepted" ? h("span", { class: "tag ok" }, t("Connected", "Connecté")) : o.status === "declined" ? h("span", { class: "tag gr" }, t("Declined", "Refusé")) : null),
    o.note ? h("div", { style: "white-space:pre-line" }, "“" + o.note + "”") : null,
    o.status === "pending" ? h("div", { class: "row" },
      h("button", { class: "btn sm", onclick: () => answer("accepted") }, t("Connect", "Se connecter")),
      h("button", { class: "btn sm no", onclick: () => answer("declined") }, t("Decline", "Refuser")),
      tp ? h("a", { class: "btn sm g", href: "#/tutor/" + tp.user_id }, t("View profile", "Voir le profil")) : null)
      : o.status === "accepted" ? h("a", { href: "#/messages", class: "btn sm" }, t("Open messages", "Ouvrir les messages")) : null);
}

async function newRequestPage() {
  V.replaceChildren(loadingView());
  const [{ data: subjects }, { data: me }] = await Promise.all([
    SB.from("subjects").select("id,name_en,name_fr,category").order("name_en"),
    SB.from("student_profiles").select("level").eq("user_id", ME.id).maybeSingle()]);
  const adult = isAdultOrParent();
  const f = { subject: "", code: "", level: (me && me.level) || "", details: "", budget: "", format: "either", languages: [], availability: [], neededBy: "", school: null, discoverable: !!adult };
  // Coming from "Post a request" on Find tutors: start with the course they searched for
  const pre = newRequestPage.prefill || ""; newRequestPage.prefill = "";
  const preCourse = pre && courseByCode(pre);
  if (preCourse) { f.code = preCourse.code; const sub = (subjects || []).find(x => x.name_en === preCourse.subject); if (sub) f.subject = String(sub.id); }
  const er = h("p", { class: "err", role: "alert" });
  const cats = [["academic", "School subjects", "Matières scolaires"], ["language", "Languages", "Langues"], ["tech", "Tech and software", "Techno et logiciels"], ["arts", "Music and arts", "Musique et arts"], ["other", "Other", "Autre"]];
  const schoolLine = h("div", {});
  const drawSchool = () => schoolLine.replaceChildren(f.school
    ? h("div", { class: "row" }, h("b", {}, schoolName(f.school)), h("button", { type: "button", class: "btn sm g", onclick: () => { f.school = null; drawSchool(); } }, t("Remove", "Retirer")))
    : schoolPicker(s => { f.school = s; drawSchool(); }, t("Add your school (optional)", "Ajoute ton école (facultatif)")));
  drawSchool();
  const subjectSelect = h("select", { onchange: e => { f.subject = e.target.value; } }, h("option", { value: "" }, t("Choose…", "Choisis…")),
    ...cats.map(([c, en, fr]) => h("optgroup", { label: t(en, fr) }, ...(subjects || []).filter(s => s.category === c).map(s => h("option", { value: s.id, selected: f.subject === String(s.id) }, subjectName(s))))));
  const send = async () => {
    if (!f.subject) { er.textContent = t("Choose a subject.", "Choisis une matière."); return; }
    if (f.details.trim().length < 10) { er.textContent = t("Say a bit more about what you need (at least 10 characters).", "Décris un peu plus ton besoin (au moins 10 caractères)."); return; }
    const budget = f.budget === "" ? null : Math.round(Number(f.budget));
    if (budget !== null && !(budget >= 5 && budget <= 200)) { er.textContent = t("Budget must be between $5 and $200 per hour.", "Le budget doit être entre 5 $ et 200 $ de l’heure."); return; }
    const { error } = await SB.from("tutor_requests").insert({ subject_id: Number(f.subject), course_code: f.code.trim().toUpperCase() || null, level: f.level || null,
      details: f.details.trim(), budget_cents: budget === null ? null : budget * 100, format: f.format, languages: f.languages, availability: f.availability,
      needed_by: f.neededBy || null, institution_id: f.school ? f.school.id : null, discoverable: f.discoverable });
    if (error) { er.textContent = /up to 5/i.test(error.message) ? t("You can have up to 5 open requests. Close one first.", "Tu peux avoir jusqu’à 5 demandes ouvertes. Ferme-en une d’abord.") : error.message; return; }
    toast(t("Request posted", "Demande publiée"));
    go("#/requests");
  };
  V.replaceChildren(h("section", { class: "narrow" },
    h("a", { href: "#/requests", class: "bk" }, "‹ " + t("My requests", "Mes demandes")),
    h("h2", { style: "margin:10px 0 6px" }, ME.kind === "parent" ? t("Post a request for your child", "Publier une demande pour ton enfant") : t("Post a tutoring request", "Publier une demande de tutorat")),
    h("p", { class: "sub" }, t("Tutors see what you write here, but never your name, email or profile until you choose to connect.", "Les tuteurs voient ce que tu écris ici, mais jamais ton nom, ton courriel ou ton profil avant que tu choisisses de te connecter.")),
    h("div", { class: "c", style: "display:grid;gap:14px" },
      field(t("Subject or skill", "Matière ou compétence"), subjectSelect),
      h("div", { class: "g2" },
        field(t("Course (optional)", "Cours (facultatif)"), courseBox(h("input", { type: "text", maxlength: 30, value: f.code, placeholder: t("Code or name, e.g. 201-NYB-05", "Code ou nom, ex. 201-NYB-05"), oninput: e => { f.code = e.target.value; } }),
          c => pickCourseInto(c, f, subjectSelect, subjects || []))),
        field(t("Level", "Niveau"), h("select", { onchange: e => { f.level = e.target.value; } }, h("option", { value: "" }, t("Choose…", "Choisis…")), ...LEVELS.map(([v, en, fr]) => h("option", { value: v, selected: f.level === v }, t(en, fr)))))),
      field(t("What do you need help with?", "Sur quoi as-tu besoin d’aide?"), h("textarea", { maxlength: 600, placeholder: t("e.g. Exam on Dec 12, stuck on derivatives and related rates. Would like 2 or 3 sessions.", "ex. Examen le 12 déc., bloqué sur les dérivées. J’aimerais 2 ou 3 séances."), oninput: e => { f.details = e.target.value; } }),
        t("Don’t include your full name, phone, email or address.", "N’inclus pas ton nom complet, téléphone, courriel ou adresse.")),
      h("div", { class: "g2" },
        field(t("Budget per hour (CAD, optional)", "Budget de l’heure ($ CA, facultatif)"), h("input", { type: "number", min: 5, max: 200, oninput: e => { f.budget = e.target.value; } })),
        field(t("Needed by (optional)", "Pour le (facultatif)"), h("input", { type: "date", min: new Date().toISOString().slice(0, 10), oninput: e => { f.neededBy = e.target.value; } }))),
      field(t("Format", "Format"), h("select", { onchange: e => { f.format = e.target.value; } }, ...FORMATS.map(([v, en, fr]) => h("option", { value: v }, t(en, fr))))),
      field(t("Languages", "Langues"), chipPicker(LANGS, f.languages, t("Languages", "Langues"))),
      field(t("When you’re free", "Quand tu es libre"), chipPicker(SLOTS, f.availability, t("Availability", "Disponibilités"))),
      field(t("School (optional, tutors will see it)", "École (facultatif, visible par les tuteurs)"), schoolLine),
      adult
        ? h("label", { class: "row", style: "cursor:pointer;flex-wrap:nowrap" }, h("input", { type: "checkbox", checked: f.discoverable, onchange: e => { f.discoverable = e.target.checked; } }),
          t("Let approved tutors find this request and offer to help", "Laisser les tuteurs approuvés trouver cette demande et proposer leur aide"))
        : h("p", { class: "mu", style: "margin:0" }, t("Because you’re under 18, tutors can’t browse your requests. You can still contact tutors yourself from Find tutors, or a parent can post a request for you.", "Comme tu as moins de 18 ans, les tuteurs ne peuvent pas parcourir tes demandes. Tu peux quand même contacter des tuteurs depuis Trouver un tuteur, ou un parent peut publier une demande pour toi.")),
      er, h("div", {}, h("button", { class: "btn", onclick: send }, t("Post request", "Publier la demande"))))));
}

/* ===== Tutor: Find students ===== */
function matchRequest(r, me) {
  const reasons = [];
  let score = 0;
  const mine = me.subjects.filter(s => s.subject_id === r.subject_id);
  if (mine.length) {
    score += 3;
    const sameCourse = r.course_code && mine.find(s => s.course_code && s.course_code.replace(/\s/g, "").toUpperCase() === r.course_code.replace(/\s/g, "").toUpperCase());
    if (sameCourse) { score += 2; reasons.push(t("You took ", "Tu as suivi ") + sameCourse.course_code); }
    else reasons.push(t("You teach ", "Tu enseignes ") + subjectName(r.subjects));
  }
  if (r.level && me.levels.includes(r.level)) { score += 1; reasons.push(t("You teach ", "Tu enseignes au niveau ") + label(LEVELS, r.level)); }
  if (r.budget_cents && me.rate && r.budget_cents >= me.rate) { score += 1; reasons.push(t("Budget covers your ", "Le budget couvre ton tarif de ") + money(me.rate / 100) + t(" rate", "")); }
  if ((r.format === "online" && me.online) || (r.format === "in_person" && me.inPerson) || r.format === "either") score += 0.5;
  const langs = (r.languages || []).filter(l => me.languages.includes(l));
  if (langs.length) { score += 0.5; reasons.push(t("You speak ", "Tu parles ") + langs.map(l => label(LANGS, l)).join(", ")); }
  const slots = (r.availability || []).filter(s => me.availability.includes(s));
  if (slots.length) { score += 0.5; reasons.push(t("You’re free ", "Tu es libre ") + label(SLOTS, slots[0]).toLowerCase()); }
  return { score, reasons, recommended: mine.length > 0 };
}

async function studentsPage() {
  if (ME.mode !== "tutor") return V.replaceChildren(h("section", {}, h("div", { class: "c" }, h("p", {}, t("Switch to tutor mode to find students.", "Passe en mode tuteur pour trouver des élèves.")))));
  const blocked = (title, text) => V.replaceChildren(h("section", {}, h("h2", {}, t("Find students", "Trouver des élèves")), h("div", { class: "c", style: "margin-top:12px" }, h("h3", {}, title), h("p", { class: "mu" }, text), h("a", { class: "btn sm g", href: "#/dashboard" }, t("Go to my dashboard", "Aller au tableau de bord")))));
  if (!ME.tutor || !ME.tutor.approved) return blocked(t(`Available once ${BRAND} approves you`, `Disponible une fois approuvé par ${BRAND}`), t(`To protect students, only tutors approved by ${BRAND} can see requests. Complete your profile and we’ll review it.`, `Pour protéger les élèves, seuls les tuteurs approuvés par ${BRAND} voient les demandes. Complète ton profil et on le vérifiera.`));
  if (!ME.birthDate || ageFrom(ME.birthDate) < 18) return blocked(t("Confirm you’re 18 or older", "Confirme que tu as 18 ans ou plus"), t("Add your date of birth on your dashboard. Only adult tutors can see student requests.", "Ajoute ta date de naissance sur ton tableau de bord. Seuls les tuteurs adultes voient les demandes."));
  V.replaceChildren(loadingView());
  const [tp, subs, prof, reqs, mine] = await Promise.all([
    SB.from("tutor_profiles").select("levels,hourly_rate_cents,offers_online,offers_in_person,availability").eq("user_id", ME.id).maybeSingle(),
    SB.from("tutor_subjects").select("subject_id,course_code").eq("tutor_id", ME.id),
    SB.from("profiles").select("languages").eq("id", ME.id).maybeSingle(),
    SB.from("tutor_requests").select("id,subject_id,course_code,level,details,budget_cents,format,languages,availability,needed_by,for_child,created_at,subjects(name_en,name_fr),institutions(id,name,name_fr)")
      .eq("status", "open").eq("discoverable", true).neq("student_id", ME.id).order("created_at", { ascending: false }).limit(200),
    SB.from("request_interests").select("id,request_id,status").eq("tutor_id", ME.id)]);
  if (reqs.error) return blocked(t("Requests aren’t switched on yet", "Les demandes ne sont pas encore activées"), t("Please try again later.", "Réessaie plus tard."));
  const me = { subjects: subs.data || [], levels: (tp.data && tp.data.levels) || [], rate: tp.data && tp.data.hourly_rate_cents, online: tp.data && tp.data.offers_online,
    inPerson: tp.data && tp.data.offers_in_person, availability: (tp.data && tp.data.availability) || [], languages: (prof.data && prof.data.languages) || [] };
  const offers = new Map((mine.data || []).map(o => [o.request_id, o]));
  const F = studentsPage.F || (studentsPage.F = { q: "", level: "", format: "" });
  const out = h("div", {});
  const draw = () => {
    const q = F.q.trim().toLowerCase();
    const rows = (reqs.data || []).filter(r => (!q || [subjectName(r.subjects), r.course_code, r.details].some(v => v && v.toLowerCase().includes(q)))
      && (!F.level || r.level === F.level) && (!F.format || r.format === F.format || r.format === "either"))
      .map(r => ({ r, m: matchRequest(r, me) })).sort((a, b) => b.m.score - a.m.score);
    const rec = rows.filter(x => x.m.recommended), other = rows.filter(x => !x.m.recommended);
    out.replaceChildren(
      !rows.length ? h("div", { class: "c mu" }, (reqs.data || []).length ? t("No request matches these filters.", "Aucune demande ne correspond à ces filtres.") : t("No open requests right now. Check back soon.", "Aucune demande ouverte pour l’instant. Reviens bientôt.")) : null,
      rec.length ? h("h3", { style: "margin:16px 0 10px" }, t("Recommended for you", "Recommandées pour toi") + " (" + rec.length + ")") : null,
      ...rec.map(({ r, m }) => requestCard(r, m.reasons, offers.get(r.id))),
      other.length ? h("h3", { style: "margin:22px 0 10px" }, t("Other requests", "Autres demandes") + " (" + other.length + ")") : null,
      ...other.map(({ r, m }) => requestCard(r, m.reasons, offers.get(r.id))));
  };
  const sel = (key, ph, opts) => h("select", { "aria-label": ph, onchange: e => { F[key] = e.target.value; draw(); } }, h("option", { value: "" }, ph), ...opts.map(([v, en, fr]) => h("option", { value: v, selected: F[key] === v }, t(en, fr))));
  V.replaceChildren(h("section", {},
    h("h2", {}, t("Find students", "Trouver des élèves")),
    h("p", { class: "sub" }, t("Requests from students who chose to be found. Recommended ones match the subjects, levels and rate on your profile.", "Des demandes d’élèves qui ont choisi d’être trouvés. Les recommandées correspondent aux matières, niveaux et tarif de ton profil.")),
    me.subjects.length ? null : h("p", {}, h("a", { href: "#/profile" }, t("Add subjects to your profile to get recommendations.", "Ajoute des matières à ton profil pour recevoir des recommandations."))),
    h("div", { class: "fil" },
      h("div", { style: "flex:2" }, h("label", { class: "f" }, t("Search", "Recherche")), courseBox(h("input", { type: "text", value: F.q, placeholder: t("Subject, course code or keyword", "Matière, code de cours ou mot-clé"), oninput: e => { F.q = e.target.value; draw(); } }),
        c => { F.q = courseQuery(c); draw(); })),
      h("div", {}, h("label", { class: "f" }, t("Level", "Niveau")), sel("level", t("Any level", "Tout niveau"), LEVELS)),
      h("div", {}, h("label", { class: "f" }, t("Format", "Format")), sel("format", t("Any format", "Tout format"), FORMATS.slice(1)))),
    out));
  draw();
}

function requestCard(r, reasons, offer) {
  const offerBtn = offer
    ? h("div", { class: "row" }, offer.status === "accepted" ? h("span", { class: "row" }, h("span", { class: "tag ok" }, t("The student connected with you", "L’élève s’est connecté avec toi")), h("a", { href: "#/messages", class: "btn sm" }, t("Messages", "Messages")))
        : offer.status === "declined" ? h("span", { class: "tag gr" }, t("The student chose someone else", "L’élève a choisi quelqu’un d’autre"))
        : h("span", { class: "tag wa" }, t("Offer sent, waiting for the student", "Offre envoyée, en attente de l’élève")),
      offer.status === "pending" ? h("button", { class: "btn sm g", onclick: async () => { const { error } = await SB.from("request_interests").delete().eq("id", offer.id); if (error) toast(error.message); else { toast(t("Offer withdrawn", "Offre retirée")); studentsPage(); } } }, t("Withdraw", "Retirer")) : null)
    : h("button", { class: "btn sm", onclick: () => offerHelp(r) }, t("I’m interested", "Je suis intéressé"));
  return h("div", { class: "c tc", style: "display:grid;gap:8px" },
    h("div", { class: "row sp" }, h("h3", { style: "font-size:17px" }, requestTitle(r)), h("span", { class: "mu" }, t("Posted ", "Publiée le ") + dateText(r.created_at.slice(0, 10)))),
    r.for_child ? h("div", {}, h("span", { class: "tag" }, t("Posted by a parent for their child", "Publiée par un parent pour son enfant"))) : null,
    h("p", { style: "margin:0;white-space:pre-line" }, r.details),
    h("div", { class: "mu" }, requestFacts(r)),
    reasons.length ? h("div", { class: "why" }, h("b", {}, t("Why you match: ", "Pourquoi toi : ")), reasons.join(" · ")) : null,
    offerBtn);
}

function offerHelp(r) {
  const ta = h("textarea", { maxlength: 500, placeholder: t("Say why you can help, e.g. your grade in the course and how you’d plan the sessions.", "Dis pourquoi tu peux aider, ex. ta note dans le cours et comment tu organiserais les séances."), "aria-label": t("Note", "Note") });
  const er = h("p", { class: "err", role: "alert" });
  modal(h("h3", { style: "margin-bottom:8px" }, t("Offer to help", "Proposer ton aide")), h("p", { class: "mu" }, requestTitle(r)),
    h("p", { class: "mu", style: "font-size:13px" }, t("The student sees your note and your public profile, then decides whether to connect. Don’t share contact details here.", "L’élève voit ta note et ton profil public, puis décide de se connecter ou non. Ne partage pas tes coordonnées ici.")),
    ta, er,
    h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" }, h("button", { class: "btn g", onclick: () => modal.close() }, t("Cancel", "Annuler")),
      h("button", { class: "btn", onclick: async () => {
        const { error } = await SB.from("request_interests").insert({ request_id: r.id, note: ta.value.trim() || null });
        if (error) { er.textContent = /row-level security/i.test(error.message) ? t("Couldn’t send. Make sure your profile is shown in search, and that you have fewer than 30 offers waiting.", "Impossible d’envoyer. Vérifie que ton profil est visible dans la recherche et que tu as moins de 30 offres en attente.") : error.message; return; }
        modal.close(); toast(t("Offer sent", "Offre envoyée")); studentsPage();
      } }, t("Send offer", "Envoyer l’offre"))));
}

ROUTES.requests = requestsPage;
ROUTES.students = studentsPage;
PAGE_TITLES.requests = () => t("My requests", "Mes demandes");
PAGE_TITLES.students = () => t("Find students", "Trouver des élèves");
NEED_LOGIN.add("requests");
NEED_LOGIN.add("students");
