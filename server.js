const http = require("http");
const https = require("https");

// ─── DB SETUP ────────────────────────────────────────────────────────────────
let pgClient = null;

function getDbClient() {
  if (pgClient) return Promise.resolve(pgClient);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return Promise.resolve(null);
  try {
    const { Client } = require("pg");
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    return client.connect().then(() => {
      pgClient = client;
      return client.query(`
        CREATE TABLE IF NOT EXISTS qa_results (
          id SERIAL PRIMARY KEY,
          rep_name TEXT,
          team TEXT,
          call_date TEXT,
          verdict TEXT,
          overall_score INTEGER,
          sale_closed BOOLEAN DEFAULT FALSE,
          manager_notes TEXT DEFAULT '',
          result_json TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `).then(() => Promise.all([
        client.query(`ALTER TABLE qa_results ADD COLUMN IF NOT EXISTS team TEXT`).catch(()=>{}),
        client.query(`ALTER TABLE qa_results ADD COLUMN IF NOT EXISTS sale_closed BOOLEAN DEFAULT FALSE`).catch(()=>{}),
        client.query(`ALTER TABLE qa_results ADD COLUMN IF NOT EXISTS manager_notes TEXT DEFAULT ''`).catch(()=>{})
      ])).then(() => client);
    });
  } catch (e) { return Promise.resolve(null); }
}

function saveResult(data) {
  return getDbClient().then(client => {
    if (!client) return;
    const score = overallScore(data);
    return client.query(
      "INSERT INTO qa_results (rep_name, team, call_date, verdict, overall_score, sale_closed, result_json) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [data.repName||"Unknown", data.team||"", data.date||"", data.verdict||"", score, data.sale_closed||false, JSON.stringify(data)]
    );
  }).catch(()=>{});
}

function getHistory(repFilter, teamFilter) {
  return getDbClient().then(client => {
    if (!client) return [];
    let q = "SELECT id, rep_name, team, call_date, verdict, overall_score, sale_closed, manager_notes, result_json, created_at FROM qa_results WHERE 1=1";
    const params = [];
    if (repFilter) { params.push("%"+repFilter.toLowerCase()+"%"); q+=` AND LOWER(rep_name) LIKE $${params.length}`; }
    if (teamFilter) { params.push(teamFilter); q+=` AND team = $${params.length}`; }
    q += " ORDER BY created_at DESC LIMIT 200";
    return client.query(q, params).then(r => r.rows);
  }).catch(()=>[]);
}

function getDashboardStats() {
  return getDbClient().then(client => {
    if (!client) return null;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(); today.setHours(0,0,0,0);
    return Promise.all([
      client.query("SELECT COUNT(*) as total FROM qa_results WHERE created_at >= $1", [startOfWeek]),
      client.query("SELECT COUNT(*) as total FROM qa_results WHERE created_at >= $1", [startOfMonth]),
      client.query("SELECT COUNT(*) as total FROM qa_results WHERE created_at >= $1", [today]),
      client.query("SELECT team, AVG(overall_score) as avg_score, COUNT(*) as calls FROM qa_results WHERE team != '' AND created_at >= $1 GROUP BY team ORDER BY avg_score DESC", [startOfWeek]),
      client.query("SELECT team, AVG(overall_score) as avg_score, COUNT(*) as calls FROM qa_results WHERE team != '' AND created_at >= $1 GROUP BY team ORDER BY avg_score DESC", [startOfMonth]),
      client.query("SELECT rep_name, team, AVG(overall_score) as avg_score, COUNT(*) as calls, SUM(CASE WHEN sale_closed THEN 1 ELSE 0 END) as closed FROM qa_results WHERE created_at >= $1 GROUP BY rep_name, team ORDER BY avg_score DESC", [startOfWeek]),
      client.query("SELECT rep_name, team, AVG(overall_score) as avg_score, COUNT(*) as calls, SUM(CASE WHEN sale_closed THEN 1 ELSE 0 END) as closed FROM qa_results WHERE created_at >= $1 GROUP BY rep_name, team ORDER BY avg_score DESC", [startOfMonth]),
      client.query("SELECT COUNT(*) as total, SUM(CASE WHEN sale_closed THEN 1 ELSE 0 END) as closed FROM qa_results WHERE created_at >= $1", [startOfWeek]),
      client.query("SELECT COUNT(*) as total, SUM(CASE WHEN sale_closed THEN 1 ELSE 0 END) as closed FROM qa_results WHERE created_at >= $1", [startOfMonth])
    ]).then(([week, month, day, teamsWeek, teamsMonth, repsWeek, repsMonth, closesWeek, closesMonth]) => ({
      callsThisWeek: parseInt(week.rows[0].total),
      callsThisMonth: parseInt(month.rows[0].total),
      callsToday: parseInt(day.rows[0].total),
      teamStatsWeek: teamsWeek.rows,
      teamStatsMonth: teamsMonth.rows,
      repStatsWeek: repsWeek.rows,
      repStatsMonth: repsMonth.rows,
      closesWeek: parseInt(closesWeek.rows[0].closed||0),
      totalWeek: parseInt(closesWeek.rows[0].total||0),
      closesMonth: parseInt(closesMonth.rows[0].closed||0),
      totalMonth: parseInt(closesMonth.rows[0].total||0)
    }));
  }).catch(()=>null);
}

function overallScore(r) {
  if (!r || !r.categories) return 0;
  let p=0,t=0;
  ["greeting","discovery","presentation","objections","closing","rapport"].forEach(cat=>{
    (r.categories[cat]?.scores||[]).forEach(s=>{if(s==="pass"){p++;t++;}else if(s==="fail")t++;});
  });
  return t>0?Math.round(p/t*100):0;
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite sales performance coach for Vamos Health, a private medical group in Utah and Arizona. You analyze real sales calls and deliver sharp, structured coaching grounded in Vamos's actual sales system and real sales data.

WHAT VAMOS IS: NOT insurance. NOT just a clinic. A financial + healthcare access solution for the Hispanic community. No SSN or immigration status required. Bilingual (Spanish/English). Safe space for undocumented individuals.

MEMBERSHIPS:
- Vamos Core: $85/month adult, $40/month child with adult, $50/month child alone. Enrollment: $100 AZ, $25 UT. $4 copay. Unlimited visits. 12 labs included free.
- Vamos Vital: $20/month. $10 enrollment. $65/visit. Labs once/year. AZ and UT.
- Vamos Plus: $20/month. $10 enrollment. Requires accepted insurance. GLP-1 access. Utah only.
- No membership: $120/visit. Labs $200-$400+ extra.
- Cancellation fee: $240 Core, $100 Vital. Waived if patient moves far from clinics.

FAMILY DISCOUNTS: 1 adult+1 child=$10/mo off. +2=$20/mo off. +3=$30/mo off. +4=$50/mo off.

12 INCLUDED LABS: Urinalysis, Basic Metabolic Panel, Comprehensive Metabolic Panel, CBC, Urine Culture, HbA1c, Cholesterol/Lipid Panel, Pap Smear, PSA, Thyroid Function, Strep Test, Pregnancy Test. Outside cost: $200-$400+.

KEY SERVICES: General exams, diabetes, hypertension, GLP-1 weight loss, mental health, women's health, sports medicine, newborn exams, STDs, allergies, wound care, nutrition, school physicals (included), skin conditions, migraines, asthma, thyroid, infections, joint pain, sleep disorders, prenatal care.

REFERRAL PROGRAM: $50 cash per referral (not same household). Mention at close and 3-week follow-up.

SALES FRAMEWORK: RAPPORT → PAIN DISCOVERY → IMPACT → VALUE PRESENTATION → CLOSE.

KEY RULES:
1. Prospect talks MORE than rep. Questions drive sales.
2. Never argue. Use: "Entiendo", "Tiene sentido", "Eso es muy común."
3. Always attempt to close same day by phone.
4. No call ends without: sale closed, appointment booked, OR specific date/time follow-up.
5. Anchor price: "Una consulta afuera cuesta $200-$300. Los laboratorios, $400 más."
6. Discover pain FIRST before presenting anything.

OBJECTION TOOLS (NO payment plans — never penalize for not offering):
1. Value anchoring vs outside costs
2. Urgency (limited spots)
3. Referral bonus ($50)
4. Family discount codes
5. Enrollment fee waiver — last resort only, not scored

SALE CLOSED DETECTION — CRITICAL:
Set "sale_closed": true ONLY if there is clear evidence in the transcript that:
- The prospect provided card/payment information
- A confirmation number or registration was completed
- The rep explicitly confirmed the membership was processed ("quedó registrado", "ya está inscrito", "procesamos su inscripción")
- The prospect agreed to pay and the call ended with enrollment confirmed
Set "sale_closed": false if the call ended without confirmed payment, even if prospect said they were interested or would call back.

SCORING: "pass", "fail", or "na" only.

GREETING (4): 1.Introduced with name+Vamos Health. 2.Established purpose within 20 seconds. 3.Asked prospect name and used it. 4.Warm professional tone.

DISCOVERY (6): 1.Asked about any health concern (ANY primary care topic). 2.Asked about insurance status. 3.Explored family situation — fail if not explored. 4.Identified IMMEDIATE pain before presenting. 5.Active listening — paraphrased or confirmed. 6.Follow-up questions based on answers not script.

PRESENTATION (5): 1.Presented AFTER discovering pain. 2.Translated benefits into dollar savings. 3.Tailored to prospect's specific needs. 4.Simple clear language. 5.Active dialogue not monologue.

OBJECTIONS (5): 1.Received objections calmly. 2.Clarified before responding. 3.Value anchoring not payment plans. 4.Used tools in order. 5.Confirmed resolution.

CLOSING (5): 1.Asked for sale directly. 2.Same-day phone close attempt. 3.Proper technique. 4.Probed when hesitation arose. 5.Concrete next step — "Hablamos pronto" = fail.

RAPPORT (5): 1.Empathetic tone throughout. 2.Prospect felt heard. 3.Prospect talked MORE. 4.Trust through honesty. 5.Consistent energy.

MISSED OPPORTUNITIES (4): 1.Buying signal ignored. 2.Family opportunity missed. 3.Pain not explored. 4.$50 referral not mentioned.

FEEDBACK: Every fail = exact moment + word-for-word script + real stat with source.

STATS: 4+ discovery questions=43% more closes (RAIN 2023). Pain verbalized=2.4x more likely (Gong 2022). Price anchoring=40% more value (JCP). Specific next step=3x better (HubSpot 2023). Rep <40% talk=54% more closes (Gong 2021). Referral mention=45% more referrals (Wharton). Same-day close=67% more (InsideSales). Personalized=36% higher (Salesforce 2023). Questions for objections=70% retention (Richardson).

COACHING: (1) Lo que hiciste bien — 1-2 specific wins. (2) Tus 3 áreas — exact moment + script + stat. (3) Lo que esto impacta — one sentence.

RESPOND WITH ONLY VALID JSON. No markdown. No code blocks. Start { end }.
Verdict: "strong">=80%, "needs coaching" 60-79%, "critical gaps"<60%.

{
  "repName": "",
  "sale_closed": false,
  "summary_es": "2-3 sentences",
  "summary_en": "2-3 sentences",
  "verdict": "needs coaching",
  "coaching_es": "structured coaching Spanish",
  "coaching_en": "structured coaching English",
  "categories": {
    "greeting":      { "scores": ["na","na","na","na"],           "notes_es": ["","","",""],        "notes_en": ["","","",""] },
    "discovery":     { "scores": ["na","na","na","na","na","na"], "notes_es": ["","","","","",""],  "notes_en": ["","","","","",""] },
    "presentation":  { "scores": ["na","na","na","na","na"],      "notes_es": ["","","","",""],     "notes_en": ["","","","",""] },
    "objections":    { "scores": ["na","na","na","na","na"],      "notes_es": ["","","","",""],     "notes_en": ["","","","",""] },
    "closing":       { "scores": ["na","na","na","na","na"],      "notes_es": ["","","","",""],     "notes_en": ["","","","",""] },
    "rapport":       { "scores": ["na","na","na","na","na"],      "notes_es": ["","","","",""],     "notes_en": ["","","","",""] },
    "opportunities": { "scores": ["na","na","na","na"],           "notes_es": ["","","",""],        "notes_en": ["","","",""] }
  }
}`;

const TEAMS = ["GDL","West Valley","Arizona 1","Arizona 2","Orem","Team Mana"];
const LOGO_BADGE = `<div style="background:#EC4899;padding:10px 18px;border-radius:10px;text-align:center;display:inline-block"><div style="font-size:15px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.2">Vamos Health</div><div style="font-size:8px;font-weight:600;color:rgba(255,255,255,.75);letter-spacing:3px;margin-top:1px">MEDICAL GROUP</div></div>`;
const LOGO_SMALL = `<div style="background:#EC4899;padding:6px 14px;border-radius:8px;text-align:center"><div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-0.3px;line-height:1.2">Vamos Health</div><div style="font-size:7px;font-weight:600;color:rgba(255,255,255,.75);letter-spacing:2.5px">MEDICAL GROUP</div></div>`;

function buildHTML(appPassword) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vamos Health — QA System</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;color:#111827}
    input,textarea,select{font-family:inherit;font-size:13px;padding:8px 11px;border-radius:7px;border:1px solid #e5e7eb;width:100%;outline:none;background:#fff}
    input:focus,textarea:focus,select:focus{border-color:#EC4899}
    button{font-family:inherit;cursor:pointer}
    .tab{flex:1;padding:7px 0;border-radius:7px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:#6b7280}
    .tab.active{background:#fff;color:#EC4899;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap}
    .badge-pass{background:#E1F5EE;color:#085041}
    .badge-fail{background:#FEE2E2;color:#991B1B}
    .badge-na{background:#f3f4f6;color:#6b7280}
  </style>
</head>
<body>
<div id="lock" style="position:fixed;inset:0;background:#f9fafb;display:flex;align-items:center;justify-content:center;z-index:999">
  <div style="background:#fff;border-radius:16px;padding:36px 32px;border:1px solid #e5e7eb;width:100%;max-width:340px;text-align:center">
    <div style="margin:0 auto 20px">${LOGO_BADGE}</div>
    <div style="font-size:13px;color:#9ca3af;margin-bottom:24px">Ingresa la contraseña del equipo</div>
    <input id="pw" type="password" placeholder="Contraseña..." style="margin-bottom:12px;text-align:center"/>
    <button onclick="tryLogin()" style="width:100%;padding:10px 0;background:#EC4899;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700">Entrar</button>
    <div id="pw-err" style="color:#EF4444;font-size:12px;margin-top:8px;display:none">Contraseña incorrecta</div>
  </div>
</div>
<div id="app" style="max-width:680px;margin:0 auto;padding:16px 12px;min-height:100vh;display:none"></div>
<script>
const CORRECT_PW=${JSON.stringify(appPassword)};
const BRAND="#EC4899";
const TEAMS=${JSON.stringify(TEAMS)};
const LOGO_HTML=${JSON.stringify(LOGO_SMALL)};

document.getElementById("pw").addEventListener("keydown",e=>{if(e.key==="Enter")tryLogin();});
function tryLogin(){
  const val=document.getElementById("pw").value;
  if(val===CORRECT_PW){
    sessionStorage.setItem("vamos_auth",val);
    document.getElementById("lock").style.display="none";
    document.getElementById("app").style.display="block";
    render();
  } else { document.getElementById("pw-err").style.display="block"; }
}
(function(){
  const saved=sessionStorage.getItem("vamos_auth");
  if(saved===CORRECT_PW){document.getElementById("lock").style.display="none";document.getElementById("app").style.display="block";}
})();

const CATS=[
  {id:"greeting",label:"Saludo",label_en:"Greeting",color:"#5DCAA5",bg:"#E1F5EE",tc:"#085041",
   es:["Se presentó con un nombre y mencionó Vamos Health (n/a si es llamada entrante o retomada)","Estableció el propósito en los primeros 20 segundos (n/a si el prospecto ya lo estableció)","Preguntó el nombre del prospecto y lo usó naturalmente","Tono cálido, profesional y seguro desde el inicio"],
   en:["Introduced with a name and mentioned Vamos Health (n/a if inbound or resumed call)","Established purpose within first 20 seconds (n/a if prospect stated reason first)","Asked prospect's name and used it naturally","Warm, professional, confident tone from the start"]},
  {id:"discovery",label:"Descubrimiento",label_en:"Discovery",color:"#EC4899",bg:"#FDF2F8",tc:"#9D174D",
   es:["Preguntó sobre cualquier preocupación de salud (cualquier tema de atención primaria)","Preguntó cómo maneja su salud hoy — ¿clínica, efectivo, seguro, o espera a ir a urgencias?","Exploró situación familiar — fail si no se exploró","Identificó el dolor INMEDIATO antes de presentar","Escucha activa — parafraseó o confirmó lo escuchado","Preguntas basadas en respuestas del prospecto, no en guión"],
   en:["Asked about any health concern (any primary care topic)","Asked how they currently manage their healthcare — clinic, cash, insurance, or wait for ER?","Explored family situation — fail if not explored","Identified IMMEDIATE pain before presenting","Active listening — paraphrased or confirmed","Follow-up questions based on answers, not a script"]},
  {id:"presentation",label:"Presentación",label_en:"Presentation",color:"#D4537E",bg:"#FBEAF0",tc:"#72243E",
   es:["Presentó DESPUÉS de descubrir el dolor","Construyó valor a través de beneficios conectados a los problemas del prospecto","Personalizó la solución a las necesidades específicas","Lenguaje simple y claro — sin jerga","Diálogo activo — no un monólogo"],
   en:["Presented AFTER discovering pain","Built value through benefits connected to prospect's specific problems","Tailored solution to prospect's specific needs","Simple clear language — no jargon","Active dialogue — not a monologue"]},
  {id:"objections",label:"Objeciones",label_en:"Objections",color:"#D85A30",bg:"#FAECE7",tc:"#712B13",
   es:["Recibió objeciones con calma","Clarificó la objeción antes de responder","Respondió al precio con valor — NO planes de pago","Usó herramientas: valor → urgencia → referido → descuento","Confirmó resolución antes de continuar"],
   en:["Received objections calmly","Clarified objection before responding","Addressed price with value — NOT payment plans","Used tools: value → urgency → referral → discount","Confirmed resolution before moving on"]},
  {id:"closing",label:"Cierre",label_en:"Closing",color:"#639922",bg:"#EAF3DE",tc:"#27500A",
   es:["Pidió la venta directamente","Intentó cerrar el mismo día por teléfono","Usó técnica: asuntivo, alternativa o urgencia","Ante dudas profundizó con preguntas","Aseguró próximo paso concreto — 'Hablamos pronto' = falla"],
   en:["Asked for the sale directly","Attempted same-day phone close","Used proper technique: assumptive, alternative, urgency","Probed with questions when hesitation arose","Secured concrete next step — 'Talk soon' = fail"]},
  {id:"rapport",label:"Rapport (Toda la llamada)",label_en:"Rapport (Entire call)",color:"#378ADD",bg:"#E6F1FB",tc:"#0C447C",
   es:["Tono empático de principio a fin","El prospecto se sintió escuchado y valorado","El prospecto habló MÁS que el rep","Confianza con honestidad — sin falsas promesas","Energía consistente incluso ante objeciones"],
   en:["Empathetic tone from start to finish","Prospect felt heard and valued","Prospect talked MORE than the rep","Trust through honesty — no false promises","Energy consistent even through objections"]},
  {id:"opportunities",label:"Oportunidades Perdidas",label_en:"Missed Opportunities",color:"#888780",bg:"#F1EFE8",tc:"#2C2C2A",
   es:["Señal de compra ignorada","Oportunidad familiar perdida","Dolor mencionado de pasada sin profundizar","Bono de $50 por referido no mencionado al cierre"],
   en:["Buying signal ignored","Family opportunity missed","Pain mentioned but not explored","$50 referral bonus not mentioned at close"]}
];

const VM={
  "strong":{bg:"#def7ec",text:"#03543f",border:"#03543f",es:"Sólido",en:"Strong"},
  "needs coaching":{bg:"#fdf2f8",text:"#9d174d",border:"#EC4899",es:"Necesita Coaching",en:"Needs Coaching"},
  "critical gaps":{bg:"#fde8e8",text:"#9b1c1c",border:"#dc2626",es:"Brechas Críticas",en:"Critical Gaps"}
};

let state={tab:"dashboard",tx:"",rep:"",team:"",date:new Date().toISOString().slice(0,10),loading:false,result:null,err:"",hist:[],viewing:null,filterRep:"",filterTeam:"",lang:"both",histLoading:false,dashboard:null,dashLoading:false};

function calcPct(catId,r){
  const s=r?.categories?.[catId]?.scores||[];
  const p=s.filter(x=>x==="pass").length,t=s.filter(x=>x==="pass"||x==="fail").length;
  return t>0?Math.round(p/t*100):null;
}
function overallPct(r){
  if(!r?.categories)return 0;
  let p=0,t=0;
  ["greeting","discovery","presentation","objections","closing","rapport"].forEach(cat=>{
    (r.categories[cat]?.scores||[]).forEach(s=>{if(s==="pass"){p++;t++;}else if(s==="fail")t++;});
  });
  return t>0?Math.round(p/t*100):0;
}
function el(tag,attrs,children){
  const e=document.createElement(tag);
  if(attrs)Object.entries(attrs).forEach(([k,v])=>{
    if(k==="style"&&typeof v==="object")Object.assign(e.style,v);
    else if(k.startsWith("on"))e.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==="className")e.className=v;
    else e.setAttribute(k,v);
  });
  if(children)([].concat(children)).forEach(c=>c!=null&&e.appendChild(typeof c==="string"?document.createTextNode(c):c));
  return e;
}

function render(){
  const app=document.getElementById("app");
  app.innerHTML="";
  const hdr=el("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}});
  const hLeft=el("div",{style:{display:"flex",alignItems:"center",gap:"10px"}});
  const logoEl=document.createElement("div");logoEl.innerHTML=LOGO_HTML;hLeft.appendChild(logoEl.firstChild);
  const ht=el("div");
  ht.appendChild(el("div",{style:{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}},"Sales Call Analyzer — QA System"));
  hLeft.appendChild(ht);hdr.appendChild(hLeft);
  const ls=el("select",{style:{width:"auto",fontSize:"11px",padding:"4px 8px",borderRadius:"6px",border:"1px solid #e5e7eb"},onChange:e=>{state.lang=e.target.value;render();}});
  [["both","ES + EN"],["es","Solo Español"],["en","English only"]].forEach(([v,t])=>{const o=el("option",{value:v},t);if(v===state.lang)o.selected=true;ls.appendChild(o);});
  hdr.appendChild(ls);app.appendChild(hdr);
  const tb=el("div",{style:{display:"flex",gap:"4px",marginBottom:"16px",background:"#ececec",borderRadius:"9px",padding:"4px"}});
  [["dashboard","Dashboard"],["analyze","Analizar"],["history","Historial"],["trends","Tendencias"],...(state.viewing?[["view","Reporte"]]:[])]
    .forEach(([id,label])=>{
      const b=el("button",{className:"tab"+(state.tab===id?" active":""),onClick:()=>{
        state.tab=id;
        if(id==="history"||id==="trends")loadHistory();
        if(id==="dashboard")loadDashboard();
        render();
      }},label);
      tb.appendChild(b);
    });
  app.appendChild(tb);
  if(state.tab==="dashboard")renderDashboard(app);
  else if(state.tab==="analyze")renderAnalyze(app);
  else if(state.tab==="history")renderHistory(app);
  else if(state.tab==="trends")renderTrends(app);
  else if(state.tab==="view"&&state.viewing)renderView(app);
}

function loadDashboard(){
  if(state.dashLoading)return;
  state.dashLoading=true;
  fetch("/api/dashboard").then(r=>r.json()).then(d=>{
    state.dashboard=d;state.dashLoading=false;render();
  }).catch(()=>{state.dashLoading=false;});
}

function loadHistory(){
  if(state.histLoading)return;
  state.histLoading=true;
  fetch("/api/history?rep="+encodeURIComponent(state.filterRep)+"&team="+encodeURIComponent(state.filterTeam))
    .then(r=>r.json()).then(rows=>{
      state.hist=rows.map(r=>({...JSON.parse(r.result_json),_dbid:r.id,_created:r.created_at,_team:r.team,_sale_closed:r.sale_closed,_notes:r.manager_notes||""}));
      state.histLoading=false;render();
    }).catch(()=>{state.histLoading=false;});
}

function renderDashboard(app){
  if(!state.dashboard&&!state.dashLoading){loadDashboard();return;}
  if(state.dashLoading){app.appendChild(el("div",{style:{textAlign:"center",color:"#9ca3af",padding:"48px"}},"Cargando dashboard…"));return;}
  const d=state.dashboard;
  if(!d){app.appendChild(el("div",{style:{textAlign:"center",color:"#9ca3af",padding:"48px"}},"No hay datos aún."));return;}

  // Top stats row
  const statsGrid=el("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"20px"}});
  const weekCloseRate=d.totalWeek>0?Math.round(d.closesWeek/d.totalWeek*100):0;
  const monthCloseRate=d.totalMonth>0?Math.round(d.closesMonth/d.totalMonth*100):0;
  [
    {label:"Hoy",value:d.callsToday,color:"#EC4899"},
    {label:"Esta semana",value:d.callsThisWeek,color:"#9D174D"},
    {label:"Este mes",value:d.callsThisMonth,color:"#7F77DD"},
    {label:"Ventas cerradas",value:weekCloseRate+"% sem / "+monthCloseRate+"% mes",color:"#085041"}
  ].forEach(s=>{
    const card=el("div",{style:{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"10px",padding:"12px 10px",textAlign:"center"}});
    card.appendChild(el("div",{style:{fontSize:"20px",fontWeight:"800",color:s.color,lineHeight:"1.2"}},String(s.value)));
    card.appendChild(el("div",{style:{fontSize:"10px",color:"#9ca3af",marginTop:"4px"}},s.label));
    statsGrid.appendChild(card);
  });
  app.appendChild(statsGrid);

  // Week vs Month side by side
  const colGrid=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px"}});

  // Helper: render a team stats column
  function teamCol(title,teamStats,repStats){
    const col=el("div");
    const colTitle=el("div",{style:{fontWeight:"700",fontSize:"12px",color:"#9D174D",background:"#FDF2F8",borderRadius:"6px",padding:"4px 10px",marginBottom:"8px",textAlign:"center"}},title);
    col.appendChild(colTitle);
    if(teamStats&&teamStats.length){
      const teamWrap=el("div",{style:{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"10px",padding:"10px",marginBottom:"10px"}});
      teamStats.forEach((t,i)=>{
        const avg=Math.round(parseFloat(t.avg_score));
        const row=el("div",{style:{display:"flex",alignItems:"center",gap:"8px",padding:"4px 0",borderBottom:i<teamStats.length-1?"1px solid #f3f4f6":"none"}});
        row.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",width:"90px",flexShrink:"0",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}},t.team));
        const barWrap=el("div",{style:{flex:"1",height:"6px",background:"#f3f4f6",borderRadius:"3px",overflow:"hidden"}});
        const bar=el("div",{style:{height:"100%",width:avg+"%",background:avg>=80?"#5DCAA5":avg>=60?"#EC4899":"#EF4444",borderRadius:"3px"}});
        barWrap.appendChild(bar);row.appendChild(barWrap);
        row.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"700",color:"#374151",width:"32px",textAlign:"right"}},avg+"%"));
        teamWrap.appendChild(row);
      });
      col.appendChild(teamWrap);
    }
    if(repStats&&repStats.length){
      const repWrap=el("div",{style:{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"10px",padding:"10px"}});
      repStats.slice(0,5).forEach((r,i)=>{
        const avg=Math.round(parseFloat(r.avg_score));
        const row=el("div",{style:{display:"flex",alignItems:"center",gap:"6px",padding:"5px 0",borderBottom:i<Math.min(repStats.length,5)-1?"1px solid #f3f4f6":"none"}});
        const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
        if(medal){const m=document.createElement("span");m.style.fontSize="13px";m.textContent=medal;row.appendChild(m);}
        else row.appendChild(el("div",{style:{width:"16px",fontSize:"10px",color:"#9ca3af",textAlign:"center"}},"#"+(i+1)));
        const info=el("div",{style:{flex:"1",minWidth:0}});
        info.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}},r.rep_name));
        if(r.team)info.appendChild(el("div",{style:{fontSize:"9px",color:"#9D174D"}},r.team));
        row.appendChild(info);
        row.appendChild(el("div",{style:{fontSize:"14px",fontWeight:"800",color:avg>=80?"#085041":avg>=60?"#9D174D":"#991B1B",flexShrink:"0"}},avg+"%"));
        repWrap.appendChild(row);
      });
      col.appendChild(repWrap);
    }
    return col;
  }

  colGrid.appendChild(teamCol("Esta semana / This week", d.teamStatsWeek, d.repStatsWeek));
  colGrid.appendChild(teamCol("Este mes / This month", d.teamStatsMonth, d.repStatsMonth));
  app.appendChild(colGrid);

  // Teams needing coaching (combined, unique)
  const allTeams=[...(d.teamStatsWeek||[]),...(d.teamStatsMonth||[])];
  const teamMap={};
  allTeams.forEach(t=>{
    if(!teamMap[t.team]||parseFloat(t.avg_score)<parseFloat(teamMap[t.team].avg_score))teamMap[t.team]=t;
  });
  const needCoaching=Object.values(teamMap).filter(t=>Math.round(parseFloat(t.avg_score))<70);
  if(needCoaching.length){
    app.appendChild(el("div",{style:{fontWeight:"700",fontSize:"13px",color:"#374151",marginBottom:"8px"}},"Equipos que necesitan coaching"));
    const ncWrap=el("div",{style:{background:"#FEE2E2",border:"1px solid #EF4444",borderRadius:"10px",padding:"12px",marginBottom:"8px"}});
    needCoaching.forEach(t=>{
      const avg=Math.round(parseFloat(t.avg_score));
      const row=el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}});
      row.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"600",color:"#991B1B"}},t.team));
      row.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"800",color:"#991B1B"}},avg+"%"));
      ncWrap.appendChild(row);
    });
    app.appendChild(ncWrap);
  }
}

function renderAnalyze(app){
  const wrap=el("div",{style:{background:"#fff",borderRadius:"12px",padding:"16px",border:"1px solid #e5e7eb"}});
  const grid1=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}});
  const rw=el("div");rw.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"Nombre del Rep"));
  rw.appendChild(el("input",{type:"text",placeholder:"Ej. Maria Garcia",value:state.rep,onInput:e=>state.rep=e.target.value}));
  const tw=el("div");tw.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"Equipo / Team"));
  const teamSel=el("select",{onChange:e=>state.team=e.target.value});
  teamSel.appendChild(el("option",{value:""},"Seleccionar equipo..."));
  TEAMS.forEach(t=>{const o=el("option",{value:t},t);if(t===state.team)o.selected=true;teamSel.appendChild(o);});
  tw.appendChild(teamSel);
  grid1.appendChild(rw);grid1.appendChild(tw);wrap.appendChild(grid1);
  const dw=el("div",{style:{maxWidth:"50%",marginBottom:"12px"}});
  dw.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"Fecha"));
  dw.appendChild(el("input",{type:"date",value:state.date,onInput:e=>state.date=e.target.value}));
  wrap.appendChild(dw);
  wrap.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"Transcripción de la llamada"));
  wrap.appendChild(el("textarea",{placeholder:"Pega la transcripción aquí (español o inglés)...",style:{width:"100%",minHeight:"180px",resize:"vertical",borderRadius:"8px",border:"1px solid #e5e7eb",padding:"10px 12px",fontSize:"13px",lineHeight:"1.6",marginBottom:"12px",outline:"none",fontFamily:"inherit"},onInput:e=>state.tx=e.target.value},state.tx));
  wrap.appendChild(el("button",{style:{width:"100%",padding:"11px 0",background:state.loading||!state.tx.trim()?"#e5e7eb":BRAND,color:state.loading||!state.tx.trim()?"#9ca3af":"#fff",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"700"},onClick:doAnalyze},state.loading?"⏳ Analizando…":"Analizar Llamada"));
  if(state.err)wrap.appendChild(el("div",{style:{marginTop:"12px",background:"#FEE2E2",border:"1px solid #EF4444",borderRadius:"8px",padding:"10px 14px",fontSize:"12px",color:"#991B1B"}},"⚠ "+state.err));
  if(state.result&&!state.loading){const rd=el("div",{style:{marginTop:"18px"}});renderResult(rd,state.result);wrap.appendChild(rd);}
  app.appendChild(wrap);
}

function doAnalyze(){
  if(!state.tx.trim()||state.loading)return;
  state.loading=true;state.err="";state.result=null;render();
  fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript:state.tx,repName:state.rep,team:state.team,date:state.date})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      if(!ok)throw new Error(d.error||"Server error");
      state.result={...d,repName:state.rep||d.repName||"Unknown",team:state.team,date:state.date,_id:Date.now()};
    })
    .catch(e=>state.err=e.message)
    .finally(()=>{state.loading=false;render();});
}

function renderResult(wrap,r){
  const sc=overallPct(r),vm=VM[r.verdict]||VM["needs coaching"];
  const isClosed=r.sale_closed||r._sale_closed;
  const vh=el("div",{style:{background:vm.bg,border:"1px solid "+vm.border,borderRadius:"12px",padding:"14px 18px",marginBottom:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}});
  const vl=el("div");
  const nameRow=el("div",{style:{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}});
  if(r.repName)nameRow.appendChild(el("div",{style:{fontSize:"17px",fontWeight:"800",color:vm.text}},r.repName));
  if(isClosed)nameRow.appendChild(el("div",{style:{background:"#E1F5EE",color:"#085041",fontSize:"10px",fontWeight:"700",padding:"2px 8px",borderRadius:"20px",border:"1px solid #5DCAA5"}},"✓ Venta Cerrada"));
  vl.appendChild(nameRow);
  if(r.team||r._team)vl.appendChild(el("div",{style:{fontSize:"11px",color:vm.text,opacity:".8",marginTop:"2px"}},"🏢 "+(r.team||r._team)));
  vl.appendChild(el("div",{style:{fontSize:"11px",color:vm.text,opacity:".7"}},r.date||""));
  vl.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"600",color:vm.text,marginTop:"3px"}},vm.es+" / "+vm.en));
  vh.appendChild(vl);
  const vr=el("div",{style:{textAlign:"center",background:"rgba(255,255,255,.6)",borderRadius:"10px",padding:"10px 16px"}});
  vr.appendChild(el("div",{style:{fontSize:"32px",fontWeight:"800",color:vm.text}},sc+"%"));
  vr.appendChild(el("div",{style:{fontSize:"10px",color:vm.text}},"Overall"));
  vh.appendChild(vr);wrap.appendChild(vh);

  // Manager notes if viewing from history
  if(r._dbid){
    const notesWrap=el("div",{style:{marginBottom:"14px"}});
    const notesLabel=el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"📝 Notas del Manager");
    notesWrap.appendChild(notesLabel);
    const notesTA=el("textarea",{placeholder:"Agregar notas...",style:{width:"100%",minHeight:"60px",resize:"vertical",borderRadius:"7px",border:"1px solid #e5e7eb",padding:"8px 10px",fontSize:"12px",lineHeight:"1.5",outline:"none",fontFamily:"inherit"}},r._notes||"");
    notesWrap.appendChild(notesTA);
    const notesBtns=el("div",{style:{display:"flex",gap:"8px",marginTop:"6px"}});
    notesBtns.appendChild(el("button",{style:{fontSize:"11px",padding:"5px 12px",background:BRAND,color:"#fff",border:"none",borderRadius:"6px",fontWeight:"600"},onClick:()=>{
      fetch("/api/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:r._dbid,notes:notesTA.value})}).then(()=>{r._notes=notesTA.value;});
    }},"Guardar nota"));
    const closedToggle=el("button",{style:{fontSize:"11px",padding:"5px 12px",background:isClosed?"#E1F5EE":"#f3f4f6",color:isClosed?"#085041":"#6b7280",border:"1px solid "+(isClosed?"#5DCAA5":"#e5e7eb"),borderRadius:"6px",fontWeight:"600"},onClick:()=>{
      const newVal=!isClosed;
      fetch("/api/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:r._dbid,sale_closed:newVal})}).then(()=>{
        r._sale_closed=newVal;r.sale_closed=newVal;
        state.histLoading=false;loadHistory();render();
      });
    }},isClosed?"✓ Venta Cerrada":"Marcar Venta Cerrada");
    notesBtns.appendChild(closedToggle);
    notesWrap.appendChild(notesBtns);
    wrap.appendChild(notesWrap);
  }

  if(r.summary_es||r.summary_en){
    const sb=el("div",{style:{background:"#f9fafb",borderLeft:"3px solid "+BRAND,padding:"10px 14px",borderRadius:"0 8px 8px 0",marginBottom:"14px",fontSize:"12px",lineHeight:"1.7",color:"#374151"}});
    if((state.lang==="both"||state.lang==="es")&&r.summary_es)sb.appendChild(el("div",null,r.summary_es));
    if((state.lang==="both"||state.lang==="en")&&r.summary_en)sb.appendChild(el("div",{style:{color:"#6b7280",marginTop:"4px"}},r.summary_en));
    wrap.appendChild(sb);
  }
  const grid=el("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px",marginBottom:"14px"}});
  CATS.filter(c=>c.id!=="opportunities").forEach(c=>{
    const pct=calcPct(c.id,r);
    const card=el("div",{style:{background:c.bg,border:"1px solid "+c.color,borderRadius:"9px",padding:"9px 6px",textAlign:"center"}});
    card.appendChild(el("div",{style:{fontSize:"9px",fontWeight:"700",color:c.tc,marginBottom:"2px",lineHeight:"1.2"}},c.label));
    card.appendChild(el("div",{style:{fontSize:"19px",fontWeight:"800",color:c.tc}},pct!==null?pct+"%":"—"));
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  CATS.forEach(c=>{
    const cd=r.categories?.[c.id];if(!cd)return;
    const scores=cd.scores||[];if(!scores.some(s=>s!=="na"))return;
    const pct=calcPct(c.id,r);
    const box=el("div",{style:{border:"1px solid "+c.color,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}});
    const hd=el("div",{style:{background:c.bg,padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}});
    hd.appendChild(el("div",{style:{fontWeight:"700",fontSize:"12px",color:c.tc}},c.label+" / "+c.label_en));
    if(pct!==null)hd.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"700",color:c.tc}},pct+"%"));
    box.appendChild(hd);
    const body=el("div",{style:{padding:"6px 14px 10px",background:"#fff"}});
    scores.forEach((s,i)=>{
      const row=el("div",{style:{padding:"6px 0",borderBottom:i<scores.length-1?"1px solid #f3f4f6":"none"}});
      const tw2=el("div",{style:{fontSize:"12px",color:"#374151",flex:"1",lineHeight:"1.5",display:"flex",flexDirection:"column",gap:"2px"}});
      if(state.lang==="both"||state.lang==="es")tw2.appendChild(el("div",null,c.es[i]||""));
      if(state.lang==="both")tw2.appendChild(el("div",{style:{fontSize:"10px",color:"#9ca3af"}},c.en[i]||""));
      if(state.lang==="en")tw2.appendChild(el("div",null,c.en[i]||""));
      const ri=el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}});
      ri.appendChild(tw2);
      ri.appendChild(el("span",{className:"badge badge-"+(s==="pass"?"pass":s==="fail"?"fail":"na")},s==="pass"?"✓ Pass":s==="fail"?"✗ Fail":"— N/A"));
      row.appendChild(ri);
      if(s==="fail"){
        const ne=cd.notes_es?.[i],nen=cd.notes_en?.[i];
        if(ne||nen){
          const note=el("div",{style:{marginTop:"5px",background:"#FEF3C7",borderLeft:"3px solid #F59E0B",padding:"5px 9px",borderRadius:"0 5px 5px 0",fontSize:"11px",color:"#92400E",lineHeight:"1.6"}});
          if((state.lang==="both"||state.lang==="es")&&ne)note.appendChild(el("div",null,"💬 "+ne));
          if((state.lang==="both"||state.lang==="en")&&nen)note.appendChild(el("div",{style:{color:"#78350F",marginTop:"2px"}},"💬 "+nen));
          row.appendChild(note);
        }
      }
      body.appendChild(row);
    });
    box.appendChild(body);wrap.appendChild(box);
  });
  if(r.coaching_es||r.coaching_en){
    const cb=el("div",{style:{background:"#fdf2f8",border:"1px solid #EC4899",borderRadius:"10px",padding:"13px 15px",marginTop:"4px"}});
    cb.appendChild(el("div",{style:{fontWeight:"700",fontSize:"13px",color:"#9D174D",marginBottom:"7px"}},"🎯 Coaching"));
    if((state.lang==="both"||state.lang==="es")&&r.coaching_es)cb.appendChild(el("div",{style:{fontSize:"12px",color:"#9D174D",lineHeight:"1.7",marginBottom:"8px"}},r.coaching_es));
    if((state.lang==="both"||state.lang==="en")&&r.coaching_en)cb.appendChild(el("div",{style:{fontSize:"12px",color:"#BE185D",lineHeight:"1.7"}},r.coaching_en));
    wrap.appendChild(cb);
  }
  wrap.appendChild(el("button",{style:{width:"100%",marginTop:"14px",background:BRAND,color:"#fff",border:"none",borderRadius:"8px",padding:"10px 0",fontSize:"13px",fontWeight:"700"},onClick:()=>downloadReport(r)},"⬇ Download Report"));
}

function renderHistory(app){
  const filterRow=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:"8px",marginBottom:"12px",alignItems:"center"}});
  const repIn=el("input",{type:"text",placeholder:"Filtrar por rep…",value:state.filterRep,onInput:e=>{state.filterRep=e.target.value;state.histLoading=false;loadHistory();}});
  const teamSel=el("select",{onChange:e=>{state.filterTeam=e.target.value;state.histLoading=false;loadHistory();}});
  teamSel.appendChild(el("option",{value:""},"Todos los equipos"));
  TEAMS.forEach(t=>{const o=el("option",{value:t},t);if(t===state.filterTeam)o.selected=true;teamSel.appendChild(o);});
  filterRow.appendChild(repIn);filterRow.appendChild(teamSel);
  filterRow.appendChild(el("button",{style:{padding:"8px 14px",background:"#fff",border:"1px solid #e5e7eb",borderRadius:"7px",fontSize:"12px",fontWeight:"600",color:"#374151",whiteSpace:"nowrap"},onClick:exportCSV},"⬇ CSV"));
  app.appendChild(filterRow);
  if(state.histLoading){app.appendChild(el("div",{style:{textAlign:"center",color:"#9ca3af",padding:"48px",fontSize:"13px"}},"Cargando…"));return;}
  if(!state.hist.length){app.appendChild(el("div",{style:{textAlign:"center",color:"#9ca3af",padding:"48px",fontSize:"13px"}},"No hay llamadas aún."));return;}
  state.hist.forEach(h=>{
    const sc=overallPct(h),vm=VM[h.verdict]||VM["needs coaching"];
    const isClosed=h.sale_closed||h._sale_closed;
    const row=el("div",{style:{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"10px",padding:"12px 14px",marginBottom:"10px",display:"flex",justifyContent:"space-between",alignItems:"center"}});
    const left=el("div",{style:{flex:"1"}});
    const nameRow=el("div",{style:{display:"flex",alignItems:"center",gap:"6px"}});
    nameRow.appendChild(el("div",{style:{fontWeight:"700",fontSize:"13px"}},h.repName||"Unknown"));
    if(isClosed)nameRow.appendChild(el("span",{style:{fontSize:"9px",background:"#E1F5EE",color:"#085041",borderRadius:"4px",padding:"1px 5px",fontWeight:"700"}},"✓ Cerrada"));
    left.appendChild(nameRow);
    const meta=el("div",{style:{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}});
    const teamName=h.team||h._team;
    if(teamName)meta.appendChild(el("span",{style:{background:"#fdf2f8",color:"#9D174D",borderRadius:"4px",padding:"1px 6px",fontSize:"10px",fontWeight:"600",marginRight:"6px"}},teamName));
    meta.appendChild(el("span",null,h.date||""));
    left.appendChild(meta);
    if(h._notes)left.appendChild(el("div",{style:{fontSize:"11px",color:"#6b7280",marginTop:"3px",fontStyle:"italic"}},"📝 "+h._notes.slice(0,50)+(h._notes.length>50?"…":"")));
    row.appendChild(left);
    const right=el("div",{style:{display:"flex",alignItems:"center",gap:"8px"}});
    const vb=el("div",{style:{background:vm.bg,border:"1px solid "+vm.border,borderRadius:"7px",padding:"5px 12px",textAlign:"center"}});
    vb.appendChild(el("div",{style:{fontSize:"17px",fontWeight:"800",color:vm.text}},sc+"%"));
    vb.appendChild(el("div",{style:{fontSize:"9px",color:vm.text}},vm.es));
    right.appendChild(vb);
    right.appendChild(el("button",{style:{fontSize:"11px",color:BRAND,background:"none",border:"1px solid "+BRAND,borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontWeight:"600"},onClick:()=>{state.viewing=h;state.tab="view";render();}},"Ver →"));
    right.appendChild(el("button",{style:{fontSize:"11px",color:"#EF4444",background:"none",border:"1px solid #EF4444",borderRadius:"6px",padding:"5px 8px",cursor:"pointer",fontWeight:"600"},onClick:()=>{
      if(confirm("¿Eliminar esta llamada? Esta acción no se puede deshacer.")){
        fetch("/api/delete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:h._dbid})}).then(()=>{
          state.hist=state.hist.filter(x=>x._dbid!==h._dbid);
          state.dashLoading=false;loadDashboard();render();
        });
      }
    }},"🗑"));
    row.appendChild(right);app.appendChild(row);
  });
}

function renderTrends(app){
  if(state.histLoading){app.appendChild(el("div",{style:{textAlign:"center",color:"#9ca3af",padding:"48px"}},"Cargando…"));return;}
  if(!state.hist.length){app.appendChild(el("div",{style:{textAlign:"center",color:"#9ca3af",padding:"48px",fontSize:"13px"}},"No hay llamadas aún."));return;}
  app.appendChild(el("div",{style:{fontWeight:"800",fontSize:"15px",marginBottom:"12px"}},"Promedio por Equipo / Team Averages"));
  const teamData={};
  state.hist.forEach(h=>{const t=h.team||h._team||"Sin equipo";if(!teamData[t])teamData[t]=[];teamData[t].push(overallPct(h));});
  const teamGrid=el("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"20px"}});
  Object.entries(teamData).forEach(([team,scores])=>{
    const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const card=el("div",{style:{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"10px",padding:"12px 10px",textAlign:"center"}});
    card.appendChild(el("div",{style:{fontSize:"10px",fontWeight:"700",color:"#9D174D",background:"#fdf2f8",borderRadius:"5px",padding:"2px 6px",marginBottom:"6px",display:"inline-block"}},team));
    card.appendChild(el("div",{style:{fontSize:"22px",fontWeight:"800",color:"#111827"}},avg+"%"));
    card.appendChild(el("div",{style:{fontSize:"10px",color:"#9ca3af"}},scores.length+" llamada"+(scores.length!==1?"s":"")));
    teamGrid.appendChild(card);
  });
  app.appendChild(teamGrid);
  app.appendChild(el("div",{style:{fontWeight:"800",fontSize:"15px",marginBottom:"12px"}},"Tendencias por Rep"));
  const byRep={};
  state.hist.forEach(h=>{const n=h.repName||"Unknown";if(!byRep[n])byRep[n]=[];byRep[n].push(h);});
  Object.entries(byRep).forEach(([name,calls])=>{
    const sorted=[...calls].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const scores=sorted.map(c=>overallPct(c));
    const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const trend=scores.length>1?scores[scores.length-1]-scores[0]:0;
    const team=calls[0]?.team||calls[0]?._team||"";
    const card=el("div",{style:{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"12px",padding:"14px 16px",marginBottom:"12px"}});
    const rh=el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}});
    const rl=el("div");
    rl.appendChild(el("div",{style:{fontWeight:"700",fontSize:"14px"}},name));
    const repMeta=el("div",{style:{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}});
    if(team)repMeta.appendChild(el("span",{style:{background:"#fdf2f8",color:"#9D174D",borderRadius:"4px",padding:"1px 6px",fontSize:"10px",fontWeight:"600",marginRight:"6px"}},team));
    repMeta.appendChild(el("span",null,calls.length+" llamada"+(calls.length!==1?"s":"")));
    rl.appendChild(repMeta);rh.appendChild(rl);
    const rr=el("div",{style:{display:"flex",gap:"8px",alignItems:"center"}});
    const ab=el("div",{style:{textAlign:"center",background:"#fdf2f8",border:"1px solid #EC4899",borderRadius:"8px",padding:"5px 10px"}});
    ab.appendChild(el("div",{style:{fontSize:"16px",fontWeight:"800",color:"#9D174D"}},avg+"%"));
    ab.appendChild(el("div",{style:{fontSize:"9px",color:"#9D174D"}},"Promedio"));
    rr.appendChild(ab);
    if(scores.length>1){
      const tc=trend>0?"#085041":trend<0?"#991B1B":"#6b7280";
      const tbg=trend>0?"#E1F5EE":trend<0?"#FEE2E2":"#f3f4f6";
      const te=el("div",{style:{textAlign:"center",background:tbg,borderRadius:"8px",padding:"5px 10px"}});
      te.appendChild(el("div",{style:{fontSize:"16px",fontWeight:"800",color:tc}},(trend>0?"+":"")+trend+"%"));
      te.appendChild(el("div",{style:{fontSize:"9px",color:tc}},"Tendencia"));
      rr.appendChild(te);
    }
    rh.appendChild(rr);card.appendChild(rh);
    if(scores.length>1){
      const maxS=Math.max(...scores),minS=Math.min(...scores),range=maxS-minS||1;
      const w=300,h=50,pad=4;
      const pts=scores.map((s,i)=>{const x=pad+(i/(scores.length-1))*(w-2*pad);const y=pad+((maxS-s)/range)*(h-2*pad);return x+","+y;}).join(" ");
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("viewBox","0 0 "+w+" "+h);svg.setAttribute("style","width:100%;height:50px;");
      const poly=document.createElementNS("http://www.w3.org/2000/svg","polyline");
      poly.setAttribute("points",pts);poly.setAttribute("fill","none");
      poly.setAttribute("stroke",BRAND);poly.setAttribute("stroke-width","2");
      poly.setAttribute("stroke-linejoin","round");svg.appendChild(poly);
      scores.forEach((s,i)=>{
        const x=pad+(i/(scores.length-1))*(w-2*pad);const y=pad+((maxS-s)/range)*(h-2*pad);
        const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
        c.setAttribute("cx",x);c.setAttribute("cy",y);c.setAttribute("r","3");c.setAttribute("fill",BRAND);svg.appendChild(c);
      });
      card.appendChild(svg);
      const dr=el("div",{style:{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#9ca3af",marginTop:"2px"}});
      dr.appendChild(el("span",null,sorted[0].date||""));dr.appendChild(el("span",null,sorted[sorted.length-1].date||""));card.appendChild(dr);
    }
    app.appendChild(card);
  });
}

function renderView(app){
  app.appendChild(el("button",{style:{fontSize:"12px",color:BRAND,background:"none",border:"none",cursor:"pointer",marginBottom:"14px",fontWeight:"600"},onClick:()=>{state.tab="history";render();}},"← Historial"));
  const wrap=el("div",{style:{background:"#fff",borderRadius:"12px",padding:"16px",border:"1px solid #e5e7eb"}});
  renderResult(wrap,state.viewing);app.appendChild(wrap);
}

function exportCSV(){
  if(!state.hist.length)return;
  const headers=["Rep","Equipo","Fecha","Veredicto","Score General","Venta Cerrada","Saludo","Descubrimiento","Presentación","Objeciones","Cierre","Rapport","Notas Manager"];
  const rows=state.hist.map(h=>[
    h.repName||"",h.team||h._team||"",h.date||"",h.verdict||"",overallPct(h),
    (h.sale_closed||h._sale_closed)?"Sí":"No",
    calcPct("greeting",h)??"",calcPct("discovery",h)??"",calcPct("presentation",h)??"",
    calcPct("objections",h)??"",calcPct("closing",h)??"",calcPct("rapport",h)??"",
    h._notes||""
  ]);
  const csv=[headers,...rows].map(r=>r.map(v=>'"'+(String(v).replace(/"/g,'""'))+'"').join(",")).join("\\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download="VamosQA_Team_"+new Date().toISOString().slice(0,10)+".csv";a.click();
}

function downloadReport(r){
  const sc=overallPct(r),vm=VM[r.verdict]||VM["needs coaching"];
  const isClosed=r.sale_closed||r._sale_closed;
  const rows=CATS.map(c=>{
    const cd=r.categories?.[c.id];if(!cd)return"";
    const items=(cd.scores||[]).map((s,i)=>{
      const badge=s==="pass"?'<span style="color:#085041;font-weight:700">✓ Pass</span>':s==="fail"?'<span style="color:#991B1B;font-weight:700">✗ Fail</span>':'<span style="color:#6b7280">— N/A</span>';
      const ne=cd.notes_es?.[i],nen=cd.notes_en?.[i];
      const noteHtml=s==="fail"&&(ne||nen)?'<div style="background:#FEF3C7;border-left:3px solid #F59E0B;padding:4px 8px;margin-top:3px;font-size:10px;color:#92400E;line-height:1.6">'+(ne?"💬 "+ne:"")+((ne&&nen)?"<br>":"")+(nen?'<span style="color:#78350F">💬 '+nen+"</span>":"")+"</div>":"";
      return'<tr><td style="padding:5px 8px;font-size:11px;vertical-align:top">'+c.es[i]+'<br><span style="color:#9ca3af;font-size:10px">'+c.en[i]+"</span>"+noteHtml+"</td><td style='padding:5px 8px;text-align:center;vertical-align:top'>"+badge+"</td></tr>";
    }).join("");
    const pct=calcPct(c.id,r);
    return'<tr><td colspan="2" style="background:'+c.bg+';padding:8px 10px;font-weight:700;font-size:12px;color:'+c.tc+';border-top:2px solid '+c.color+'">'+c.label+" / "+c.label_en+(pct!==null?" — "+pct+"%":"")+"</td></tr>"+items;
  }).join("");
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QA Report</title></head><body style="font-family:system-ui;max-width:740px;margin:0 auto;padding:30px;color:#111"><div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #EC4899"><div><div style="display:flex;align-items:center;gap:8px"><div style="font-size:20px;font-weight:800;color:#EC4899">Vamos Health QA</div>'+(isClosed?'<span style="font-size:11px;background:#E1F5EE;color:#085041;border-radius:6px;padding:2px 8px;font-weight:700">✓ Venta Cerrada</span>':"")+'</div><div style="font-size:14px;margin-top:4px">'+(r.repName||"")+(r.team?' <span style="font-size:11px;background:#fdf2f8;color:#9D174D;border-radius:4px;padding:2px 7px">'+r.team+"</span>":"")+'</div><div style="font-size:11px;color:#9ca3af">'+(r.date||"")+'</div>'+(r._notes?'<div style="font-size:11px;color:#6b7280;margin-top:4px;font-style:italic">📝 '+r._notes+"</div>":"")+'</div><div style="background:'+vm.bg+';border:1px solid '+vm.border+';border-radius:10px;padding:12px 20px;text-align:center"><div style="font-size:32px;font-weight:800;color:'+vm.text+'">'+sc+'%</div><div style="font-size:11px;color:'+vm.text+'">'+vm.es+" / "+vm.en+'</div></div></div>'+(r.summary_es?'<div style="background:#f5f5f5;border-left:3px solid #EC4899;padding:10px 14px;margin-bottom:20px;font-size:12px;line-height:1.7;color:#374151">'+r.summary_es+(r.summary_en?"<br><br><span style='color:#9ca3af'>"+r.summary_en+"</span>":"")+"</div>":"")+'<table style="width:100%;border-collapse:collapse;margin-bottom:20px">'+rows+"</table>"+(r.coaching_es?'<div style="background:#fdf2f8;border:1px solid #EC4899;border-radius:8px;padding:14px;font-size:12px;color:#9D174D;line-height:1.7"><strong>🎯 Coaching</strong><br><br>'+r.coaching_es+(r.coaching_en?"<br><br><em style='color:#BE185D'>"+r.coaching_en+"</em>":"")+"</div>":"")+'<div style="margin-top:28px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:12px">Vamos Health QA · '+new Date().toLocaleDateString()+"</div></body></html>";
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));
  a.download="VamosQA_"+((r.repName||"Rep").replace(/\\s+/g,"_"))+"_"+(r.date||"report")+".html";a.click();
}
</script>
</body>
</html>`;
}

// ─── SERVER ───────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const urlParts = req.url.split("?");
  const url = urlParts[0];
  const appPassword = process.env.QA_PASSWORD || "VamosQA2026";

  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildHTML(appPassword));
    return;
  }

  if (req.method === "GET" && url === "/api/dashboard") {
    getDashboardStats().then(stats => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stats || {}));
    });
    return;
  }

  if (req.method === "GET" && url === "/api/history") {
    const qs = new URLSearchParams(urlParts[1] || "");
    getHistory(qs.get("rep") || "", qs.get("team") || "").then(rows => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
    });
    return;
  }

  if (req.method === "POST" && url === "/api/update") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { id, notes, sale_closed } = JSON.parse(body);
        getDbClient().then(client => {
          if (!client) { res.writeHead(500); res.end("{}"); return; }
          const updates = [];
          const params = [];
          if (notes !== undefined) { params.push(notes); updates.push(`manager_notes = $${params.length}`); }
          if (sale_closed !== undefined) { params.push(sale_closed); updates.push(`sale_closed = $${params.length}`); }
          if (!updates.length) { res.writeHead(200); res.end("{}"); return; }
          params.push(id);
          client.query(`UPDATE qa_results SET ${updates.join(",")} WHERE id = $${params.length}`, params).then(() => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          });
        });
      } catch (e) { res.writeHead(400); res.end("{}"); }
    });
    return;
  }

  if (req.method === "POST" && url === "/api/delete") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { id } = JSON.parse(body);
        getDbClient().then(client => {
          if (!client) { res.writeHead(500); res.end("{}"); return; }
          client.query("DELETE FROM qa_results WHERE id = $1", [id]).then(() => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          });
        });
      } catch (e) { res.writeHead(400); res.end("{}"); }
    });
    return;
  }

  if (req.method === "POST" && url === "/api/analyze") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { transcript, repName, team, date } = JSON.parse(body);
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }));
          return;
        }
        const trimmedTranscript = transcript.slice(0, 8000);
        const payload = JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 6000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: (repName ? `Rep name: ${repName}\n` : "") + (team ? `Team: ${team}\n` : "") + "\nTranscript:\n" + trimmedTranscript }]
        });
        const options = {
          hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
          headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": apiKey, "Content-Length": Buffer.byteLength(payload) }
        };
        const apiReq = https.request(options, apiRes => {
          let data = "";
          apiRes.on("data", c => data += c);
          apiRes.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: parsed.error.message })); return; }
              const text = (parsed.content || []).map(b => b.text || "").join("").trim();
              const clean = text.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
              const result = JSON.parse(clean);
              result.repName = repName || result.repName || "Unknown";
              result.team = team || "";
              result.date = date || "";
              saveResult(result);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (e) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Failed to parse AI response: " + e.message })); }
          });
        });
        apiReq.on("error", e => { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "API request failed: " + e.message })); });
        apiReq.write(payload); apiReq.end();
      } catch (e) { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Bad request: " + e.message })); }
    });
    return;
  }

  res.writeHead(404); res.end("Not found");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Vamos QA running on port " + PORT);
  getDbClient().then(c => console.log(c ? "Database connected" : "No database — history disabled"));
});
