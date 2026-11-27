/* Cram core: Supabase connection, language, small helpers, menu and page router.
   index.html loads this file first, then auth.js, pages.js, profile.js, tutors.js and requests.js. */

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

/* ===== Brand name =====
   The site's name lives here, and every page reads it. To rename the site, change this one line.
   ("Cram" is a working name.) Also update the <title> line in index.html, which shows for a split second while loading. */
const BRAND = "Cram";

/* ===== Bot protection (Cloudflare Turnstile) =====
   Shows a small "I'm human" check on sign-up, log-in and password reset, so bots can't mass-create accounts.
   The SITE key below is public, like the Supabase public key: it's fine in the page code.
   The SECRET key must NEVER go here or anywhere in GitHub: paste it only in Supabase (Authentication > Attack Protection).
   Empty "" = the check is switched off and the site works as before. See the pull request for the setup steps.
   Order matters: 1) paste the site key here and publish, 2) THEN switch CAPTCHA on in Supabase. */
const TURNSTILE_SITE_KEY = "";

// Draws the check inside `box`. Returns { token(), reset() }. With no site key, token() is always "" and nothing is shown.
function humanCheck(box) {
  const st = { token: "", id: null };
  const api = { token: () => st.token, reset: () => { st.token = ""; if (st.id != null && window.turnstile) window.turnstile.reset(st.id); } };
  if (!TURNSTILE_SITE_KEY) return api;
  box.classList.add("hcheck");
  const draw = () => {
    if (!box.isConnected) return; // the dialog was closed before the check loaded
    st.id = window.turnstile.render(box, { sitekey: TURNSTILE_SITE_KEY, language: lang, size: "flexible",
      callback: tok => { st.token = tok; }, "expired-callback": () => { st.token = ""; }, "error-callback": () => { st.token = ""; } });
  };
  if (window.turnstile) setTimeout(draw, 0);
  else {
    humanCheck.waiting = (humanCheck.waiting || []).concat(draw);
    if (!document.getElementById("cf-turnstile")) { // load Cloudflare's script only the first time it's needed
      window.onTurnstileLoad = () => { const w = humanCheck.waiting; humanCheck.waiting = []; w.forEach(f => f()); };
      document.head.append(h("script", { id: "cf-turnstile", src: "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit", async: true, defer: true }));
    }
  }
  return api;
}
// Error shown when someone presses the button before the check is done
const humanCheckMissing = () => t("Please complete the “I’m human” check first.", "Complète d’abord la vérification « Je suis humain ».");

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
  const msgs = ["messages", t("Messages", "Messages") + (typeof UNREAD !== "undefined" && UNREAD ? " (" + UNREAD + ")" : "")];
  if (ME.mode === "tutor") return [["dashboard", t("Dashboard", "Tableau de bord")], ["students", t("Find students", "Trouver des élèves")], msgs, mine];
  return [["dashboard", t("Dashboard", "Tableau de bord")], ["find", t("Find tutors", "Trouver un tuteur")], ["requests", t("My requests", "Mes demandes")], msgs, mine];
}

function renderChrome() {
  const r = cur.split("/")[1] || "";
  $("#nav").replaceChildren(...navItems().map(([key, label]) =>
    h("a", { href: "#/" + key, class: r === key ? "on" : "", "aria-current": r === key ? "page" : null }, label)));
  $("#foot").replaceChildren(
    t("© " + BRAND + " · An independent student project from Montreal, not affiliated with any school. ", "© " + BRAND + " · Un projet étudiant indépendant de Montréal, non affilié à une école. "),
    h("a", { href: "#/status" }, t("What’s real so far", "Ce qui est réel pour l’instant")), " · ",
    h("a", { href: "#/privacy" }, t("Privacy", "Confidentialité")), " · ",
    h("a", { href: "#/terms" }, t("Terms", "Conditions")));
  $("#logo").textContent = BRAND;
  $("#skip").textContent = t("Skip to main content", "Passer au contenu principal");
  acct();
}

// "Loading…" placeholder. If a page is still showing it after 15 seconds, route() replaces it with a clear message.
const loadingView = text => h("section", { class: "loading" }, h("p", { class: "mu" }, text || t("Loading…", "Chargement…")));
function showProblem() {
  V.replaceChildren(h("section", {}, h("div", { class: "c" },
    h("h3", {}, t("This page didn’t load", "Cette page ne s’est pas chargée")),
    h("p", { class: "mu" }, t(`Check your internet connection and refresh. If it keeps happening, ${BRAND}’s database may be missing its latest update.`, `Vérifie ta connexion Internet et actualise. Si ça continue, la base de données de ${BRAND} n’a peut-être pas sa dernière mise à jour.`)),
    h("button", { class: "btn sm", onclick: () => location.reload() }, t("Refresh", "Actualiser")))));
}
let routeToken = 0;

function route(focus) {
  const [, r = "", arg] = cur.split("/");
  const token = ++routeToken;
  if (!$("#modal").hidden) modal.close();
  renderChrome();
  document.title = (PAGE_TITLES[r] ? PAGE_TITLES[r]() : BRAND) + " · " + BRAND;
  const failed = e => { console.error(e); if (token === routeToken) showProblem(); };
  try {
    if (NEED_LOGIN.has(r) && !AUTH_READY) V.replaceChildren(loadingView());
    else if (NEED_LOGIN.has(r) && !ME) needLogin();
    else { const p = (ROUTES[r] || nf)(arg); if (p && p.catch) p.catch(failed); }
  } catch (e) { failed(e); }
  setTimeout(() => { if (token === routeToken && V.querySelector(".loading")) showProblem(); }, 15000);
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
  if (NEED_LOGIN.has(r) || r === "tutor") route(); else renderChrome(); // the tutor page shows Contact and Report only when logged in
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

/* ===== Intro: the name gets "highlighted" for about a second, once per visit =====
   It sits on top of the page while the page loads underneath, so it never slows anything down.
   Click or press any key to skip. Skipped for people who turned off animations on their device. */
function intro() {
  try { if (sessionStorage.getItem("intro_seen")) return; sessionStorage.setItem("intro_seen", "1"); } catch (_) { return; }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = h("div", { class: "intro", "aria-hidden": "true" },
    h("div", { class: "intro-word" }, BRAND),
    h("div", { class: "intro-line" }, t("Help from someone who already passed your course", "De l’aide de quelqu’un qui a déjà réussi ton cours")));
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 300); removeEventListener("keydown", close); };
  el.onclick = close;
  addEventListener("keydown", close);
  document.body.append(el);
  setTimeout(close, 1200);
}

/* ===== Start-up (called at the bottom of index.html once every file is loaded) ===== */
function start() {
  intro();
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
  route();
  // Safety net: if we still don't know who is logged in after 8 seconds, stop waiting and show the page anyway
  setTimeout(() => { if (!AUTH_READY) { AUTH_READY = true; refreshForUser(); } }, 8000);
}

/* ===== Date picker: Day / Month / Year dropdowns (clearer than the browser's own date box, and the same on every phone) =====
   datePicker("Date of birth") returns an element; el.getValue() gives "2005-03-14", or "" if it isn't complete and real.
   el.partly() is true when only some of the three are chosen. */
function datePicker(label, opts = {}) {
  const now = new Date().getFullYear();
  const from = opts.fromYear || now - 100, to = opts.toYear || now;
  const monthName = m => new Date(2000, m, 1).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { month: "long" });
  const pick = (name, first, items) => h("select", { "aria-label": label + " : " + name }, h("option", { value: "" }, first), ...items);
  const day = pick(t("day", "jour"), t("Day", "Jour"), Array.from({ length: 31 }, (_, i) => h("option", { value: i + 1 }, String(i + 1))));
  const month = pick(t("month", "mois"), t("Month", "Mois"), Array.from({ length: 12 }, (_, i) => h("option", { value: i + 1 }, monthName(i))));
  const year = pick(t("year", "année"), t("Year", "Année"), Array.from({ length: to - from + 1 }, (_, i) => h("option", { value: to - i }, String(to - i))));
  const el = h("div", { class: "datepick", role: "group", "aria-label": label }, ...(lang === "fr" ? [day, month, year] : [month, day, year]));
  const pad = n => String(n).padStart(2, "0");
  el.getValue = () => {
    if (!day.value || !month.value || !year.value) return "";
    const d = new Date(Number(year.value), Number(month.value) - 1, Number(day.value));
    if (d.getMonth() !== Number(month.value) - 1) return ""; // e.g. February 30 doesn't exist
    return year.value + "-" + pad(month.value) + "-" + pad(day.value);
  };
  el.partly = () => [day, month, year].some(x => x.value) && !el.getValue();
  return el;
}

// Rejects if something takes longer than ms (so a button never spins forever)
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);
