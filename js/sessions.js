/* Cram sessions and reviews.
   Inside a conversation, the student or the tutor proposes a session; the other person confirms or declines.
   After it starts, the student marks it as done, then can leave one review (1 to 5 stars). Reviews show on the
   tutor's profile without the student's name. Every rule is checked by the database (supabase-update-7.sql). */

const SESSION_STATUS = {
  proposed: ["wa", "Waiting for an answer", "En attente de réponse"],
  confirmed: ["ok", "Confirmed", "Confirmée"],
  declined: ["gr", "Declined", "Refusée"],
  cancelled: ["gr", "Cancelled", "Annulée"],
  completed: ["ok", "Done", "Terminée"]
};
const statusTag = s => { const [c, en, fr] = SESSION_STATUS[s.status] || ["gr", s.status, s.status]; return h("span", { class: "tag " + c }, t(en, fr)); };
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
const sessionWhen = s => new Date(s.starts_at).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const sessionFacts = s => [sessionWhen(s), s.minutes + " min", s.format === "online" ? t("Online", "En ligne") : t("In person", "En personne"),
  money(s.rate_cents / 100), t("total ", "total ") + "$" + (Math.round(s.rate_cents * s.minutes / 60) / 100).toFixed(2)].join(" · ");
const dbProblem = e => (e && e.message) || t("Something went wrong. Please try again.", "Une erreur s’est produite. Réessaie.");

// Average rating per tutor, for search results and profiles (empty if the database update isn't run yet)
async function loadRatings() {
  if (loadRatings.cache && Date.now() - loadRatings.at < 60000) return loadRatings.cache;
  const { data, error } = await SB.rpc("tutor_ratings");
  const map = {};
  if (!error) (data || []).forEach(r => { map[r.tutor_id] = r; });
  loadRatings.cache = map; loadRatings.at = Date.now();
  return map;
}
const ratingTag = r => r && r.review_count ? h("span", { class: "tag", title: t("Average from reviews after completed sessions", "Moyenne des avis après des séances terminées") },
  "★ " + Number(r.avg_rating).toFixed(1) + " (" + r.review_count + ")") : null;

// Reviews block on a tutor's public profile
async function reviewsBox(tutorId) {
  const box = h("div", { class: "c", style: "margin-top:14px" }, h("h3", {}, t("Reviews", "Avis")), h("p", { class: "mu" }, t("Loading…", "Chargement…")));
  SB.from("reviews").select("id,rating,comment,created_at").eq("tutor_id", tutorId).order("created_at", { ascending: false }).limit(50).then(({ data, error }) => {
    const list = error ? [] : data || [];
    const avg = list.length ? (list.reduce((a, r) => a + r.rating, 0) / list.length).toFixed(1) : null;
    box.replaceChildren(h("h3", {}, t("Reviews", "Avis") + (avg ? " · ★ " + avg + " (" + list.length + ")" : "")),
      h("p", { class: "mu", style: "font-size:13px;margin:4px 0 8px" }, t(`Only students who completed a session with this tutor on ${BRAND} can leave a review.`, `Seuls les élèves qui ont terminé une séance avec ce tuteur sur ${BRAND} peuvent laisser un avis.`)),
      ...(list.length ? list.map(r => h("div", { style: "padding:10px 0;border-top:1px solid var(--ln)" },
        h("div", { class: "row sp" }, h("b", { style: "color:var(--ac)", "aria-label": r.rating + "/5" }, stars(r.rating)), h("span", { class: "mu" }, new Date(r.created_at).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "long", year: "numeric" }))),
        r.comment ? h("p", { style: "margin:6px 0 0;white-space:pre-line" }, r.comment) : null))
        : [h("p", { class: "mu" }, t("No reviews yet.", "Aucun avis pour l’instant."))]));
  });
  return box;
}

// Sessions panel shown at the top of a conversation
function sessionsPanel(c) {
  const wrap = h("div", { class: "c", style: "margin-bottom:14px" });
  const draw = async () => {
    const { data, error } = await SB.from("sessions").select("*").eq("conversation_id", c.id).order("starts_at", { ascending: false }).limit(50);
    if (error) { wrap.replaceChildren(h("p", { class: "mu", style: "margin:0" }, t("Booking sessions isn’t switched on yet.", "La réservation de séances n’est pas encore activée."))); return; }
    const list = data || [];
    const done = list.filter(s => s.status === "completed").map(s => s.id);
    let reviewed = new Set();
    if (done.length && c.student_id === ME.id) {
      const r = await SB.from("reviews").select("session_id").in("session_id", done);
      reviewed = new Set((r.data || []).map(x => x.session_id));
    }
    wrap.replaceChildren(
      h("div", { class: "row sp" }, h("h3", {}, t("Sessions", "Séances")), h("button", { class: "btn sm", onclick: () => proposeSession(c, draw) }, t("Propose a session", "Proposer une séance"))),
      ...(list.length ? list.map(s => sessionRow(s, c, reviewed.has(s.id), draw))
        : [h("p", { class: "mu", style: "margin:8px 0 0" }, t("No sessions yet. Agree on a time in the messages, then propose it here so both of you have it written down.", "Aucune séance. Entendez-vous sur un moment dans les messages, puis propose-le ici pour que vous l’ayez tous les deux par écrit."))]));
  };
  wrap.append(h("p", { class: "mu", style: "margin:0" }, t("Loading…", "Chargement…")));
  draw();
  return wrap;
}

function sessionRow(s, c, reviewed, redraw) {
  const act = async (action, sure) => {
    if (sure && !confirm(sure)) return;
    const { error } = await SB.rpc("update_session", { sid: s.id, action });
    if (error) return toast(dbProblem(error));
    redraw();
  };
  const started = new Date(s.starts_at) <= new Date();
  const mine = s.proposed_by === ME.id, student = s.student_id === ME.id;
  const buttons = [
    s.status === "proposed" && !mine && !started ? h("button", { class: "btn sm", onclick: () => act("confirm") }, t("Confirm", "Confirmer")) : null,
    s.status === "proposed" && !mine ? h("button", { class: "btn sm g", onclick: () => act("decline") }, t("Decline", "Refuser")) : null,
    ["proposed", "confirmed"].includes(s.status) && !started ? h("button", { class: "btn sm g", onclick: () => act("cancel", t("Cancel this session?", "Annuler cette séance?")) }, t("Cancel", "Annuler")) : null,
    s.status === "confirmed" && started && student ? h("button", { class: "btn sm", onclick: () => act("complete", t("Confirm that this session happened?", "Confirmer que cette séance a eu lieu?")) }, t("Mark as done", "Marquer comme terminée")) : null,
    s.status === "completed" && student && !reviewed ? h("button", { class: "btn sm", onclick: () => reviewModal(s, c, redraw) }, t("Leave a review", "Laisser un avis")) : null,
    s.status === "completed" && student && reviewed ? h("span", { class: "mu" }, "✓ " + t("Reviewed", "Avis laissé")) : null
  ].filter(Boolean);
  const note = s.status === "proposed" && mine ? t("You proposed this. Waiting for the other person.", "Tu as proposé ceci. En attente de l’autre personne.")
    : s.status === "confirmed" && started && !student ? t("The student marks it as done after the session.", "L’élève la marque comme terminée après la séance.") : "";
  return h("div", { style: "padding:12px 0;border-top:1px solid var(--ln);display:grid;gap:6px" },
    h("div", { class: "row sp" }, h("b", {}, s.topic || t("Tutoring session", "Séance de tutorat")), statusTag(s)),
    h("div", { class: "mu" }, sessionFacts(s)),
    note ? h("div", { class: "mu", style: "font-size:13px" }, note) : null,
    buttons.length ? h("div", { class: "row" }, ...buttons) : null);
}

function proposeSession(c, redraw) {
  const pad = n => String(n).padStart(2, "0");
  const d = new Date(Date.now() + 86400000); d.setHours(18, 0, 0, 0); // tomorrow at 6 p.m.
  const local = x => x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate()) + "T" + pad(x.getHours()) + ":" + pad(x.getMinutes());
  const when = h("input", { type: "datetime-local", value: local(d), min: local(new Date()), "aria-label": t("Date and time", "Date et heure") });
  const mins = h("select", { "aria-label": t("Length", "Durée") }, ...[30, 45, 60, 90, 120, 180].map(m => h("option", { value: m, selected: m === 60 }, m + " min")));
  const fmt = h("select", { "aria-label": t("Format", "Format") }, h("option", { value: "online" }, t("Online", "En ligne")), h("option", { value: "in_person" }, t("In person", "En personne")));
  const rate = h("input", { type: "number", min: 5, max: 200, step: 1, placeholder: "25", "aria-label": t("Price per hour ($)", "Prix par heure ($)") });
  const topic = h("input", { type: "text", maxlength: 120, placeholder: t("e.g. Derivatives review before the midterm", "ex. Révision des dérivées avant l’intra"), "aria-label": t("Topic", "Sujet") });
  const er = h("p", { class: "err", role: "alert" });
  // Prefill the price with the tutor's hourly rate when we can see it
  SB.from("tutor_profiles").select("hourly_rate_cents").eq("user_id", c.tutor_id).maybeSingle().then(r => { if (r.data && r.data.hourly_rate_cents && !rate.value) rate.value = r.data.hourly_rate_cents / 100; }, () => {});
  const send = async () => {
    const start = new Date(when.value), price = Math.round(Number(rate.value) * 100);
    if (!when.value || isNaN(start)) { er.textContent = t("Pick a date and time.", "Choisis une date et une heure."); return; }
    if (start < new Date(Date.now() + 3600000)) { er.textContent = t("Pick a time at least 1 hour from now.", "Choisis un moment au moins 1 heure plus tard."); return; }
    if (!(price >= 500 && price <= 20000)) { er.textContent = t("The price must be between $5 and $200 per hour.", "Le prix doit être entre 5 $ et 200 $ de l’heure."); return; }
    const { error } = await SB.rpc("propose_session", { cid: c.id, starts: start.toISOString(), mins: Number(mins.value), fmt: fmt.value, rate: price, what: topic.value.trim() });
    if (error) { er.textContent = dbProblem(error); return; }
    modal.close(); toast(t("Session proposed", "Séance proposée")); redraw();
  };
  modal(h("h3", { style: "margin-bottom:8px" }, t("Propose a session", "Proposer une séance")),
    h("p", { class: "mu", style: "font-size:13px" }, t(`The other person confirms or declines. Payment isn’t handled by ${BRAND} yet: settle it between you, and never pay before you have met.`, `L’autre personne confirme ou refuse. ${BRAND} ne gère pas encore les paiements : réglez-les entre vous, et ne payez jamais avant de vous être rencontrés.`)),
    h("div", { style: "display:grid;gap:10px" },
      h("div", {}, h("label", { class: "f" }, t("Date and time", "Date et heure")), when),
      h("div", { class: "g2", style: "gap:10px" }, h("div", {}, h("label", { class: "f" }, t("Length", "Durée")), mins), h("div", {}, h("label", { class: "f" }, t("Format", "Format")), fmt)),
      h("div", {}, h("label", { class: "f" }, t("Price per hour ($)", "Prix par heure ($)")), rate),
      h("div", {}, h("label", { class: "f" }, t("Topic (optional)", "Sujet (facultatif)")), topic)),
    er,
    h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" }, h("button", { class: "btn g", onclick: () => modal.close() }, t("Cancel", "Annuler")),
      h("button", { class: "btn", onclick: send }, t("Propose", "Proposer"))));
}

function reviewModal(s, c, redraw) {
  let rating = 0;
  const starBtns = [1, 2, 3, 4, 5].map(n => h("button", { type: "button", class: "star", "aria-label": n + "/5", onclick: () => { rating = n; paint(); } }, "★"));
  const paint = () => starBtns.forEach((b, i) => { b.classList.toggle("on", i < rating); b.setAttribute("aria-pressed", String(i < rating)); });
  const ta = h("textarea", { maxlength: 600, placeholder: t("What went well? What could be better? (optional)", "Qu’est-ce qui a bien marché? Qu’est-ce qui pourrait être mieux? (facultatif)"), "aria-label": t("Comment", "Commentaire") });
  const er = h("p", { class: "err", role: "alert" });
  modal(h("h3", { style: "margin-bottom:8px" }, t("Review ", "Évaluer ") + otherName(c)),
    h("p", { class: "mu", style: "font-size:13px" }, t("Your review appears on the tutor’s profile without your name. Be honest and respectful.", "Ton avis apparaît sur le profil du tuteur sans ton nom. Sois honnête et respectueux.")),
    h("div", { class: "row", style: "gap:4px;margin:6px 0 10px" }, ...starBtns), ta, er,
    h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" }, h("button", { class: "btn g", onclick: () => modal.close() }, t("Cancel", "Annuler")),
      h("button", { class: "btn", onclick: async () => {
        if (!rating) { er.textContent = t("Choose 1 to 5 stars.", "Choisis de 1 à 5 étoiles."); return; }
        const { error } = await SB.rpc("add_review", { sid: s.id, stars: rating, words: ta.value.trim() });
        if (error) { er.textContent = dbProblem(error); return; }
        loadRatings.cache = null;
        modal.close(); toast(t("Thanks for your review!", "Merci pour ton avis!")); redraw();
      } }, t("Post review", "Publier l’avis"))));
}

// Dashboard card: upcoming sessions, proposals to answer and sessions to review
function sessionsCard() {
  const card = h("div", { class: "c" }, h("h3", {}, t("Your sessions", "Tes séances")), h("p", { class: "mu" }, t("Loading…", "Chargement…")));
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  SB.from("sessions").select("id,conversation_id,student_id,tutor_id,proposed_by,topic,starts_at,minutes,format,rate_cents,status")
    .in("status", ["proposed", "confirmed"]).gte("starts_at", since).order("starts_at").limit(20).then(({ data, error }) => {
      if (error) { card.remove(); return; }
      const role = ME.mode === "tutor" ? "tutor_id" : "student_id";
      const now = new Date();
      const list = (data || []).filter(s => s[role] === ME.id && (new Date(s.starts_at) > now || s.status === "confirmed")).slice(0, 5);
      const what = s => s.status === "proposed" ? (s.proposed_by === ME.id ? t("waiting for an answer", "en attente de réponse") : t("needs your answer", "attend ta réponse"))
        : new Date(s.starts_at) <= now ? (role === "student_id" ? t("mark it as done", "marque-la comme terminée") : t("waiting for the student", "en attente de l’élève")) : t("confirmed", "confirmée");
      card.replaceChildren(h("h3", {}, t("Your sessions", "Tes séances")),
        ...(list.length ? list.map(s => h("a", { href: "#/messages/" + s.conversation_id, style: "display:block;padding:8px 0;border-top:1px solid var(--ln);color:var(--ink);text-decoration:none" },
          h("b", {}, sessionWhen(s)), h("span", { class: "mu" }, " · " + (s.topic || t("Tutoring session", "Séance de tutorat")) + " · " + what(s))))
          : [h("p", { class: "mu" }, ME.mode === "tutor" ? t("No upcoming sessions. Students can book you from your conversations.", "Aucune séance à venir. Les élèves peuvent réserver depuis vos conversations.")
              : t("No upcoming sessions. Propose one from a conversation with a tutor.", "Aucune séance à venir. Propose-en une depuis une conversation avec un tuteur."))]),
        h("a", { class: "btn sm g", href: "#/messages", style: "margin-top:8px" }, t("Open messages", "Ouvrir les messages")));
    }, () => card.remove());
  return card;
}
