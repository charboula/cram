/* Cram pages: home page and the dashboards (student and tutor). */

/* ===== Home ===== */
function home() {
  const heading = (en, fr, subEn, subFr) => [h("h2", { class: "rv" }, t(en, fr)), subEn ? h("p", { class: "sub rv" }, t(subEn, subFr)) : null];
  const steps = (list) => h("ol", { class: "steps" }, ...list.map(([a, b, c, d]) =>
    h("li", {}, h("b", {}, t(a, b)), h("div", { class: "mu" }, t(c, d)))));
  const studentSteps = [
    ["Search by subject or skill", "Cherche par matière ou compétence", "Calculus, French, Python, Excel, piano… Filter by budget, level, language and online or in person.", "Calcul, français, Python, Excel, piano… Filtre par budget, niveau, langue, en ligne ou en personne."],
    ["Compare real profiles", "Compare de vrais profils", "See each tutor’s schools, subjects, rate and availability, and why they match what you need.", "Vois les écoles, matières, tarifs et disponibilités de chaque tuteur, et pourquoi il correspond à ton besoin."],
    ["Contact a tutor or post a request", "Contacte un tuteur ou publie une demande", "Message a tutor, or describe what you need and let qualified tutors come to you.", "Écris à un tuteur, ou décris ton besoin et laisse les tuteurs qualifiés venir à toi."]];
  const tutorSteps = [
    ["Create your profile", "Crée ton profil", "Your subjects, current and past schools, languages, rate and availability.", "Tes matières, tes écoles actuelles et passées, tes langues, ton tarif et tes disponibilités."],
    ["Get approved by Cram", "Fais-toi approuver par Cram", "We review every tutor before they appear to students.", "On vérifie chaque tuteur avant qu’il apparaisse aux élèves."],
    ["Find students", "Trouve des élèves", "Browse requests that match what you know and offer to help.", "Parcours les demandes qui correspondent à ce que tu connais et propose ton aide."]];
  const audiences = [
    ["Students", "Élèves et étudiants", "High school, CEGEP or university. Find help for a course, an exam or a whole term.", "Secondaire, cégep ou université. Trouve de l’aide pour un cours, un examen ou une session entière.", "#/find", t("Find a tutor", "Trouver un tuteur")],
    ["Parents and guardians", "Parents et tuteurs légaux", "Compare tutors before anyone meets your child, and post requests on their behalf.", "Compare les tuteurs avant qu’ils rencontrent ton enfant, et publie des demandes en son nom.", null, t("Create a parent account", "Créer un compte parent"), "parent"],
    ["Adults and professionals", "Adultes et professionnels", "Languages, coding, Excel, music. No school needed to use Cram.", "Langues, programmation, Excel, musique. Pas besoin d’être aux études pour utiliser Cram.", "#/find", t("Find a tutor", "Trouver un tuteur")],
    ["Tutors", "Tuteurs", "Turn what you know into income. Set your own rate and hours.", "Transforme ce que tu sais en revenu. Fixe ton tarif et tes heures.", null, t("Become a tutor", "Devenir tuteur"), "tutor"]];
  const faq = [
    ["Is Cram free?", "Cram est-il gratuit?", "Creating an account and browsing are free. Tutors set their own rates.", "Créer un compte et parcourir sont gratuits. Les tuteurs fixent leurs propres tarifs."],
    ["Can I get free help instead?", "Puis-je obtenir de l’aide gratuite?", "Yes. Many schools and libraries offer free help, and it is a good place to start. Cram suits you if you want a tutor who knows your exact course or skill and a regular time slot.", "Oui. Beaucoup d’écoles et de bibliothèques offrent de l’aide gratuite, et c’est un bon point de départ. Cram te convient si tu veux un tuteur qui connaît ton cours ou ta compétence et une plage régulière."],
    ["How do I know a tutor is qualified?", "Comment savoir qu’un tuteur est qualifié?", "Cram approves every tutor before they appear. Courses, grades and schools are self-reported and labelled that way. A “Verified” badge appears only after Cram checks an official document.", "Cram approuve chaque tuteur avant qu’il apparaisse. Les cours, notes et écoles sont déclarés et indiqués comme tels. Le badge « Vérifié » n’apparaît qu’après la vérification d’un document officiel par Cram."],
    ["Can students under 18 use Cram?", "Les moins de 18 ans peuvent-ils utiliser Cram?", "Students 14 and older can create an account. Under 14, a parent or guardian creates it. Requests from students under 18 are never shown to tutors; a parent can post one for them instead. All tutors are adults.", "Les élèves de 14 ans et plus peuvent créer un compte. Avant 14 ans, un parent ou tuteur légal le crée. Les demandes des moins de 18 ans ne sont jamais montrées aux tuteurs; un parent peut en publier une à leur place. Tous les tuteurs sont majeurs."],
    ["Is it safe to meet a tutor?", "Est-ce sécuritaire de rencontrer un tuteur?", "Choose online, or meet in a public place like a library, and keep your messages inside Cram.", "Choisis l’en ligne ou un lieu public comme une bibliothèque, et garde tes messages dans Cram."]];
  const join = role => () => (ME ? go("#/dashboard") : authModal("signup", role));

  V.replaceChildren(
    h("div", { class: "hero solo", id: "hero" }, h("div", {},
      h("span", { class: "pill" }, t("Tutoring in Montreal, in English and French", "Tutorat à Montréal, en français et en anglais")),
      h("h1", {}, ...(lang === "fr" ? ["Trouve le bon tuteur pour ", h("em", {}, "n’importe quelle matière"), "."] : ["Find the right tutor for ", h("em", {}, "any subject"), "."])),
      h("p", { class: "lead" }, t("Search tutors by subject, school, budget and schedule. And if you tutor, find students who need exactly what you know.", "Cherche des tuteurs par matière, école, budget et horaire. Et si tu donnes des cours, trouve des élèves qui ont besoin exactement de ce que tu sais.")),
      homeSearch(),
      h("div", { class: "row", style: "justify-content:center;margin-top:16px" },
        h("a", { class: "btn", href: "#/find" }, t("Find a tutor", "Trouver un tuteur")),
        h("button", { class: "btn g", onclick: join("tutor") }, t("Become a tutor", "Devenir tuteur"))))),
    h("div", { class: "strip rv" }, ...[["Any subject or skill", "Toute matière ou compétence"], ["Tutors set their own rate", "Les tuteurs fixent leur tarif"], ["English and French", "Anglais et français"], ["Every tutor approved by Cram", "Chaque tuteur approuvé par Cram"]].map(([a, b]) =>
      h("div", {}, h("span", { style: "color:var(--ok);font-weight:700" }, "✓ "), t(a, b)))),
    h("section", {}, ...heading("How Cram works", "Comment fonctionne Cram", "One site for both sides: students find tutors, and tutors find students.", "Un seul site pour les deux côtés : les élèves trouvent des tuteurs, et les tuteurs trouvent des élèves."),
      h("div", { class: "g2 home-two" },
        h("div", { class: "c rv" }, h("h3", {}, t("For students", "Pour les élèves")), steps(studentSteps)),
        h("div", { class: "c rv" }, h("h3", {}, t("For tutors", "Pour les tuteurs")), steps(tutorSteps)))),
    h("section", {}, ...heading("Made for everyone who learns", "Pour tous ceux qui apprennent", "", ""),
      h("div", { class: "aud" }, ...audiences.map(([a, b, c, d, href, label, role], i) =>
        h("div", { class: "c h rv", style: "--d:" + i * 0.08 + "s;display:flex;flex-direction:column;gap:8px" },
          h("h3", {}, t(a, b)), h("p", { class: "mu", style: "margin:0;flex:1" }, t(c, d)),
          href ? h("a", { class: "btn g sm", href }, label) : h("button", { class: "btn g sm", onclick: join(role) }, label))))),
    h("section", {}, ...heading("Free help or Cram?", "Aide gratuite ou Cram?", "Both have a place. Here is the honest difference.", "Les deux ont leur place. Voici la différence, en toute honnêteté."),
      h("div", { class: "g2" },
        h("div", { class: "c rv" }, h("h3", {}, t("School and library help", "Aide de l’école et de la bibliothèque")),
          h("ul", { class: "mu", style: "padding-left:18px;margin:8px 0 0" }, h("li", {}, t("Free", "Gratuite")), h("li", {}, t("Good for quiet space and quick questions", "Idéale pour un lieu calme et des questions rapides")), h("li", {}, t("Hours and availability can be limited", "Les heures et disponibilités peuvent être limitées")))),
        h("div", { class: "c rv", style: "border-color:var(--ac)" }, h("h3", {}, "Cram"),
          h("ul", { class: "mu", style: "padding-left:18px;margin:8px 0 0" }, h("li", {}, t("Tutors set their own rate", "Les tuteurs fixent leur tarif")), h("li", {}, t("Someone who knows your exact course or skill", "Quelqu’un qui connaît ton cours ou ta compétence")), h("li", {}, t("Evenings, weekends and a regular weekly slot", "Soirs, fins de semaine et une plage hebdomadaire régulière")))))),
    h("section", {}, h("h2", { class: "rv" }, t("Common questions", "Questions fréquentes")),
      h("div", { class: "tc rv", style: "margin-top:14px" }, ...faq.map(([q, qf, a, af]) => h("details", { class: "c" }, h("summary", {}, t(q, qf)), h("p", {}, t(a, af)))))),
    h("section", {}, h("div", { class: "c rv cta-band", style: "padding:28px" },
      h("h2", {}, t("Know a subject well? Tutor it.", "Tu maîtrises une matière? Enseigne-la.")),
      h("p", { class: "sub", style: "margin-bottom:14px" }, t("Create your profile, set your rate, and find students who need help. Every tutor is reviewed by Cram before appearing.", "Crée ton profil, fixe ton tarif et trouve des élèves qui ont besoin d’aide. Chaque tuteur est vérifié par Cram avant d’apparaître.")),
      h("button", { class: "btn", onclick: join("tutor") }, t("Create a tutor account", "Créer un compte tuteur")))));
}

// Home search box: sends you to Find tutors with what you typed
function homeSearch() {
  const inp = h("input", { type: "text", placeholder: t("What do you need help with? e.g. Calculus, Excel, piano", "Tu as besoin d’aide en quoi? ex. Calcul, Excel, piano"),
    "aria-label": t("Search tutors", "Chercher un tuteur"), onkeydown: e => { if (e.key === "Enter" && inp.value.trim()) go("#/find/" + encodeURIComponent(inp.value.trim())); } });
  return h("div", { class: "sbox" }, inp);
}

/* ===== Dashboard (one page; what it shows depends on student or tutor mode) ===== */
function dashboard() {
  const cards = [];
  if (!ME.dbReady) cards.push(h("div", { class: "c" }, h("h3", {}, t("Some account features aren’t switched on yet", "Certaines fonctions du compte ne sont pas encore activées")),
    h("p", { class: "mu" }, t("Cram’s database needs its latest update. Please try again later.", "La base de données de Cram doit être mise à jour. Réessaie plus tard.")),
    ME.dbError ? h("p", { class: "mu", style: "font-size:12px" }, t("Technical detail: ", "Détail technique : ") + ME.dbError) : null));
  else if (!ME.birthDate) cards.push(birthDateCard());
  if (ME.dbReady) cards.push(sessionsCard());
  cards.push(...(ME.mode === "tutor" ? tutorCards() : studentCards()), otherRoleCard(), accountCard());
  V.replaceChildren(h("section", {},
    h("div", { class: "row sp" },
      h("div", {},
        h("h2", {}, t("Hi, ", "Bonjour, ") + ME.name),
        h("p", { class: "sub", style: "margin:0" }, ME.mode === "tutor" ? t("Tutor dashboard", "Tableau de bord tuteur")
          : ME.kind === "parent" ? t("Student dashboard · parent or guardian account", "Tableau de bord élève · compte parent ou tuteur légal")
          : t("Student dashboard", "Tableau de bord élève")))),
    h("div", { class: "g2", style: "margin-top:20px" }, ...cards)));
}

function birthDateCard() {
  const inp = h("input", { type: "date", "aria-label": t("Date of birth", "Date de naissance"), max: new Date().toISOString().slice(0, 10) });
  const er = h("p", { class: "err", role: "alert" });
  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inp.value)) { er.textContent = t("Please enter your date of birth.", "Entre ta date de naissance."); return; }
    const { error } = await SB.rpc("set_birth_date", { d: inp.value });
    if (error) { er.textContent = error.message; return; }
    ME.birthDate = inp.value;
    toast(t("Saved", "Enregistré"));
    dashboard();
  };
  return h("div", { class: "c", style: "border-color:var(--wa)" },
    h("h3", {}, t("Add your date of birth", "Ajoute ta date de naissance")),
    h("p", { class: "mu" }, t("Cram has safety rules for minors, so we need it once. It stays private and can’t be changed later.", "Cram a des règles de sécurité pour les mineurs, alors on en a besoin une fois. Elle reste privée et ne peut pas être modifiée ensuite.")),
    inp, er, h("button", { class: "btn sm", style: "margin-top:10px", onclick: save }, t("Save", "Enregistrer")));
}

function studentCards() {
  return [
    h("div", { class: "c" }, h("h3", {}, t("Find a tutor", "Trouver un tuteur")),
      h("p", { class: "mu" }, t("Search approved tutors by subject or course. We use your level and school to put the best matches first.", "Cherche des tuteurs approuvés par matière ou cours. On utilise ton niveau et ton école pour montrer les meilleurs choix en premier.")),
      h("a", { class: "btn sm", href: "#/find" }, t("Find a tutor", "Trouver un tuteur"))),
    h("div", { class: "c" }, h("h3", {}, t("Your requests", "Tes demandes")),
      h("p", { class: "mu" }, ME.kind === "parent"
        ? t("Post what your child needs help with. Approved tutors can offer to help, and you choose who to connect with.", "Publie ce pour quoi ton enfant a besoin d’aide. Des tuteurs approuvés peuvent proposer leur aide, et tu choisis avec qui te connecter.")
        : t("Post what you need help with. Approved tutors can offer to help, and you choose who to connect with.", "Publie ce pour quoi tu as besoin d’aide. Des tuteurs approuvés peuvent proposer leur aide, et tu choisis avec qui te connecter.")),
      h("div", { class: "row" }, h("a", { class: "btn sm", href: "#/requests/new" }, t("New request", "Nouvelle demande")), h("a", { class: "btn sm g", href: "#/requests" }, t("My requests", "Mes demandes")))),
    h("div", { class: "c" }, h("h3", {}, t("Your profile", "Ton profil")),
      h("p", { class: "mu" }, t("Add your level, languages and school (optional) so we can suggest the right tutors.", "Ajoute ton niveau, tes langues et ton école (facultatif) pour qu’on te suggère les bons tuteurs.")),
      h("a", { class: "btn sm g", href: "#/profile" }, t("Edit my profile", "Modifier mon profil")))];
}

function tutorCards() {
  const tp = ME.tutor || {};
  const listed = h("input", { type: "checkbox", checked: !!tp.is_listed, onchange: async e => {
    const want = e.target.checked;
    const { error } = await SB.from("tutor_profiles").update({ is_listed: want }).eq("user_id", ME.id);
    if (error) { e.target.checked = !want; toast(t("Couldn’t save: ", "Impossible d’enregistrer : ") + error.message); return; }
    tp.is_listed = want;
    toast(want ? t("You’ll appear in search once approved", "Tu apparaîtras dans la recherche une fois approuvé") : t("Hidden from search", "Masqué de la recherche"));
  } });
  const missing = [
    !tp.headline && t("a headline", "un titre"),
    !tp.bio && t("a short bio", "une courte bio"),
    !tp.hourly_rate_cents && t("your hourly rate", "ton tarif horaire")].filter(Boolean);
  return [
    h("div", { class: "c" }, h("h3", {}, t("Find students", "Trouver des élèves")),
      h("p", { class: "mu" }, t("Browse requests from students who want help, with the best matches for your profile first.", "Parcours les demandes d’élèves qui veulent de l’aide, avec les meilleurs choix pour ton profil en premier.")),
      h("a", { class: "btn sm", href: "#/students" }, t("Find students", "Trouver des élèves"))),
    h("div", { class: "c" }, h("h3", {}, t("Your status", "Ton statut")),
      h("div", { class: "row", style: "margin:8px 0" }, tp.approved
        ? h("span", { class: "tag ok" }, "✓ " + t("Approved by Cram", "Approuvé par Cram"))
        : h("span", { class: "tag wa" }, t("Waiting for Cram’s approval", "En attente d’approbation par Cram"))),
      h("label", { class: "row", style: "cursor:pointer;flex-wrap:nowrap;margin-top:8px" }, listed, t("Show my profile in search", "Montrer mon profil dans la recherche")),
      h("p", { class: "mu", style: "margin:8px 0 0" }, t("Students see you only when you are approved and this is on.", "Les élèves te voient seulement si tu es approuvé et que ceci est activé."))),
    h("div", { class: "c" }, h("h3", {}, t("Your profile", "Ton profil")),
      missing.length
        ? h("p", { class: "mu" }, t("Still missing: ", "Il manque encore : ") + missing.join(", ") + ".")
        : h("p", { class: "mu" }, t("Your profile has the basics. Add subjects and schools so students can find you.", "Ton profil a l’essentiel. Ajoute des matières et des écoles pour que les élèves te trouvent.")),
      h("a", { class: "btn sm", href: "#/profile" }, t("Edit my profile", "Modifier mon profil")))];
}

function otherRoleCard() {
  if (ME.roles.student && ME.roles.tutor) {
    const other = ME.mode === "tutor" ? "student" : "tutor";
    return h("div", { class: "c" }, h("h3", {}, t("Your account has both roles", "Ton compte a les deux rôles")),
      h("p", { class: "mu" }, t("Switch any time from the button at the top.", "Change à tout moment avec le bouton en haut.")),
      h("button", { class: "btn g sm", onclick: () => switchMode(other) }, other === "tutor" ? t("Switch to tutor", "Passer en tuteur") : t("Switch to student", "Passer en élève")));
  }
  if (!ME.roles.tutor) {
    const adult = ME.birthDate && ageFrom(ME.birthDate) >= 18;
    return h("div", { class: "c" }, h("h3", {}, t("Want to tutor too?", "Tu veux aussi donner des cours?")),
      h("p", { class: "mu" }, t("Add a tutor role to this account. You keep one login and switch between the two. Tutors must be 18 or older.", "Ajoute un rôle tuteur à ce compte. Tu gardes une seule connexion et tu passes de l’un à l’autre. Les tuteurs doivent avoir 18 ans ou plus.")),
      h("button", { class: "btn g sm", disabled: !adult || !ME.dbReady, onclick: () => addRole("tutor") }, t("Add tutor role", "Ajouter le rôle tuteur")));
  }
  return h("div", { class: "c" }, h("h3", {}, t("Need help with something yourself?", "Tu as toi-même besoin d’aide?")),
    h("p", { class: "mu" }, t("Add a student role to this account and switch between the two.", "Ajoute un rôle élève à ce compte et passe de l’un à l’autre.")),
    h("button", { class: "btn g sm", disabled: !ME.dbReady, onclick: () => addRole("student") }, t("Add student role", "Ajouter le rôle élève")));
}

ROUTES[""] = home;
ROUTES.dashboard = dashboard;
PAGE_TITLES[""] = () => t("Home", "Accueil");
PAGE_TITLES.dashboard = () => t("Dashboard", "Tableau de bord");

/* ===== "What's real so far" page (linked from the footer) ===== */
function status() {
  const li = (en, fr) => h("li", { style: "margin:6px 0" }, t(en, fr));
  V.replaceChildren(h("section", {},
    h("h2", {}, t("What’s real so far", "Ce qui est réel pour l’instant")),
    h("p", { class: "sub" }, t("Cram is being built in steps. Here is exactly what is real today.", "Cram se construit par étapes. Voici exactement ce qui est réel aujourd’hui.")),
    h("div", { class: "g2" },
      h("div", { class: "c" },
        h("h3", { style: "color:var(--ok)" }, "✓ " + t("Real (saved in Cram’s database)", "Réel (enregistré dans la base de données de Cram)")),
        h("ul", { style: "padding-left:18px" },
          li("Accounts: sign up, email confirmation, log in", "Comptes : inscription, confirmation par courriel, connexion"),
          li("Student and tutor roles on one account, with a switch", "Rôles étudiant et tuteur sur un seul compte, avec une bascule"),
          li("Tutor approval by Cram and the “show me in search” setting", "Approbation des tuteurs par Cram et le réglage « me montrer dans la recherche »"),
          li("Age rules for minors", "Règles d’âge pour les mineurs"),
          li("Profiles: languages, level, school search, tutor subjects, schools, rate and availability", "Profils : langues, niveau, recherche d’école, matières, écoles, tarif et disponibilités du tuteur"),
          li("Tutor search, filters, comparison and tutor profiles", "Recherche de tuteurs, filtres, comparaison et profils"),
          li("Tutoring requests, Find Students and offers to help", "Demandes de tutorat, Trouver des élèves et offres d’aide"),
          li("Private messages between a student and a tutor", "Messages privés entre un élève et un tuteur"),
          li("Booking sessions, and reviews only after a completed session", "Réservation de séances, et avis seulement après une séance terminée"),
          li("Password reset, reporting a problem, deleting your account", "Réinitialisation du mot de passe, signalement d’un problème, suppression du compte"))),
      h("div", { class: "c" },
        h("h3", { style: "color:var(--wa)" }, "… " + t("Coming next", "À venir")),
        h("ul", { style: "padding-left:18px" },
          li("Payments through Cram", "Paiements par Cram"),
          li("Verified grades and profile photos for tutors", "Notes vérifiées et photos de profil pour les tuteurs"),
          li("Final privacy policy and terms, reviewed by a lawyer", "Politique de confidentialité et conditions finales, révisées par un avocat"))))));
}

ROUTES.status = status;
PAGE_TITLES.status = () => t("What’s real so far", "Ce qui est réel");
