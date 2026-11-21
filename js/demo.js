/* Cram DEMO pages: Find a tutor, tutor profile, booking, sessions and reviews.
   Everything in this file uses MADE-UP tutors and saves only in the visitor's own browser (localStorage).
   It is temporary: later phases replace it with real Supabase data, and then this file is deleted. */
const HS=[["Health Science","Sciences de la santé"],["201-NYA-05|Calculus I","202-NYA-05|General Chemistry"]],SS=[["Social Science","Sciences humaines"],["383-910-VA|Intro to Economics","360-300-VA|Research Methods"]];
const INST={mcgill:["McGill University",{sci:[["Science","Sciences"],["MATH 140|Calculus 1","CHEM 110|General Chemistry 1"]],cs:[["Computer Science","Informatique"],["COMP 202|Foundations of Programming","MATH 133|Linear Algebra"]]}],
 vanier:["Vanier College",{hs:HS,ss:SS}],udem:["Université de Montréal",{cs:[["Computer Science","Informatique"],["IFT 1015|Programmation 1","MAT 1978|Algèbre linéaire"]],sci:[["Science","Sciences"],["MAT 1400|Calcul 1","CHM 1101|Chimie générale"]]}],
 mont:["Cégep Montmorency",{hs:HS,ss:SS}]};
const TUT=[
 {id:"t1",n:"Maya C.",i:"mcgill",c:[["MATH 140","A"],["MATH 133","A-"]],r:22,d:{Mon:["18:00","19:00"],Wed:["17:00","18:00"]},m:["online","in-person"],v:"self"},
 {id:"t2",n:"Jordan S.",i:"mcgill",c:[["COMP 202","A-"]],r:25,d:{Tue:["16:00","17:00"],Thu:["18:00","19:00"]},m:["online"],v:"self"},
 {id:"t3",n:"Amira H.",i:"mcgill",c:[["CHEM 110","A"]],r:20,d:{Mon:["17:00"],Wed:["17:00","18:00"],Sat:["10:00","11:00"]},m:["online","in-person"],v:"self"},
 {id:"t4",n:"Daniel P.",i:"mcgill",c:[["MATH 140","B+"]],r:16,d:{Fri:["15:00","16:00"],Sun:["14:00"]},m:["in-person"],v:"pending"},
 {id:"t5",n:"Lucas T.",i:"vanier",c:[["201-NYA-05","A"],["202-NYA-05","A-"]],r:18,d:{Tue:["18:00","19:00"],Sat:["12:00","13:00"]},m:["online","in-person"],v:"self"},
 {id:"t6",n:"Sofia R.",i:"vanier",c:[["201-NYA-05","A-"]],r:15,d:{Mon:["19:00"],Thu:["19:00","20:00"]},m:["online"],v:"self"},
 {id:"t7",n:"Karim B.",i:"udem",c:[["IFT 1015","A"],["MAT 1978","B+"]],r:24,d:{Wed:["18:00","19:00"],Sun:["11:00","12:00"]},m:["online","in-person"],v:"self"},
 {id:"t8",n:"Léa G.",i:"mont",c:[["201-NYA-05","A"]],r:15,d:{Tue:["17:00","18:00"],Fri:["16:00"]},m:["online","in-person"],v:"self"}];
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
let S={bk:[],rev:[],msg:[],sel:{i:"",p:"",c:""},role:"student"};
try{Object.assign(S,JSON.parse(localStorage.getItem("cram_v2")||"{}"));delete S.user;delete S.acc;delete S.wl}catch(_){}
const save=()=>{try{localStorage.setItem("cram_v2",JSON.stringify(S))}catch(_){}};
const api={ // every call is async so a real backend drops in without touching the UI
 async tutor(id){return TUT.find(x=>x.id===id)},
 async reviews(id){return S.rev.filter(r=>r.t===id)},
 async book(b){S.bk.push(b);save();return b},
 async setStatus(id,s){S.bk.find(b=>b.id===id).s=s;save()},
 async review(r){S.rev.push(r);save()},
 async message(m){S.msg.push(m);save()}};
const stats=id=>{const rs=S.rev.filter(r=>r.t===id);return{n:rs.length,avg:rs.length?rs.reduce((a,r)=>a+r.s,0)/rs.length:0,done:S.bk.filter(b=>b.t===id&&b.s==="completed").length}};
const cname=code=>{for(const k in INST)for(const p of Object.values(INST[k][1]))for(const c of p[1]){const[a,b]=c.split("|");if(a===code)return b}return""};
const PH={};
const av=(x,sz=52)=>h("div",{class:"av",style:"width:"+sz+"px;height:"+sz+"px;font-size:"+Math.round(sz*.35)+"px;"+(PH[x.id]?"background:url("+PH[x.id]+") center/cover":"background:"+tone(x.n))},PH[x.id]?"":x.n.split(" ").map(w=>w[0]).join(""));
const tone=n=>["#7E1D3C","#2F4B8F","#1F7A6B","#7A4B1F","#5B3A8F"][[...n].reduce((a,c)=>a+c.charCodeAt(0),0)%5];
const vb=v=>v==="verified"?h("span",{class:"tag ok"},"✓ "+t("Verified by Cram","Vérifié par Cram")):v==="pending"?h("span",{class:"tag wa"},"… "+t("Review pending","Vérification en cours")):h("span",{class:"tag gr"},t("Self-reported, not verified","Déclaré, non vérifié"));
const stars=id=>{const s=stats(id);return s.n?h("span",{},"★ "+s.avg.toFixed(1)+" ("+s.n+")"):h("span",{class:"mu"},t("No reviews yet","Aucun avis"))};
function courseSearch(go){
  const box=h("div",{class:"sbox"}),inp=h("input",{type:"text",placeholder:t("Search a course, e.g. MATH 140","Cherche un cours, ex. MATH 140"),"aria-label":t("Search courses","Chercher un cours"),autocomplete:"off",role:"combobox","aria-expanded":"false","aria-autocomplete":"list","aria-controls":"cs-list"}),res=h("div",{class:"sres",id:"cs-list",role:"listbox",hidden:true});
  inp.oninput=()=>{const q=inp.value.trim().toLowerCase();res.replaceChildren();if(q.length<2){res.hidden=true;return}
    const hits=[];for(const k in INST)for(const[p,pv]of Object.entries(INST[k][1]))for(const c of pv[1]){const[code,nm]=c.split("|");if((code+" "+nm).toLowerCase().includes(q))hits.push({k,p,code,nm})}
    res.hidden=false;if(!hits.length){res.append(h("div",{style:"padding:14px 16px",class:"mu"},t("No course found. Try a code or a shorter word.","Aucun cours trouvé. Essaie un code ou un mot plus court.")));return}
    hits.slice(0,6).forEach(x=>res.append(h("button",{role:"option",onclick:()=>{S.sel={i:x.k,p:x.p,c:x.code};save();go()}},h("b",{},x.code+" · "+x.nm),h("br"),h("small",{},INST[x.k][0]))))};
  inp.onkeydown=e=>{if(e.key==="ArrowDown"){const b=res.querySelector("button");if(b){e.preventDefault();b.focus()}}else if(e.key==="Escape")res.hidden=true};
  res.onkeydown=e=>{const bs=[...res.querySelectorAll("button")],i=bs.indexOf(document.activeElement);if(e.key==="ArrowDown"){e.preventDefault();(bs[i+1]||bs[0]).focus()}else if(e.key==="ArrowUp"){e.preventDefault();(i>0?bs[i-1]:inp).focus()}else if(e.key==="Escape"){res.hidden=true;inp.focus()}};
  new MutationObserver(()=>inp.setAttribute("aria-expanded",String(!res.hidden))).observe(res,{attributes:true,attributeFilter:["hidden"]});
  box.append(inp,res);return box}
function find(){
  const s=S.sel,F=find.F||(find.F={price:40,day:"",rating:0});
  const opt=(v,l,cur)=>{const o=h("option",{value:v},l);if(v===cur)o.selected=true;return o};
  const iSel=h("select",{"aria-label":t("School","École"),onchange:e=>{S.sel={i:e.target.value,p:"",c:""};save();find()}},opt("",t("Choose a school","Choisis une école"),s.i),...Object.entries(INST).map(([k,v])=>opt(k,v[0],s.i)));
  const progs=s.i?Object.entries(INST[s.i][1]):[];
  const pSel=h("select",{"aria-label":t("Program","Programme"),disabled:!s.i,onchange:e=>{S.sel.p=e.target.value;S.sel.c="";save();find()}},opt("",t("Choose a program","Choisis un programme"),s.p),...progs.map(([k,v])=>opt(k,t(...v[0]),s.p)));
  const courses=s.i&&s.p?INST[s.i][1][s.p][1]:[];
  const cSel=h("select",{"aria-label":t("Course","Cours"),disabled:!s.p,onchange:e=>{S.sel.c=e.target.value;save();find()}},opt("",t("Choose a course","Choisis un cours"),s.c),...courses.map(c=>{const[a,b]=c.split("|");return opt(a,a+" · "+b,s.c)}));
  const price=h("input",{type:"range",min:10,max:40,value:F.price,"aria-label":t("Max price","Prix max"),oninput:e=>{F.price=+e.target.value;pl.textContent=money(F.price);draw()}}),pl=h("span",{class:"mu"},money(F.price));
  const day=h("select",{"aria-label":"Day",onchange:e=>{F.day=e.target.value;draw()}},opt("",t("Any day","N’importe quel jour"),F.day),...DAYS.map(d=>opt(d,d,F.day)));
  const rat=h("select",{"aria-label":"Rating",onchange:e=>{F.rating=+e.target.value;draw()}},...[[0,t("Any rating","Toute note")],[3,"★ 3+"],[4,"★ 4+"],[4.5,"★ 4.5+"]].map(([v,l])=>opt(String(v),l,String(F.rating))));
  const out=h("div",{class:"res",style:"margin-top:8px"});
  function draw(){out.replaceChildren();
    if(!s.c){out.append(h("div",{class:"c mu"},t("Choose your school, program and course (or use search) to see matching tutors.","Choisis ton école, ton programme et ton cours (ou utilise la recherche) pour voir les tuteurs.")));return}
    const ok=x=>x.r<=F.price&&(!F.day||x.d[F.day])&&(!F.rating||stats(x.id).avg>=F.rating);
    const has=x=>x.c.some(c=>c[0]===s.c),list=TUT.filter(x=>has(x)&&ok(x)).sort((a,b)=>(b.i===s.i)-(a.i===s.i)||stats(b.id).avg-stats(a.id).avg||a.r-b.r);
    const ex=list.filter(x=>x.i===s.i),ot=list.filter(x=>x.i!==s.i);
    out.append(h("h3",{style:"margin:18px 0 10px"},ex.length+" "+t("exact matches","correspondances exactes")+" · "+s.c));
    if(!ex.length)out.append(h("div",{class:"c mu"},t("No tutor at your school has this course with these filters. Try loosening a filter.","Aucun tuteur de ton école n’a ce cours avec ces filtres. Essaie d’assouplir un filtre.")));
    ex.forEach(x=>out.append(tcard(x,true)));
    if(ot.length){out.append(h("h3",{style:"margin:22px 0 10px"},t("Same course, other schools","Même cours, autres écoles")));ot.forEach(x=>out.append(tcard(x,false)))}
  }
  V.replaceChildren(h("section",{},h("h2",{},t("Find your tutor","Trouve ton tuteur")),h("p",{class:"sub"},t("Tutors who took the exact same course at your school come first.","Les tuteurs ayant suivi le même cours dans ton école passent en premier.")),h("p",{},h("span",{class:"tag wa"},t("Demo: these tutors are made up. Real tutor search is coming in a later update.","Démo : ces tuteurs sont fictifs. La vraie recherche arrive dans une prochaine mise à jour."))),
    courseSearch(find),h("div",{class:"sel",style:"margin-top:16px"},h("div",{},h("label",{class:"f"},t("School","École")),iSel),h("div",{},h("label",{class:"f"},t("Program","Programme")),pSel),h("div",{},h("label",{class:"f"},t("Course","Cours")),cSel)),
    h("div",{class:"fil"},h("div",{},h("label",{class:"f"},t("Max price","Prix max")+" · "),pl,price),h("div",{},h("label",{class:"f"},t("Available on","Disponible le")),day),h("div",{},h("label",{class:"f"},t("Minimum rating","Note minimale")),rat)),out));
  draw();
}
function tcard(x,exact){
  const s=stats(x.id),days=Object.keys(x.d).join(" · ");
  return h("div",{class:"c h tc"},h("div",{class:"row"},av(x),
    h("div",{style:"flex:1;min-width:180px"},h("h3",{style:"font-size:17px"},x.n+" ",h("span",{class:"tag gr"},"Demo")),h("div",{class:"mu"},INST[x.i][0])),h("div",{style:"text-align:right"},h("b",{style:"font-size:17px"},money(x.r)),h("div",{class:"mu"},stars(x.id)))),
    h("div",{class:"row"},exact?h("span",{class:"tag ok"},"✓ "+t("Same course, same school","Même cours, même école")):h("span",{class:"tag"},t("Different school","Autre école")),vb(x.v),h("span",{class:"mu"},s.done+" "+t("sessions completed","séances terminées")),h("span",{class:"mu"},"· "+days)),
    h("div",{class:"row"},h("a",{class:"btn sm",href:"#/book/"+x.id},t("Request session","Demander une séance")),h("a",{class:"btn sm g",href:"#/tutor/"+x.id},t("View profile","Voir le profil")),h("button",{class:"btn sm g",onclick:()=>contact(x)},t("Contact","Contacter"))));
}
function contact(x){
  const ta=h("textarea",{placeholder:t("Hi! I’m taking "+(S.sel.c||"this course")+". Are you free this week?","Salut! Je suis le cours "+(S.sel.c||"")+". Es-tu libre cette semaine?"),"aria-label":"Message"}),er=h("p",{class:"err",role:"alert"});
  modal(h("h3",{},t("Message ","Écrire à ")+x.n),h("p",{class:"mu"},t("Demo only: messages are saved on this device. Real delivery needs a backend.","Démo seulement : les messages restent sur cet appareil. L’envoi réel exige un serveur.")),ta,er,
   h("div",{class:"row",style:"margin-top:12px;justify-content:flex-end"},h("button",{class:"btn g",onclick:()=>modal.close()},t("Cancel","Annuler")),h("button",{class:"btn",onclick:async()=>{if(!ta.value.trim()){er.textContent=t("Write a message first.","Écris d’abord un message.");return}await api.message({t:x.id,x:ta.value.trim()});modal.close();toast(t("Message saved (demo).","Message enregistré (démo)."))}},t("Send","Envoyer"))))}
async function profile(id){
  const x=await api.tutor(id);if(!x)return nf();const s=stats(id),rs=await api.reviews(id);
  V.replaceChildren(h("section",{},h("a",{href:"#/find",class:"bk"},"‹ "+t("Back","Retour")),h("div",{class:"c",style:"margin-top:12px"},
    h("div",{class:"row"},av(x),h("div",{style:"flex:1"},h("h2",{style:"margin:0"},x.n),h("div",{class:"mu"},INST[x.i][0]+" · "+t("Demo profile, not a real person","Profil de démo, pas une vraie personne"))),h("div",{style:"text-align:right"},h("b",{style:"font-size:19px"},money(x.r)),h("div",{class:"mu"},stars(id)))),
    h("div",{class:"row",style:"margin-top:14px"},h("span",{class:"tag"},s.done+" "+t("completed sessions","séances terminées")),x.m.map(m=>h("span",{class:"tag gr"},m==="online"?t("Online","En ligne"):t("In person","En personne")))),
    h("div",{class:"row",style:"margin-top:16px"},h("a",{class:"btn",href:"#/book/"+id},t("Request session","Demander une séance")),h("button",{class:"btn g",onclick:()=>contact(x)},t("Contact","Contacter")),h("label",{class:"btn g",style:"cursor:pointer"},t("Add photo (demo)","Ajouter une photo (démo)"),h("input",{type:"file",accept:"image/*",style:"display:none",onchange:e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{PH[id]=r.result;profile(id)};r.readAsDataURL(f)}})))),
   h("div",{class:"g2",style:"margin-top:14px"},
    h("div",{class:"c"},h("h3",{},t("Courses completed","Cours réussis")),h("p",{class:"mu",style:"margin:4px 0 10px"},t("Grades below are claimed by the tutor.","Les notes ci-dessous sont déclarées par le tuteur.")),...x.c.map(c=>h("div",{class:"row sp",style:"padding:9px 0;border-top:1px solid var(--ln)"},h("div",{},h("b",{},c[0]),h("div",{class:"mu"},cname(c[0])+" · "+t("grade claimed","note déclarée")+" "+c[1])),vb(x.v)))),
    h("div",{class:"c"},h("h3",{},t("Availability","Disponibilités")),...Object.entries(x.d).map(([d,sl])=>h("div",{class:"row sp",style:"padding:9px 0;border-top:1px solid var(--ln)"},h("b",{},d),h("span",{class:"mu"},sl.join(" · ")))))),
   h("div",{class:"c",style:"margin-top:14px"},h("h3",{},t("Reviews","Avis")),rs.length?rs.map(r=>h("div",{style:"padding:10px 0;border-top:1px solid var(--ln)"},h("b",{},"★".repeat(r.s)+"☆".repeat(5-r.s)),h("div",{class:"mu"},(r.tags||[]).join(" · ")),r.x?h("div",{},"“"+r.x+"”"):null,h("div",{class:"mu"},t("Left by you in this demo","Laissé par toi dans cette démo")))):h("p",{class:"mu"},t("No reviews yet. Reviews appear only after a completed session.","Aucun avis pour l’instant. Les avis apparaissent après une séance terminée."))),
   h("div",{class:"c",style:"margin-top:14px"},h("h3",{},t("What the badges mean","Signification des badges")),h("div",{class:"row",style:"margin:10px 0"},vb("verified"),vb("pending"),vb("self")),h("p",{class:"mu",style:"margin:0"},t("Verified means Cram checked an official transcript. That needs a backend and is not active in this demo, so no demo profile is verified.","Vérifié signifie que Cram a contrôlé un relevé officiel. Cela exige un serveur et n’est pas actif dans cette démo : aucun profil de démo n’est vérifié.")))));
}
async function book(id){
  const x=await api.tutor(id);if(!x)return nf();const f={d:"",s:"",m:x.m[0],c:x.c.find(c=>c[0]===S.sel.c)?S.sel.c:x.c[0][0]};
  const min=new Date(Date.now()+864e5).toISOString().slice(0,10),er=h("p",{class:"err",role:"alert"}),slots=h("div",{class:"chips"});
  const dI=h("input",{type:"date",min,"aria-label":"Date",onchange:e=>{f.d=e.target.value;f.s="";paint()}});
  function paint(){slots.replaceChildren();if(!f.d){slots.append(h("span",{class:"mu"},t("Pick a date to see times.","Choisis une date pour voir les heures.")));return}
    const day=DAYS[new Date(f.d+"T12:00").getDay()],all=x.d[day]||[],taken=S.bk.filter(b=>b.t===id&&b.d===f.d&&b.s!=="declined").map(b=>b.h);
    if(!all.length){slots.append(h("span",{class:"mu"},x.n+" "+t("isn’t available on "+day+"s. Try another date.","n’est pas disponible le "+day+". Essaie une autre date.")));return}
    all.forEach(sl=>slots.append(h("button",{class:"chip"+(f.s===sl?" on":""),disabled:taken.includes(sl),onclick:()=>{f.s=sl;paint()}},sl)))}
  const mode=h("div",{class:"chips"},...x.m.map(m=>h("button",{class:"chip"+(f.m===m?" on":""),onclick:e=>{f.m=m;[...mode.children].forEach(b=>b.classList.toggle("on",b===e.currentTarget))}},m==="online"?t("Online","En ligne"):t("In person","En personne"))));
  const cs=h("select",{"aria-label":"Course",onchange:e=>f.c=e.target.value},...x.c.map(c=>{const o=h("option",{value:c[0]},c[0]+" · "+cname(c[0]));if(c[0]===f.c)o.selected=true;return o}));
  const rep=h("input",{type:"checkbox","aria-label":"Repeat weekly"});const note=h("textarea",{placeholder:t("What do you want to work on?","Sur quoi veux-tu travailler?"),"aria-label":"Note"});
  const send=async()=>{if(!f.d||!f.s){er.textContent=t("Choose a date and a time slot.","Choisis une date et une heure.");return}
    const weeks=rep.checked?4:1;let b;
    for(let i=0;i<weeks;i++){const dt=new Date(f.d+"T12:00");dt.setDate(dt.getDate()+7*i);const d2=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
      if(S.bk.some(q=>q.t===id&&q.d===d2&&q.h===f.s&&q.s!=="declined"))continue;
      const nb=await api.book({id:"B"+Date.now().toString(36).toUpperCase()+i,t:id,d:d2,h:f.s,m:f.m,c:f.c,x:note.value.trim(),s:"pending"});b=b||nb}
    V.replaceChildren(h("section",{},h("div",{class:"c",style:"text-align:center;padding:36px 20px"},h("div",{class:"n",style:"margin:0 auto 12px;background:var(--ok);color:#fff"},"✓"),h("h2",{},t("Request sent","Demande envoyée")),
      h("p",{class:"mu"},x.n+" · "+b.c+" · "+b.d+" "+b.h+" · "+(b.m==="online"?t("Online","En ligne"):t("In person","En personne"))+(weeks>1?" · "+t("repeats weekly ("+weeks+" requests)","chaque semaine ("+weeks+" demandes)"):"")),h("p",{class:"mu"},t("Reference ","Référence ")+b.id+" · "+t("Status: waiting for the tutor.","Statut : en attente du tuteur.")),
      h("p",{class:"mu",style:"font-size:13px"},t("Demo: real email/SMS confirmations need a backend.","Démo : les confirmations réelles par courriel ou texto exigent un serveur.")),h("a",{class:"btn",href:"#/requests"},t("View my sessions","Voir mes séances")))))};
  V.replaceChildren(h("section",{},h("a",{href:"#/tutor/"+id,class:"bk"},"‹ "+t("Back","Retour")),h("h2",{style:"margin:10px 0 16px"},t("Request a session with ","Demander une séance avec ")+x.n),
   h("div",{class:"c",style:"display:grid;gap:14px"},h("div",{},h("label",{class:"f"},t("Course","Cours")),cs),h("div",{},h("label",{class:"f"},"Date"),dI),h("div",{},h("label",{class:"f"},t("Time","Heure")),slots),h("div",{},h("label",{class:"f"},t("Format","Format")),mode),h("label",{class:"row",style:"cursor:pointer;font-size:14px;flex-wrap:nowrap"},rep,t("Repeat weekly for 4 weeks (same day and time)","Répéter chaque semaine pendant 4 semaines (même jour et heure)")),h("div",{},h("label",{class:"f"},t("Note (optional)","Note (facultatif)")),note),er,h("button",{class:"btn",onclick:send},t("Send request · ","Envoyer la demande · ")+money(x.r)))));paint();
}
function requests(){
  const seg=h("div",{class:"seg"},...[["student",t("I’m the student","Je suis l’étudiant")],["tutor",t("I’m the tutor (demo)","Je suis le tuteur (démo)")]].map(([r,l])=>h("button",{class:S.role===r?"on":"",onclick:()=>{S.role=r;save();requests()}},l)));
  const list=h("div",{class:"tc"});
  if(!S.bk.length)list.append(h("div",{class:"c mu"},t("No sessions yet. Request one from a tutor profile.","Aucune séance pour l’instant. Fais une demande depuis un profil de tuteur."),h("div",{style:"margin-top:12px"},h("a",{class:"btn sm",href:"#/find"},t("Find a tutor","Trouver un tuteur")))));
  S.bk.slice().reverse().forEach(b=>{const x=TUT.find(y=>y.id===b.t),rv=S.rev.find(r=>r.b===b.id);
    const stT={pending:t("Pending","En attente"),accepted:t("Accepted","Acceptée"),declined:t("Declined","Refusée"),completed:t("Completed","Terminée")}[b.s];
    const act=h("div",{class:"row"});
    if(S.role==="tutor"&&b.s==="pending")act.append(h("button",{class:"btn sm",onclick:async()=>{await api.setStatus(b.id,"accepted");toast(t("Accepted","Acceptée"));requests()}},t("Accept","Accepter")),h("button",{class:"btn sm no",onclick:async()=>{await api.setStatus(b.id,"declined");requests()}},t("Decline","Refuser")));
    if(S.role==="student"&&b.s==="accepted")act.append(h("button",{class:"btn sm",onclick:async()=>{await api.setStatus(b.id,"completed");requests()}},t("Mark completed (demo)","Marquer terminée (démo)")));
    if(S.role==="student"&&b.s==="completed"&&!rv)act.append(h("button",{class:"btn sm",onclick:()=>reviewForm(b,x)},t("Leave a review","Laisser un avis")));
    list.append(h("div",{class:"c"},h("div",{class:"row sp"},h("b",{},x.n+" · "+b.c),h("span",{class:"tag"+(b.s==="accepted"||b.s==="completed"?" ok":b.s==="pending"?" wa":" gr")},stT)),h("div",{class:"mu"},b.d+" "+b.h+" · "+(b.m==="online"?t("Online","En ligne"):t("In person","En personne"))+" · "+b.id),rv?h("div",{class:"ok2",style:"margin-top:6px"},"★".repeat(rv.s)+" "+t("Reviewed","Évalué")):null,act.children.length?h("div",{style:"margin-top:10px"},act):null))});
  V.replaceChildren(h("section",{},h("h2",{},t("My sessions","Mes séances")),h("p",{class:"sub"},t("Demo: switch roles to accept or decline as the tutor. Real notifications and payments need a backend.","Démo : change de rôle pour accepter ou refuser en tant que tuteur. Les notifications et paiements réels exigent un serveur.")),seg,list))}
function reviewForm(b,x){
  const st={s:5,tags:[]},tags=[t("On time","Ponctuel"),t("Clear explanations","Explications claires"),t("Patient","Patient"),t("Well prepared","Bien préparé")];
  const row=h("div",{class:"row"}),ta=h("textarea",{"aria-label":"Comment",placeholder:t("Say a little about the session","Dis quelques mots sur la séance")});
  const pS=()=>row.replaceChildren(...[1,2,3,4,5].map(n=>h("button",{class:"chip"+(n<=st.s?" on":""),"aria-label":n+" ★",onclick:()=>{st.s=n;pS()}},"★")));pS();
  modal(h("h3",{},t("Review ","Évaluer ")+x.n),row,h("div",{class:"chips",style:"margin:12px 0"},...tags.map(g=>h("button",{class:"chip",onclick:e=>{const i=st.tags.indexOf(g);i<0?st.tags.push(g):st.tags.splice(i,1);e.currentTarget.classList.toggle("on")}},g))),ta,
   h("div",{class:"row",style:"margin-top:12px;justify-content:flex-end"},h("button",{class:"btn g",onclick:()=>modal.close()},t("Cancel","Annuler")),h("button",{class:"btn",onclick:async()=>{await api.review({b:b.id,t:b.t,s:st.s,tags:st.tags,x:ta.value.trim()});modal.close();toast(t("Thanks for your review","Merci pour ton avis"));requests()}},t("Submit","Envoyer"))))}

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
          li("Profiles: languages, level, school search, tutor subjects, schools, rate and availability", "Profils : langues, niveau, recherche d’école, matières, écoles, tarif et disponibilités du tuteur"))),
      h("div", { class: "c" },
        h("h3", { style: "color:var(--wa)" }, "… " + t("Demo (made-up data, saved only in your browser)", "Démo (données fictives, enregistrées seulement dans ton navigateur)")),
        h("ul", { style: "padding-left:18px" },
          li("The tutor list, tutor profiles and course search", "La liste de tuteurs, les profils et la recherche de cours"),
          li("Session requests, accept/decline and reviews", "Demandes de séance, accepter/refuser et avis"),
          li("Messages", "Messages")))),
    h("div", { class: "row", style: "margin-top:16px" },
      h("button", { class: "btn no", onclick: () => { S.bk = []; S.rev = []; S.msg = []; save(); toast(t("Demo data reset", "Données de démo réinitialisées")); } },
        t("Reset demo data", "Réinitialiser la démo")))));
}

/* Register the demo pages with the router (see ROUTES in core.js) */
ROUTES.find = find;
ROUTES.tutor = id => profile(id);
ROUTES.book = id => book(id);
ROUTES.requests = requests;
ROUTES.status = status;
PAGE_TITLES.find = () => t("Find a tutor", "Trouver un tuteur");
PAGE_TITLES.tutor = () => t("Tutor profile", "Profil du tuteur");
PAGE_TITLES.book = () => t("Request a session", "Demander une séance");
PAGE_TITLES.requests = () => t("My sessions", "Mes séances");
PAGE_TITLES.status = () => t("What’s real so far", "Ce qui est réel");
const demoPending = () => S.bk.filter(b => b.s === "pending").length;
