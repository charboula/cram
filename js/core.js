/* Cram core: Supabase connection, language, small helpers, menu and page router.
   index.html loads this file first, then auth.js, pages.js, profile.js and tutors.js. */

/* ===== Supabase connection =====
   Only the PUBLIC key goes here (called "anon" or "publishable"). NEVER paste the "service_role" or "secret" key. */
const SUPABASE_URL = "https://flxakahbpaeagnxgtbzw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xJ_NtOmUYmgfqklmP0UH5Q_zvYgFbMu";
// PKCE = the email link comes back as ?code=... (not #tokens), so it never clashes with the #/ page links
const SB = window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true } })
  : null;
const FROM_EMAIL_LINK = new URLSearchParams(location.search).has("code");
const LINK_ERROR = /error/.test(location.search) || /^#error/.test(location.hash); // e.g. an expired confirmation link

/* ===== Language: t("English", "Français") picks the right one ===== */
let lang = "en";
try { lang = localStorage.getItem("cram_lang") || ((navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en"); } catch (_) {}
const t = (en, fr) => (lang === "fr" ? fr : en);

/* ===== Small helpers ===== */
const $ = s => document.querySelector(s);
const V = $("#v"); // the main area where each page is drawn

// h("div", {class: "c"}, "text", child...) builds a piece of the page.
// Text is always added as plain text, never as HTML, so nothing a user types can run as code on the page.
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (name === "class") el.className = value;
    else if (name.startsWith("on")) el[name] = value;
    else if (value !== false && value != null) el.setAttribute(name, value === true ? "" : value);
  }
  el.append(...kids.flat(9).filter(k => k != null && k !== false));
  return el;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("on"), 2600);
}

const money = n => "$" + n + t("/hr", "/h");

// modal(...content) opens a dialog box; modal.close() closes it
function modal(...kids) {
  const m = $("#modal");
  if (modal.close && !m.hidden) modal.close();
  const prev = document.activeElement;
  const box = h("div", { class: "c", role: "dialog", "aria-modal": "true", "aria-label": t("Dialog", "Boîte de dialogue"), tabindex: "-1" }, ...kids);
  m.replaceChildren(box);
  m.hidden = false;
  const onKey = e => {
    if (e.key === "Escape") modal.close();
    if (e.key === "Tab") { // keep keyboard focus inside the dialog
      const f = [...box.querySelectorAll("button,textarea,input,select,a[href]")].filter(x => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  modal.close = () => { m.hidden = true; document.removeEventListener("keydown", onKey); prev && prev.focus && prev.focus(); };
  document.addEventListener("keydown", onKey);
  m.onclick = e => { if (e.target === m) modal.close(); };
  (box.querySelector("textarea,input,button") || box).focus();
}

/* ===== The signed-in person =====
   ME is null when logged out. When logged in (filled by loadUser in auth.js):
   { id, email, name, roles: {student, tutor}, mode: "student" or "tutor", kind: "self" or "parent",
     birthDate, tutor: {approved, is_listed, headline, bio, hourly_rate_cents}, dbReady } */
let ME = null;
let AUTH_READY = !SB; // becomes true once we know whether someone is logged in

/* ===== Router: "#/dashboard" shows ROUTES.dashboard, "#/tutor/t1" calls ROUTES.tutor("t1") ===== */
const ROUTES = {};       // each page file adds its pages here
const PAGE_TITLES = {};  // browser tab titles, same keys
const NEED_LOGIN = new Set(["dashboard"]);
let cur = location.hash || "#/";

// pushState adds a history entry so the browser Back button works
const go = url => { if (url === cur) return route(true); cur = url; try { history.pushState(null, "", url); } catch (_) {} route(true); };

// The menu changes with who is looking: visitor, student mode or tutor mode
function navItems() {
  if (!ME) return [["", t("Home", "Accueil")], ["find", t("Find tutors", "Trouver un tuteur")]];
  const mine = ["profile", t("My profile", "Mon profil")];
  if (ME.mode === "tutor") return [["dashboard", t("Dashboard", "Tableau de bord")], ["find", t("Tutors", "Tuteurs")], mine];
  return [["dashboard", t("Dashboard", "Tableau de bord")], ["find", t("Find tutors", "Trouver un tuteur")], mine];
}

function renderChrome() {
  const r = cur.split("/")[1] || "";
  $("#nav").replaceChildren(...navItems().map(([key, label]) =>
    h("a", { href: "#/" + key, class: r === key ? "on" : "", "aria-current": r === key ? "page" : null }, label)));
  $("#foot").replaceChildren(
    t("© Cram · An independent student project, not affiliated with any school. ", "© Cram · Un projet étudiant indépendant, non affilié à une école. "),
    h("a", { href: "#/status" }, t("What’s real so far", "Ce qui est réel pour l’instant")));
  $("#skip").textContent = t("Skip to main content", "Passer au contenu principal");
  acct();
}

function route(focus) {
  const [, r = "", arg] = cur.split("/");
  if (!$("#modal").hidden) modal.close();
  renderChrome();
  document.title = (PAGE_TITLES[r] ? PAGE_TITLES[r]() : "Cram") + " · Cram";
  if (NEED_LOGIN.has(r) && !AUTH_READY) V.replaceChildren(h("section", {}, h("p", { class: "mu" }, t("Loading…", "Chargement…"))));
  else if (NEED_LOGIN.has(r) && !ME) needLogin();
  else (ROUTES[r] || nf)(arg);
  V.style.animation = "none"; V.offsetHeight; V.style.animation = ""; // replay the fade-in
  window.scrollTo(0, 0);
  if (focus) V.focus({ preventScroll: true });
  // fade-in on scroll for elements marked .rv
  route.io && route.io.disconnect();
  const io = route.io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("in", e.isIntersecting)), { threshold: 0.12 });
  V.querySelectorAll(".rv").forEach(x => io.observe(x));
}

// After logging in or out: redraw the menu, and the page if it depends on who is logged in
function refreshForUser() {
  const r = cur.split("/")[1] || "";
  if (NEED_LOGIN.has(r)) route(); else renderChrome();
}

function needLogin() {
  V.replaceChildren(h("section", {}, h("div", { class: "c", style: "text-align:center;padding:32px 20px" },
    h("h2", {}, t("Please log in", "Connecte-toi")),
    h("p", { class: "mu" }, t("You need an account to see this page.", "Tu as besoin d’un compte pour voir cette page.")),
    h("div", { class: "row", style: "justify-content:center" },
      h("button", { class: "btn", onclick: () => authModal("login") }, t("Log in", "Connexion")),
      h("button", { class: "btn g", onclick: () => authModal("signup") }, t("Sign up", "S’inscrire"))))));
}

const nf = () => V.replaceChildren(h("section", {}, h("h2", {}, t("Page not found", "Page introuvable")), h("a", { class: "btn", href: "#/" }, t("Go home", "Accueil"))));

/* ===== Start-up (called at the bottom of index.html once every file is loaded) ===== */
function start() {
  if (LINK_ERROR) {
    cur = "#/";
    try { history.replaceState(null, "", location.pathname + "#/"); } catch (_) {}
    setTimeout(() => toast(t("That email link has expired or was already used. Try logging in, or sign up again.", "Ce lien a expiré ou a déjà été utilisé. Essaie de te connecter ou inscris-toi à nouveau.")), 300);
  }
  const langBtn = $("#lang");
  const showLang = () => { document.documentElement.lang = lang; langBtn.dataset.l = lang; langBtn.setAttribute("aria-checked", String(lang === "fr")); };
  langBtn.onclick = () => { lang = lang === "fr" ? "en" : "fr"; try { localStorage.setItem("cram_lang", lang); } catch (_) {} showLang(); route(); };
  showLang();
  const sync = () => { const u = location.hash || "#/"; if (u !== cur) { cur = u; route(true); } };
  addEventListener("hashchange", sync);
  addEventListener("popstate", sync);
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    go(a.getAttribute("href"));
  });
  addEventListener("scroll", () => { // gentle fade of the home hero while scrolling
    const el = document.getElementById("hero");
    if (el) el.style.setProperty("--p", Math.min(1, Math.max(0, scrollY / (el.offsetHeight * 0.8))));
  }, { passive: true });
  route();
}
