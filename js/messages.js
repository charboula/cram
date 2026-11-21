/* Cram messages: conversation list (#/messages), one conversation (#/messages/12), the "Contact" button
   on tutor profiles, and the unread count in the menu. Only the two people in a conversation can read it
   (enforced by the database, supabase-update-6.sql). New messages are checked every 8 seconds while a conversation is open. */

const CONV_FIELDS = "id,student_id,tutor_id,last_message_at,last_sender_id,student_last_read,tutor_last_read,request_id," +
  "student:profiles!conversations_student_id_fkey(display_name),tutor:profiles!conversations_tutor_id_fkey(display_name)";
let UNREAD = 0;

const otherName = c => (c.student_id === ME.id ? (c.tutor && c.tutor.display_name) : (c.student && c.student.display_name)) || t("Someone", "Quelqu’un");
const myRoleIn = c => (c.student_id === ME.id ? "student" : "tutor");
function isUnread(c) {
  if (!c.last_message_at || c.last_sender_id === ME.id) return false;
  const read = c.student_id === ME.id ? c.student_last_read : c.tutor_last_read;
  return !read || read < c.last_message_at;
}
const timeText = ts => new Date(ts).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Unread conversations, shown next to "Messages" in the menu
async function refreshUnread() {
  if (!ME || !SB) return;
  const { data, error } = await SB.from("conversations").select("student_id,tutor_id,last_message_at,last_sender_id,student_last_read,tutor_last_read");
  if (error) return;
  const n = (data || []).filter(isUnread).length;
  if (n !== UNREAD) { UNREAD = n; renderChrome(); }
}
setInterval(refreshUnread, 60000);

// "Contact" on a tutor's profile (students only; the database checks this too)
async function contactTutor(tutorId) {
  if (!ME) return authModal("login");
  if (!ME.roles.student) return toast(t("Add a student role from your dashboard to contact tutors.", "Ajoute un rôle élève depuis ton tableau de bord pour contacter des tuteurs."));
  const { data, error } = await SB.rpc("start_conversation", { tutor: tutorId });
  if (error) return toast(t("Couldn’t start the conversation: ", "Impossible de démarrer la conversation : ") + error.message);
  if (ME.mode !== "student") { ME.mode = "student"; try { localStorage.setItem("cram_mode", "student"); } catch (_) {} }
  go("#/messages/" + data);
}

async function messagesPage(id) {
  if (id) return conversationPage(Number(id));
  V.replaceChildren(loadingView());
  const { data, error } = await SB.from("conversations").select(CONV_FIELDS).order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) return V.replaceChildren(h("section", {}, h("div", { class: "c mu" }, t("Messages aren’t switched on yet. Please try again later.", "La messagerie n’est pas encore activée. Réessaie plus tard."))));
  const list = data || [];
  UNREAD = list.filter(isUnread).length;
  renderChrome();
  V.replaceChildren(h("section", {},
    h("h2", {}, t("Messages", "Messages")),
    h("p", { class: "sub" }, t("Conversations start when a student contacts a tutor, or connects with a tutor’s offer.", "Les conversations commencent quand un élève contacte un tuteur ou accepte l’offre d’un tuteur.")),
    list.length
      ? h("div", { class: "c", style: "padding:0" }, ...list.map(c => h("a", { href: "#/messages/" + c.id, class: "conv" + (isUnread(c) ? " unread" : "") },
          h("div", {}, h("b", {}, otherName(c)), h("span", { class: "mu" }, " · " + (myRoleIn(c) === "student" ? t("your tutor", "ton tuteur") : t("your student", "ton élève")))),
          h("span", { class: "mu" }, c.last_message_at ? timeText(c.last_message_at) : t("No messages yet", "Aucun message")))))
      : h("div", { class: "c mu" }, ME.roles.student ? t("No conversations yet. Open a tutor’s profile and press Contact.", "Aucune conversation. Ouvre le profil d’un tuteur et appuie sur Contacter.") : t("No conversations yet. Students contact you, or connect after you offer to help on Find students.", "Aucune conversation. Les élèves te contactent, ou acceptent ton offre dans Trouver des élèves."))));
}

async function conversationPage(id) {
  V.replaceChildren(loadingView());
  const { data: c, error } = await SB.from("conversations").select(CONV_FIELDS).eq("id", id).maybeSingle();
  if (error || !c) return nf();
  const box = h("div", { class: "thread" });
  const ta = h("textarea", { maxlength: 2000, placeholder: t("Write a message…", "Écris un message…"), "aria-label": t("Message", "Message"), style: "min-height:70px" });
  const er = h("p", { class: "err", role: "alert" });
  let lastId = 0;
  const load = async () => {
    const { data } = await SB.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", id).gt("id", lastId).order("id").limit(200);
    if (!data || !data.length) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    const first = !lastId;
    if (first) box.replaceChildren();
    data.forEach(m => box.append(h("div", { class: "msg" + (m.sender_id === ME.id ? " me" : "") }, h("div", { style: "white-space:pre-wrap" }, m.body), h("small", {}, timeText(m.created_at)))));
    lastId = data[data.length - 1].id;
    if (atBottom || first) box.scrollTop = box.scrollHeight;
    SB.rpc("mark_conversation_read", { cid: id }).then(refreshUnread);
  };
  const send = async () => {
    const body = ta.value.trim();
    if (!body) return;
    btn.disabled = true;
    const { error: e } = await SB.from("messages").insert({ conversation_id: id, body });
    btn.disabled = false;
    if (e) { er.textContent = /row-level security/i.test(e.message) ? t("Too many messages in the last hour. Please wait a bit.", "Trop de messages dans la dernière heure. Attends un peu.") : e.message; return; }
    er.textContent = ""; ta.value = "";
    await load();
    box.scrollTop = box.scrollHeight;
  };
  ta.onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); };
  const btn = h("button", { class: "btn", onclick: send }, t("Send", "Envoyer"));
  const otherLink = c.student_id === ME.id ? h("a", { href: "#/tutor/" + c.tutor_id }, otherName(c)) : h("b", {}, otherName(c));
  V.replaceChildren(h("section", {},
    h("a", { href: "#/messages", class: "bk" }, "‹ " + t("All messages", "Tous les messages")),
    h("h2", { style: "margin:10px 0 4px" }, otherLink),
    h("p", { class: "mu", style: "margin:0 0 12px;font-size:13px" }, t("Keep your conversation on Cram. Never share passwords or payment details. For in-person sessions, meet in a public place.", "Garde ta conversation sur Cram. Ne partage jamais de mot de passe ni d’informations de paiement. Pour les séances en personne, rencontre-toi dans un lieu public.")),
    sessionsPanel(c),
    h("div", { class: "c", style: "padding:0;overflow:hidden" }, box,
      h("div", { style: "padding:12px;border-top:1px solid var(--ln);display:grid;gap:8px" }, ta, er, h("div", { class: "row sp" }, h("span", { class: "mu", style: "font-size:13px" }, t("Ctrl+Enter to send", "Ctrl+Entrée pour envoyer")), btn)))));
  box.append(h("p", { class: "mu", style: "text-align:center" }, t("No messages yet. Say hello and what you need help with.", "Aucun message. Dis bonjour et ce sur quoi tu as besoin d’aide.")));
  await load();
  // Check for new messages every 8 seconds while this conversation is on screen
  const token = routeToken;
  const timer = setInterval(() => { if (token !== routeToken) clearInterval(timer); else load(); }, 8000);
}

ROUTES.messages = messagesPage;
PAGE_TITLES.messages = () => t("Messages", "Messages");
NEED_LOGIN.add("messages");
