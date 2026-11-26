/* Cram pages: home page and the dashboards (student and tutor). */

/* ===== Home ===== */
function home() {
  const B = BRAND;
  const join = role => () => (ME ? go("#/dashboard") : authModal("signup", role));
  const mark = s => h("mark", {}, s); // highlighter effect on a few key words
  const code = s => h("span", { class: "code" }, s); // course codes, in the typewriter font

  // Three steps for students, written the way a student would explain it to a friend
  const studentSteps = [
    ["Type your course code", "Tape ton code de cours", "Like 201-NYA-05 or MATH 140. No code? Just type the subject: Calculus, Organic chem, Python.", "Comme 201-NYA-05 ou MATH 140. Pas de code? Tape la matière : Calcul, Chimie organique, Python."],
    ["See who already took it", "Vois qui l’a déjà suivi", "Tutors who took that exact course at your school show up first, with the reason they match.", "Les tuteurs qui ont suivi ce cours précis à ton école apparaissent en premier, avec la raison du match."],
    ["Message them, book a session", "Écris-leur, réserve une séance", "Online or at the library, evenings and weekends. Or post a request and let tutors come to you.", "En ligne ou à la bibliothèque, soirs et fins de semaine. Ou publie une demande et laisse les tuteurs venir à toi."]];
  const tutorSteps = [
    ["List the courses you passed", "Liste les cours que tu as réussis", "Course code, school, and the grade you got.", "Code du cours, école, et ta note."],
    ["Get approved", "Fais-toi approuver", "We check every tutor before students can see them.", "On vérifie chaque tuteur avant que les élèves puissent le voir."],
    ["Pick your students", "Choisis tes élèves", "Set your own rate and hours, and answer requests for courses you know.", "Fixe ton tarif et tes heures, et réponds aux demandes pour les cours que tu connais."]];
  const audiences = [
    ["CEGEP and university students", "Cégépiens et universitaires", "Midterm next week, a course you might fail, or a whole term of help.", "Intra la semaine prochaine, un cours que tu risques de couler, ou toute une session d’aide.", "#/find", t("Find a tutor", "Trouver un tuteur")],
    ["High school students and parents", "Élèves du secondaire et parents", "Parents can compare tutors before anyone meets their child, and post requests for them.", "Les parents peuvent comparer les tuteurs avant qu’ils rencontrent leur enfant, et publier des demandes en son nom.", null, t("Create a parent account", "Créer un compte parent"), "parent"],
    ["Anyone learning something new", "Quiconque apprend quelque chose", "Languages, coding, Excel, music. You don’t need to be in school.", "Langues, programmation, Excel, musique. Pas besoin d’être aux études.", "#/find", t("Find a tutor", "Trouver un tuteur")]];
  const faq = [
    ["Is " + B + " free?", B + " est-il gratuit?", "Creating an account and browsing are free. Tutors set their own rates.", "Créer un compte et parcourir sont gratuits. Les tuteurs fixent leurs propres tarifs."],
    ["Can I get free help instead?", "Puis-je obtenir de l’aide gratuite?", "Yes. Your school’s help centre and the library are a good place to start. " + B + " is for when you want someone who took your exact course, at a time that suits you.", "Oui. Le centre d’aide de ton école et la bibliothèque sont un bon point de départ. " + B + " sert quand tu veux quelqu’un qui a suivi ton cours, à l’heure qui te convient."],
    ["How do I know a tutor is any good?", "Comment savoir si un tuteur est bon?", "Every tutor is approved before they appear. Courses, grades and schools are self-reported and labelled that way. A “Verified” badge appears only after we check an official document.", "Chaque tuteur est approuvé avant d’apparaître. Les cours, notes et écoles sont déclarés et indiqués comme tels. Le badge « Vérifié » n’apparaît qu’après la vérification d’un document officiel."],
    ["Can students under 18 use " + B + "?", "Les moins de 18 ans peuvent-ils utiliser " + B + "?", "Students 14 and older can create an account. Under 14, a parent or guardian creates it. Requests from students under 18 are never shown to tutors; a parent can post one for them instead. All tutors are adults.", "Les élèves de 14 ans et plus peuvent créer un compte. Avant 14 ans, un parent ou tuteur légal le crée. Les demandes des moins de 18 ans ne sont jamais montrées aux tuteurs; un parent peut en publier une à leur place. Tous les tuteurs sont majeurs."],
    ["Is it safe to meet a tutor?", "Est-ce sécuritaire de rencontrer un tuteur?", "Choose online, or meet in a public place like a library, and keep your messages inside " + B + ".", "Choisis l’en ligne ou un lieu public comme une bibliothèque, et garde tes messages dans " + B + "."]];
  const steps = list => h("ol", { class: "nsteps" }, ...list.map(([a, b, c, d]) =>
    h("li", {}, h("b", {}, t(a, b)), h("p", {}, t(c, d)))));

  V.replaceChildren(
    // 1. Hero: the promise on the left, a worked example of a match on the right
    h("div", { class: "hero", id: "hero" },
      h("div", {},
        h("p", { class: "kicker" }, t("Montreal · CEGEP, university and high school · EN / FR", "Montréal · cégep, université et secondaire · FR / EN")),
        h("h1", {}, ...(lang === "fr"
          ? ["Fais-toi aider par quelqu’un qui a ", mark("déjà réussi ton cours"), "."]
          : ["Get help from someone who ", mark("already passed your course"), "."])),
        h("p", { class: "lead" }, t("Search by course code. Tutors who took that exact course at your school come up first, so they know how it’s taught and where everyone gets stuck.",
          "Cherche par code de cours. Les tuteurs qui ont suivi ce cours précis à ton école apparaissent en premier : ils savent comment il est enseigné et où tout le monde bloque.")),
        homeSearch(),
        // One-tap examples under the search box, so a student sees how it works without typing
        h("div", { class: "quick" }, h("span", { class: "mu" }, t("Try a Vanier course:", "Essaie un cours de Vanier :")),
          ...["201-NYA-05", "201-NYB-05", "202-NYA-05", "203-NYA-05", "101-NYA-05"].map(c => {
            const k = courseByCode(c);
            return h("a", { class: "chip code", href: "#/find/" + encodeURIComponent(c), title: k ? t(k.en, k.fr) : c }, c);
          })),
        h("div", { class: "row", style: "margin-top:14px" },
          h("a", { class: "btn", href: "#/find" }, t("Find a tutor", "Trouver un tuteur")),
          h("button", { class: "btn g", onclick: join("tutor") }, t("I want to tutor", "Je veux donner des cours")))),
      h("div", { class: "slip", "aria-label": t("Example of how matching works", "Exemple de fonctionnement du jumelage") },
        h("p", { class: "slip-h" }, t("How a match works (example)", "Comment marche un match (exemple)")),
        h("div", { class: "slip-row" }, h("small", {}, t("You search", "Tu cherches")), code("201-NYA-05"), h("span", { class: "mu" }, t("Calculus I · Vanier College", "Calcul I · Collège Vanier"))),
        h("div", { class: "slip-row" }, h("small", {}, t(B + " shows first", B + " montre d’abord")), h("span", {}, t("Tutors who took ", "Les tuteurs qui ont suivi "), code("201-NYA-05"), t(" at Vanier", " à Vanier"))),
        h("div", { class: "slip-row" }, h("small", {}, t("And tells you why", "Et te dit pourquoi")), h("span", { class: "why" }, t("Took 201-NYA-05 at Vanier College (A, self-reported)", "A suivi 201-NYA-05 à Collège Vanier (A, déclaré)"))))),

    // 2. Students: three plain steps, no cards
    h("section", {},
      h("h2", {}, t("For students", "Pour les élèves")),
      steps(studentSteps)),

    // 3. Tutors: the brand-coloured band
    h("section", { class: "band" },
      h("div", {},
        h("h2", {}, t("Got an A in a course? Someone in it right now needs you.", "Tu as eu un A dans un cours? Quelqu’un le suit en ce moment et a besoin de toi.")),
        h("p", { class: "sub" }, t("Tutor the courses you already passed, at your own rate and hours. Most of the prep is done: you’ve sat the exams.", "Donne des cours dans les matières que tu as déjà réussies, à ton tarif et selon tes heures. Le plus gros de la préparation est fait : tu as déjà passé les examens.")),
        h("button", { class: "btn", onclick: join("tutor") }, t("Create a tutor account", "Créer un compte tuteur"))),
      steps(tutorSteps)),

    // 4. Who it's for: a simple ruled list
    h("section", {},
      h("h2", {}, t("Who it’s for", "Pour qui")),
      h("div", { class: "rules" }, ...audiences.map(([a, b, c, d, href, label, role]) =>
        h("div", { class: "rule" },
          h("h3", {}, t(a, b)), h("p", { class: "mu" }, t(c, d)),
          href ? h("a", { class: "btn g sm", href }, label) : h("button", { class: "btn g sm", onclick: join(role) }, label))))),

    // 5. Honest comparison with free help
    h("section", {},
      h("h2", {}, t("Free help or " + B + "?", "Aide gratuite ou " + B + "?")),
      h("p", { class: "sub" }, t("Both have a place. Here’s the honest difference.", "Les deux ont leur place. Voici la différence, honnêtement.")),
      h("div", { class: "vs" },
        h("div", {}, h("h3", {}, t("Your school’s help centre", "Le centre d’aide de ton école")),
          h("ul", {}, h("li", {}, t("Free", "Gratuit")), h("li", {}, t("Good for quick questions", "Bien pour les questions rapides")), h("li", {}, t("Limited hours, often full before exams", "Heures limitées, souvent plein avant les examens")))),
        h("div", { class: "us" }, h("h3", {}, B),
          h("ul", {}, h("li", {}, t("Tutors set their own rate", "Les tuteurs fixent leur tarif")), h("li", {}, t("Someone who took your exact course", "Quelqu’un qui a suivi ton cours")), h("li", {}, t("Evenings, weekends, a regular weekly slot", "Soirs, fins de semaine, une plage fixe chaque semaine")))))),

    // 6. Questions
    h("section", {},
      h("h2", {}, t("Questions", "Questions")),
      h("div", { class: "faq" }, ...faq.map(([q, qf, a, af]) => h("details", {}, h("summary", {}, t(q, qf)), h("p", {}, t(a, af)))))));
}

// Home search box: suggests courses while you type, then sends you to Find tutors
function homeSearch() {
  const inp = h("input", { type: "text", placeholder: t("Course code or subject, e.g. 201-NYA-05, MATH 140, Chemistry", "Code de cours ou matière, ex. 201-NYA-05, MATH 140, Chimie"),
    "aria-label": t("Search tutors", "Chercher un tuteur"), onkeydown: e => { if (e.key === "Enter" && inp.value.trim()) go("#/find/" + encodeURIComponent(inp.value.trim())); } });
  return courseBox(inp, c => go("#/find/" + encodeURIComponent(courseQuery(c))), "sbox", text => go("#/find/" + encodeURIComponent(text)));
}

/* ===== Dashboard (one page; what it shows depends on student or tutor mode) ===== */
function dashboard() {
  const cards = [];
  if (!ME.dbReady) cards.push(h("div", { class: "c" }, h("h3", {}, t("Some account features aren’t switched on yet", "Certaines fonctions du compte ne sont pas encore activées")),
    h("p", { class: "mu" }, t(`${BRAND}’s database needs its latest update. Please try again later.`, `La base de données de ${BRAND} doit être mise à jour. Réessaie plus tard.`)),
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

// Missing date of birth: send them to My profile, where it's saved with everything else in one go
function birthDateCard() {
  return h("div", { class: "c", style: "border-color:var(--wa)" },
    h("h3", {}, t("Add your date of birth", "Ajoute ta date de naissance")),
    h("p", { class: "mu" }, t(`${BRAND} has safety rules for minors, so we need it once. It stays private and can’t be changed later.`, `${BRAND} a des règles de sécurité pour les mineurs, alors on en a besoin une fois. Elle reste privée et ne peut pas être modifiée ensuite.`)),
    h("a", { class: "btn sm", href: "#/profile" }, t("Finish my profile", "Compléter mon profil")));
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
  // What a new tutor must finish before students can see them. Courses with grades are the whole point of the site,
  // so the "show me in search" switch stays off until at least one is added.
  const steps = h("ul", { class: "todo" }, h("li", { class: "mu" }, t("Checking your profile…", "Vérification de ton profil…")));
  let ready = false;
  const listed = h("input", { type: "checkbox", checked: !!tp.is_listed, onchange: async e => {
    const want = e.target.checked;
    if (want && !ready) { e.target.checked = false; toast(t("Finish the steps above first.", "Termine d’abord les étapes ci-dessus.")); return; }
    const { error } = await SB.from("tutor_profiles").update({ is_listed: want }).eq("user_id", ME.id);
    if (error) { e.target.checked = !want; toast(t("Couldn’t save: ", "Impossible d’enregistrer : ") + error.message); return; }
    tp.is_listed = want;
    toast(want ? t("You’ll appear in search once approved", "Tu apparaîtras dans la recherche une fois approuvé") : t("Hidden from search", "Masqué de la recherche"));
  } });
  SB.from("tutor_subjects").select("grade").eq("tutor_id", ME.id).then(({ data }) => {
    const graded = (data || []).filter(s => s.grade).length;
    const todo = [
      [!!tp.headline && !!tp.bio, t("A headline and a short bio", "Un titre et une courte bio")],
      [!!tp.hourly_rate_cents, t("Your hourly rate", "Ton tarif horaire")],
      [graded > 0, t("At least one course you passed, with your grade", "Au moins un cours réussi, avec ta note")]];
    ready = todo.every(x => x[0]);
    steps.replaceChildren(...todo.map(([done, text]) => h("li", { class: done ? "done" : "" }, (done ? "✓ " : "○ ") + text)),
      h("li", { class: tp.approved ? "done" : "" }, (tp.approved ? "✓ " : "○ ") + t(`Approved by ${BRAND}`, `Approuvé par ${BRAND}`) +
        (tp.approved ? "" : t(" (we check after you finish the steps above)", " (on vérifie quand tu as fini les étapes ci-dessus)"))));
    listed.disabled = !ready && !tp.is_listed; // can always switch it off
  });
  return [
    h("div", { class: "c" }, h("h3", {}, t("Find students", "Trouver des élèves")),
      h("p", { class: "mu" }, t("Browse requests from students who want help, with the best matches for your profile first.", "Parcours les demandes d’élèves qui veulent de l’aide, avec les meilleurs choix pour ton profil en premier.")),
      h("a", { class: "btn sm", href: "#/students" }, t("Find students", "Trouver des élèves"))),
    h("div", { class: "c" }, h("h3", {}, t("Get listed", "Apparaître dans la recherche")),
      h("p", { class: "mu", style: "margin:4px 0 0" }, t("Students find you by the courses you passed, so those come first.", "Les élèves te trouvent par les cours que tu as réussis, alors ça passe en premier.")),
      steps,
      h("a", { class: "btn sm g", href: "#/profile" }, t("Edit my profile", "Modifier mon profil")),
      h("label", { class: "row", style: "cursor:pointer;flex-wrap:nowrap;margin-top:12px" }, listed, t("Show my profile in search", "Montrer mon profil dans la recherche")),
      h("p", { class: "mu", style: "margin:8px 0 0" }, t("Students see you only when you are approved and this is on.", "Les élèves te voient seulement si tu es approuvé et que ceci est activé.")))];
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
    h("p", { class: "sub" }, t(`${BRAND} is being built in steps. Here is exactly what is real today.`, `${BRAND} se construit par étapes. Voici exactement ce qui est réel aujourd’hui.`)),
    h("div", { class: "g2" },
      h("div", { class: "c" },
        h("h3", { style: "color:var(--ok)" }, "✓ " + t(`Real (saved in ${BRAND}’s database)`, `Réel (enregistré dans la base de données de ${BRAND})`)),
        h("ul", { style: "padding-left:18px" },
          li("Accounts: sign up, email confirmation, log in", "Comptes : inscription, confirmation par courriel, connexion"),
          li("Student and tutor roles on one account, with a switch", "Rôles étudiant et tuteur sur un seul compte, avec une bascule"),
          li(`Tutor approval by ${BRAND} and the “show me in search” setting`, `Approbation des tuteurs par ${BRAND} et le réglage « me montrer dans la recherche »`),
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
          li(`Payments through ${BRAND}`, `Paiements par ${BRAND}`),
          li("Verified grades and profile photos for tutors", "Notes vérifiées et photos de profil pour les tuteurs"),
          li("Final privacy policy and terms, reviewed by a lawyer", "Politique de confidentialité et conditions finales, révisées par un avocat"))))));
}

ROUTES.status = status;
PAGE_TITLES.status = () => t("What’s real so far", "Ce qui est réel");
