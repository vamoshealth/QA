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
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;color:#111827}
    input,textarea,select{font-family:inherit;font-size:13px;padding:8px 11px;border-radius:7px;border:1px solid #e5e7eb;width:100%;outline:none;background:#fff}
    input:focus,textarea:focus{border-color:#7F77DD}
    button{font-family:inherit;cursor:pointer}
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const {useState,useEffect,useCallback} = React;
const BRAND="#7F77DD";

const CATS=[
  {id:"greeting",label:"Saludo",label_en:"Greeting",color:"#5DCAA5",bg:"#E1F5EE",textColor:"#085041",
   criteria_es:["Se presentó con nombre completo","Mencionó Vamos","Preguntó el nombre del cliente y lo usó","Tono cálido y profesional desde el inicio"],
   criteria_en:["Introduced with full name","Mentioned Vamos","Asked for caller's name and used it","Warm professional tone from the start"]},
  {id:"discovery",label:"Descubrimiento",label_en:"Discovery",color:"#7F77DD",bg:"#EEEDFE",textColor:"#3C3489",
   criteria_es:["Identificó necesidad INMEDIATA del prospecto","Descubrió necesidades ADICIONALES (familia, trabajo, condiciones)","Transiciones fluidas sin guión rígido","Escucha activa — parafraseó o confirmó lo que escuchó","Preguntas basadas en respuestas del prospecto, no en un script"],
   criteria_en:["Identified prospect's IMMEDIATE need","Uncovered ADDITIONAL needs (family, employment, conditions)","Smooth transitions without rigid script","Active listening — paraphrased or confirmed what was heard","Follow-up questions based on prospect's answers, not a script"]},
  {id:"presentation",label:"Presentación",label_en:"Presentation",color:"#D4537E",bg:"#FBEAF0",textColor:"#72243E",
   criteria_es:["Solución personalizada a las necesidades específicas mencionadas","Pausó para confirmar comprensión antes de seguir","Lenguaje simple y claro, sin jerga técnica","Diálogo activo — no un monólogo unilateral"],
   criteria_en:["Tailored solution to the specific needs mentioned","Paused to confirm understanding before moving on","Simple and clear language no technical jargon","Active dialogue — not a one-sided monologue"]},
  {id:"objections",label:"Objeciones",label_en:"Objections",color:"#D85A30",bg:"#FAECE7",textColor:"#712B13",
   criteria_es:["Recibió objeciones con calma sin ponerse defensivo","Clarificó la objeción antes de responder","Abordó precio con valor no con descuentos","Resolvió dudas con preguntas no con presión","Confirmó resolución antes de continuar"],
   criteria_en:["Welcomed objections without getting defensive","Clarified the objection before responding","Addressed price with value not discounts","Resolved hesitation with questions not pressure","Confirmed resolution before moving on"]},
  {id:"closing",label:"Cierre",label_en:"Closing",color:"#639922",bg:"#EAF3DE",textColor:"#27500A",
   criteria_es:["Pidió la venta de forma directa y con seguridad","Usó técnica de cierre adecuada (asuntivo, alternativa, urgencia real)","Ante dudas profundizó con preguntas en vez de rendirse","Agendó un siguiente paso concreto si no cerró en la llamada"],
   criteria_en:["Asked for the close directly and confidently","Used appropriate closing technique (assumptive, alternative, real urgency)","When faced with hesitation probed with questions instead of giving up","Scheduled a concrete next step if not closed on the call"]},
  {id:"rapport",label:"Rapport (Toda la llamada)",label_en:"Rapport (Entire call)",color:"#378ADD",bg:"#E6F1FB",textColor:"#0C447C",
   criteria_es:["Mantuvo tono empático y humano de principio a fin","El prospecto se sintió escuchado y valorado","Generó confianza siendo transparente y honesto","Energía y calidez consistentes incluso ante objeciones o silencios"],
   criteria_en:["Maintained empathetic and human tone throughout","The prospect felt heard and valued","Built trust by being transparent and honest","Energy and warmth consistent even through objections or silences"]},
  {id:"opportunities",label:"Oportunidades Perdidas",label_en:"Missed Opportunities",color:"#888780",bg:"#F1EFE8",textColor:"#2C2C2A",
   criteria_es:["Señal de compra ignorada — interés no capitalizado","Momento ideal para cerrar no aprovechado","Dolor mencionado de pasada sin profundizar","Referido potencial no solicitado","Upsell o cross-sell visible pero no abordado"],
   criteria_en:["Buying signal ignored — prospect interest not capitalized","Ideal closing moment missed","Pain mentioned in passing not explored","Potential referral not requested","Visible upsell or cross-sell not addressed"]}
];

const VM={
  "strong":        {bg:"#def7ec",text:"#03543f",border:"#03543f",es:"Sólido",en:"Strong"},
  "needs coaching":{bg:"#fef3c7",text:"#92400e",border:"#d97706",es:"Necesita Coaching",en:"Needs Coaching"},
  "critical gaps": {bg:"#fde8e8",text:"#9b1c1c",border:"#dc2626",es:"Brechas Críticas",en:"Critical Gaps"}
};

const LS="vamos_v6";

const calcPct=(cat,r)=>{
  const s=r?.categories?.[cat.id]?.scores||[];
  const p=s.filter(x=>x==="pass").length;
  const t=s.filter(x=>x==="pass"||x==="fail").length;
  return t>0?Math.round(p/t*100):null;
};

const overallPct=r=>{
  if(!r?.categories)return 0;
  let p=0,t=0;
  CATS.filter(c=>c.id!=="opportunities").forEach(c=>{
    (r.categories[c.id]?.scores||[]).forEach(s=>{if(s==="pass"){p++;t++;}else if(s==="fail")t++;});
  });
  return t>0?Math.round(p/t*100):0;
};

function ScoreBadge({score}){
  const cfg={pass:{bg:"#E1F5EE",color:"#085041",label:"✓ Pass"},fail:{bg:"#FEE2E2",color:"#991B1B",label:"✗ Fail"},na:{bg:"#f3f4f6",color:"#6b7280",label:"— N/A"}}[score]||{bg:"#f3f4f6",color:"#6b7280",label:"—"};
  return <span style={{background:cfg.bg,color:cfg.color,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}}>{cfg.label}</span>;
}

function ResultView({r,lang}){
  const sc=overallPct(r);
  const vm=VM[r.verdict]||VM["needs coaching"];
  return(
    <div>
      <div style={{background:vm.bg,border:"1px solid "+vm.border,borderRadius:12,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          {r.repName&&<div style={{fontSize:17,fontWeight:800,color:vm.text}}>{r.repName}</div>}
          <div style={{fontSize:11,color:vm.text,opacity:.7}}>{r.date}</div>
          <div style={{fontSize:12,fontWeight:600,color:vm.text,marginTop:3}}>{vm.es} / {vm.en}</div>
        </div>
        <div style={{textAlign:"center",background:"rgba(255,255,255,.5)",borderRadius:10,padding:"10px 16px"}}>
          <div style={{fontSize:32,fontWeight:800,color:vm.text}}>{sc}%</div>
          <div style={{fontSize:10,color:vm.text}}>Overall</div>
        </div>
      </div>

      {(r.summary_es||r.summary_en)&&(
        <div style={{background:"#f9fafb",borderLeft:"3px solid "+BRAND,padding:"10px 14px",borderRadius:"0 8px 8px 0",marginBottom:14,fontSize:12,lineHeight:1.7,color:"#374151"}}>
          {(lang==="both"||lang==="es")&&r.summary_es&&<div>{r.summary_es}</div>}
          {lang==="both"&&<br/>}
          {(lang==="both"||lang==="en")&&r.summary_en&&<div style={{color:"#6b7280"}}>{r.summary_en}</div>}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:14}}>
        {CATS.filter(c=>c.id!=="opportunities").map(c=>{
          const pct=calcPct(c,r);
          return(
            <div key={c.id} style={{background:c.bg,border:"1px solid "+c.color,borderRadius:9,padding:"9px 6px",textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:c.textColor,marginBottom:2,lineHeight:1.2}}>{c.label}</div>
              <div style={{fontSize:19,fontWeight:800,color:c.textColor}}>{pct!==null?pct+"%":"—"}</div>
            </div>
          );
        })}
      </div>

      {CATS.map(c=>{
        const catData=r.categories?.[c.id];
        if(!catData)return null;
        const scores=catData.scores||[];
        if(!scores.some(s=>s!=="na"))return null;
        const pct=calcPct(c,r);
        return(
          <div key={c.id} style={{border:"1px solid "+c.color,borderRadius:10,marginBottom:10,overflow:"hidden"}}>
            <div style={{background:c.bg,padding:"9px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:12,color:c.textColor}}>{c.label} / {c.label_en}</div>
              {pct!==null&&<div style={{fontSize:12,fontWeight:700,color:c.textColor}}>{pct}%</div>}
            </div>
            <div style={{padding:"6px 14px 10px",background:"#fff"}}>
              {scores.map((s,i)=>{
                const note_es=catData.notes_es?.[i];
                const note_en=catData.notes_en?.[i];
                return(
                  <div key={i} style={{padding:"6px 0",borderBottom:i<scores.length-1?"1px solid #f3f4f6":"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{fontSize:12,color:"#374151",flex:1,lineHeight:1.5}}>
                        {(lang==="both"||lang==="es")&&<div>{c.criteria_es[i]}</div>}
                        {lang==="both"&&<div style={{fontSize:10,color:"#9ca3af"}}>{c.criteria_en[i]}</div>}
                        {lang==="en"&&<div>{c.criteria_en[i]}</div>}
                      </div>
                      <ScoreBadge score={s}/>
                    </div>
                    {s==="fail"&&(note_es||note_en)&&(
                      <div style={{marginTop:4,background:"#FEF3C7",borderLeft:"3px solid #F59E0B",padding:"5px 9px",borderRadius:"0 5px 5px 0",fontSize:11,color:"#92400E",lineHeight:1.5}}>
                        {(lang==="both"||lang==="es")&&note_es&&<div>💬 {note_es}</div>}
                        {lang==="both"&&note_es&&note_en&&<br/>}
                        {(lang==="both"||lang==="en")&&note_en&&<div style={{color:"#78350F"}}>💬 {note_en}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {(r.coaching_es||r.coaching_en)&&(
        <div style={{background:"#EEEDF9",border:"1px solid "+BRAND,borderRadius:10,padding:"13px 15px",marginTop:4}}>
          <div style={{fontWeight:700,fontSize:13,color:"#3730A3",marginBottom:7}}>🎯 Coaching</div>
          {(lang==="both"||lang==="es")&&r.coaching_es&&<div style={{fontSize:12,color:"#3730A3",lineHeight:1.7,marginBottom:lang==="both"?8:0}}>{r.coaching_es}</div>}
          {(lang==="both"||lang==="en")&&r.coaching_en&&<div style={{fontSize:12,color:"#4338CA",lineHeight:1.7,fontStyle:lang==="both"?"italic":"normal"}}>{r.coaching_en}</div>}
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState("analyze");
  const [tx,setTx]=useState("");
  const [rep,setRep]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [loading,setLoad]=useState(false);
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");
  const [hist,setHist]=useState([]);
  const [viewing,setView]=useState(null);
  const [filter,setFilter]=useState("");
  const [lang,setLang]=useState("both");

  useEffect(()=>{try{const d=localStorage.getItem(LS);if(d)setHist(JSON.parse(d));}catch(e){}},[]);
  const saveHist=useCallback(h=>{try{localStorage.setItem(LS,JSON.stringify(h));}catch(e){};},[]);

  const analyze=async()=>{
    if(!tx.trim())return;
    setLoad(true);setErr("");setResult(null);
    try{
      const res=await fetch("/api/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({transcript:tx,repName:rep})
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Server error");
      const entry={...data,repName:rep||data.repName||"Unknown",date,_id:Date.now(),transcript:tx};
      setResult(entry);
      const next=[entry,...hist].slice(0,100);
      setHist(next);saveHist(next);
    }catch(e){setErr(e.message);}
    finally{setLoad(false);}
  };

  const filtered=hist.filter(h=>!filter||h.repName?.toLowerCase().includes(filter.toLowerCase()));

  return(
    <div style={{maxWidth:680,margin:"0 auto",padding:"16px 12px",minHeight:"100vh",background:"#f9fafb"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:BRAND,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#fff",fontWeight:800,fontSize:16}}>V</span>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>Vamos Health QA</div>
            <div style={{fontSize:11,color:"#9ca3af"}}>Sales Call Analyzer</div>
          </div>
        </div>
        <select value={lang} onChange={e=>setLang(e.target.value)} style={{width:"auto",fontSize:11,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb"}}>
          <option value="both">ES + EN</option>
          <option value="es">Solo Español</option>
          <option value="en">English only</option>
        </select>
      </div>

      <div style={{display:"flex",gap:4,marginBottom:16,background:"#ececec",borderRadius:9,padding:4}}>
        {[["analyze","Analizar"],["history","Historial"],...(viewing?[["view","Reporte"]]:[])]
          .map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:tab===id?"#fff":"transparent",color:tab===id?BRAND:"#6b7280",boxShadow:tab===id?"0 1px 3px rgba(0,0,0,.08)":"none"}}>{label}</button>
        ))}
      </div>

      {tab==="analyze"&&(
        <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid #e5e7eb"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Nombre del Rep</div>
              <input value={rep} onChange={e=>setRep(e.target.value)} placeholder="Ej. Maria Garcia"/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Fecha</div>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
            </div>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:4}}>Transcripción de la llamada</div>
          <textarea value={tx} onChange={e=>setTx(e.target.value)} placeholder="Pega la transcripción aquí (español o inglés)..." style={{width:"100%",minHeight:180,resize:"vertical",borderRadius:8,border:"1px solid #e5e7eb",padding:"10px 12px",fontSize:13,lineHeight:1.6,marginBottom:12,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={analyze} disabled={loading||!tx.trim()} style={{width:"100%",padding:"11px 0",background:loading||!tx.trim()?"#e5e7eb":BRAND,color:loading||!tx.trim()?"#9ca3af":"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:loading||!tx.trim()?"not-allowed":"pointer"}}>
            {loading?"⏳ Analizando…":"Analizar Llamada"}
          </button>
          {err&&<div style={{marginTop:12,background:"#FEE2E2",border:"1px solid #EF4444",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#991B1B"}}>⚠ {err}</div>}
          {result&&!loading&&<div style={{marginTop:18}}><ResultView r={result} lang={lang}/></div>}
        </div>
      )}

      {tab==="history"&&(
        <div>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar por nombre del rep…" style={{marginBottom:12}}/>
          {filtered.length===0
            ?<div style={{textAlign:"center",color:"#9ca3af",padding:48,fontSize:13}}>No hay llamadas aún.</div>
            :filtered.map(h=>{
              const sc=overallPct(h);const vm=VM[h.verdict]||VM["needs coaching"];
              return(
                <div key={h._id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{h.repName}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>{h.date}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{background:vm.bg,border:"1px solid "+vm.border,borderRadius:7,padding:"5px 12px",textAlign:"center"}}>
                      <div style={{fontSize:17,fontWeight:800,color:vm.text}}>{sc}%</div>
                      <div style={{fontSize:9,color:vm.text}}>{vm.es}</div>
                    </div>
                    <button onClick={()=>{setView(h);setTab("view");}} style={{fontSize:11,color:BRAND,background:"none",border:"1px solid "+BRAND,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontWeight:600}}>Ver →</button>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {tab==="view"&&viewing&&(
        <div style={{background:"#fff",borderRadius:12,padding:16,border:"1px solid #e5e7eb"}}>
          <button onClick={()=>setTab("history")} style={{fontSize:12,color:BRAND,background:"none",border:"none",cursor:"pointer",marginBottom:14,fontWeight:600}}>← Historial</button>
          <ResultView r={viewing} lang={lang}/>
        </div>
      )}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
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
          res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set in environment variables" }));
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
              const clean = text.replace(/^```json\s*/,"").replace(/\s*```$/,"").trim();
              const result = JSON.parse(clean);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch(e) {
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
      } catch(e) {
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
