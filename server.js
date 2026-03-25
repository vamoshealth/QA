const http = require("http");
const https = require("https");

const SYSTEM_PROMPT = `You are an elite sales performance coach for Vamos Health, a private medical group in Utah and Arizona. You analyze real sales calls and deliver sharp, structured coaching grounded in Vamos's actual sales system and real sales data.

WHAT VAMOS IS: NOT insurance. NOT just a clinic. A financial + healthcare access solution for the Hispanic community. No SSN or immigration status required. Bilingual (Spanish/English). Safe space for undocumented individuals.

MEMBERSHIPS:
- Vamos Core: $85/month adult, $40/month child with adult, $50/month child alone. Enrollment: $100 AZ, $25 UT. $4 copay. Unlimited visits. 12 labs included free.
- Vamos Vital: $20/month. $10 enrollment. $65/visit. Labs once/year. AZ and UT.
- Vamos Plus: $20/month. $10 enrollment. Requires accepted insurance. GLP-1 access. Utah only.
- No membership: $120/visit. Labs $200-$400+ extra.
- Cancellation fee: $240 Core, $100 Vital. Waived if patient moves far from clinics.

FAMILY DISCOUNTS: 1 adult+1 child=$10/mo off. +2 children=$20/mo off. +3=$30/mo off. +4=$50/mo off.

12 INCLUDED LABS: Urinalysis, Basic Metabolic Panel, Comprehensive Metabolic Panel, CBC, Urine Culture, HbA1c, Cholesterol/Lipid Panel, Pap Smear, PSA, Thyroid Function, Strep Test, Pregnancy Test. Outside cost: $200-$400+.

KEY SERVICES: School physicals (required, included), diabetes management, hypertension control, GLP-1 weight loss, mental health, women's health, sports medicine, newborn exams, STD treatment, allergy treatment, wound care, nutrition counseling.

VAMOS JUNTOS: Membership includes discounts on cell phones (save up to $25), restaurants, groceries, movies, hotels, car rentals, flights. Use when prospect is hesitant.

REFERRAL PROGRAM: $50 cash per successful referral (not same household). Mention at close and 3-week follow-up.

CLINICS: West Valley (385)402-7500 | Orem (801)471-0028 | Ogden (385)483-4649 | Phoenix (623)688-2667

SALES FRAMEWORK: RAPPORT → PAIN DISCOVERY → IMPACT → VALUE PRESENTATION → CLOSE. Never present before discovering pain.

KEY SALES RULES:
1. Prospect must talk MORE than rep. Questions drive sales, not monologues.
2. Never argue. Use: "Entiendo", "Tiene sentido", "Eso es muy común."
3. Always attempt to close by phone same day — even if they say they need to think.
4. No call ends without: sale closed, appointment booked, OR specific date/time follow-up. "Hablamos pronto" = failure.
5. Create urgency: "Los chequeos gratuitos se llenan rápido."
6. Anchor price: "Una consulta afuera cuesta $200-$300. Los laboratorios, $400 más."
7. Discover pain FIRST. Ask: "¿Cuándo fue al médico por última vez? ¿Cuánto le costó?"

OBJECTION TOOLS (in order — Vamos does NOT have payment plans, never penalize for not offering them):
1. Value anchoring vs outside costs
2. Urgency (limited spots)
3. Referral bonus ($50 immediate ROI)
4. Family discount codes
5. Enrollment fee waiver — LAST RESORT ONLY when call is dying over enrollment fee. Must try steps 1-4 first. If call collapsed over enrollment fee without attempting this, mark as missed opportunity.

SCORING: Evaluate each criterion as "pass", "fail", or "na". Be strict on Discovery, Value Framing, and Closing.

GREETING (4 criteria):
1. Introduced with full name and mentioned Vamos Health clearly
2. Established immediate value in first 10 seconds (free checkup, free BP/glucose screening, or clear hook)
3. Asked prospect's name and used it naturally throughout
4. Warm, professional, confident tone from first seconds

DISCOVERY (6 criteria):
1. Asked about health conditions (hypertension, diabetes, cholesterol — highest-value profiles)
2. Asked about insurance status (no insurance = Core pitch; has insurance = Vital/complement pitch)
3. Explored family situation (spouse, kids) — unlocks discounts and school physical angle
4. Identified IMMEDIATE pain before presenting anything
5. Active listening — paraphrased or confirmed what prospect said
6. Follow-up questions based on prospect's answers, not a rigid script

PRESENTATION (5 criteria):
1. Presented AFTER discovering pain — did not pitch without understanding prospect first
2. Translated benefits into specific dollar savings ("Labs outside = $200-$400, here they're included")
3. Tailored solution to specific needs this prospect mentioned
4. Simple clear language — no jargon, no info dump
5. Active dialogue — check-in questions, not a monologue

OBJECTIONS (5 criteria):
1. Received objections calmly — used "Entiendo", "Tiene sentido", "Eso es muy común"
2. Clarified objection with a question before responding
3. Addressed price with value anchoring vs outside costs — NOT payment plans (don't exist at Vamos)
4. Used approved tools in order: value anchoring → urgency → referral bonus → family discount → enrollment fee waiver (last resort)
5. Confirmed objection was resolved before moving on

CLOSING (5 criteria):
1. Asked for the sale directly and confidently
2. Attempted same-day phone close — even when prospect said they needed to think or talk to spouse
3. Used proper technique: assumptive ("¿Con qué tarjeta?"), alternative ("¿Hoy o mañana?"), or urgency ("Los cupos se llenan")
4. When hesitation arose, probed with questions instead of giving up ("¿Qué es lo que le gustaría pensar?")
5. Secured concrete next step with exact date and time — or closed. "Hablamos pronto" = fail.

RAPPORT — ENTIRE CALL (5 criteria):
1. Empathetic human tone from start to finish — not just greeting
2. Prospect felt heard and valued — genuine interest in their life
3. Prospect talked MORE than rep — rep listened, did not dominate
4. Trust built through honesty and transparency — no false promises
5. Energy and warmth consistent even through objections or silence

MISSED OPPORTUNITIES (6 criteria — "fail"=missed, "pass"=handled or not applicable):
1. Buying signal ignored — interest shown but not capitalized on
2. Family opportunity missed — spouse or kids mentioned but family plan/discounts/school physicals not explored
3. Pain mentioned in passing but not explored
4. $50 referral bonus not mentioned at close
5. Vamos Juntos not used when prospect was hesitant
6. Enrollment fee waiver not attempted when call died over enrollment fee cost

FEEDBACK FORMAT — every "fail" note must:
1. Name the exact moment from the transcript
2. Give word-for-word script of what rep should have said
3. Include a real sales stat with source

GOOD example: "Cuando Claudia dijo 'casi no me enfermo', no reencuadraste. Podrías haber dicho: 'Muchas personas sanas la usan para los laboratorios — afuera cuestan $300, aquí incluidos.' Reps que conectan beneficios preventivos con ahorro concreto cierran 34% más. (RAIN Group, 2023)"

BAD example (never): "No profundizaste en las necesidades."

SALES STATS TO USE:
- 4+ discovery questions before presenting = 43% more closes. (RAIN Group, 2023)
- Prospects who verbalize pain are 2.4x more likely to buy. (Gong.io, 2022)
- Price anchoring increases perceived value by 40%. (Journal of Consumer Psychology)
- Specific next step = 3x better conversion than open follow-up. (HubSpot, 2023)
- Rep talks less than 40% of call = 54% more closes. (Gong.io, 2021)
- Mentioning referral bonus at close increases referral rates 45%. (Wharton School of Business)
- Same-day phone close attempt = 67% more conversions. (InsideSales.com)
- Personalized pitch = 36% higher close rate. (Salesforce, 2023)
- Handling objections with questions retains 70% of hesitant prospects. (Richardson Sales Training)

COACHING SUMMARY STRUCTURE (in both Spanish and English):
1. Lo que hiciste bien / What you did well — 1-2 genuine specific wins from this call
2. Tus 3 áreas de enfoque / Your 3 focus areas — the 3 most impactful gaps, each with: exact moment + word-for-word script + sales stat
3. Lo que esto impacta / What this impacts — one sentence connecting performance to closes, retention, reactivations

Tone: Direct, respectful, like a coach who wants them to win. Always tie behavior to business outcome.

IMPORTANT: Respond with ONLY a valid JSON object. No markdown. No code blocks. Start with { and end with }.
Verdict: "strong" if pass rate>=80%, "needs coaching" 60-79%, "critical gaps" below 60%.

JSON structure:
{
  "repName": "",
  "summary_es": "2-3 sentences: what happened, what worked, critical gap",
  "summary_en": "2-3 sentences: what happened, what worked, critical gap",
  "verdict": "needs coaching",
  "coaching_es": "Structured: (1) Lo que hiciste bien, (2) 3 áreas de enfoque con scripts y estadísticas, (3) Lo que esto impacta",
  "coaching_en": "Structured: (1) What you did well, (2) 3 focus areas with scripts and stats, (3) What this impacts",
  "categories": {
    "greeting":      { "scores": ["na","na","na","na"],            "notes_es": ["","","",""],            "notes_en": ["","","",""] },
    "discovery":     { "scores": ["na","na","na","na","na","na"],  "notes_es": ["","","","","",""],      "notes_en": ["","","","","",""] },
    "presentation":  { "scores": ["na","na","na","na","na"],       "notes_es": ["","","","",""],         "notes_en": ["","","","",""] },
    "objections":    { "scores": ["na","na","na","na","na"],       "notes_es": ["","","","",""],         "notes_en": ["","","","",""] },
    "closing":       { "scores": ["na","na","na","na","na"],       "notes_es": ["","","","",""],         "notes_en": ["","","","",""] },
    "rapport":       { "scores": ["na","na","na","na","na"],       "notes_es": ["","","","",""],         "notes_en": ["","","","",""] },
    "opportunities": { "scores": ["na","na","na","na","na","na"],  "notes_es": ["","","","","",""],      "notes_en": ["","","","","",""] }
  }
}`;

const CATS_CONFIG = {
  greeting:      { count: 4 },
  discovery:     { count: 6 },
  presentation:  { count: 5 },
  objections:    { count: 5 },
  closing:       { count: 5 },
  rapport:       { count: 5 },
  opportunities: { count: 6 }
};

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vamos Health — QA System</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;color:#111827}
    input,textarea,select{font-family:inherit;font-size:13px;padding:8px 11px;border-radius:7px;border:1px solid #e5e7eb;width:100%;outline:none;background:#fff}
    input:focus,textarea:focus{border-color:#7F77DD}
    button{font-family:inherit;cursor:pointer}
    .tab{flex:1;padding:7px 0;border-radius:7px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:#6b7280}
    .tab.active{background:#fff;color:#7F77DD;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap}
    .badge-pass{background:#E1F5EE;color:#085041}
    .badge-fail{background:#FEE2E2;color:#991B1B}
    .badge-na{background:#f3f4f6;color:#6b7280}
  </style>
</head>
<body>
<div id="app" style="max-width:680px;margin:0 auto;padding:16px 12px;min-height:100vh"></div>
<script>
const BRAND="#7F77DD";
const CATS=[
  {id:"greeting",label:"Saludo",label_en:"Greeting",color:"#5DCAA5",bg:"#E1F5EE",tc:"#085041",
   es:["Se presentó con nombre completo y mencionó Vamos Health","Estableció valor inmediato en los primeros 10 segundos","Preguntó el nombre del prospecto y lo usó naturalmente","Tono cálido, profesional y seguro desde el inicio"],
   en:["Introduced with full name and mentioned Vamos Health","Established immediate value in first 10 seconds","Asked prospect's name and used it naturally","Warm, professional, confident tone from the start"]},
  {id:"discovery",label:"Descubrimiento",label_en:"Discovery",color:"#7F77DD",bg:"#EEEDFE",tc:"#3C3489",
   es:["Preguntó sobre condiciones de salud (hipertensión, diabetes, colesterol)","Preguntó sobre estatus de seguro médico — pivote crítico de la presentación","Exploró situación familiar (cónyuge, hijos) — descuentos y chequeos escolares","Identificó el dolor INMEDIATO antes de presentar cualquier solución","Escucha activa — parafraseó o confirmó lo que escuchó","Preguntas basadas en respuestas del prospecto, no en un guión rígido"],
   en:["Asked about health conditions (hypertension, diabetes, cholesterol)","Asked about insurance status — critical pitch pivot point","Explored family situation (spouse, kids) — unlocks discounts and school physicals","Identified IMMEDIATE pain before presenting anything","Active listening — paraphrased or confirmed what was heard","Follow-up questions based on prospect's answers, not a rigid script"]},
  {id:"presentation",label:"Presentación",label_en:"Presentation",color:"#D4537E",bg:"#FBEAF0",tc:"#72243E",
   es:["Presentó DESPUÉS de descubrir el dolor — no lanzó el pitch sin entender primero","Tradujo beneficios a ahorros concretos en dólares ('Labs afuera = $200-$400, aquí incluidos')","Personalizó la solución a las necesidades específicas de este prospecto","Lenguaje simple y claro — sin jerga ni sobrecarga de información","Diálogo activo — hizo preguntas de verificación, no un monólogo unilateral"],
   en:["Presented AFTER discovering pain — did not pitch without understanding prospect first","Translated benefits into specific dollar savings ('Labs outside = $200-$400, here included')","Tailored solution to this prospect's specific needs","Simple clear language — no jargon, no info overload","Active dialogue — check-in questions, not a one-sided monologue"]},
  {id:"objections",label:"Objeciones",label_en:"Objections",color:"#D85A30",bg:"#FAECE7",tc:"#712B13",
   es:["Recibió objeciones con calma — usó 'Entiendo', 'Tiene sentido', 'Eso es muy común'","Clarificó la objeción con una pregunta antes de responder","Respondió al precio con valor comparado vs costos externos — NO planes de pago (no existen en Vamos)","Usó herramientas en orden: valor → urgencia → bono de referido → descuento familiar → exención de inscripción (último recurso)","Confirmó que la objeción quedó resuelta antes de continuar"],
   en:["Received objections calmly — used 'Entiendo', 'Tiene sentido', 'Eso es muy común'","Clarified objection with a question before responding","Addressed price with value vs outside costs — NOT payment plans (don't exist at Vamos)","Used approved tools in order: value → urgency → referral bonus → family discount → fee waiver (last resort)","Confirmed objection was resolved before moving on"]},
  {id:"closing",label:"Cierre",label_en:"Closing",color:"#639922",bg:"#EAF3DE",tc:"#27500A",
   es:["Pidió la venta directamente y con seguridad","Intentó cerrar por teléfono el mismo día — incluso cuando dijeron que necesitaban pensar","Usó técnica adecuada: asuntivo ('¿Con qué tarjeta?'), alternativa ('¿Hoy o mañana?'), urgencia ('Los cupos se llenan')","Ante dudas, profundizó con preguntas en vez de rendirse ('¿Qué es lo que le gustaría pensar?')","Aseguró próximo paso concreto con fecha y hora exactas — o cerró la venta. 'Hablamos pronto' = falla."],
   en:["Asked for the sale directly and confidently","Attempted same-day phone close — even when prospect needed to think or talk to spouse","Used proper technique: assumptive ('¿Con qué tarjeta?'), alternative ('Today or tomorrow?'), urgency ('Spots fill up')","When hesitation arose, probed with questions instead of giving up","Secured concrete next step with exact date/time — or closed. 'Talk soon' = fail."]},
  {id:"rapport",label:"Rapport (Toda la llamada)",label_en:"Rapport (Entire call)",color:"#378ADD",bg:"#E6F1FB",tc:"#0C447C",
   es:["Tono empático y humano de principio a fin — no solo en el saludo","El prospecto se sintió escuchado y valorado — interés genuino en su vida","El prospecto habló MÁS que el rep — el rep escuchó y no dominó la conversación","Generó confianza con honestidad y transparencia — sin falsas promesas ni presión","Energía y calidez consistentes incluso ante objeciones o silencios"],
   en:["Empathetic human tone from start to finish — not just greeting","Prospect felt heard and valued — genuine interest in their life","Prospect talked MORE than rep — rep listened and did not dominate","Trust built through honesty and transparency — no false promises or pressure","Energy and warmth consistent even through objections or silence"]},
  {id:"opportunities",label:"Oportunidades Perdidas",label_en:"Missed Opportunities",color:"#888780",bg:"#F1EFE8",tc:"#2C2C2A",
   es:["Señal de compra ignorada — el prospecto mostró interés y no se capitalizó","Oportunidad familiar perdida — mencionó cónyuge o hijos pero no se exploró plan familiar, descuentos o chequeos escolares","Dolor mencionado de pasada sin profundizar","Bono de $50 por referido no mencionado al cierre","Beneficios de Vamos Juntos no usados cuando el prospecto dudaba","Exención de inscripción no intentada cuando la llamada se cayó por el costo de inscripción"],
   en:["Buying signal ignored — prospect showed interest and rep did not capitalize","Family opportunity missed — spouse or kids mentioned but family plan/discounts/school physicals not explored","Pain mentioned in passing but not explored","$50 referral bonus not mentioned at close","Vamos Juntos benefits not used when prospect was hesitant","Enrollment fee waiver not attempted when call died over enrollment fee"]}
];

const VM={
  "strong":{bg:"#def7ec",text:"#03543f",border:"#03543f",es:"Sólido",en:"Strong"},
  "needs coaching":{bg:"#fef3c7",text:"#92400e",border:"#d97706",es:"Necesita Coaching",en:"Needs Coaching"},
  "critical gaps":{bg:"#fde8e8",text:"#9b1c1c",border:"#dc2626",es:"Brechas Críticas",en:"Critical Gaps"}
};
const LS="vamos_v7";

let state={tab:"analyze",tx:"",rep:"",date:new Date().toISOString().slice(0,10),loading:false,result:null,err:"",hist:[],viewing:null,filter:"",lang:"both"};
try{const d=localStorage.getItem(LS);if(d)state.hist=JSON.parse(d);}catch(e){}

function saveHist(){try{localStorage.setItem(LS,JSON.stringify(state.hist));}catch(e){}}

function calcPct(catId,r){
  const s=r?.categories?.[catId]?.scores||[];
  const p=s.filter(x=>x==="pass").length,t=s.filter(x=>x==="pass"||x==="fail").length;
  return t>0?Math.round(p/t*100):null;
}
function overallPct(r){
  if(!r?.categories)return 0;
  let p=0,t=0;
  CATS.filter(c=>c.id!=="opportunities").forEach(c=>{
    (r.categories[c.id]?.scores||[]).forEach(s=>{if(s==="pass"){p++;t++;}else if(s==="fail")t++;});
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
  const logo=el("div",{style:{width:"36px",height:"36px",background:BRAND,borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"16px"}},"V");
  const hTitles=el("div");
  hTitles.appendChild(el("div",{style:{fontWeight:"800",fontSize:"15px"}},"Vamos Health QA"));
  hTitles.appendChild(el("div",{style:{fontSize:"11px",color:"#9ca3af"}},"Sales Call Analyzer"));
  hLeft.appendChild(logo);hLeft.appendChild(hTitles);hdr.appendChild(hLeft);
  const langSel=el("select",{style:{width:"auto",fontSize:"11px",padding:"4px 8px",borderRadius:"6px",border:"1px solid #e5e7eb"},onChange:e=>{state.lang=e.target.value;render();}});
  [["both","ES + EN"],["es","Solo Español"],["en","English only"]].forEach(([v,t])=>{const o=el("option",{value:v},t);if(v===state.lang)o.selected=true;langSel.appendChild(o);});
  hdr.appendChild(langSel);app.appendChild(hdr);
  const tabBar=el("div",{style:{display:"flex",gap:"4px",marginBottom:"16px",background:"#ececec",borderRadius:"9px",padding:"4px"}});
  const tabs=[["analyze","Analizar"],["history","Historial"],...(state.viewing?[["view","Reporte"]]:[])] ;
  tabs.forEach(([id,label])=>{const b=el("button",{className:"tab"+(state.tab===id?" active":""),onClick:()=>{state.tab=id;render();}},label);tabBar.appendChild(b);});
  app.appendChild(tabBar);
  if(state.tab==="analyze")renderAnalyze(app);
  else if(state.tab==="history")renderHistory(app);
  else if(state.tab==="view"&&state.viewing)renderView(app);
}

function renderAnalyze(app){
  const wrap=el("div",{style:{background:"#fff",borderRadius:"12px",padding:"16px",border:"1px solid #e5e7eb"}});
  const grid=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}});
  const repWrap=el("div");
  repWrap.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"Nombre del Rep"));
  const repIn=el("input",{type:"text",placeholder:"Ej. Maria Garcia",value:state.rep,onInput:e=>state.rep=e.target.value});
  repWrap.appendChild(repIn);
  const dateWrap=el("div");
  dateWrap.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"Fecha"));
  const dateIn=el("input",{type:"date",value:state.date,onInput:e=>state.date=e.target.value});
  dateWrap.appendChild(dateIn);
  grid.appendChild(repWrap);grid.appendChild(dateWrap);
  wrap.appendChild(grid);
  wrap.appendChild(el("div",{style:{fontSize:"11px",fontWeight:"600",color:"#374151",marginBottom:"4px"}},"Transcripción de la llamada"));
  const ta=el("textarea",{placeholder:"Pega la transcripción aquí (español o inglés)...",style:{width:"100%",minHeight:"180px",resize:"vertical",borderRadius:"8px",border:"1px solid #e5e7eb",padding:"10px 12px",fontSize:"13px",lineHeight:"1.6",marginBottom:"12px",outline:"none",fontFamily:"inherit"},onInput:e=>state.tx=e.target.value},state.tx);
  wrap.appendChild(ta);
  const btn=el("button",{style:{width:"100%",padding:"11px 0",background:state.loading||!state.tx.trim()?"#e5e7eb":BRAND,color:state.loading||!state.tx.trim()?"#9ca3af":"#fff",border:"none",borderRadius:"8px",fontSize:"14px",fontWeight:"700"},onClick:doAnalyze},state.loading?"⏳ Analizando…":"Analizar Llamada");
  wrap.appendChild(btn);
  if(state.err)wrap.appendChild(el("div",{style:{marginTop:"12px",background:"#FEE2E2",border:"1px solid #EF4444",borderRadius:"8px",padding:"10px 14px",fontSize:"12px",color:"#991B1B"}},"⚠ "+state.err));
  if(state.result&&!state.loading){const rd=el("div",{style:{marginTop:"18px"}});renderResult(rd,state.result);wrap.appendChild(rd);}
  app.appendChild(wrap);
}

function doAnalyze(){
  if(!state.tx.trim()||state.loading)return;
  state.loading=true;state.err="";state.result=null;render();
  fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript:state.tx,repName:state.rep})})
    .then(r=>r.json().then(d=>({ok:r.ok,d})))
    .then(({ok,d})=>{
      if(!ok)throw new Error(d.error||"Server error");
      const entry=Object.assign({},d,{repName:state.rep||d.repName||"Unknown",date:state.date,_id:Date.now(),transcript:state.tx});
      state.result=entry;
      state.hist=[entry,...state.hist].slice(0,100);
      saveHist();
    })
    .catch(e=>state.err=e.message)
    .finally(()=>{state.loading=false;render();});
}

function renderResult(wrap,r){
  const sc=overallPct(r);
  const vm=VM[r.verdict]||VM["needs coaching"];
  const vh=el("div",{style:{background:vm.bg,border:"1px solid "+vm.border,borderRadius:"12px",padding:"14px 18px",marginBottom:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}});
  const vLeft=el("div");
  if(r.repName)vLeft.appendChild(el("div",{style:{fontSize:"17px",fontWeight:"800",color:vm.text}},r.repName));
  vLeft.appendChild(el("div",{style:{fontSize:"11px",color:vm.text,opacity:".7"}},r.date||""));
  vLeft.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"600",color:vm.text,marginTop:"3px"}},vm.es+" / "+vm.en));
  vh.appendChild(vLeft);
  const vRight=el("div",{style:{textAlign:"center",background:"rgba(255,255,255,.5)",borderRadius:"10px",padding:"10px 16px"}});
  vRight.appendChild(el("div",{style:{fontSize:"32px",fontWeight:"800",color:vm.text}},sc+"%"));
  vRight.appendChild(el("div",{style:{fontSize:"10px",color:vm.text}},"Overall"));
  vh.appendChild(vRight);wrap.appendChild(vh);

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
    const catData=r.categories?.[c.id];
    if(!catData)return;
    const scores=catData.scores||[];
    if(!scores.some(s=>s!=="na"))return;
    const pct=calcPct(c.id,r);
    const box=el("div",{style:{border:"1px solid "+c.color,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}});
    const hd=el("div",{style:{background:c.bg,padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}});
    hd.appendChild(el("div",{style:{fontWeight:"700",fontSize:"12px",color:c.tc}},c.label+" / "+c.label_en));
    if(pct!==null)hd.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"700",color:c.tc}},pct+"%"));
    box.appendChild(hd);
    const body=el("div",{style:{padding:"6px 14px 10px",background:"#fff"}});
    scores.forEach((s,i)=>{
      const row=el("div",{style:{padding:"6px 0",borderBottom:i<scores.length-1?"1px solid #f3f4f6":"none"}});
      const txtWrap=el("div",{style:{fontSize:"12px",color:"#374151",flex:"1",lineHeight:"1.5",display:"flex",flexDirection:"column",gap:"2px"}});
      if(state.lang==="both"||state.lang==="es")txtWrap.appendChild(el("div",null,c.es[i]||""));
      if(state.lang==="both")txtWrap.appendChild(el("div",{style:{fontSize:"10px",color:"#9ca3af"}},c.en[i]||""));
      if(state.lang==="en")txtWrap.appendChild(el("div",null,c.en[i]||""));
      const rowInner=el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}});
      rowInner.appendChild(txtWrap);
      const badge=el("span",{className:"badge badge-"+(s==="pass"?"pass":s==="fail"?"fail":"na")},s==="pass"?"✓ Pass":s==="fail"?"✗ Fail":"— N/A");
      rowInner.appendChild(badge);
      row.appendChild(rowInner);
      if(s==="fail"){
        const ne=catData.notes_es?.[i],nen=catData.notes_en?.[i];
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
    const cb=el("div",{style:{background:"#EEEDF9",border:"1px solid "+BRAND,borderRadius:"10px",padding:"13px 15px",marginTop:"4px"}});
    cb.appendChild(el("div",{style:{fontWeight:"700",fontSize:"13px",color:"#3730A3",marginBottom:"7px"}},"🎯 Coaching"));
    if((state.lang==="both"||state.lang==="es")&&r.coaching_es)cb.appendChild(el("div",{style:{fontSize:"12px",color:"#3730A3",lineHeight:"1.7",marginBottom:"8px"}},r.coaching_es));
    if((state.lang==="both"||state.lang==="en")&&r.coaching_en)cb.appendChild(el("div",{style:{fontSize:"12px",color:"#4338CA",lineHeight:"1.7"}},r.coaching_en));
    wrap.appendChild(cb);
  }

  wrap.appendChild(el("button",{style:{width:"100%",marginTop:"14px",background:BRAND,color:"#fff",border:"none",borderRadius:"8px",padding:"10px 0",fontSize:"13px",fontWeight:"700"},onClick:()=>downloadReport(r)},"⬇ Download Report"));
}

function renderHistory(app){
  const fi=el("input",{type:"text",placeholder:"Filtrar por nombre del rep…",value:state.filter,style:{marginBottom:"12px"},onInput:e=>{state.filter=e.target.value;render();}});
  app.appendChild(fi);
  const filtered=state.hist.filter(h=>!state.filter||h.repName?.toLowerCase().includes(state.filter.toLowerCase()));
  if(!filtered.length){app.appendChild(el("div",{style:{textAlign:"center",color:"#9ca3af",padding:"48px",fontSize:"13px"}},"No hay llamadas aún."));return;}
  filtered.forEach(h=>{
    const sc=overallPct(h),vm=VM[h.verdict]||VM["needs coaching"];
    const row=el("div",{style:{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"10px",padding:"12px 14px",marginBottom:"10px",display:"flex",justifyContent:"space-between",alignItems:"center"}});
    const left=el("div");
    left.appendChild(el("div",{style:{fontWeight:"700",fontSize:"13px"}},h.repName||"Unknown"));
    left.appendChild(el("div",{style:{fontSize:"11px",color:"#9ca3af"}},h.date||""));
    row.appendChild(left);
    const right=el("div",{style:{display:"flex",alignItems:"center",gap:"10px"}});
    const vb=el("div",{style:{background:vm.bg,border:"1px solid "+vm.border,borderRadius:"7px",padding:"5px 12px",textAlign:"center"}});
    vb.appendChild(el("div",{style:{fontSize:"17px",fontWeight:"800",color:vm.text}},sc+"%"));
    vb.appendChild(el("div",{style:{fontSize:"9px",color:vm.text}},vm.es));
    right.appendChild(vb);
    right.appendChild(el("button",{style:{fontSize:"11px",color:BRAND,background:"none",border:"1px solid "+BRAND,borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontWeight:"600"},onClick:()=>{state.viewing=h;state.tab="view";render();}},"Ver →"));
    row.appendChild(right);app.appendChild(row);
  });
}

function renderView(app){
  app.appendChild(el("button",{style:{fontSize:"12px",color:BRAND,background:"none",border:"none",cursor:"pointer",marginBottom:"14px",fontWeight:"600"},onClick:()=>{state.tab="history";render();}},"← Historial"));
  const wrap=el("div",{style:{background:"#fff",borderRadius:"12px",padding:"16px",border:"1px solid #e5e7eb"}});
  renderResult(wrap,state.viewing);app.appendChild(wrap);
}

function downloadReport(r){
  const sc=overallPct(r),vm=VM[r.verdict]||VM["needs coaching"];
  const rows=CATS.map(c=>{
    const cd=r.categories?.[c.id];if(!cd)return"";
    const items=(cd.scores||[]).map((s,i)=>{
      const badge=s==="pass"?'<span style="color:#085041;font-weight:700">✓ Pass</span>':s==="fail"?'<span style="color:#991B1B;font-weight:700">✗ Fail</span>':'<span style="color:#6b7280">— N/A</span>';
      const note_es=cd.notes_es?.[i],note_en=cd.notes_en?.[i];
      const noteHtml=s==="fail"&&(note_es||note_en)?'<div style="background:#FEF3C7;border-left:3px solid #F59E0B;padding:4px 8px;margin-top:3px;font-size:10px;color:#92400E;line-height:1.6">'+(note_es?"💬 "+note_es:"")+((note_es&&note_en)?"<br>":"")+(note_en?'<span style="color:#78350F">💬 '+note_en+"</span>":"")+"</div>":"";
      return'<tr><td style="padding:5px 8px;font-size:11px;vertical-align:top">'+c.es[i]+'<br><span style="color:#9ca3af;font-size:10px">'+c.en[i]+"</span>"+noteHtml+"</td><td style='padding:5px 8px;text-align:center;vertical-align:top'>"+badge+"</td></tr>";
    }).join("");
    const pct=calcPct(c.id,r);
    return'<tr><td colspan="2" style="background:'+c.bg+';padding:8px 10px;font-weight:700;font-size:12px;color:'+c.tc+';border-top:2px solid '+c.color+'">'+c.label+" / "+c.label_en+(pct!==null?" — "+pct+"%":"")+"</td></tr>"+items;
  }).join("");
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QA Report — '+r.repName+'</title></head><body style="font-family:system-ui;max-width:740px;margin:0 auto;padding:30px;color:#111"><div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #7F77DD"><div><div style="font-size:20px;font-weight:800;color:#7F77DD">Vamos Health QA</div><div style="font-size:14px;margin-top:4px">'+(r.repName||"")+'</div><div style="font-size:11px;color:#9ca3af">'+(r.date||"")+'</div></div><div style="background:'+vm.bg+';border:1px solid '+vm.border+';border-radius:10px;padding:12px 20px;text-align:center"><div style="font-size:32px;font-weight:800;color:'+vm.text+'">'+sc+'%</div><div style="font-size:11px;color:'+vm.text+'">'+vm.es+" / "+vm.en+'</div></div></div>'+(r.summary_es?'<div style="background:#f5f5f5;border-left:3px solid #7F77DD;padding:10px 14px;margin-bottom:20px;font-size:12px;line-height:1.7;color:#374151">'+r.summary_es+(r.summary_en?"<br><br><span style='color:#9ca3af'>"+r.summary_en+"</span>":"")+"</div>":"")+'<table style="width:100%;border-collapse:collapse;margin-bottom:20px">'+rows+"</table>"+(r.coaching_es?'<div style="background:#EEEDF9;border:1px solid #7F77DD;border-radius:8px;padding:14px;font-size:12px;color:#3730A3;line-height:1.7"><strong>🎯 Coaching</strong><br><br>'+r.coaching_es+(r.coaching_en?"<br><br><em style='color:#4338CA'>"+r.coaching_en+"</em>":"")+"</div>":"")+'<div style="margin-top:28px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:12px">Vamos Health QA · '+new Date().toLocaleDateString()+"</div></body></html>";
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));
  a.download="VamosQA_"+((r.repName||"Rep").replace(/\s+/g,"_"))+"_"+(r.date||"report")+".html";
  a.click();
}

render();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  if (req.method === "POST" && req.url === "/api/analyze") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { transcript, repName } = JSON.parse(body);
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }));
          return;
        }
        const payload = JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: (repName ? `Rep name: ${repName}\n\n` : "") + "Transcript:\n" + transcript }]
        });
        const options = {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            "x-api-key": apiKey,
            "Content-Length": Buffer.byteLength(payload)
          }
        };
        const apiReq = https.request(options, apiRes => {
          let data = "";
          apiRes.on("data", chunk => data += chunk);
          apiRes.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: parsed.error.message }));
                return;
              }
              const text = (parsed.content || []).map(b => b.text || "").join("").trim();
              const clean = text.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
              const result = JSON.parse(clean);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (e) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Failed to parse AI response: " + e.message }));
            }
          });
        });
        apiReq.on("error", e => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "API request failed: " + e.message }));
        });
        apiReq.write(payload);
        apiReq.end();
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bad request: " + e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Vamos QA running on port " + PORT));
