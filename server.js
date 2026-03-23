const http = require("http");
const https = require("https");

const SYSTEM_PROMPT = `You are an expert sales QA analyst for Vamos, a healthcare membership company. Analyze the sales call and evaluate rep performance.

IMPORTANT: Respond with ONLY a valid JSON object. No markdown. No code blocks. No explanation. Start with { and end with }.

Evaluate each criterion: "pass", "fail", or "na" (not applicable).
For failed items write a short specific coaching note in Spanish (notes_es) and English (notes_en).
For opportunities category: "fail"=opportunity was missed, "pass"=handled well, "na"=did not apply.
Verdict: "strong" if pass rate>=80%, "needs coaching" if 60-79%, "critical gaps" if below 60%.

Return this exact JSON structure:
{
  "repName": "",
  "summary_es": "2-3 sentence summary in Spanish",
  "summary_en": "2-3 sentence summary in English",
  "verdict": "needs coaching",
  "coaching_es": "1-2 paragraph coaching message in Spanish",
  "coaching_en": "1-2 paragraph coaching message in English",
  "categories": {
    "greeting":      { "scores": ["na","na","na","na"],      "notes_es": ["","","",""],      "notes_en": ["","","",""] },
    "discovery":     { "scores": ["na","na","na","na","na"], "notes_es": ["","","","",""],   "notes_en": ["","","","",""] },
    "presentation":  { "scores": ["na","na","na","na"],      "notes_es": ["","","",""],      "notes_en": ["","","",""] },
    "objections":    { "scores": ["na","na","na","na","na"], "notes_es": ["","","","",""],   "notes_en": ["","","","",""] },
    "closing":       { "scores": ["na","na","na","na"],      "notes_es": ["","","",""],      "notes_en": ["","","",""] },
    "rapport":       { "scores": ["na","na","na","na"],      "notes_es": ["","","",""],      "notes_en": ["","","",""] },
    "opportunities": { "scores": ["na","na","na","na","na"], "notes_es": ["","","","",""],   "notes_en": ["","","","",""] }
  }
}`;

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
    .cat-header{padding:9px 14px;display:flex;justify-content:space-between;align-items:center}
    .cat-body{padding:6px 14px 10px;background:#fff}
    .criterion{padding:6px 0;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
    .note{margin-top:4px;background:#FEF3C7;border-left:3px solid #F59E0B;padding:5px 9px;border-radius:0 5px 5px 0;font-size:11px;color:#92400E;line-height:1.5}
  </style>
</head>
<body>
<div id="app" style="max-width:680px;margin:0 auto;padding:16px 12px;min-height:100vh"></div>
<script>
const BRAND="#7F77DD";
const CATS=[
  {id:"greeting",label:"Saludo",label_en:"Greeting",color:"#5DCAA5",bg:"#E1F5EE",tc:"#085041",
   es:["Se presentó con nombre completo","Mencionó Vamos","Preguntó el nombre del cliente y lo usó","Tono cálido y profesional desde el inicio"],
   en:["Introduced with full name","Mentioned Vamos","Asked for caller's name and used it","Warm professional tone from the start"]},
  {id:"discovery",label:"Descubrimiento",label_en:"Discovery",color:"#7F77DD",bg:"#EEEDFE",tc:"#3C3489",
   es:["Identificó necesidad INMEDIATA del prospecto","Descubrió necesidades ADICIONALES (familia, trabajo, condiciones)","Transiciones fluidas sin guión rígido","Escucha activa — parafraseó o confirmó lo que escuchó","Preguntas basadas en respuestas del prospecto, no en un script"],
   en:["Identified prospect's IMMEDIATE need","Uncovered ADDITIONAL needs (family, employment, conditions)","Smooth transitions without rigid script","Active listening — paraphrased or confirmed what was heard","Follow-up questions based on prospect's answers, not a script"]},
  {id:"presentation",label:"Presentación",label_en:"Presentation",color:"#D4537E",bg:"#FBEAF0",tc:"#72243E",
   es:["Solución personalizada a las necesidades específicas mencionadas","Pausó para confirmar comprensión antes de seguir","Lenguaje simple y claro, sin jerga técnica","Diálogo activo — no un monólogo unilateral"],
   en:["Tailored solution to the specific needs mentioned","Paused to confirm understanding before moving on","Simple and clear language no technical jargon","Active dialogue not a one-sided monologue"]},
  {id:"objections",label:"Objeciones",label_en:"Objections",color:"#D85A30",bg:"#FAECE7",tc:"#712B13",
   es:["Recibió objeciones con calma sin ponerse defensivo","Clarificó la objeción antes de responder","Abordó precio con valor no con descuentos","Resolvió dudas con preguntas no con presión","Confirmó resolución antes de continuar"],
   en:["Welcomed objections without getting defensive","Clarified the objection before responding","Addressed price with value not discounts","Resolved hesitation with questions not pressure","Confirmed resolution before moving on"]},
  {id:"closing",label:"Cierre",label_en:"Closing",color:"#639922",bg:"#EAF3DE",tc:"#27500A",
   es:["Pidió la venta de forma directa y con seguridad","Usó técnica de cierre adecuada (asuntivo, alternativa, urgencia real)","Ante dudas profundizó con preguntas en vez de rendirse","Agendó un siguiente paso concreto si no cerró en la llamada"],
   en:["Asked for the close directly and confidently","Used appropriate closing technique","When faced with hesitation probed with questions instead of giving up","Scheduled a concrete next step if not closed on the call"]},
  {id:"rapport",label:"Rapport (Toda la llamada)",label_en:"Rapport (Entire call)",color:"#378ADD",bg:"#E6F1FB",tc:"#0C447C",
   es:["Mantuvo tono empático y humano de principio a fin","El prospecto se sintió escuchado y valorado","Generó confianza siendo transparente y honesto","Energía y calidez consistentes incluso ante objeciones o silencios"],
   en:["Maintained empathetic and human tone throughout","The prospect felt heard and valued","Built trust by being transparent and honest","Energy and warmth consistent even through objections or silences"]},
  {id:"opportunities",label:"Oportunidades Perdidas",label_en:"Missed Opportunities",color:"#888780",bg:"#F1EFE8",tc:"#2C2C2A",
   es:["Señal de compra ignorada — interés no capitalizado","Momento ideal para cerrar no aprovechado","Dolor mencionado de pasada sin profundizar","Referido potencial no solicitado","Upsell o cross-sell visible pero no abordado"],
   en:["Buying signal ignored — prospect interest not capitalized","Ideal closing moment missed","Pain mentioned in passing not explored","Potential referral not requested","Visible upsell or cross-sell not addressed"]}
];
const VM={
  "strong":{bg:"#def7ec",text:"#03543f",border:"#03543f",es:"Sólido",en:"Strong"},
  "needs coaching":{bg:"#fef3c7",text:"#92400e",border:"#d97706",es:"Necesita Coaching",en:"Needs Coaching"},
  "critical gaps":{bg:"#fde8e8",text:"#9b1c1c",border:"#dc2626",es:"Brechas Críticas",en:"Critical Gaps"}
};
const LS="vamos_v6";

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

  // Header
  const hdr=el("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}});
  const hLeft=el("div",{style:{display:"flex",alignItems:"center",gap:"10px"}});
  hLeft.appendChild(el("div",{style:{width:"36px",height:"36px",background:BRAND,borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"16px"}},"V"));
  const hTitles=el("div");
  hTitles.appendChild(el("div",{style:{fontWeight:"800",fontSize:"15px"}},"Vamos Health QA"));
  hTitles.appendChild(el("div",{style:{fontSize:"11px",color:"#9ca3af"}},"Sales Call Analyzer"));
  hLeft.appendChild(hTitles);
  hdr.appendChild(hLeft);
  const langSel=el("select",{style:{width:"auto",fontSize:"11px",padding:"4px 8px",borderRadius:"6px",border:"1px solid #e5e7eb"},onChange:e=>{state.lang=e.target.value;render();}});
  [["both","ES + EN"],["es","Solo Español"],["en","English only"]].forEach(([v,t])=>{
    const o=el("option",{value:v},t);if(v===state.lang)o.selected=true;langSel.appendChild(o);
  });
  hdr.appendChild(langSel);
  app.appendChild(hdr);

  // Tabs
  const tabBar=el("div",{style:{display:"flex",gap:"4px",marginBottom:"16px",background:"#ececec",borderRadius:"9px",padding:"4px"}});
  const tabs=[["analyze","Analizar"],["history","Historial"],...(state.viewing?[["view","Reporte"]]:[])] ;
  tabs.forEach(([id,label])=>{
    const b=el("button",{className:"tab"+(state.tab===id?" active":""),onClick:()=>{state.tab=id;render();}},label);
    tabBar.appendChild(b);
  });
  app.appendChild(tabBar);

  if(state.tab==="analyze") renderAnalyze(app);
  else if(state.tab==="history") renderHistory(app);
  else if(state.tab==="view"&&state.viewing) renderView(app);
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
  if(state.err){
    wrap.appendChild(el("div",{style:{marginTop:"12px",background:"#FEE2E2",border:"1px solid #EF4444",borderRadius:"8px",padding:"10px 14px",fontSize:"12px",color:"#991B1B"}},"⚠ "+state.err));
  }
  if(state.result&&!state.loading){
    const rd=el("div",{style:{marginTop:"18px"}});
    renderResult(rd,state.result);
    wrap.appendChild(rd);
  }
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
  // verdict header
  const vh=el("div",{style:{background:vm.bg,border:"1px solid "+vm.border,borderRadius:"12px",padding:"14px 18px",marginBottom:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}});
  const vLeft=el("div");
  if(r.repName)vLeft.appendChild(el("div",{style:{fontSize:"17px",fontWeight:"800",color:vm.text}},r.repName));
  vLeft.appendChild(el("div",{style:{fontSize:"11px",color:vm.text,opacity:".7"}},r.date||""));
  vLeft.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"600",color:vm.text,marginTop:"3px"}},vm.es+" / "+vm.en));
  vh.appendChild(vLeft);
  const vRight=el("div",{style:{textAlign:"center",background:"rgba(255,255,255,.5)",borderRadius:"10px",padding:"10px 16px"}});
  vRight.appendChild(el("div",{style:{fontSize:"32px",fontWeight:"800",color:vm.text}},sc+"%"));
  vRight.appendChild(el("div",{style:{fontSize:"10px",color:vm.text}},"Overall"));
  vh.appendChild(vRight);
  wrap.appendChild(vh);

  // summary
  if(r.summary_es||r.summary_en){
    const sb=el("div",{style:{background:"#f9fafb",borderLeft:"3px solid "+BRAND,padding:"10px 14px",borderRadius:"0 8px 8px 0",marginBottom:"14px",fontSize:"12px",lineHeight:"1.7",color:"#374151"}});
    if((state.lang==="both"||state.lang==="es")&&r.summary_es)sb.appendChild(el("div",null,r.summary_es));
    if((state.lang==="both"||state.lang==="en")&&r.summary_en)sb.appendChild(el("div",{style:{color:"#6b7280",marginTop:"4px"}},r.summary_en));
    wrap.appendChild(sb);
  }

  // score grid
  const grid=el("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px",marginBottom:"14px"}});
  CATS.filter(c=>c.id!=="opportunities").forEach(c=>{
    const pct=calcPct(c.id,r);
    const card=el("div",{style:{background:c.bg,border:"1px solid "+c.color,borderRadius:"9px",padding:"9px 6px",textAlign:"center"}});
    card.appendChild(el("div",{style:{fontSize:"9px",fontWeight:"700",color:c.tc,marginBottom:"2px",lineHeight:"1.2"}},c.label));
    card.appendChild(el("div",{style:{fontSize:"19px",fontWeight:"800",color:c.tc}},pct!==null?pct+"%":"—"));
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  // categories detail
  CATS.forEach(c=>{
    const catData=r.categories?.[c.id];
    if(!catData)return;
    const scores=catData.scores||[];
    if(!scores.some(s=>s!=="na"))return;
    const pct=calcPct(c.id,r);
    const box=el("div",{style:{border:"1px solid "+c.color,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}});
    const hd=el("div",{className:"cat-header",style:{background:c.bg}});
    hd.appendChild(el("div",{style:{fontWeight:"700",fontSize:"12px",color:c.tc}},c.label+" / "+c.label_en));
    if(pct!==null)hd.appendChild(el("div",{style:{fontSize:"12px",fontWeight:"700",color:c.tc}},pct+"%"));
    box.appendChild(hd);
    const body=el("div",{className:"cat-body"});
    scores.forEach((s,i)=>{
      const row=el("div",{className:"criterion"});
      const txtWrap=el("div",{style:{fontSize:"12px",color:"#374151",flex:"1",lineHeight:"1.5"}});
      if(state.lang==="both"||state.lang==="es")txtWrap.appendChild(el("div",null,c.es[i]||""));
      if(state.lang==="both")txtWrap.appendChild(el("div",{style:{fontSize:"10px",color:"#9ca3af"}},c.en[i]||""));
      if(state.lang==="en")txtWrap.appendChild(el("div",null,c.en[i]||""));
      row.appendChild(txtWrap);
      const badge=el("span",{className:"badge badge-"+(s==="pass"?"pass":s==="fail"?"fail":"na")},s==="pass"?"✓ Pass":s==="fail"?"✗ Fail":"— N/A");
      row.appendChild(badge);
      body.appendChild(row);
      if(s==="fail"){
        const ne=catData.notes_es?.[i],nen=catData.notes_en?.[i];
        if(ne||nen){
          const note=el("div",{className:"note"});
          if((state.lang==="both"||state.lang==="es")&&ne)note.appendChild(el("div",null,"💬 "+ne));
          if((state.lang==="both"||state.lang==="en")&&nen)note.appendChild(el("div",{style:{color:"#78350F",marginTop:"2px"}},"💬 "+nen));
          body.appendChild(note);
        }
      }
    });
    box.appendChild(body);
    wrap.appendChild(box);
  });

  // coaching
  if(r.coaching_es||r.coaching_en){
    const cb=el("div",{style:{background:"#EEEDF9",border:"1px solid "+BRAND,borderRadius:"10px",padding:"13px 15px",marginTop:"4px"}});
    cb.appendChild(el("div",{style:{fontWeight:"700",fontSize:"13px",color:"#3730A3",marginBottom:"7px"}},"🎯 Coaching"));
    if((state.lang==="both"||state.lang==="es")&&r.coaching_es)cb.appendChild(el("div",{style:{fontSize:"12px",color:"#3730A3",lineHeight:"1.7",marginBottom:"8px"}},r.coaching_es));
    if((state.lang==="both"||state.lang==="en")&&r.coaching_en)cb.appendChild(el("div",{style:{fontSize:"12px",color:"#4338CA",lineHeight:"1.7"}},r.coaching_en));
    wrap.appendChild(cb);
  }

  // download btn
  const dlBtn=el("button",{style:{width:"100%",marginTop:"14px",background:BRAND,color:"#fff",border:"none",borderRadius:"8px",padding:"10px 0",fontSize:"13px",fontWeight:"700"},onClick:()=>downloadReport(r)},"⬇ Download Report");
  wrap.appendChild(dlBtn);
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
    row.appendChild(right);
    app.appendChild(row);
  });
}

function renderView(app){
  app.appendChild(el("button",{style:{fontSize:"12px",color:BRAND,background:"none",border:"none",cursor:"pointer",marginBottom:"14px",fontWeight:"600"},onClick:()=>{state.tab="history";render();}},"← Historial"));
  const wrap=el("div",{style:{background:"#fff",borderRadius:"12px",padding:"16px",border:"1px solid #e5e7eb"}});
  renderResult(wrap,state.viewing);
  app.appendChild(wrap);
}

function downloadReport(r){
  const sc=overallPct(r),vm=VM[r.verdict]||VM["needs coaching"];
  const rows=CATS.map(c=>{
    const cd=r.categories?.[c.id];if(!cd)return"";
    const items=(cd.scores||[]).map((s,i)=>{
      const badge=s==="pass"?'<span style="color:#085041;font-weight:700">✓ Pass</span>':s==="fail"?'<span style="color:#991B1B;font-weight:700">✗ Fail</span>':'<span style="color:#6b7280">— N/A</span>';
      const note=s==="fail"&&cd.notes_es?.[i]?'<div style="background:#FEF3C7;border-left:3px solid #F59E0B;padding:4px 8px;margin-top:3px;font-size:10px;color:#92400E">💬 '+cd.notes_es[i]+(cd.notes_en?.[i]?'<br><span style="color:#78350F">💬 '+cd.notes_en[i]+'</span>':"")+"</div>":"";
      return'<tr><td style="padding:5px 8px;font-size:11px">'+c.es[i]+'<br><span style="color:#9ca3af;font-size:10px">'+c.en[i]+"</span>"+note+"</td><td style='padding:5px 8px;text-align:center'>"+badge+"</td></tr>";
    }).join("");
    const pct=calcPct(c.id,r);
    return'<tr><td colspan="2" style="background:'+c.bg+';padding:8px 10px;font-weight:700;font-size:12px;color:'+c.tc+';border-top:2px solid '+c.color+'">'+c.label+" / "+c.label_en+(pct!==null?" — "+pct+"%":"")+"</td></tr>"+items;
  }).join("");
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QA Report</title></head><body style="font-family:system-ui;max-width:740px;margin:0 auto;padding:30px;color:#111"><div style="display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #7F77DD"><div><div style="font-size:20px;font-weight:800;color:#7F77DD">Vamos Health QA</div><div style="font-size:14px;margin-top:4px">'+(r.repName||"")+'</div><div style="font-size:11px;color:#9ca3af">'+(r.date||"")+'</div></div><div style="background:'+vm.bg+';border:1px solid '+vm.border+';border-radius:10px;padding:12px 20px;text-align:center"><div style="font-size:32px;font-weight:800;color:'+vm.text+'">'+sc+'%</div><div style="font-size:11px;color:'+vm.text+'">'+vm.es+" / "+vm.en+'</div></div></div>'+(r.summary_es?'<div style="background:#f5f5f5;border-left:3px solid #7F77DD;padding:10px 14px;margin-bottom:20px;font-size:12px;line-height:1.7;color:#374151">'+r.summary_es+(r.summary_en?"<br><br><span style='color:#9ca3af'>"+r.summary_en+"</span>":"")+"</div>":"")+'<table style="width:100%;border-collapse:collapse;margin-bottom:20px">'+rows+"</table>"+(r.coaching_es?'<div style="background:#EEEDF9;border:1px solid #7F77DD;border-radius:8px;padding:14px;font-size:12px;color:#3730A3;line-height:1.7"><strong>🎯 Coaching</strong><br><br>'+r.coaching_es+(r.coaching_en?"<br><br><em style='color:#4338CA'>"+r.coaching_en+"</em>":"")+"</div>":"")+'<div style="margin-top:28px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:12px">Vamos Health QA · '+new Date().toLocaleDateString()+"</div></body></html>";
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
          max_tokens: 2000,
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
