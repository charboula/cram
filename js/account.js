/* Cram account basics: report a problem, delete my account, and the privacy policy and terms pages.
   Reports go to a private table only Cram's admin can read (supabase-update-11.sql). */

/* ===== Report a person (from a tutor profile or a conversation) ===== */
const REPORT_REASONS = [
  ["inappropriate", "Inappropriate or offensive", "Inapproprié ou offensant"],
  ["harassment", "Harassment or threats", "Harcèlement ou menaces"],
  ["scam", "Scam, or asked for money or personal details", "Arnaque, ou demande d’argent ou d’informations personnelles"],
  ["fake", "Fake profile or false information", "Faux profil ou fausses informations"],
  ["minor_safety", "A concern about a minor’s safety", "Une inquiétude pour la sécurité d’un mineur"],
  ["other", "Something else", "Autre chose"]];

function reportModal(targetUser, conversationId, name) {
  if (!ME) return authModal("login");
  let reason = "";
  const chips = h("div", { style: "display:grid;gap:6px;margin:8px 0 12px" }, ...REPORT_REASONS.map(([k, en, fr]) =>
    h("label", { class: "row", style: "cursor:pointer;flex-wrap:nowrap" },
      h("input", { type: "radio", name: "reason", value: k, onchange: () => { reason = k; } }), t(en, fr))));
  const ta = h("textarea", { maxlength: 1000, placeholder: t("What happened? (optional)", "Que s’est-il passé? (facultatif)"), "aria-label": t("Details", "Détails") });
  const er = h("p", { class: "err", role: "alert" });
  const btn = h("button", { class: "btn", onclick: async () => {
    if (!reason) { er.textContent = t("Choose a reason.", "Choisis une raison."); return; }
    btn.disabled = true;
    const { error } = await SB.from("reports").insert({ target_user: targetUser || null, conversation_id: conversationId || null, reason, details: ta.value.trim() || null });
    btn.disabled = false;
    if (error) { er.textContent = /row-level security/i.test(error.message) ? t("You’ve sent a lot of reports today. Please try again tomorrow.", "Tu as envoyé beaucoup de signalements aujourd’hui. Réessaie demain.") : error.message; return; }
    modal(h("h3", { style: "margin-bottom:8px" }, t("Thanks for telling us", "Merci de nous l’avoir signalé")),
      h("p", {}, t(`${BRAND} will look at it. The other person isn’t told who reported them.`, `${BRAND} va l’examiner. L’autre personne ne sait pas qui l’a signalée.`)),
      h("p", { class: "mu", style: "font-size:13px" }, t("If someone is in danger right now, call 911.", "Si quelqu’un est en danger en ce moment, appelle le 911.")),
      h("button", { class: "btn", style: "width:100%", onclick: () => modal.close() }, "OK"));
  } }, t("Send report", "Envoyer le signalement"));
  modal(h("h3", { style: "margin-bottom:6px" }, t("Report ", "Signaler ") + (name || t("this person", "cette personne"))),
    h("p", { class: "mu", style: "font-size:13px" }, t(`Only ${BRAND} sees reports. If this is about a conversation, ${BRAND} may read it to check.`, `Seul ${BRAND} voit les signalements. S’il s’agit d’une conversation, ${BRAND} peut la lire pour vérifier.`)),
    chips, ta, er,
    h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" }, h("button", { class: "btn g", onclick: () => modal.close() }, t("Cancel", "Annuler")), btn));
}
const reportLink = (targetUser, conversationId, name) => h("button", { class: "linkbtn", onclick: () => reportModal(targetUser, conversationId, name) }, "⚑ " + t("Report", "Signaler"));

/* ===== Account card on the dashboard: change password, delete account ===== */
function accountCard() {
  return h("div", { class: "c" }, h("h3", {}, t("Your account", "Ton compte")),
    h("p", { class: "mu" }, ME.email),
    h("div", { class: "row" },
      h("a", { class: "btn sm g", href: "#/password" }, t("Change password", "Changer le mot de passe")),
      h("button", { class: "btn sm no", onclick: deleteAccount }, t("Delete my account", "Supprimer mon compte"))));
}

function deleteAccount() {
  const word = t("DELETE", "SUPPRIMER");
  const inp = h("input", { type: "text", autocomplete: "off", "aria-label": t("Type ", "Tape ") + word });
  const er = h("p", { class: "err", role: "alert" });
  const btn = h("button", { class: "btn", style: "background:#B3261E;border-color:#B3261E", onclick: async () => {
    if (inp.value.trim().toUpperCase() !== word) { er.textContent = t("Type ", "Tape ") + word + t(" to confirm.", " pour confirmer."); return; }
    btn.disabled = true;
    const { error } = await SB.rpc("delete_my_account");
    if (error) { btn.disabled = false; er.textContent = error.message; return; }
    try { await SB.auth.signOut(); } catch (_) {}
    try { localStorage.removeItem("cram_mode"); } catch (_) {}
    ME = null;
    modal.close();
    go("#/");
    toast(t("Your account and its data were deleted.", "Ton compte et ses données ont été supprimés."));
  } }, t("Delete forever", "Supprimer pour toujours"));
  const li = (en, fr) => h("li", {}, t(en, fr));
  modal(h("h3", { style: "margin-bottom:8px" }, t("Delete your account?", "Supprimer ton compte?")),
    h("p", {}, t(`This can’t be undone. ${BRAND} will permanently delete:`, `C’est irréversible. ${BRAND} supprimera pour toujours :`)),
    h("ul", { style: "padding-left:18px;margin:6px 0 10px" },
      li("your login, name and date of birth", "ta connexion, ton nom et ta date de naissance"),
      li("your student and tutor profiles, subjects and schools", "tes profils élève et tuteur, matières et écoles"),
      li("your requests and offers to help", "tes demandes et tes offres d’aide"),
      li("your conversations and messages (for both people in them)", "tes conversations et messages (pour les deux personnes)"),
      li("your sessions, and reviews you wrote or received", "tes séances, et les avis que tu as écrits ou reçus")),
    h("p", { class: "mu", style: "font-size:13px" }, t(`Reports you sent are kept without your name, to keep ${BRAND} safe.`, `Les signalements que tu as envoyés sont gardés sans ton nom, pour la sécurité de ${BRAND}.`)),
    h("label", { class: "f" }, t("Type ", "Tape ") + word + t(" to confirm", " pour confirmer")), inp, er,
    h("div", { class: "row", style: "margin-top:12px;justify-content:flex-end" }, h("button", { class: "btn g", onclick: () => modal.close() }, t("Cancel", "Annuler")), btn));
}

/* ===== Privacy policy and terms (DRAFTS: to be reviewed by a lawyer before real launch) ===== */
const draftNote = () => h("div", { class: "c", style: "border-color:var(--wa);margin-bottom:14px" },
  h("b", { style: "color:var(--wa)" }, t("Draft", "Brouillon")), " · ",
  t(`This text is a plain-language draft. It will be reviewed by a lawyer before ${BRAND}’s official launch.`, `Ce texte est un brouillon en langage simple. Il sera révisé par un avocat avant le lancement officiel de ${BRAND}.`));
const sec = (title, ...paras) => h("div", { style: "margin-top:18px" }, h("h3", { style: "margin-bottom:6px" }, title), ...paras.map(p => Array.isArray(p)
  ? h("ul", { style: "padding-left:18px;margin:6px 0" }, ...p.map(x => h("li", { style: "margin:4px 0" }, x))) : h("p", { style: "margin:6px 0" }, p)));
const CONTACT = "privacy@cram.example"; // TODO: replace with Cram's real contact email before launch

function privacyPage() {
  V.replaceChildren(h("section", { style: "max-width:760px" },
    h("h2", {}, t("Privacy policy", "Politique de confidentialité")),
    h("p", { class: "sub" }, t("Last updated November 21, 2026", "Mise à jour le 21 novembre 2026")),
    draftNote(),
    sec(t("Who we are", "Qui nous sommes"),
      t(`${BRAND} is an independent student project in Montreal that connects students with tutors. It is not affiliated with any school. The person responsible for protecting your personal information is ${BRAND}’s founder. Contact: `, `${BRAND} est un projet étudiant indépendant à Montréal qui met en relation des élèves et des tuteurs. Il n’est affilié à aucune école. La personne responsable de la protection de tes renseignements personnels est le fondateur de ${BRAND}. Contact : `) + CONTACT),
    sec(t("What we collect, and why", "Ce qu’on recueille, et pourquoi"),
      [t("Account: your email, name and password (the password is stored encrypted by our provider; we can’t read it).", "Compte : ton courriel, ton nom et ton mot de passe (chiffré par notre fournisseur; on ne peut pas le lire)."),
       t("Date of birth: only to apply our safety rules for minors. It is never shown to anyone.", "Date de naissance : seulement pour appliquer nos règles de sécurité pour les mineurs. Elle n’est jamais montrée à personne."),
       t(`Profile details you choose to add: languages, level, school, subjects, grades, rate and availability. Tutor profiles are public once ${BRAND} approves them; student profiles are private.`, `Les détails de profil que tu choisis d’ajouter : langues, niveau, école, matières, notes, tarif et disponibilités. Les profils de tuteurs sont publics une fois approuvés par ${BRAND}; les profils d’élèves sont privés.`),
       t("Tutoring requests and offers, messages, sessions and reviews, so the site can work. Reviews are shown without the student’s name.", "Les demandes et offres de tutorat, les messages, les séances et les avis, pour que le site fonctionne. Les avis sont affichés sans le nom de l’élève."),
       t(`Reports you send, so we can keep ${BRAND} safe.`, `Les signalements que tu envoies, pour garder ${BRAND} sécuritaire.`)]),
    sec(t("What we don’t do", "Ce qu’on ne fait pas"),
      [t("We don’t sell your information or show ads.", "On ne vend pas tes renseignements et on n’affiche pas de publicité."),
       t("We don’t take payments yet, so we hold no card or bank details.", "On ne prend pas encore de paiements, donc on ne garde aucune information de carte ou bancaire."),
       t("We don’t use tracking cookies. The site only stores your language, mode and login on your device.", "On n’utilise pas de témoins de suivi. Le site garde seulement ta langue, ton mode et ta connexion sur ton appareil.")]),
    sec(t("Who can see what", "Qui peut voir quoi"),
      t(`Messages are visible only to the two people in the conversation, and to ${BRAND} if one of them reports it. ${BRAND}’s admin can see account data to run and protect the service.`, `Les messages ne sont visibles que par les deux personnes de la conversation, et par ${BRAND} si l’une d’elles la signale. L’administrateur de ${BRAND} peut voir les données des comptes pour faire fonctionner et protéger le service.`)),
    sec(t("Where it is stored", "Où c’est conservé"),
      t(`${BRAND}’s data is stored by our database provider, Supabase, whose servers may be outside Quebec. We picked a provider that protects data with encryption and access rules.`, `Les données de ${BRAND} sont conservées par notre fournisseur de base de données, Supabase, dont les serveurs peuvent être hors du Québec. On a choisi un fournisseur qui protège les données par chiffrement et règles d’accès.`)),
    sec(t("Minors", "Mineurs"),
      [t("You must be at least 14 to create an account. Under 14, a parent or guardian creates a parent account instead.", "Il faut avoir au moins 14 ans pour créer un compte. Avant 14 ans, un parent ou tuteur légal crée plutôt un compte parent."),
       t("Requests from students under 18 are never shown to tutors.", "Les demandes des élèves de moins de 18 ans ne sont jamais montrées aux tuteurs."),
       t(`Tutors must be 18 or older and approved by ${BRAND}.`, `Les tuteurs doivent avoir 18 ans ou plus et être approuvés par ${BRAND}.`)]),
    sec(t("Your rights (Quebec Law 25)", "Tes droits (Loi 25 du Québec)"),
      [t("See and correct your information: most of it is on your profile page.", "Consulter et corriger tes renseignements : la plupart sont sur ta page de profil."),
       t("Delete your account and its data at any time from your dashboard.", "Supprimer ton compte et ses données à tout moment depuis ton tableau de bord."),
       t("Ask us a question or make a complaint at ", "Nous poser une question ou faire une plainte à ") + CONTACT + t(". You can also contact the Commission d’accès à l’information du Québec.", ". Tu peux aussi contacter la Commission d’accès à l’information du Québec.")]),
    sec(t("How long we keep it", "Combien de temps on la garde"),
      t("As long as your account exists. When you delete it, your data is deleted right away, except reports you sent, which are kept without your name.", "Aussi longtemps que ton compte existe. Quand tu le supprimes, tes données sont supprimées immédiatement, sauf les signalements que tu as envoyés, qui sont gardés sans ton nom."))));
}

function termsPage() {
  V.replaceChildren(h("section", { style: "max-width:760px" },
    h("h2", {}, t("Terms of use", "Conditions d’utilisation")),
    h("p", { class: "sub" }, t("Last updated November 21, 2026", "Mise à jour le 21 novembre 2026")),
    draftNote(),
    sec(t(`What ${BRAND} is`, `Ce qu’est ${BRAND}`),
      t(`${BRAND} helps students and tutors find each other, talk, and book sessions. Tutors are independent: they are not ${BRAND}’s employees, and ${BRAND} does not guarantee results.`, `${BRAND} aide les élèves et les tuteurs à se trouver, à se parler et à réserver des séances. Les tuteurs sont indépendants : ils ne sont pas des employés de ${BRAND}, et ${BRAND} ne garantit pas de résultats.`)),
    sec(t("Your account", "Ton compte"),
      [t("Give true information, including your real date of birth.", "Donne des informations vraies, y compris ta vraie date de naissance."),
       t("Keep your password private. You are responsible for what happens on your account.", "Garde ton mot de passe privé. Tu es responsable de ce qui se passe sur ton compte."),
       t("You must be 14 or older, and 18 or older to tutor or to make a parent account.", "Tu dois avoir 14 ans ou plus, et 18 ans ou plus pour donner des cours ou créer un compte parent.")]),
    sec(t("Be respectful and honest", "Sois respectueux et honnête"),
      [t("No harassment, hate, sexual content, threats or spam.", "Pas de harcèlement, de haine, de contenu sexuel, de menaces ni de pourriel."),
       t("Tutors: only claim courses, grades and schools that are true. Grades are self-reported unless marked “Verified”.", "Tuteurs : n’indique que des cours, notes et écoles vrais. Les notes sont déclarées sauf si elles sont marquées « Vérifié »."),
       t("No cheating: tutors help students learn; they don’t do graded work or exams for them.", "Pas de tricherie : les tuteurs aident les élèves à apprendre; ils ne font pas leurs travaux notés ni leurs examens."),
       t("Reviews must be about a real session and honest.", "Les avis doivent porter sur une vraie séance et être honnêtes.")]),
    sec(t("Sessions and payments", "Séances et paiements"),
      t(`${BRAND} doesn’t process payments yet. Students and tutors agree on the price themselves and settle it directly. Never pay before you have met, and meet in a public place for in-person sessions.`, `${BRAND} ne traite pas encore les paiements. Les élèves et tuteurs s’entendent sur le prix et le règlent directement. Ne paie jamais avant de vous être rencontrés, et rencontrez-vous dans un lieu public pour les séances en personne.`)),
    sec(t("Safety and reports", "Sécurité et signalements"),
      t(`Use the Report button if something is wrong. ${BRAND} may hide profiles, remove content or close accounts that break these rules. In an emergency, call 911.`, `Utilise le bouton Signaler si quelque chose ne va pas. ${BRAND} peut masquer des profils, retirer du contenu ou fermer des comptes qui enfreignent ces règles. En cas d’urgence, appelle le 911.`)),
    sec(t("Changes and contact", "Changements et contact"),
      t(`${BRAND} is an early-stage project and these terms may change; we’ll show the date of the latest version here. Questions: `, `${BRAND} est un projet en démarrage et ces conditions peuvent changer; on indiquera ici la date de la dernière version. Questions : `) + CONTACT)));
}

ROUTES.privacy = privacyPage;
ROUTES.terms = termsPage;
PAGE_TITLES.privacy = () => t("Privacy policy", "Politique de confidentialité");
PAGE_TITLES.terms = () => t("Terms of use", "Conditions d’utilisation");
