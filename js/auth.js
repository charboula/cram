/* Cram accounts: sign up, log in, log out, loading the signed-in person, and switching between student and tutor. */

// Age in whole years on today's date, from "YYYY-MM-DD"
function ageFrom(dateStr) {
  const b = new Date(dateStr + "T12:00"), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

// Safety rules (the database checks them too). Returns an error message, or "" if fine.
function ageProblem(dateStr, joinAs) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return t("Please enter your date of birth.", "Entre ta date de naissance.");
  const a = ageFrom(dateStr);
  if (a < 0 || a > 120) return t("Please enter a real date of birth.", "Entre une vraie date de naissance.");
  if (a < 14) return t(`${BRAND} accounts are for people 14 and older. A parent or guardian can create an account for you.`, `Les comptes ${BRAND} sont pour les 14 ans et plus. Un parent ou tuteur légal peut créer un compte pour toi.`);
  if (joinAs === "tutor" && a < 18) return t("Tutors must be 18 or older. You can join as a student.", "Les tuteurs doivent avoir 18 ans ou plus. Tu peux t’inscrire comme élève.");
  if (joinAs === "parent" && a < 18) return t("Parent and guardian accounts are for adults (18+).", "Les comptes parent ou tuteur légal sont pour les adultes (18 ans et plus).");
  return "";
}

/* ===== Header: account area ===== */
function acct() {
  const a = $("#acct");
  a.replaceChildren();
  if (!AUTH_READY) return;
  if (ME) {
    const both = ME.roles.student && ME.roles.tutor;
    a.append(...[
      h("span", { class: "d-only", style: "font-weight:600;font-size:14px" }, ME.name),
      both ? h("button", { class: "btn g sm d-only", onclick: () => switchMode(ME.mode === "tutor" ? "student" : "tutor") },
        ME.mode === "tutor" ? t("Switch to student", "Passer en élève") : t("Switch to tutor", "Passer en tuteur")) : null,
      h("button", { class: "btn g sm", onclick: logOut }, t("Log out", "Se déconnecter"))].filter(Boolean));
  } else {
    a.append(
      h("button", { class: "btn g sm", onclick: () => authModal("login") }, t("Log in", "Connexion")),
      h("button", { class: "btn sm d-only", onclick: () => authModal("signup") }, t("Sign up", "S’inscrire")));
  }
}

async function logOut() {
  try { SB && await SB.auth.signOut(); } catch (_) {}
  ME = null;
  toast(t("Logged out", "Déconnecté"));
  go("#/");
}

/* ===== Sign-up / log-in dialog. joinAs: "student", "parent" or "tutor" ===== */
function authModal(mode, joinAs) {
  const f = { name: "", email: "", joinAs: joinAs || "student" };
  const er = h("p", { class: "err", role: "alert" });
  const field = (label, key, type, auto) => [
    h("label", { class: "f" }, label),
    h("input", { type, "aria-label": label, autocomplete: auto, oninput: e => { f[key] = e.target.value; } })];
  const tabs = h("div", { class: "seg" }, ...[["login", t("Log in", "Connexion")], ["signup", t("Sign up", "Inscription")]].map(([m, l]) =>
    h("button", { class: mode === m ? "on" : "", onclick: () => authModal(m, f.joinAs) }, l)));
  const roles = h("div", { class: "chips", style: "margin-bottom:12px" }, ...[
    ["student", t("I need a tutor", "Je cherche un tuteur")],
    ["parent", t("I’m a parent or guardian", "Je suis parent ou tuteur légal")],
    ["tutor", t("I want to tutor", "Je veux donner des cours")]].map(([r, l]) =>
    h("button", { class: "chip" + (f.joinAs === r ? " on" : ""), "aria-pressed": String(f.joinAs === r), onclick: e => {
      f.joinAs = r;
      [...roles.children].forEach(b => { b.classList.toggle("on", b === e.currentTarget); b.setAttribute("aria-pressed", String(b === e.currentTarget)); });
    } }, l)));
  const dob = datePicker(t("Your date of birth", "Ta date de naissance"));
  const pw = h("input", { type: "password", "aria-label": t("Password", "Mot de passe"), autocomplete: mode === "login" ? "current-password" : "new-password" });
  const agree = h("input", { type: "checkbox", id: "agree" }); // sign-up only: must be ticked to create an account
  const hcBox = h("div", {}), human = humanCheck(hcBox); // bot check (only shows once TURNSTILE_SITE_KEY is set in core.js)

  const submit = async () => {
    const email = f.email.trim().toLowerCase();
    if (mode === "signup" && f.name.trim().length < 2) { er.textContent = t("Please enter your name.", "Entre ton nom."); return; }
    if (mode === "signup") { const p = ageProblem(dob.getValue(), f.joinAs); if (p) { er.textContent = p; return; } }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { er.textContent = t("Please enter a valid email address.", "Entre une adresse courriel valide."); return; }
    if (pw.value.length < 8) { er.textContent = t("Password must be at least 8 characters.", "Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (mode === "signup" && !agree.checked) { er.textContent = t("Please tick the box to agree to the Terms and Privacy policy.", "Coche la case pour accepter les Conditions et la Politique de confidentialité."); return; }
    if (TURNSTILE_SITE_KEY && !human.token()) { er.textContent = humanCheckMissing(); return; }
    const captchaToken = human.token() || undefined;
    if (!SB) { er.textContent = t("Can’t reach the account service. Refresh the page and try again.", "Impossible de joindre le service de comptes. Actualise la page et réessaie."); return; }
    er.textContent = "";
    btn.disabled = true;
    try {
      if (mode === "signup") {
        // These details go to the database, which creates the profile (see handle_new_user in the SQL scripts)
        const data_ = {
          role: f.joinAs === "tutor" ? "tutor" : "student",
          account_kind: f.joinAs === "parent" ? "parent" : "self",
          display_name: f.name.trim(),
          birth_date: dob.getValue() };
        const { data, error } = await withTimeout(SB.auth.signUp({ email, password: pw.value, options: { data: data_, emailRedirectTo: location.origin + location.pathname, captchaToken } }), 20000);
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) { er.textContent = t("That email already has an account. Try logging in.", "Ce courriel a déjà un compte. Essaie de te connecter."); return; }
        if (!data.session) {
          modal(h("h3", { style: "margin-bottom:10px" }, t("Check your email", "Vérifie tes courriels")),
            h("p", {}, t("We sent a confirmation link to ", "On a envoyé un lien de confirmation à ") + email + t(". Click it to finish creating your account.", ". Clique dessus pour terminer ton inscription.")),
            h("button", { class: "btn", style: "width:100%", onclick: () => modal.close() }, "OK"));
          return;
        }
        await signedIn(data.session);
      } else {
        const { data, error } = await withTimeout(SB.auth.signInWithPassword({ email, password: pw.value, options: { captchaToken } }), 20000);
        if (error) throw error;
        await signedIn(data.session);
      }
    } catch (e) {
      const m = String((e && e.message) || "");
      er.textContent = m === "timeout" ? t("The connection is slow. Check your internet and try again.", "La connexion est lente. Vérifie ton Internet et réessaie.")
        : /invalid login/i.test(m) ? t("Wrong email or password.", "Courriel ou mot de passe incorrect.")
        : /not confirmed/i.test(m) ? t("Please confirm your email first. Check your inbox for the link.", "Confirme d’abord ton courriel. Cherche le lien dans ta boîte de réception.")
        : /rate limit|too many/i.test(m) ? t("Too many tries. Please wait a minute and try again.", "Trop d’essais. Attends une minute et réessaie.")
        : /captcha/i.test(m) ? t("The “I’m human” check failed or expired. Please do it again.", "La vérification « Je suis humain » a échoué ou expiré. Refais-la.")
        : /database error/i.test(m) ? t("We couldn’t create this account. Check your date of birth and try again.", "Impossible de créer ce compte. Vérifie ta date de naissance et réessaie.")
        : t("Something went wrong: ", "Une erreur est survenue : ") + m;
    } finally { btn.disabled = false; human.reset(); } // each check works only once, so get a fresh one for the next try
  };
  const btn = h("button", { class: "btn", style: "width:100%", onclick: submit }, mode === "signup" ? t("Create account", "Créer le compte") : t("Log in", "Se connecter"));
  modal(h("h3", { style: "margin-bottom:10px" }, `${BRAND}`), tabs,
    mode === "signup" ? [
      h("label", { class: "f" }, t("I’m joining because", "Je m’inscris parce que")), roles,
      ...field(t("Your name", "Ton nom"), "name", "text", "name"),
      h("label", { class: "f" }, t("Your date of birth", "Ta date de naissance")), dob,
      h("p", { class: "mu", style: "font-size:13px;margin:4px 0 8px" }, t("Kept private. Used only for our safety rules for minors.", "Gardée privée. Sert seulement à nos règles de sécurité pour les mineurs."))] : null,
    ...field(t("Email", "Courriel"), "email", "email", "email"),
    h("label", { class: "f" }, t("Password", "Mot de passe")), pw, er,
    mode === "signup" ? [
      h("label", { class: "agree", for: "agree" }, agree, h("span", {}, t("I agree to the ", "J’accepte les "),
        h("a", { href: "#/terms", target: "_blank", rel: "noopener" }, t("Terms of use", "Conditions d’utilisation")), t(" and the ", " et la "),
        h("a", { href: "#/privacy", target: "_blank", rel: "noopener" }, t("Privacy policy", "Politique de confidentialité")), ".")),
      h("p", { class: "mu", style: "font-size:13px;margin:4px 0 8px" }, t("We’ll email you a link to confirm your account.", "On t’enverra un lien par courriel pour confirmer ton compte."))] : null,
    hcBox, btn,
    mode === "login" ? h("p", { style: "text-align:center;margin:12px 0 0;font-size:14px" },
      h("a", { href: "#", onclick: e => { e.preventDefault(); forgotPassword(f.email); } }, t("Forgot your password?", "Mot de passe oublié?"))) : null);
}

/* ===== Loading the signed-in person from the database ===== */
async function loadUser(session) {
  if (!session) { ME = null; AUTH_READY = true; refreshForUser(); return; }
  const u = session.user, meta = u.user_metadata || {};
  const me = { id: u.id, email: u.email, name: meta.display_name || u.email, roles: { student: false, tutor: false }, mode: "student",
    kind: "self", birthDate: null, tutor: null, dbReady: true };
  const one = q => q.maybeSingle().then(r => r, e => ({ data: null, error: e }));
  const [p, s, tu, d] = await Promise.all([
    one(SB.from("profiles").select("role,display_name").eq("id", u.id)),
    one(SB.from("student_profiles").select("user_id").eq("user_id", u.id)),
    one(SB.from("tutor_profiles").select("approved,is_listed,headline,bio,hourly_rate_cents").eq("user_id", u.id)),
    one(SB.from("account_details").select("birth_date,account_kind").eq("user_id", u.id))]);
  if (p.data) me.name = p.data.display_name || me.name;
  me.roles.student = !!s.data;
  me.roles.tutor = !!tu.data;
  me.tutor = tu.data;
  if (d.error) { me.dbReady = false; me.dbError = d.error.message || String(d.error); console.warn("account_details:", d.error); } // the database update for this version hasn't been run yet
  else if (d.data) { me.birthDate = d.data.birth_date; me.kind = d.data.account_kind; }
  if (!me.roles.student && !me.roles.tutor) me.roles[p.data && p.data.role === "tutor" ? "tutor" : "student"] = true;
  let saved = "";
  try { saved = localStorage.getItem("cram_mode") || ""; } catch (_) {}
  me.mode = me.roles[saved] ? saved : (p.data && me.roles[p.data.role] ? p.data.role : (me.roles.tutor ? "tutor" : "student"));
  ME = me;
  AUTH_READY = true;
  refreshForUser();
  refreshUnread();
}

async function signedIn(session) {
  if ($("#modal") && !$("#modal").hidden) modal.close();
  await loadUser(session);
  if (RECOVERY) return go("#/password");
  toast(t("Welcome, ", "Bienvenue, ") + ME.name);
  go("#/dashboard");
}

/* ===== Password reset =====
   1. "Forgot your password?" sends an email link (Supabase).
   2. The link brings you back here already logged in; Supabase tells us it's a reset (PASSWORD_RECOVERY),
      so we open the "Choose a new password" page. Open the link in the same browser you asked from. */
let RECOVERY = false;
function forgotPassword(prefill) {
  const inp = h("input", { type: "email", value: prefill || "", autocomplete: "email", "aria-label": t("Email", "Courriel") });
  const er = h("p", { class: "err", role: "alert" });
  const hcBox = h("div", {}), human = humanCheck(hcBox);
  const btn = h("button", { class: "btn", style: "width:100%;margin-top:10px", onclick: async () => {
    const email = inp.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { er.textContent = t("Please enter a valid email address.", "Entre une adresse courriel valide."); return; }
    if (TURNSTILE_SITE_KEY && !human.token()) { er.textContent = humanCheckMissing(); return; }
    btn.disabled = true;
    try {
      const { error } = await withTimeout(SB.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname, captchaToken: human.token() || undefined }), 20000);
      if (error && /rate limit|too many|seconds/i.test(error.message)) { er.textContent = t("Please wait a minute before asking for another link.", "Attends une minute avant de demander un autre lien."); return; }
      if (error && /captcha/i.test(error.message)) { er.textContent = t("The “I’m human” check failed or expired. Please do it again.", "La vérification « Je suis humain » a échoué ou expiré. Refais-la."); return; }
      // Same message whether or not the email has an account, so nobody can use this to check who is on Cram
      modal(h("h3", { style: "margin-bottom:10px" }, t("Check your email", "Vérifie tes courriels")),
        h("p", {}, t("If an account uses ", "Si un compte utilise ") + email + t(", we sent it a link to choose a new password.", ", on lui a envoyé un lien pour choisir un nouveau mot de passe.")),
        h("p", { class: "mu", style: "font-size:13px" }, t("Open the link on this device, in this same browser. It works once and expires after a while.", "Ouvre le lien sur cet appareil, dans ce même navigateur. Il fonctionne une seule fois et expire après un moment.")),
        h("button", { class: "btn", style: "width:100%", onclick: () => modal.close() }, "OK"));
    } catch (e) {
      er.textContent = e.message === "timeout" ? t("The connection is slow. Check your internet and try again.", "La connexion est lente. Vérifie ton Internet et réessaie.") : e.message;
    } finally { btn.disabled = false; human.reset(); }
  } }, t("Send me a link", "M’envoyer un lien"));
  modal(h("h3", { style: "margin-bottom:8px" }, t("Reset your password", "Réinitialiser ton mot de passe")),
    h("p", { class: "mu" }, t("Enter your account’s email. We’ll send you a link to choose a new password.", "Entre le courriel de ton compte. On t’enverra un lien pour choisir un nouveau mot de passe.")),
    h("label", { class: "f" }, t("Email", "Courriel")), inp, er, hcBox, btn,
    h("p", { style: "text-align:center;margin:12px 0 0;font-size:14px" }, h("a", { href: "#", onclick: e => { e.preventDefault(); authModal("login"); } }, "‹ " + t("Back to log in", "Retour à la connexion"))));
}

// "Choose a new password" (after a reset link, or any time from the dashboard)
function passwordPage() {
  const a = h("input", { type: "password", autocomplete: "new-password", "aria-label": t("New password", "Nouveau mot de passe") });
  const b = h("input", { type: "password", autocomplete: "new-password", "aria-label": t("Type it again", "Retape-le") });
  const er = h("p", { class: "err", role: "alert" });
  const btn = h("button", { class: "btn", style: "margin-top:12px", onclick: async () => {
    if (a.value.length < 8) { er.textContent = t("Password must be at least 8 characters.", "Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (a.value !== b.value) { er.textContent = t("The two passwords don’t match.", "Les deux mots de passe ne correspondent pas."); return; }
    btn.disabled = true;
    try {
      const { error } = await withTimeout(SB.auth.updateUser({ password: a.value }), 20000);
      if (error) { er.textContent = /different|same/i.test(error.message) ? t("Choose a password different from your old one.", "Choisis un mot de passe différent de l’ancien.") : error.message; return; }
      RECOVERY = false;
      toast(t("Your new password is saved", "Ton nouveau mot de passe est enregistré"));
      go("#/dashboard");
    } catch (e) {
      er.textContent = e.message === "timeout" ? t("The connection is slow. Check your internet and try again.", "La connexion est lente. Vérifie ton Internet et réessaie.") : e.message;
    } finally { btn.disabled = false; }
  } }, t("Save new password", "Enregistrer le mot de passe"));
  V.replaceChildren(h("section", {}, h("div", { class: "c", style: "max-width:460px" },
    h("h2", { style: "margin-bottom:6px" }, t("Choose a new password", "Choisis un nouveau mot de passe")),
    h("p", { class: "mu" }, t("At least 8 characters. Use one you don’t use anywhere else.", "Au moins 8 caractères. Utilise-en un que tu n’utilises nulle part ailleurs.")),
    h("label", { class: "f" }, t("New password", "Nouveau mot de passe")), a,
    h("label", { class: "f" }, t("Type it again", "Retape-le")), b, er, btn)));
  a.focus();
}
ROUTES.password = passwordPage;
PAGE_TITLES.password = () => t("New password", "Nouveau mot de passe");
NEED_LOGIN.add("password");

function switchMode(mode) {
  if (!ME || !ME.roles[mode]) return;
  ME.mode = mode;
  try { localStorage.setItem("cram_mode", mode); } catch (_) {}
  toast(mode === "tutor" ? t("You’re now in tutor mode", "Tu es maintenant en mode tuteur") : t("You’re now in student mode", "Tu es maintenant en mode élève"));
  go("#/dashboard");
}

// Adds the other role to this account (the database checks the tutor age rule)
async function addRole(role) {
  const { error } = await SB.rpc("add_role", { r: role });
  if (error) { toast(/18/.test(error.message) ? t("Tutors must be 18 or older.", "Les tuteurs doivent avoir 18 ans ou plus.") : t("Couldn’t add the role: ", "Impossible d’ajouter le rôle : ") + error.message); return; }
  const { data } = await SB.auth.getSession();
  await loadUser(data.session);
  switchMode(role);
}

if (SB) SB.auth.onAuthStateChange((ev, session) => setTimeout(() => { // setTimeout: Supabase advises not to call it again directly inside this callback
  if (ev === "PASSWORD_RECOVERY") { // came back from a "reset your password" email
    RECOVERY = true;
    if (ME && ME.id === session.user.id) go("#/password");
  } else if (ev === "INITIAL_SESSION" && FROM_EMAIL_LINK) { // came back from the confirmation email
    try { history.replaceState(null, "", location.pathname + (location.hash || "#/")); } catch (_) {}
    if (session) signedIn(session);
    else { loadUser(null); toast(t("Your email is confirmed. You can log in now.", "Ton courriel est confirmé. Tu peux te connecter maintenant.")); authModal("login"); }
  } else if (ev === "SIGNED_IN" && ME && session && session.user.id === ME.id) {
    // same person, nothing changed (this event also fires when you come back to the tab)
  } else if (ev === "INITIAL_SESSION" || ev === "SIGNED_OUT" || (ev === "SIGNED_IN" && !FROM_EMAIL_LINK)) loadUser(session);
}, 0));
