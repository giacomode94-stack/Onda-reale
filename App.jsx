import { useState, useEffect } from "react";

// ── Storage (localStorage per browser reale) ─────────────────────────────────
const KEYS = { bookings: "or_bookings", clients: "or_clients", quotes: "or_quotes" };
function load(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

// ── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("it-IT") : "—";
const nights = (a, b) => (!a || !b) ? 0 : Math.max(0, (new Date(b) - new Date(a)) / 86400000);
const MONTHS_IT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const STATUS_COLOR = { Confermata:"#0ea5e9", Opzione:"#f59e0b", Cancellata:"#ef4444", Completata:"#10b981" };
const QUOTE_STATUS_COLOR = { Bozza:"#94a3b8", Inviato:"#f59e0b", Accettato:"#10b981", Rifiutato:"#ef4444" };
const BOATS = ["Altamarea 35 GT"];

// ── Style tokens ─────────────────────────────────────────────────────────────
const INPUT = { background:"#1e293b", border:"1px solid #334155", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", width:"100%", fontSize:14, boxSizing:"border-box" };
const SELECT = { ...INPUT };
const BTN_PRIMARY = { background:"#0ea5e9", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 };
const BTN_GHOST = { background:"transparent", color:"#94a3b8", border:"1px solid #334155", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontWeight:600, fontSize:14 };
const BTN_GREEN = { ...BTN_PRIMARY, background:"#10b981" };

function Badge({ color, label }) {
  return <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:6, padding:"2px 10px", fontSize:12, fontWeight:600 }}>{label}</span>;
}
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:16, width:"100%", maxWidth:wide?720:560, maxHeight:"90vh", overflowY:"auto", padding:28 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, color:"#e2e8f0", fontSize:18 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", fontSize:22, cursor:"pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", color:"#94a3b8", fontSize:12, marginBottom:4, fontWeight:600, letterSpacing:.5 }}>{label.toUpperCase()}</label>
      {children}
    </div>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportQuotePDF(quote, clients) {
  const clientName = quote.client || clients.find(c => c.id === quote.clientId)?.name || "—";
  const rows = quote.items.map(it => {
    const sub = (parseFloat(it.qty)||0) * (parseFloat(it.unit)||0);
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${it.desc}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${it.qty}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">€ ${parseFloat(it.unit||0).toLocaleString("it-IT")}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">€ ${sub.toLocaleString("it-IT")}</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preventivo Onda Reale</title>
  <style>body{font-family:Arial,sans-serif;margin:0;padding:40px;color:#1e293b}h1{color:#0ea5e9;margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#0ea5e9;color:#fff;padding:10px 12px;text-align:left}.total{text-align:right;font-size:20px;font-weight:700;margin-top:16px;color:#0ea5e9}.footer{margin-top:40px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:16px}</style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
    <div><h1>⚓ Onda Reale Charter</h1><p style="color:#64748b;margin:4px 0">DPI Immobiliare SRL · Marsala, Sicilia</p></div>
    <div style="text-align:right"><p style="margin:0;font-weight:700;font-size:18px">PREVENTIVO</p><p style="color:#64748b;margin:4px 0">Data: ${fmt(quote.date)}</p></div>
  </div>
  <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px">
    <p style="margin:0;font-weight:700;font-size:16px">${clientName}</p>
    <p style="margin:4px 0;color:#64748b">Periodo: ${fmt(quote.from)} → ${fmt(quote.to)} · ${nights(quote.from,quote.to)} notti</p>
    <p style="margin:4px 0;color:#64748b">Imbarcazione: ${quote.boat || BOATS[0]}</p>
  </div>
  <table><thead><tr><th>Descrizione</th><th style="text-align:center">Qtà</th><th style="text-align:right">Prezzo unit.</th><th style="text-align:right">Totale</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="total">TOTALE: € ${(quote.total||0).toLocaleString("it-IT")}</div>
  ${quote.notes?`<div style="margin-top:24px;background:#f8fafc;border-radius:8px;padding:16px"><strong>Note:</strong> ${quote.notes}</div>`:""}
  <div class="footer"><p>Preventivo valido 15 giorni dalla data di emissione.</p><p>Onda Reale Charter</p></div>
  </body></html>`;
  const w = window.open("","_blank");
  w.document.write(html); w.document.close();
  setTimeout(()=>w.print(),500);
}

// ── Messaggi ──────────────────────────────────────────────────────────────────
const MESSAGE_TEMPLATES = [
  { id:"conferma", label:"✅ Conferma prenotazione", gen:(b)=>`Gentile ${b.client},\n\nSiamo lieti di confermare la Sua prenotazione con Onda Reale Charter.\n\n📅 Check-in: ${fmt(b.from)}\n📅 Check-out: ${fmt(b.to)}\n⛵ Imbarcazione: ${b.boat}\n👥 Persone a bordo: ${b.crew}\n💰 Importo totale: € ${parseFloat(b.price||0).toLocaleString("it-IT")}\n\n${b.deposit?`Le chiediamo di versare l'acconto di € ${parseFloat(b.deposit).toLocaleString("it-IT")} entro 48 ore.\n\n`:""}A presto a bordo!\nOnda Reale Charter` },
  { id:"reminder", label:"⏰ Promemoria imbarco", gen:(b)=>`Gentile ${b.client},\n\nLa sua avventura si avvicina!\n\n📅 Data imbarco: ${fmt(b.from)}\n⛵ Imbarcazione: ${b.boat}\n📍 Porto di Marsala\n\nPresentarsi 30 minuti prima con documento d'identità valido.\n\nBuona navigazione!\nOnda Reale Charter` },
  { id:"acconto", label:"💳 Sollecito acconto", gen:(b)=>`Gentile ${b.client},\n\nRicordiamo che risulta in attesa il versamento dell'acconto di € ${parseFloat(b.deposit||0).toLocaleString("it-IT")} per la prenotazione del ${fmt(b.from)}.\n\nLa prenotazione rimarrà in "Opzione" fino alla ricezione.\n\nCordiali saluti,\nOnda Reale Charter` },
  { id:"feedback", label:"⭐ Richiesta recensione", gen:(b)=>`Gentile ${b.client},\n\nSperiamo che la Sua esperienza a bordo di ${b.boat} sia stata indimenticabile!\n\nLe saremmo grati se volesse lasciarci una recensione su Booking.com o Google.\n\nGrazie e a presto!\nOnda Reale Charter` },
  { id:"cancellazione", label:"❌ Cancellazione", gen:(b)=>`Gentile ${b.client},\n\nPrendiamo atto della cancellazione della prenotazione del ${fmt(b.from)}.\n\nLe condizioni di rimborso sono quelle indicate nel contratto.\n\nSperiamo di rivederLa presto.\n\nOnda Reale Charter` },
];

function MessaggiView({ bookings, clients }) {
  const [selB, setSelB] = useState("");
  const [selT, setSelT] = useState(MESSAGE_TEMPLATES[0].id);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const upcoming = bookings.filter(b=>b.status!=="Cancellata").sort((a,b)=>a.from.localeCompare(b.from));
  useEffect(()=>{
    if(selB){const b=bookings.find(x=>x.id===selB);const t=MESSAGE_TEMPLATES.find(t=>t.id===selT);if(b&&t)setText(t.gen(b));}
    else setText("");
  },[selB,selT,bookings]);
  const copy=()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        <Field label="Prenotazione">
          <select style={SELECT} value={selB} onChange={e=>setSelB(e.target.value)}>
            <option value="">— seleziona —</option>
            {upcoming.map(b=><option key={b.id} value={b.id}>{b.client} · {fmt(b.from)}</option>)}
          </select>
        </Field>
        <Field label="Tipo messaggio">
          <select style={SELECT} value={selT} onChange={e=>setSelT(e.target.value)}>
            {MESSAGE_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
      </div>
      {!selB && <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:40, textAlign:"center", color:"#64748b" }}>Seleziona una prenotazione per generare il messaggio</div>}
      {selB && <>
        <Field label="Messaggio (modificabile)">
          <textarea style={{...INPUT,minHeight:240,resize:"vertical",fontFamily:"monospace",fontSize:13,lineHeight:1.6}} value={text} onChange={e=>setText(e.target.value)}/>
        </Field>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button style={BTN_GHOST} onClick={()=>{const b=bookings.find(x=>x.id===selB);const t=MESSAGE_TEMPLATES.find(t=>t.id===selT);if(b&&t)setText(t.gen(b));}}>↺ Ripristina</button>
          <button style={copied?BTN_GREEN:BTN_PRIMARY} onClick={copy}>{copied?"✓ Copiato!":"📋 Copia testo"}</button>
        </div>
      </>}
      <div style={{ marginTop:28 }}>
        <div style={{ color:"#94a3b8", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:12 }}>TEMPLATE DISPONIBILI</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:8 }}>
          {MESSAGE_TEMPLATES.map(t=>(
            <div key={t.id} onClick={()=>setSelT(t.id)} style={{ background:selT===t.id?"#1e3a5f":"#1e293b", border:`1px solid ${selT===t.id?"#0ea5e9":"#334155"}`, borderRadius:10, padding:"12px 14px", cursor:"pointer" }}>
              <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Statistiche ───────────────────────────────────────────────────────────────
function StatisticsView({ bookings }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const years = [...new Set(bookings.map(b=>b.from?.slice(0,4)).filter(Boolean))].sort().reverse();
  const byMonth = Array.from({length:12},(_,i)=>{
    const m=String(i+1).padStart(2,"0");
    const mb=bookings.filter(b=>b.from?.startsWith(`${year}-${m}`)&&b.status!=="Cancellata");
    return {label:MONTHS_IT[i],bookings:mb.length,revenue:mb.reduce((s,b)=>s+(parseFloat(b.price)||0),0),nights:mb.reduce((s,b)=>s+nights(b.from,b.to),0)};
  });
  const totalRev=byMonth.reduce((s,m)=>s+m.revenue,0);
  const totalBook=byMonth.reduce((s,m)=>s+m.bookings,0);
  const totalNights=byMonth.reduce((s,m)=>s+m.nights,0);
  const maxRev=Math.max(...byMonth.map(m=>m.revenue),1);
  const statusCounts=Object.keys(STATUS_COLOR).map(s=>({label:s,count:bookings.filter(b=>b.status===s&&b.from?.startsWith(String(year))).length,color:STATUS_COLOR[s]}));
  const topClients=Object.entries(bookings.filter(b=>b.from?.startsWith(String(year))&&b.status!=="Cancellata").reduce((acc,b)=>{acc[b.client]=(acc[b.client]||0)+(parseFloat(b.price)||0);return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <span style={{ color:"#e2e8f0", fontWeight:700, fontSize:18 }}>Anno</span>
        <select style={{...SELECT,width:"auto"}} value={year} onChange={e=>setYear(parseInt(e.target.value))}>
          {(years.length?years:[String(new Date().getFullYear())]).map(y=><option key={y}>{y}</option>)}
        </select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:28 }}>
        {[{label:"FATTURATO",val:`€ ${totalRev.toLocaleString("it-IT")}`,color:"#0ea5e9"},{label:"PRENOTAZIONI",val:totalBook,color:"#10b981"},{label:"NOTTI TOTALI",val:totalNights,color:"#f59e0b"},{label:"SCONTRINO MEDIO",val:totalBook?`€ ${Math.round(totalRev/totalBook).toLocaleString("it-IT")}`:"—",color:"#a78bfa"}].map(k=>(
          <div key={k.label} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"16px 18px" }}>
            <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:.5 }}>{k.label}</div>
            <div style={{ color:k.color, fontSize:22, fontWeight:800, marginTop:4 }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20, marginBottom:20 }}>
        <div style={{ color:"#e2e8f0", fontWeight:700, marginBottom:16 }}>Fatturato mensile {year}</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:120 }}>
          {byMonth.map((m,i)=>{
            const h=maxRev>0?(m.revenue/maxRev)*100:0;
            return (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ background:"#0ea5e933", borderRadius:"4px 4px 0 0", width:"100%", height:h+"%", minHeight:m.revenue>0?4:0, border:m.revenue>0?"1px solid #0ea5e9":"none", position:"relative" }}>
                  {m.revenue>0&&<div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%)", color:"#0ea5e9", fontSize:9, whiteSpace:"nowrap", marginBottom:2 }}>{Math.round(m.revenue/1000)}k</div>}
                </div>
                <span style={{ color:"#64748b", fontSize:9, fontWeight:600 }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20 }}>
          <div style={{ color:"#e2e8f0", fontWeight:700, marginBottom:16 }}>Stato prenotazioni</div>
          {statusCounts.map(s=>(
            <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <Badge color={s.color} label={s.label}/><span style={{ color:"#e2e8f0", fontWeight:700 }}>{s.count}</span>
            </div>
          ))}
        </div>
        <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20 }}>
          <div style={{ color:"#e2e8f0", fontWeight:700, marginBottom:16 }}>Top clienti</div>
          {topClients.length===0&&<div style={{ color:"#64748b", fontSize:13 }}>Nessun dato</div>}
          {topClients.map(([name,rev],i)=>(
            <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ color:"#94a3b8", fontSize:13 }}><span style={{ color:"#0ea5e9", fontWeight:700, marginRight:8 }}>#{i+1}</span>{name}</span>
              <span style={{ color:"#e2e8f0", fontWeight:700, fontSize:13 }}>€ {rev.toLocaleString("it-IT")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarView({ bookings, onAdd, onEdit }) {
  const [month, setMonth] = useState(()=>{const n=new Date();return{y:n.getFullYear(),m:n.getMonth()};});
  const first=new Date(month.y,month.m,1);
  const daysInMonth=new Date(month.y,month.m+1,0).getDate();
  const startDay=(first.getDay()+6)%7;
  const cells=[];
  for(let i=0;i<startDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const cellDate=(d)=>`${month.y}-${String(month.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const bookingsForDay=(d)=>{const cd=cellDate(d);return bookings.filter(b=>b.from<=cd&&b.to>cd&&b.status!=="Cancellata");};
  const todayStr=today();
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setMonth(p=>{const d=new Date(p.y,p.m-1);return{y:d.getFullYear(),m:d.getMonth()};})} style={BTN_GHOST}>‹</button>
        <span style={{ color:"#e2e8f0", fontWeight:700, fontSize:16, flex:1, textAlign:"center" }}>
          {first.toLocaleDateString("it-IT",{month:"long",year:"numeric"}).replace(/^\w/,c=>c.toUpperCase())}
        </span>
        <button onClick={()=>setMonth(p=>{const d=new Date(p.y,p.m+1);return{y:d.getFullYear(),m:d.getMonth()};})} style={BTN_GHOST}>›</button>
        <button onClick={onAdd} style={BTN_PRIMARY}>+</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
        {["L","M","M","G","V","S","D"].map((d,i)=>(
          <div key={i} style={{ textAlign:"center", color:"#64748b", fontSize:11, fontWeight:700, padding:"3px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((d,i)=>{
          if(!d)return <div key={i}/>;
          const cd=cellDate(d);
          const dayB=bookingsForDay(d);
          const isToday=cd===todayStr;
          return (
            <div key={i} style={{ background:isToday?"#1e3a5f":"#1e293b", border:`1px solid ${isToday?"#0ea5e9":"#334155"}`, borderRadius:6, minHeight:56, padding:4, cursor:"pointer" }}
              onClick={()=>dayB.length===1?onEdit(dayB[0]):onAdd()}>
              <div style={{ color:isToday?"#0ea5e9":"#94a3b8", fontSize:11, fontWeight:isToday?700:400, marginBottom:2 }}>{d}</div>
              {dayB.slice(0,2).map(b=>(
                <div key={b.id} onClick={e=>{e.stopPropagation();onEdit(b);}}
                  style={{ background:STATUS_COLOR[b.status]+"33", borderLeft:`2px solid ${STATUS_COLOR[b.status]}`, borderRadius:3, padding:"1px 4px", fontSize:9, color:"#e2e8f0", marginBottom:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {b.client}
                </div>
              ))}
              {dayB.length>2&&<div style={{ color:"#64748b", fontSize:9 }}>+{dayB.length-2}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap" }}>
        {Object.entries(STATUS_COLOR).map(([s,c])=>(
          <div key={s} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
            <span style={{ color:"#64748b", fontSize:11 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Booking Form ──────────────────────────────────────────────────────────────
function BookingForm({ booking, clients, onSave, onDelete, onClose }) {
  const [f,setF]=useState(booking||{id:uid(),client:"",clientId:"",boat:BOATS[0],from:today(),to:"",crew:1,status:"Opzione",notes:"",price:"",deposit:"",depositPaid:false});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const selectClient=(id)=>{const c=clients.find(c=>c.id===id);if(c){set("clientId",id);set("client",c.name);}else{set("clientId","");set("client",id);}};
  return (
    <div>
      <Field label="Cliente">
        <select style={SELECT} value={f.clientId||""} onChange={e=>selectClient(e.target.value)}>
          <option value="">— seleziona —</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input style={{...INPUT,marginTop:6}} placeholder="O digita nome nuovo cliente" value={f.client} onChange={e=>set("client",e.target.value)}/>
      </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Check-in"><input type="date" style={INPUT} value={f.from} onChange={e=>set("from",e.target.value)}/></Field>
        <Field label="Check-out"><input type="date" style={INPUT} value={f.to} onChange={e=>set("to",e.target.value)}/></Field>
      </div>
      {f.from&&f.to&&<div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#0ea5e9", fontSize:13, marginBottom:14 }}>🗓 {nights(f.from,f.to)} notti · {fmt(f.from)} → {fmt(f.to)}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Prezzo totale (€)"><input type="number" style={INPUT} value={f.price} onChange={e=>set("price",e.target.value)}/></Field>
        <Field label="Acconto (€)"><input type="number" style={INPUT} value={f.deposit} onChange={e=>set("deposit",e.target.value)}/></Field>
      </div>
      <Field label="Stato"><select style={SELECT} value={f.status} onChange={e=>set("status",e.target.value)}>{Object.keys(STATUS_COLOR).map(s=><option key={s}>{s}</option>)}</select></Field>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <input type="checkbox" id="dep" checked={f.depositPaid} onChange={e=>set("depositPaid",e.target.checked)} style={{ width:16,height:16,accentColor:"#0ea5e9" }}/>
        <label htmlFor="dep" style={{ color:"#94a3b8", fontSize:14 }}>Acconto ricevuto</label>
      </div>
      <Field label="Note"><textarea style={{...INPUT,minHeight:60,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)}/></Field>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        {booking&&<button style={{...BTN_GHOST,color:"#ef4444",borderColor:"#ef444444"}} onClick={()=>{onDelete(booking.id);onClose();}}>Elimina</button>}
        <button style={BTN_GHOST} onClick={onClose}>Annulla</button>
        <button style={BTN_PRIMARY} onClick={()=>{onSave(f);onClose();}}>Salva</button>
      </div>
    </div>
  );
}

// ── Client Form ───────────────────────────────────────────────────────────────
function ClientForm({ client, onSave, onDelete, onClose }) {
  const [f,setF]=useState(client||{id:uid(),name:"",email:"",phone:"",notes:""});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div>
      <Field label="Nome e Cognome"><input style={INPUT} value={f.name} onChange={e=>set("name",e.target.value)}/></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Email"><input style={INPUT} value={f.email} onChange={e=>set("email",e.target.value)}/></Field>
        <Field label="Telefono"><input style={INPUT} value={f.phone} onChange={e=>set("phone",e.target.value)}/></Field>
      </div>
      <Field label="Note"><textarea style={{...INPUT,minHeight:60,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)}/></Field>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        {client&&<button style={{...BTN_GHOST,color:"#ef4444",borderColor:"#ef444444"}} onClick={()=>{onDelete(client.id);onClose();}}>Elimina</button>}
        <button style={BTN_GHOST} onClick={onClose}>Annulla</button>
        <button style={BTN_PRIMARY} onClick={()=>{onSave(f);onClose();}}>Salva</button>
      </div>
    </div>
  );
}

// ── Clients View ──────────────────────────────────────────────────────────────
function ClientsView({ clients, bookings, onAdd, onEdit }) {
  const [search,setSearch]=useState("");
  const filtered=clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.email?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <input style={{...INPUT,flex:1}} placeholder="🔍  Cerca…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <button style={BTN_PRIMARY} onClick={onAdd}>+ Cliente</button>
      </div>
      {filtered.length===0&&<div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Nessun cliente</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(c=>(
          <div key={c.id} onClick={()=>onEdit(c)} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"14px 18px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:"#e2e8f0", fontWeight:700 }}>{c.name}</div>
              <div style={{ color:"#64748b", fontSize:13 }}>{c.email}{c.phone&&` · ${c.phone}`}</div>
            </div>
            <div style={{ color:"#0ea5e9", fontSize:13, fontWeight:600 }}>{bookings.filter(b=>b.clientId===c.id).length} pren.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quote Form ────────────────────────────────────────────────────────────────
function QuoteForm({ quote, clients, onSave, onDelete, onClose }) {
  const [f,setF]=useState(quote||{id:uid(),client:"",clientId:"",date:today(),from:"",to:"",boat:BOATS[0],items:[{desc:"Noleggio barca",qty:1,unit:""}],status:"Bozza",notes:""});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const setItem=(i,k,v)=>setF(p=>{const items=[...p.items];items[i]={...items[i],[k]:v};return{...p,items};});
  const addItem=()=>setF(p=>({...p,items:[...p.items,{desc:"",qty:1,unit:""}]}));
  const removeItem=(i)=>setF(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  const total=f.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.unit)||0),0);
  const selectClient=(id)=>{const c=clients.find(c=>c.id===id);if(c){set("clientId",id);set("client",c.name);}};
  return (
    <div>
      <Field label="Cliente">
        <select style={SELECT} value={f.clientId||""} onChange={e=>selectClient(e.target.value)}>
          <option value="">— seleziona —</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Data"><input type="date" style={INPUT} value={f.date} onChange={e=>set("date",e.target.value)}/></Field>
        <Field label="Stato"><select style={SELECT} value={f.status} onChange={e=>set("status",e.target.value)}>{Object.keys(QUOTE_STATUS_COLOR).map(s=><option key={s}>{s}</option>)}</select></Field>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Inizio"><input type="date" style={INPUT} value={f.from} onChange={e=>set("from",e.target.value)}/></Field>
        <Field label="Fine"><input type="date" style={INPUT} value={f.to} onChange={e=>set("to",e.target.value)}/></Field>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", color:"#94a3b8", fontSize:12, marginBottom:8, fontWeight:600, letterSpacing:.5 }}>VOCI</label>
        {f.items.map((it,i)=>(
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 70px 80px 30px", gap:6, marginBottom:6 }}>
            <input style={INPUT} placeholder="Descrizione" value={it.desc} onChange={e=>setItem(i,"desc",e.target.value)}/>
            <input style={INPUT} type="number" placeholder="Qtà" value={it.qty} onChange={e=>setItem(i,"qty",e.target.value)}/>
            <input style={INPUT} type="number" placeholder="€" value={it.unit} onChange={e=>setItem(i,"unit",e.target.value)}/>
            <button onClick={()=>removeItem(i)} style={{...BTN_GHOST,padding:"0 6px",color:"#ef4444",borderColor:"#ef444444"}}>×</button>
          </div>
        ))}
        <button onClick={addItem} style={{...BTN_GHOST,fontSize:13,padding:"6px 12px"}}>+ Voce</button>
      </div>
      <div style={{ background:"#1e293b", border:"1px solid #0ea5e9", borderRadius:8, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ color:"#94a3b8", fontWeight:600 }}>TOTALE</span>
        <span style={{ color:"#0ea5e9", fontWeight:800, fontSize:20 }}>€ {total.toLocaleString("it-IT")}</span>
      </div>
      <Field label="Note"><textarea style={{...INPUT,minHeight:50,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)}/></Field>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        {quote&&<button style={{...BTN_GHOST,color:"#ef4444",borderColor:"#ef444444"}} onClick={()=>{onDelete(quote.id);onClose();}}>Elimina</button>}
        <button style={BTN_GHOST} onClick={onClose}>Annulla</button>
        <button style={{...BTN_GHOST,color:"#10b981",borderColor:"#10b98144"}} onClick={()=>exportQuotePDF({...f,total},clients)}>📄 PDF</button>
        <button style={BTN_PRIMARY} onClick={()=>{onSave({...f,total});onClose();}}>Salva</button>
      </div>
    </div>
  );
}

// ── Quotes View ───────────────────────────────────────────────────────────────
function QuotesView({ quotes, clients, onAdd, onEdit }) {
  const cName=(q)=>q.client||clients.find(c=>c.id===q.clientId)?.name||"—";
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
        <button style={BTN_PRIMARY} onClick={onAdd}>+ Preventivo</button>
      </div>
      {quotes.length===0&&<div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Nessun preventivo</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {quotes.map(q=>(
          <div key={q.id} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div onClick={()=>onEdit(q)} style={{ cursor:"pointer", flex:1 }}>
              <div style={{ color:"#e2e8f0", fontWeight:700 }}>{cName(q)}</div>
              <div style={{ color:"#64748b", fontSize:13 }}>{fmt(q.from)} → {fmt(q.to)} · {fmt(q.date)}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <Badge color={QUOTE_STATUS_COLOR[q.status]} label={q.status}/>
              <span style={{ color:"#0ea5e9", fontWeight:700 }}>€ {(q.total||0).toLocaleString("it-IT")}</span>
              <button style={{...BTN_GHOST,padding:"4px 10px",fontSize:12,color:"#10b981",borderColor:"#10b98144"}} onClick={()=>exportQuotePDF(q,clients)}>📄 PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bookings List ─────────────────────────────────────────────────────────────
function BookingsList({ bookings, onEdit, onAdd }) {
  const [filter,setFilter]=useState("Tutte");
  const [search,setSearch]=useState("");
  const sorted=[...bookings].filter(b=>(filter==="Tutte"||b.status===filter)&&b.client.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.from.localeCompare(a.from));
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input style={{...INPUT,flex:1,minWidth:140}} placeholder="🔍  Cerca…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={{...SELECT,width:"auto"}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option>Tutte</option>
          {Object.keys(STATUS_COLOR).map(s=><option key={s}>{s}</option>)}
        </select>
        <button style={BTN_PRIMARY} onClick={onAdd}>+</button>
      </div>
      {sorted.length===0&&<div style={{ color:"#64748b", textAlign:"center", padding:40 }}>Nessuna prenotazione</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {sorted.map(b=>(
          <div key={b.id} onClick={()=>onEdit(b)} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"14px 18px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:"#e2e8f0", fontWeight:700 }}>{b.client}</div>
              <div style={{ color:"#64748b", fontSize:13 }}>{fmt(b.from)} → {fmt(b.to)} · {nights(b.from,b.to)} notti</div>
              {b.deposit&&<div style={{ fontSize:12, marginTop:2, color:b.depositPaid?"#10b981":"#f59e0b" }}>{b.depositPaid?"✓":"⏳"} Acconto € {parseFloat(b.deposit).toLocaleString("it-IT")}</div>}
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
              <Badge color={STATUS_COLOR[b.status]} label={b.status}/>
              {b.price&&<span style={{ color:"#0ea5e9", fontWeight:700 }}>€ {parseFloat(b.price).toLocaleString("it-IT")}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ bookings, clients, quotes }) {
  const t=today();
  const active=bookings.filter(b=>b.status==="Confermata"&&b.to>=t);
  const thisMonth=bookings.filter(b=>b.from?.slice(0,7)===t.slice(0,7));
  const revenue=thisMonth.reduce((s,b)=>s+(parseFloat(b.price)||0),0);
  const upcoming=bookings.filter(b=>b.from>=t&&b.status!=="Cancellata").sort((a,b)=>a.from.localeCompare(b.from)).slice(0,5);
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:24 }}>
        {[{l:"ATTIVE",v:active.length,c:"#0ea5e9"},{l:"CLIENTI",v:clients.length,c:"#e2e8f0"},{l:"PREVENTIVI",v:quotes.filter(q=>q.status==="Inviato").length,c:"#f59e0b"},{l:"MESE €",v:revenue.toLocaleString("it-IT"),c:"#10b981"}].map(k=>(
          <div key={k.l} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"16px 18px" }}>
            <div style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:.5 }}>{k.l}</div>
            <div style={{ color:k.c, fontSize:24, fontWeight:800, marginTop:4 }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{ color:"#94a3b8", fontSize:12, fontWeight:700, letterSpacing:.5, marginBottom:10 }}>PROSSIME PRENOTAZIONI</div>
      {upcoming.length===0&&<div style={{ color:"#64748b" }}>Nessuna prenotazione futura</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {upcoming.map(b=>(
          <div key={b.id} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:"#e2e8f0", fontWeight:600 }}>{b.client}</div>
              <div style={{ color:"#64748b", fontSize:13 }}>{fmt(b.from)} · {nights(b.from,b.to)} notti</div>
            </div>
            <Badge color={STATUS_COLOR[b.status]} label={b.status}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("dashboard");
  const [bookings,setBookings]=useState([]);
  const [clients,setClients]=useState([]);
  const [quotes,setQuotes]=useState([]);
  const [modal,setModal]=useState(null);

  useEffect(()=>{
    const b=load(KEYS.bookings);const c=load(KEYS.clients);const q=load(KEYS.quotes);
    if(b)setBookings(b);if(c)setClients(c);if(q)setQuotes(q);
  },[]);

  useEffect(()=>save(KEYS.bookings,bookings),[bookings]);
  useEffect(()=>save(KEYS.clients,clients),[clients]);
  useEffect(()=>save(KEYS.quotes,quotes),[quotes]);

  const saveBooking=(b)=>setBookings(p=>p.find(x=>x.id===b.id)?p.map(x=>x.id===b.id?b:x):[...p,b]);
  const delBooking=(id)=>setBookings(p=>p.filter(x=>x.id!==id));
  const saveClient=(c)=>setClients(p=>p.find(x=>x.id===c.id)?p.map(x=>x.id===c.id?c:x):[...p,c]);
  const delClient=(id)=>setClients(p=>p.filter(x=>x.id!==id));
  const saveQuote=(q)=>setQuotes(p=>p.find(x=>x.id===q.id)?p.map(x=>x.id===q.id?q:x):[...p,q]);
  const delQuote=(id)=>setQuotes(p=>p.filter(x=>x.id!==id));

  const TABS=[
    {id:"dashboard",label:"Home",icon:"⚓"},
    {id:"calendar",label:"Cal.",icon:"🗓"},
    {id:"list",label:"Pren.",icon:"📋"},
    {id:"clients",label:"Clienti",icon:"👤"},
    {id:"quotes",label:"Prev.",icon:"📄"},
    {id:"stats",label:"Stat.",icon:"📊"},
    {id:"msg",label:"Msg",icon:"✉️"},
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#0a0f1e", fontFamily:"'Inter',system-ui,sans-serif", paddingBottom:70 }}>
      <div style={{ background:"#0f172a", borderBottom:"1px solid #1e293b", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:50 }}>
        <div style={{ width:32,height:32,background:"linear-gradient(135deg,#0ea5e9,#0369a1)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>⚓</div>
        <div>
          <div style={{ color:"#e2e8f0", fontWeight:800, fontSize:16 }}>Onda Reale</div>
          <div style={{ color:"#475569", fontSize:11 }}>Charter Manager</div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 14px" }}>
        {tab==="dashboard"&&<Dashboard bookings={bookings} clients={clients} quotes={quotes}/>}
        {tab==="calendar"&&<CalendarView bookings={bookings} onAdd={()=>setModal({type:"booking",data:null})} onEdit={b=>setModal({type:"booking",data:b})}/>}
        {tab==="list"&&<BookingsList bookings={bookings} onAdd={()=>setModal({type:"booking",data:null})} onEdit={b=>setModal({type:"booking",data:b})}/>}
        {tab==="clients"&&<ClientsView clients={clients} bookings={bookings} onAdd={()=>setModal({type:"client",data:null})} onEdit={c=>setModal({type:"client",data:c})}/>}
        {tab==="quotes"&&<QuotesView quotes={quotes} clients={clients} onAdd={()=>setModal({type:"quote",data:null})} onEdit={q=>setModal({type:"quote",data:q})}/>}
        {tab==="stats"&&<StatisticsView bookings={bookings}/>}
        {tab==="msg"&&<MessaggiView bookings={bookings} clients={clients}/>}
      </div>

      {/* Bottom nav bar — stile iPhone */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#0f172a", borderTop:"1px solid #1e293b", display:"flex", zIndex:50, paddingBottom:"env(safe-area-inset-bottom)" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, background:"none", border:"none", cursor:"pointer", padding:"10px 4px 8px", color:tab===t.id?"#0ea5e9":"#64748b", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:9, fontWeight:tab===t.id?700:400 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {modal?.type==="booking"&&<Modal title={modal.data?"Modifica":"Nuova Prenotazione"} onClose={()=>setModal(null)}><BookingForm booking={modal.data} clients={clients} onSave={saveBooking} onDelete={delBooking} onClose={()=>setModal(null)}/></Modal>}
      {modal?.type==="client"&&<Modal title={modal.data?"Modifica":"Nuovo Cliente"} onClose={()=>setModal(null)}><ClientForm client={modal.data} onSave={saveClient} onDelete={delClient} onClose={()=>setModal(null)}/></Modal>}
      {modal?.type==="quote"&&<Modal title={modal.data?"Modifica":"Nuovo Preventivo"} onClose={()=>setModal(null)} wide><QuoteForm quote={modal.data} clients={clients} onSave={saveQuote} onDelete={delQuote} onClose={()=>setModal(null)}/></Modal>}
    </div>
  );
}
