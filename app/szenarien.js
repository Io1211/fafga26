(function() {
'use strict';
/* SZENARIEN – gemeinsame Quelle für Dashboard (index.html) und Standalone-Seite (szenarien.html) */
const $ = s => document.querySelector(s);
/* Ruhiges Layout: nur NEUE Einträge animieren, feste Höhe fürs Log, kein weiches Scrollen beim Neuaufbau */
(function(){ const st=document.createElement('style'); st.textContent=`
#chat,#mthread{scroll-behavior:auto!important;overscroll-behavior:contain}
.msg,.em,.log li{animation:none!important}
.msg.anim,.em.anim,.log li.anim{animation:pop .18s ease-out!important}
#log{height:300px;max-height:none!important;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
#log li{align-items:flex-start}
#log .st{flex:none;width:18px;display:inline-flex;justify-content:center;align-items:flex-start;min-height:1.3em}
#log .spin{margin-top:5px}
`; document.head.appendChild(st); })();
/* ============================== STATE ============================== */
const PERSP = {
  maria:{name:'Maria', role:'Chefin', emoji:'👩‍💼', bot:'Gastgeber-Copilot', sub:'Assistent · online', av:'🤖', mail:'maria@gasthof-alpenblick.at'},
  ivana:{name:'Ivana', role:'Housekeeping', emoji:'🧹', bot:'Gastgeber-Copilot', sub:'Assistent · online', av:'🤖', mail:'ivana@gasthof-alpenblick.at'},
  marco:{name:'Marco', role:'Küchenchef', emoji:'👨‍🍳', bot:'Gastgeber-Copilot', sub:'Assistent · online', av:'🤖', mail:'marco@gasthof-alpenblick.at'},
  sabine:{name:'Sabine', role:'Rezeption', emoji:'💁', bot:'Gastgeber-Copilot', sub:'Assistent · online', av:'🤖', mail:'sabine@gasthof-alpenblick.at'},
  lena:{name:'Lena', role:'Service (Lehrling)', emoji:'🧑‍🍽️', bot:'Gastgeber-Copilot', sub:'Assistent · online', av:'🤖', mail:'lena@gasthof-alpenblick.at'},
  tim:{name:'Tim', role:'Bewerber', emoji:'🧑', bot:'Gasthof Alpenblick', sub:'digitaler Assistent · antwortet sofort', av:'🏡', mail:'tim@example.com'}
};
const state = {persp:'maria', chan:'wa', subject:'', subjects:{}, cast:['maria'], threads:{}, unread:{}, typing:{}, log:[], inbox:[], stats:{posts:0,apps:0,min:0}, pendings:{}, speed:1, run:0, clock:'08:00', msgId:0, lastSc:null};
Object.keys(PERSP).forEach(k=>{ state.threads[k]=[]; });
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ABORT = Symbol('abort');
let runSeq = 0;
function isoWeek(d){ const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const n=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-n); return Math.ceil((((x-new Date(Date.UTC(x.getUTCFullYear(),0,1)))/864e5)+1)/7); }
function tick(){ let [h,m]=state.clock.split(':').map(Number); m+=1; if(m>=60){m=0;h=(h+1)%24;} state.clock=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); return state.clock; }

function push(th, msg){
  msg.id = ++state.msgId; msg.time = tick();
  state.threads[th].push(msg);
  if(th!==state.persp && msg.from==='bot') state.unread[th]=(state.unread[th]||0)+1;
  if(th===state.persp) renderThread();
  renderPersp(); return msg;
}
function setTyping(th,on){ state.typing[th]=on; if(th===state.persp) renderThread(); }
function addInbox(items, minutes){
  items.forEach(i=>state.inbox.unshift({...i,status:i.status||'freigegeben'}));
  if(!items.every(i=>i.status==='wartet')){ state.stats.posts += items.filter(i=>i.status!=='wartet').length; state.stats.min += minutes||0; }
  renderSide();
}
function logLine(text){ state.log.push({text,done:true}); renderLog(); }

/* ============================== RUN HELPERS ============================== */
function newRun(){
  const id=++runSeq; state.run=id; state.pendings={}; state.typing={};
  const chk=()=>{ if(state.run!==id) throw ABORT; };
  const sleep=async ms=>{ await new Promise(r=>setTimeout(r,ms*state.speed)); chk(); };
  const subj=(th,o)=>{ if(o.subject) state.subjects[th]=o.subject; };
  return {
    sleep,
    async bot(th,text,o={}){ setTyping(th,true); await sleep(o.wait??1000); setTyping(th,false); subj(th,o); return push(th,{from:'bot',text,cards:o.cards,slides:o.slides,mail:o.mail,board:o.board}); },
    async me(th,text,o={}){ await sleep(o.wait??700); return push(th,{from:'me',via:'media',text,media:o.media}); },
    /* Rückfrage mit Buttons; pro Person kann genau eine offen sein (mehrere Personen parallel möglich) */
    async ask(th,text,options,o={}){
      setTyping(th,true); await sleep(o.wait??1000); setTyping(th,false); subj(th,o);
      const m=push(th,{from:'bot',text,cards:o.cards,slides:o.slides,buttons:options,mail:o.mail,board:o.board});
      const r = await new Promise(resolve=>{ state.pendings[th]={th,options,msg:m,resolve}; });
      chk(); if(r!=='__recalled') await sleep(350); return r;
    },
    /* offene Rückfrage einer Person zurückziehen */
    cancel(th){ const p=state.pendings[th]; if(!p) return false; delete state.pendings[th]; p.msg.buttons=null; renderThread(); p.resolve('__recalled'); return true; },
    async work(th,lines){
      setTyping(th,true);
      for(const l of lines){ const it={text:l,done:false}; state.log.push(it); renderLog(); await sleep(520); it.done=true; renderLog(); }
    }
  };
}
function runScenario(id){
  const sc = SC.find(s=>s.id===id); if(!sc) return;
  state.pendings={}; // offene Rückfragen des vorigen Szenarios verwerfen
  state.lastSc=id; state.cast=sc.cast||[sc.persp]; state.persp=sc.persp;
  Object.keys(state.threads).forEach(k=>{ state.threads[k]=[]; state.unread[k]=0; });
  state.subjects={}; state.log=[]; state.clock=sc.clock||'08:00';
  state.subject = typeof sc.subject==='function'?sc.subject():(sc.subject||'Gastgeber-Copilot');
  $('#pop').hidden=true;
  logLine(state.chan==='wa'?'📤 Zustellung: WhatsApp (Push, max. 3 Buttons)':'📤 Zustellung: E-Mail (Aktionslinks, mehr Kontext)');
  const S=newRun(); renderAll();
  sc.run(S).catch(e=>{ if(e!==ABORT) console.error(e); });
}
function pick(msgId, optId){
  let th=null, m=null;
  for(const k of Object.keys(state.threads)){ const f=state.threads[k].find(x=>x.id===msgId); if(f){ th=k; m=f; break; } }
  if(!m||!m.buttons) return;
  const opt=m.buttons.find(o=>o.id===optId); if(!opt) return;
  const p=state.pendings[th];
  m.buttons=null; m.chosen=opt.label; push(th,{from:'me',via:'click',text:opt.label});
  if(p && p.msg===m){ delete state.pendings[th]; p.resolve(optId); }
  else if(opt.reply){ setTyping(th,true); setTimeout(()=>{ setTyping(th,false); push(th,{from:'bot',text:opt.reply}); }, 900*state.speed); }
  renderThread();
}
/* Demo-Hilfe: alle Mitarbeitenden (außer Chefin) beantworten offene Rückfragen mit der ersten Option */
async function autoTeam(){
  const id=state.run; let idle=0;
  while(state.run===id && idle<4){
    await new Promise(r=>setTimeout(r,700*state.speed));
    const ths=Object.keys(state.pendings).filter(t=>t!=='maria');
    if(!ths.length){ idle++; continue; }
    idle=0;
    ths.forEach(t=>{ const p=state.pendings[t]; if(p) pick(p.msg.id,p.options[0].id); });
  }
}

/* ============================== FREITEXT ============================== */
function onSend(text){
  text=(text||'').trim(); if(!text) return;
  const th=state.persp; push(th,{from:'me',via:'text',text});
  const low=text.toLowerCase(), p=state.pendings[th];
  if(p){
    const opt = p.options.find(o=>(o.keys||[]).some(k=>low.includes(k)));
    if(opt){ p.msg.buttons=null; p.msg.chosen=opt.label; delete state.pendings[th]; renderThread(); p.resolve(opt.id); return; }
    return botSay(th,'Das habe ich nicht ganz verstanden 🙈 Tippe bitte auf eine der Optionen oder schreib z. B. „'+(p.options[0].keys?.[0]||'ja')+'“.');
  }
  const staff = th!=='maria' && th!=='tim';
  if(low.includes('stopp')) return botSay(th, staff ? 'Verstanden – dein Einverständnis ist widerrufen ✔ Beiträge mit dir werden gesperrt, bereits veröffentlichte in 48 Stunden entfernt.' : 'STOPP erkannt: Ich sende dir keine Nachrichten mehr. Mit „START" bin ich wieder da.');
  if(low.includes('pause')) return botSay(th,'Ich pausiere für 7 Tage 🔕 und melde mich danach wieder.');
  if(low.includes('hilfe')) return botSay(th,'Das kann ich:\n🔔 Ich melde mich bei Wetter, Events, Eröffnungen & Anlässen – mit Aufgaben passend zu deiner Rolle\n🎤 Du schickst Sprachnachricht/Foto/Video → ich mache einen Post daraus\n\nStichwörter: STOPP · PAUSE · HILFE');
  if(th==='maria' && low.length>12){
    const cleaned=text.replace(/[„“"]/g,'').replace(/[.!?]+$/,'');
    return botSay(th,'Notiert! Daraus mache ich gern einen Post:',{cards:[{title:'Entwurf',text:cleaned.charAt(0).toUpperCase()+cleaned.slice(1)+'.\n\nNeues aus dem Gasthof Alpenblick 🏔 Mehr dazu in unserer Story.\n\n#alpenblick #tirol'}]});
  }
  botSay(th,'Danke! Ich schaue mir das an. 👍');
}
function botSay(th,text,o={}){ setTyping(th,true); setTimeout(()=>{ setTyping(th,false); push(th,{from:'bot',text,cards:o.cards}); }, 900*state.speed); }

/* ============================== BAUSTEINE ============================== */
const OK = (extra={}) => ({id:'ok',label:'👍 Alles freigeben',keys:['ok','passt','freigeb','ja','👍','gut'],...extra});
const EDIT = () => ({id:'edit',label:'✏️ Ändern',keys:['änder','anders','nein']});
const LATER = () => ({id:'later',label:'🗓 Später',keys:['später','spaeter','morgen']});
const shorten = t => { const p=t.split('\n\n'); return p.length>2?[p[0],p[p.length-1]].join('\n\n'):t; };
const warm = t => t+'\n\nBis bald – eure Maria';
/* Freigabe-Schleife: Entwurf zeigen, ändern (kürzer/wärmer), freigeben, später */
async function approveFlow(S,th,intro,cards,inboxItem,min,o={}){
  let cur=cards.map(c=>({...c}));
  let c=await S.ask(th,intro,[OK(),EDIT(),LATER()],{cards:cur,slides:o.slides,wait:300,mail:o.mail});
  while(c==='edit'){
    const v=await S.ask(th,'Was soll anders werden?',[{id:'kurz',label:'Kürzer',keys:['kürz','kurz']},{id:'warm',label:'Persönlicher',keys:['persön','wärm','warm']},{id:'back',label:'Passt doch so',keys:['passt']}]);
    if(v==='kurz') cur[0].text=shorten(cur[0].text); if(v==='warm') cur[0].text=warm(cur[0].text);
    c=await S.ask(th,'Neue Version – besser so?',[OK(),EDIT(),LATER()],{cards:cur,slides:o.slides});
  }
  if(c==='later'){ await S.bot(th,'Alles klar, ich erinnere dich '+(o.remind||'morgen 07:30')+'. 🗓'); return false; }
  addInbox([inboxItem],min);
  logLine('🔌 ContentBrief übergeben → Werkstatt/Publishing (brf_'+inboxItem.title.toLowerCase().replace(/\W+/g,'_').slice(0,20)+')');
  await S.bot(th,'Freigegeben ✔ '+(o.when||'Ich poste zur besten Zeit (heute 17:30).'));
  return true;
}
const WX_WE=[{d:'Fr',e:'☀️',t:'22°'},{d:'Sa',e:'☀️',t:'24°'},{d:'So',e:'🌤️',t:'23°'},{d:'Mo',e:'☁️',t:'16°'}];

/* ============================== SZENARIEN: AKTUELLES ============================== */
/* ---- Team-Szenarien: ein Ereignis, jede Rolle bekommt ihre eigene Aufgabe (datengetrieben) ---- */
const BSTATE={sent:'⏳ gesendet',fyi:'💬 zur Info',ack:'👀 gelesen',accepted:'👍 übernimmt',done:'✅ erledigt',later:'⏰ später',declined:'✖ nicht möglich',help:'🙋 braucht Hilfe',recalled:'↩ zurückgezogen'};
function boardSet(board,id,st){ const t=board.find(x=>x.id===id); if(t) t.state=st; renderThread(); }
const ROLE_NOTE='Du bekommst nur die Aufgabe, die zu deiner Rolle passt. Den Gesamtplan sieht die Chefin.';
const FYI_OPT=[{id:'ok',label:'👍 Verstanden',keys:['ok','verstanden','ja','👍'],state:'ack'}];
const val=v=>typeof v==='function'?v():v;
const O=(id,label,keys,state,extra={})=>({id,label,keys,state,...extra});
const PH=(label,emoji,hue)=>({type:'photo',label,emoji,hue});
const VID=(label,emoji,hue,dur='0:09')=>({type:'video',dur,label,emoji,hue});
const VOI=(dur,transcript)=>({type:'voice',dur,transcript});
const D=(ask,media,work,done,extra={})=>({ask,media,work,done,...extra});

/* Motor: führt einen Plan aus. Staff-Aufgaben laufen gleichzeitig; Aufgaben der Chefin nacheinander nach ihrer Freigabe. */
async function runTeam(S,plan){
  const M='maria';
  const board=plan.tasks.map(t=>({id:t.id,who:t.who,icon:t.icon,label:t.label,state:t.fyi?'fyi':'sent'}));
  const res={}; let recalled=false, ended=false; const skipped={};
  const dead=id=>recalled||skipped[id];
  const staff=plan.tasks.filter(t=>t.who!==M), own=plan.tasks.filter(t=>t.who===M);
  const subject=t=>t.subject||(plan.icon+' '+plan.short+': '+t.label);

  await S.work(M,[...val(plan.signals),'👥 Rollen-Zuordnung: '+plan.tasks.length+' Aufgaben aus dem Betriebsplan ('+[...new Set(plan.tasks.map(t=>PERSP[t.who].role))].join(', ')+')','📨 '+plan.tasks.length+' Nachrichten vorbereitet – Umfang je Rolle: Chefin = Gesamtüberblick, Team = nur die eigene Aufgabe']);

  async function runTask(t){
    const th=t.who, opts=t.fyi?FYI_OPT:t.options;
    const r=await S.ask(th,val(t.msg),opts,{wait:th===M?600:900,cards:t.cards,subject:th===M?undefined:subject(t),mail:th===M?undefined:{facts:t.facts||plan.facts,src:ROLE_NOTE+(t.note?' '+t.note:'')}});
    if(r==='__recalled') return;
    const opt=opts.find(x=>x.id===r);
    if(opt.state) boardSet(board,t.id,opt.state);
    if(dead(t.id)) return;
    if(opt.res) Object.assign(res,opt.res);
    if(opt.learn) logLine(opt.learn);
    if(opt.follow){
      await S.bot(th,opt.follow.ask); await S.me(th,'',{media:opt.follow.media,wait:1300}); if(dead(t.id)) return;
      if(opt.follow.res) Object.assign(res,opt.follow.res);
      if(!opt.deliver) boardSet(board,t.id,'done');
    }
    if(opt.reply) await S.bot(th,opt.reply);
    if(opt.notify) push(M,{from:'bot',text:opt.notify});
    if(opt.deliver){
      const d=opt.deliver;
      if(d.ask) await S.bot(th,d.ask);
      await S.me(th,d.text||'',{media:typeof d.media==='function'?d.media(res):d.media,wait:1600}); if(dead(t.id)) return;
      if(d.work) await S.work(th,[d.work]);
      if(d.res) Object.assign(res,d.res);
      boardSet(board,t.id,'done');
      if(d.done) await S.bot(th,d.done,{wait:500});
    }
    if(opt.end) ended=true;
  }
  const recallAll=async text=>{ recalled=true; await Promise.all(staff.map(t=>{ S.cancel(t.who); boardSet(board,t.id,'recalled'); return S.bot(t.who,text,{wait:400}); })); own.forEach(t=>boardSet(board,t.id,'recalled')); };

  /* Team-Nachrichten laufen gleichzeitig, jede Person antwortet für sich */
  const team=staff.map((t,i)=>(async()=>{ await S.sleep(500+i*450); await runTask(t); })().catch(e=>{ if(e!==ABORT) console.error(e); }));

  /* Chefin: Überblick + Steuerung */
  const editable=staff.filter(t=>!t.fyi).slice(0,3);
  const ovOpts=[{id:'ok',label:'👍 Läuft so',keys:['ok','ja','passt','läuft']}];
  if(editable.length) ovOpts.push({id:'edit',label:'✏️ Aufgabe streichen',keys:['streich','änder']});
  ovOpts.push({id:'recall',label:'🔕 Team zurückrufen',keys:['zurück','stopp','nein']});
  const c=await S.ask(M,val(plan.overview.text),ovOpts,{wait:300,board,subject:val(plan.overview.subject),cards:plan.overview.cards,mail:plan.overview.mail});
  if(c==='recall'){ await recallAll('↩ Aufgabe zurückgezogen – Maria hat "'+plan.short+'" für heute abgesagt. Danke, du musst nichts tun!'); return S.bot(M,'Team zurückgerufen ✔ Alle wurden informiert, niemand muss etwas tun.'); }
  if(c==='edit'){
    const w=await S.ask(M,'Welche Aufgabe soll entfallen?',editable.map(t=>({id:t.id,label:t.icon+' '+PERSP[t.who].role+' ('+PERSP[t.who].name+')',keys:[PERSP[t.who].name.toLowerCase(),PERSP[t.who].role.toLowerCase()]})),{wait:500});
    const t=staff.find(x=>x.id===w); skipped[w]=true; S.cancel(t.who); boardSet(board,w,'recalled');
    await S.bot(t.who,'↩ Aufgabe zurückgezogen – Maria plant es heute anders. Danke, du musst nichts tun!',{wait:400});
    await S.bot(M,'Erledigt ✔ '+PERSP[t.who].name+' ist raus. Der Rest läuft weiter.',{wait:400});
  }
  await S.bot(M,'Alles klar! Ich sammle die Rückmeldungen – oben siehst du den Stand.',{wait:500});
  for(const t of own){ await runTask(t); if(ended) break; }
  if(ended){ await recallAll('↩ Aufgabe zurückgezogen – Maria hat "'+plan.short+'" für heute abgesagt. Danke, du musst nichts tun!'); return S.bot(M,plan.endText||'Alles klar, dann lassen wir das für heute. Das Team wurde informiert.'); }

  const waiting=board.filter(t=>t.who!==M&&['sent','accepted','help'].includes(t.state));
  if(waiting.length) await S.bot(M,'Ich warte noch auf: '+waiting.map(t=>PERSP[t.who].name).join(', ')+'.',{wait:500});
  await Promise.all(team);

  /* Ergebnis zusammenführen */
  const done=id=>board.find(b=>b.id===id)?.state==='done';
  const missing=board.filter(t=>['later','declined','help','sent'].includes(t.state)).map(t=>PERSP[t.who].name+' ('+BSTATE[t.state].replace(/^\S+\s/,'')+')');
  const F=plan.final({res,done,missing});
  const intro=missing.length?'Ich habe den Beitrag aus dem gebaut, was da ist. Noch offen: '+missing.join(', ')+'.':F.intro;
  const ok=await approveFlow(S,M,intro,F.cards,F.item,F.minutes,{slides:F.slides,when:F.when,mail:F.mail});
  if(ok){
    if(F.also&&F.also.length){ addInbox(F.also.map(a=>({title:a.title,channels:a.channels,status:a.status})),F.alsoMinutes||0); F.also.filter(a=>a.handoff).forEach(a=>logLine('🔌 ContentBrief übergeben → '+a.handoff)); }
    await Promise.all(staff.filter(t=>!t.fyi&&done(t.id)).map(t=>S.bot(t.who,'🎉 '+(t.thanks||'Dein Beitrag ist Teil des Posts von heute – freigegeben, geht online. Danke!'),{wait:400})));
  }
}
const sc_team=plan=>S=>runTeam(S,plan);

const WEEKS_ADVENT=()=>Math.max(1,Math.round((new Date('2026-11-29')-new Date())/6048e5));

/* ---------- 1. Es hat geschneit ---------- */
const PLAN_SCHNEE={icon:'❄️',short:'Neuschnee',
  signals:['❄️ Signal: 8 cm Neuschnee über Nacht (Wetterdienst, 06:40)','🕗 Ruhezeit-Check 07:40 ✔ · Tageslimit Chefin 0/1 Push','📊 Verlauf: letzter Schnee-Post vor 120 Tagen → Neuheit hoch','🧠 Chance „Neuschnee-Postkarte" · Score 80 → Push','🛡 Einverständnis: nur Sachmotive, keine Personen im Bild → kein Tresor-Eintrag nötig'],
  facts:['8 cm Neuschnee (bis 06:40)','−3 … +1 °C, Sonne ab ca. 09:00'],
  overview:{subject:'❄️ 8 cm Neuschnee – Postkartenmotiv & Aufgaben fürs Team',text:'❄️ Guten Morgen, Maria! Über Nacht sind 8 cm Neuschnee gefallen – das Haus sieht aus wie eine Postkarte. Fotos wirken bei Schnee am Vormittag am besten (Sonne ab ca. 9 Uhr).\n\nIch habe fünf kleine Aufgaben vorbereitet und dein Team gerade angeschrieben. Jede:r bekommt nur, was zu seiner Rolle passt. Der Stand aktualisiert sich hier laufend:',
    cards:[{title:'Daraus entsteht',text:'1 Reel + Karussell (bis zu 4 Slides) + Story mit Anreise-Info. Veröffentlicht wird nur mit deiner Freigabe.'}],
    mail:{facts:['8 cm Neuschnee (bis 06:40), −3 … +1 °C, Sonne ab ca. 09:00','Anreisen heute: 8 Gäste','Letzter Schnee-Post: vor 120 Tagen','Adventwochenenden erst zu 40 % belegt'],wx:[{d:'Heute',e:'🌨️',t:'1°'},{d:'Mo',e:'☀️',t:'2°'},{d:'Di',e:'☀️',t:'3°'},{d:'Mi',e:'☁️',t:'1°'}]}},
  tasks:[
    {id:'ivana',who:'ivana',icon:'🧹',label:'Eingang & Terrasse bis 8:30 schneefrei',msg:'❄️ Guten Morgen Ivana! Über Nacht sind 8 cm Neuschnee gefallen.\n\nMaria möchte gegen 9 Uhr ein kurzes Video von Eingang und Terrasse drehen. Wenn es geht, bis 8:30: Eingangsbereich und Wege schneefrei, Sitzmöbel abwischen.\n\nKlappt das?',
      facts:['8 cm Neuschnee (bis 06:40)','Dreh gegen 9 Uhr (Sonne)','Bereich: Eingang, Terrasse, Wege'],thanks:'Danke fürs Räumen – dadurch wurde das Video so schön!',
      options:[O('ok','✅ Erledigt bis 8:30',['ok','erledigt','ja'],'done',{reply:'Danke Ivana! 🙌 Dann kann Maria um 9 Uhr in Ruhe drehen.'}),O('help','🙋 Brauche Hilfe',['hilfe'],'help',{reply:'Alles klar, ich sage Maria Bescheid, dass du Unterstützung brauchst. 🙋',notify:'🙋 Ivana braucht Hilfe beim Räumen von Eingang und Terrasse – wer kann kurz unterstützen?'}),O('no','❌ Schaffe ich nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke fürs Bescheid geben.',notify:'↪ Ivana schafft das Räumen bis 8:30 nicht. Das Video besser erst nach 10 Uhr drehen.'})]},
    {id:'reel',who:'maria',icon:'🎥',label:'Postkarten-Video Terrasse (10 s, ab ca. 9 Uhr)',msg:'🎥 Deine Aufgabe: ein 10-Sekunden-Video von der Terrasse – am besten ab ca. 9 Uhr, wenn die Sonne da ist (Ivana räumt bis 8:30).',
      options:[O('yes','🎥 Video senden (Demo)',['video','ja','ok'],'done',{deliver:D(null,VID('Terrasse, Neuschnee','🏔️',210),'🎞 Video 9 s stabilisiert, 9:16 zugeschnitten · 💬 Text-Overlay statt Ton',null)}),O('later','⏰ Später',['später'],'later')]},
    {id:'marco',who:'marco',icon:'🍲',label:'Gericht winterlich anrichten + 1 Foto (bis 12:30)',msg:'❄️ Hallo Marco, über Nacht 8 cm Neuschnee. Maria plant heute einen Schnee-Post – und braucht dein Auge für den Teller.\n\nIdee: ein winterliches Gericht besonders schön anrichten (z. B. Kaiserschmarrn mit Puderzucker-„Schnee" oder Suppe im Brotlaib) und ein Foto machen: Nahaufnahme, dunkler Teller, ein Rosmarinzweig.\n\n3 Minuten, bis 12:30 wäre ideal.',
      facts:['8 cm Neuschnee (bis 06:40)','Foto bis 12:30 (vor dem Mittagsgeschäft)','Im Bild: nur Speise, keine Personen'],thanks:'Dein Teller ist Teil des Schnee-Posts von heute – freigegeben, geht um 17:30 online. Danke!',
      options:[O('yes','✅ Mach ich',['ja','mach','ok'],'accepted',{deliver:D('Super, danke! 🙌 Schick mir das Foto einfach hierher, wenn der Teller fertig ist. 📷',r=>PH((r.dish||'Winterlicher Teller')+' – Nahaufnahme','🍲',25),'👁 Teller-Foto (Marco): Nahaufnahme, gutes Licht, keine Personen erkennbar ✔','Perfekt, sieht klasse aus! Ich gebe es an Maria weiter. 🙌')}),
        O('other','💡 Anderes Gericht',['anders','gericht'],'accepted',{follow:{ask:'Sprich kurz ein, welches Gericht du nehmen möchtest – ich gebe es weiter. 🎤',media:VOI('0:07','„Ich nehm lieber die Kürbissuppe, die sieht mit dem Schnee draußen am besten aus."'),res:{dish:'Kürbissuppe'}},deliver:D('Notiert, Kürbissuppe! Schick mir das Foto, wenn sie fertig ist. 📷',r=>PH((r.dish||'Winterlicher Teller')+' – Nahaufnahme','🍲',25),'👁 Teller-Foto (Marco): Nahaufnahme, gutes Licht, keine Personen erkennbar ✔','Perfekt, sieht klasse aus! Ich gebe es an Maria weiter. 🙌')}),
        O('no','⏰ Heute nicht',['nicht','nein','später'],'declined',{learn:'📉 Lernen: Küche lehnt Foto-Aufgaben vor dem Mittagsgeschäft öfter ab → künftig erst nach 14 Uhr fragen',reply:'Kein Problem, danke! Ich frage bei passender Gelegenheit wieder. 👍'})]},
    {id:'sabine',who:'sabine',icon:'🛎',label:'Zufahrt für die Anreise-Story bestätigen',msg:'❄️ Hallo Sabine, 8 cm Neuschnee. Heute reisen 8 Gäste an (Reservierungssystem) – viele werden nach der Straße fragen.\n\nMaria möchte eine kurze Story mit Anreise-Hinweis posten. Dafür brauche ich von dir eine Info, die ich nicht raten darf: Wie ist die Zufahrt zum Haus gerade?',
      facts:['8 cm Neuschnee (bis 06:40)','Anreisen heute: 8 Gäste (Reservierungssystem)','Frage: aktuelle Lage der Zufahrt'],note:'Die KI fragt bewusst nach, statt die Straßenlage zu erfinden.',thanks:'Deine Zufahrts-Info ist in der Anreise-Story von heute – freigegeben, geht um 17:30 online. Danke!',
      options:[O('frei','✅ Frei befahrbar',['frei','ok'],'done',{res:{road:'frei'},reply:'Danke Sabine! Ich baue „Zufahrt frei" in die Story ein. ✔'}),O('ketten','⛓ Ketten nötig',['ketten'],'done',{res:{road:'ketten'},reply:'Danke! Ich schreibe „Schneeketten mitführen" in die Story. ⛓'}),O('problem','🚧 Problem / gesperrt',['problem','gesperrt'],'done',{res:{road:'problem'},reply:'Danke für die Warnung! Ich sage Maria sofort Bescheid – die Story wird zum Hinweis statt zum Werbepost. 🚧',notify:'🚧 Sabine meldet ein Problem mit der Zufahrt. Die Anreise-Story wird als Warnhinweis formuliert, nicht als Werbung.'})]},
    {id:'lena',who:'lena',icon:'☕',label:'Fenstertisch mit Heißgetränk fotografieren',msg:'❄️ Hi Lena! Es hat geschneit – super Lichtstimmung am Fenster. Kleine Aufgabe (2 Min., am Nachmittag): den Tisch am Fenster mit einem heißen Getränk ganz nah fotografieren. Keine Gesichter im Bild, dann brauchst du kein Einverständnis zu geben.',
      facts:['Neuschnee, gutes Licht am Fenster','Motiv: Fenstertisch + Heißgetränk','Keine Personen im Bild → kein Einverständnis nötig'],
      options:[O('yes','✅ Mach ich',['ja','mach','ok'],'accepted',{deliver:D('Super, danke! 🙌 Schick das Foto hierher, wenn du es hast. 📷',PH('Fenstertisch mit Heißgetränk','☕',200),'👁 Foto Fenstertisch: keine Personen erkennbar ✔ (kein Einverständnis nötig)','Wunderschön, danke Lena! Ich gebe es an Maria weiter. ☕')}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich erinnere dich um 15 Uhr. ⏰'}),O('no','❌ Geht nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke fürs Bescheid geben! 👍'})]}
  ],
  final:({res,done})=>{
    const slides=['Titel: 8 cm Neuschnee ❄️']; if(done('reel')) slides.push('Terrasse (Standbild aus dem Video)'); if(done('marco')) slides.push((res.dish||'Winterlicher Teller')+' aus der Küche'); if(done('lena')) slides.push('Fenstertisch mit Heißgetränk');
    const caption='Erster Schnee im Alpenblick ❄️\n\nÜber Nacht ist der Winter angekommen – 8 cm Neuschnee.'+(done('marco')?'\nAus der Küche gibt es dazu '+(res.dish||'einen winterlich angerichteten Teller')+'.':'')+(done('lena')?'\nUnd am Fenster wartet ein heißes Getränk.':'')+'\n\nFür die Adventwochenenden haben wir noch Zimmer frei – Link in Bio.\n\n#erstermschnee #tirol #winterurlaub';
    const road={frei:'Anreise heute: Die Zufahrt zum Haus ist aktuell frei befahrbar (Meldung der Rezeption). Gute Fahrt und bis gleich!',ketten:'Anreise heute: Bitte Schneeketten mitführen (Meldung der Rezeption). Fragen? Die Rezeption hilft gern.',problem:'⚠ Anreise heute: Die Zufahrt ist eingeschränkt. Bitte kurz bei der Rezeption anrufen, bevor ihr losfahrt.'}[res.road];
    const cards=[{title:done('reel')?'Reel (9 s) + Caption':'Caption',text:caption}]; if(road) cards.push({title:'Story: Anreise-Info',text:road}); if(done('reel')) cards.push({title:'Hinweis',text:'Sound bitte direkt beim Posten in der App wählen (Lizenz).'});
    return {intro:'Alles beisammen – dein Team hat geliefert! ❄️ So sieht der Beitrag aus:',cards,slides:slides.length>1?slides:undefined,item:{title:'Neuschnee-Paket (Team)',channels:[done('reel')?'Instagram Reel':null,slides.length>1?'Karussell':null,road?'Story':null].filter(Boolean)},minutes:45,when:'Ich poste heute 17:30, wenn die meisten Urlauber schauen.'};
  }};

/* ---------- 2. Schönes Wochenende ---------- */
const PLAN_WOCHENENDE={icon:'☀️',short:'Sonniges Wochenende',
  signals:['⛅ Signal: Fr–So trocken, Ø 10 h Sonne, bis 24 °C (Wetterdienst)','🛏️ Signal: Belegung Fr–So 55 % → 9 Zimmer frei (Reservierungssystem)','🔀 Kombination: Lücke + Schönwetter → Wirkung ↑ (+0,2)','🚦 Sicherheits-Check: keine Böen ≥ 60 km/h → Tourentipps erlaubt','🧠 Chance „Sonniges Wochenende" · Score 88 → Push'],
  facts:['Fr–So: 0 mm Regen, Ø 10 h Sonne, bis 24 °C','Belegung Fr–So: 55 % (9 von 20 Zimmern frei)'],
  overview:{subject:'☀️ Kaiserwetter am Wochenende – und 9 Zimmer sind noch frei',text:'☀️ Wochenend-Tipp: Freitag bis Sonntag Kaiserwetter (kein Regen, ~10 Std. Sonne, bis 24 °C). Bei dir sind noch 9 Zimmer frei (55 % belegt).\n\nIch habe fünf kleine Aufgaben vorbereitet und dein Team angeschrieben – jede:r bekommt nur, was zur Rolle passt. Der Stand aktualisiert sich hier laufend:',
    cards:[{title:'Daraus entsteht',text:'Last-Minute-Post + Wandertipps-Karussell (3 Routen aus deiner Liste) + Story. Veröffentlicht wird nur mit deiner Freigabe.'}],
    mail:{facts:['Fr–So: 0 mm Regen, Ø 10 h Sonne, bis 24 °C','Belegung Fr–So: 55 % (9 von 20 Zimmern frei)','Zuletzt Wandertipps vor 38 Tagen'],wx:WX_WE}},
  tasks:[
    {id:'anreiz',who:'maria',icon:'🎁',label:'Anreiz für Kurzentschlossene wählen',msg:'🎁 Deine Entscheidung: Welchen Anreiz möchtest du bieten? (Ich erfinde keine Preise.)',
      options:[O('fr','🥐 Frühstück inklusive',['frühstück'],'done',{res:{anreiz:'Frühstück inklusive'}}),O('dr','🍷 Willkommensgetränk',['getränk','willkommen'],'done',{res:{anreiz:'Willkommensgetränk gratis'}}),O('pr','💶 10 % bei 2 Nächten',['preis','%','euro'],'done',{res:{anreiz:'10 % bei 2 Nächten'}})]},
    {id:'sabine',who:'sabine',icon:'🛎',label:'Freie Zimmer bestätigen',msg:'☀️ Hallo Sabine, am Wochenende ist Kaiserwetter – Maria plant ein Last-Minute-Angebot. Laut Reservierungssystem sind Fr–So noch 9 Zimmer frei. Stimmt das, und darf ich sie als „Last-Minute" anbieten?',
      facts:['Fr–So: Kaiserwetter (0 mm, ~10 h Sonne)','Belegung Fr–So: 55 % → 9 Zimmer frei (Reservierungssystem)'],thanks:'Deine Zimmer-Info steht im Last-Minute-Post von heute. Danke!',
      options:[O('ok','✅ Stimmt, 9 frei',['stimmt','ok','ja'],'done',{res:{rooms:'9'},reply:'Danke Sabine! Ich schreibe „noch 9 Zimmer" in den Post.'}),O('less','✏️ Es sind weniger',['weniger'],'done',{res:{rooms:'wenige'},reply:'Alles klar, ich schreibe „nur noch wenige Zimmer".'}),O('no','🚫 Kein Last-Minute',['kein','nein'],'declined',{res:{noLM:true},reply:'Verstanden, ich lasse das Angebot weg und mache nur Wandertipps.',notify:'Sabine möchte kein Last-Minute-Angebot – es gibt nur Wandertipps.'})]},
    {id:'ivana',who:'ivana',icon:'🧹',label:'Freie Zimmer bis Fr 14 Uhr bezugsfertig',msg:'☀️ Hallo Ivana, am Wochenende sind Fr–So noch 9 Zimmer frei und Maria bietet sie Kurzentschlossenen an. Können alle freien Zimmer bis Freitag 14 Uhr bezugsfertig sein?',
      facts:['Fr–So: 9 freie Zimmer','Anreise ab Freitag 14 Uhr'],thanks:'Bezugsfertige Zimmer machen das Angebot erst möglich. Danke!',
      options:[O('ok','✅ Alle bereit bis Fr 14 Uhr',['ok','ja','bereit'],'done',{reply:'Danke Ivana! 🙌 Dann können Kurzentschlossene direkt kommen.'}),O('part','⚠ 2 Zimmer erst Sa früh',['zwei','2','später'],'done',{res:{lateRooms:true},reply:'Alles klar, ich schreibe „einige Zimmer ab Samstag früh bezugsfertig".',notify:'Ivana: 2 Zimmer sind erst ab Samstag früh bezugsfertig – der Post erwähnt das.'}),O('no','❌ Schaffe ich nicht',['nicht','nein'],'declined',{reply:'Kein Problem, ich sage Maria Bescheid.',notify:'⚠ Ivana schafft die Zimmer bis Freitag nicht – Last-Minute-Angebot besser erst ab Samstag.'})]},
    {id:'marco',who:'marco',icon:'🥪',label:'Rucksack-Jause anbieten + Foto',msg:'☀️ Hallo Marco, Kaiserwetter am Wochenende – viele Gäste wandern. Maria plant Wandertipps mit Einkehr. Kannst du am Wochenende eine Rucksack-Jause anbieten (auf Vorbestellung bis Freitag) und ein Foto davon machen?',
      facts:['Fr–So: Kaiserwetter, Wanderwetter','Idee: Rucksack-Jause auf Vorbestellung bis Fr','Im Bild: nur Speise, keine Personen'],thanks:'Deine Rucksack-Jause ist Teil des Wochenend-Posts. Danke!',
      options:[O('yes','✅ Ja, mit Foto',['ja','ok','mach'],'accepted',{res:{jause:true},deliver:D('Super! Schick mir das Foto, wenn die Jause gepackt ist. 📷',PH('Rucksack-Jause','🥪',35),'👁 Foto Rucksack-Jause: gutes Licht, keine Personen erkennbar ✔','Sieht köstlich aus! Ich gebe es an Maria weiter. 🥪')}),O('no','❌ Nicht möglich',['nicht','nein'],'declined',{reply:'Kein Problem, danke fürs Bescheid geben! 👍'})]},
    {id:'lena',who:'lena',icon:'🥐',label:'Frühstückstisch auf der Terrasse fotografieren',msg:'☀️ Hi Lena! Am Wochenende ist Kaiserwetter. Kleine Aufgabe (2 Min.): den gedeckten Frühstückstisch auf der Terrasse fotografieren, ohne Personen im Bild. Am besten morgens im Sonnenlicht.',
      facts:['Fr–So: Kaiserwetter','Motiv: Frühstückstisch Terrasse','Keine Personen im Bild → kein Einverständnis nötig'],
      options:[O('yes','✅ Mach ich',['ja','mach','ok'],'accepted',{deliver:D('Super, danke! 🙌 Schick das Foto hierher. 📷',PH('Frühstück auf der Terrasse','🥐',45),'👁 Foto Frühstückstisch: keine Personen erkennbar ✔','Wunderschön, danke Lena! ☀️')}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich erinnere dich Freitagfrüh. ⏰'}),O('no','❌ Geht nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]}
  ],
  final:({res,done})=>{
    const rooms=res.rooms==='9'?'noch 9 Zimmer':res.rooms==='wenige'?'nur noch wenige Zimmer':'noch ein paar Zimmer';
    const cards=[]; if(!res.noLM) cards.push({title:'Instagram-Post (Last-Minute)',text:'Kaiserwetter am Wochenende – und '+rooms+' sind frei. ☀️\n\nFreitag bis Sonntag trocken und sonnig. Kurzentschlossen? Dazu: '+(res.anreiz||'[Anreiz bitte ergänzen]')+'.'+(res.lateRooms?'\n(Einige Zimmer ab Samstag früh bezugsfertig.)':'')+'\n\nDirekt buchen (ohne Provision): Link in Bio.'});
    cards.push({title:'Karussell-Caption (Wandertipps)',text:'3 Runden ab Haus – Kaiserwetter bis Sonntag. 🥾\n\nAlmrunde (3 Std., mit Einkehr), Panoramaweg (2 Std., wenig Steigung), Seerunde (1,5 Std., kinderwagentauglich).'+(res.jause?'\nRucksack-Jause vom Haus auf Vorbestellung bis Freitag.':'')+'\n\n#wandernintirol #kaiserwetter'});
    const slides=['Titel: Kaiserwetter','Almrunde','Panoramaweg','Seerunde']; if(done('marco')) slides.push('Rucksack-Jause'); if(done('lena')) slides.push('Frühstück auf der Terrasse');
    return {intro:'Alles beisammen – dein Team hat geliefert! ☀️ So sieht der Beitrag aus:',cards,slides,item:{title:'Sonniges Wochenende (Team)',channels:['Instagram','Karussell','Story']},minutes:40,when:'Ich poste Donnerstag 18:00 – rechtzeitig vor den Wochenend-Buchungen.'};
  }};

/* ---------- 3. Neueröffnung in der Region ---------- */
const PLAN_EROEFFNUNG={icon:'🆕',short:'Neueröffnung Gondelbahn',endText:'Alles klar, kein Beitrag dazu. Das Team wurde informiert.',
  signals:['🔎 Signal: Neuer Eintrag im Tourismusverband-Feed „Neue Gondelbahn ‚Almblick‘ eröffnet Sa"','🧠 KI-Extraktion: Typ=Neueröffnung · Ort=12 km · Datum=Samstag · Zielgruppe: Wanderer/Familien','📊 Wettbewerb: 2 Nachbarbetriebe haben bereits gepostet','🧠 Chance „Regionale Neueröffnung" · Score 66 → Digest'],
  facts:['Gondelbahn „Almblick" eröffnet Samstag','Entfernung: 12 km','Quelle: Tourismusverband (RSS)'],
  overview:{subject:'🆕 Neu in der Region: Gondelbahn „Almblick" eröffnet am Samstag',text:'🆕 Neu in der Region: Die Gondelbahn „Almblick" (12 km von dir) eröffnet am Samstag. Gäste werden danach fragen – und zwei Nachbarn haben schon gepostet.\n\nMit deinem persönlichen Tipp bist du die vertrauenswürdige Stimme. Ich habe kleine Aufgaben vorbereitet und dein Team angeschrieben:',
    mail:{facts:['Quelle: Tourismusverband (RSS), heute 07:05','„Neue Gondelbahn ‚Almblick‘ eröffnet am Samstag"','Entfernung: 12 km','2 Nachbarbetriebe haben schon gepostet'],src:'Hinweis: Die KI hat nur diese Angaben. Öffnungszeiten und Preise kennt sie nicht und erfindet sie nicht.'}},
  tasks:[
    {id:'tip',who:'maria',icon:'📍',label:'Dein Insider-Tipp (Sprachnachricht)',msg:'📍 Wann ist der beste Zeitpunkt für die Bahn, und wo kehrt man ein? Sprich es kurz ein – dein Tipp macht den Unterschied.',
      options:[O('voice','🎤 Tipp einsprechen (Demo)',['tipp','ja'],'done',{deliver:D(null,VOI('0:12','„Fahrt vor 10 Uhr, dann ist wenig los. Und danach unbedingt Jause beim Huberwirt, der ist gleich an der Bergstation."'),'🎧 Sprachnachricht → Text · Fakten getrennt: Verbands-Info (geprüft) + dein Tipp (von dir)',null,{res:{tip:true}})}),O('info','📰 Nur Info-Story',['info','story'],'done',{res:{tip:false}}),O('no','🙅 Nicht relevant',['nicht','nein'],'declined',{end:true,learn:'📉 Lerngewicht „Neueröffnung": −0,2'})]},
    {id:'sabine',who:'sabine',icon:'🛎',label:'Öffnungszeiten der Bahn nachsehen',msg:'🆕 Hallo Sabine, am Samstag eröffnet die Gondelbahn „Almblick" (12 km). Gäste werden dich danach fragen. Kannst du Öffnungszeiten und Preise auf der Betreiber-Seite nachsehen? Ich darf sie nicht raten.',
      facts:['Gondelbahn „Almblick" eröffnet Samstag','Gefragt: Öffnungszeiten & Preise (nicht erfinden)'],thanks:'Deine Öffnungszeiten stehen im Post zur neuen Bahn. Danke!',
      options:[O('ok','✅ Habe ich (Demo)',['ok','ja','habe'],'accepted',{deliver:D('Danke! Schick mir kurz, was du gefunden hast.',null,'📝 Angaben der Rezeption übernommen (Quelle: Betreiber-Seite, von Sabine geprüft)','Perfekt, ich trage die Zeiten ein und lasse die Preise offen. 📝',{text:'Täglich 9:00–16:30 Uhr (laut Betreiber-Seite). Preise stehen noch nicht online.',res:{hours:'täglich 9:00–16:30 Uhr'}})}),O('nf','🔎 Finde ich nicht',['nicht','finde'],'help',{reply:'Kein Problem, ich lasse „Öffnungszeiten: [bitte prüfen]" im Post stehen.',notify:'🙋 Sabine findet die Öffnungszeiten der Bahn nicht – im Post steht ein Platzhalter.'}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich erinnere dich Freitagfrüh. ⏰'})]},
    {id:'marco',who:'marco',icon:'🥪',label:'Rucksack-Jause für Bahn-Ausflügler?',msg:'🆕 Hallo Marco, ab Samstag fahren Gäste mit der neuen Gondelbahn „Almblick". Maria überlegt einen Ausflugstipp. Könntest du eine Rucksack-Jause für Ausflügler anbieten (auf Vorbestellung)?',
      facts:['Gondelbahn „Almblick" eröffnet Samstag','Idee: Rucksack-Jause auf Vorbestellung'],
      options:[O('yes','✅ Ja, auf Vorbestellung',['ja','ok'],'done',{res:{jause:true},reply:'Danke Marco! Ich erwähne die Rucksack-Jause im Post.'}),O('no','❌ Nein',['nein','nicht'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'lena',who:'lena',icon:'💬',label:'Gästefragen beim Frühstück beantworten',msg:'🆕 Hi Lena, ab Samstag eröffnet die Gondelbahn „Almblick" (12 km entfernt). Beim Frühstück werden Gäste danach fragen. Kurzinfo für dich: Eröffnung Samstag; Zeiten und Preise liefert Sabine, sobald sie sie hat.',
      facts:['Gondelbahn „Almblick" eröffnet Samstag','12 km entfernt','Zeiten/Preise: folgen von der Rezeption'],
      options:[O('ok','✅ Verstanden',['ok','verstanden','ja'],'ack'),O('q','❓ Ich habe eine Frage',['frage'],'help',{reply:'Alles klar, ich gebe deine Frage an Maria weiter.',notify:'🙋 Lena hat eine Frage zur neuen Bahn – bitte kurz erklären.'})]},
    {id:'ivana',who:'ivana',icon:'🗂',label:'Tippkarte in Zimmermappen legen',msg:'🆕 Hallo Ivana, Maria macht eine kleine Tippkarte zur neuen Gondelbahn „Almblick". Sobald sie an der Rezeption liegt (heute Mittag), bitte beim Zimmerservice in die Zimmermappen legen.',
      facts:['Tippkarte (Druck) liegt heute Mittag an der Rezeption','Aufgabe: in Zimmermappen legen'],thanks:'Die Tippkarte in den Zimmern kommt bei den Gästen gut an. Danke!',
      options:[O('ok','✅ Mache ich',['ok','ja'],'done',{reply:'Danke Ivana! 🙌'}),O('no','❌ Schaffe ich nicht',['nicht','nein'],'declined',{reply:'Kein Problem, ich frage die Rezeption.'})]}
  ],
  final:({res,done})=>({intro:'Perfekt – so sieht der Beitrag aus:',cards:[{title:'Instagram-Caption',text:'Neu in der Region: Die Gondelbahn „Almblick" eröffnet am Samstag – nur 12 km von uns. 🚠\n\n'+(res.tip?'Unser Tipp: früh losfahren (vor 10 Uhr ist wenig los) und danach Jause beim Huberwirt an der Bergstation.\n\n':'')+'Öffnungszeiten: '+(res.hours||'[bitte vom Betreiber eintragen]')+'. Preise: [bitte vom Betreiber eintragen]\n\n'+(res.jause?'Rucksack-Jause auf Vorbestellung an der Rezeption.\n\n':'')+'#almblick #tirol #ausflugstipp'}],item:{title:'Neu: Gondelbahn Almblick'+(res.tip?' + Insider-Tipp':''),channels:['Instagram','Facebook']},minutes:25,when:'Ich poste Freitag 17:00 – bevor Gäste ihr Wochenende planen.',
    also:done('ivana')?[{title:'Tippkarte Gondelbahn (Druck)',channels:['Druck','Zimmermappen'],status:'freigegeben'}]:[],alsoMinutes:8})};

/* ---------- 4. Veranstaltungshinweise (echte Termine als Beispiel, recherchiert bei den Veranstaltern) ---------- */
const PLAN_EVENT={icon:'🎪',short:'Veranstaltungshinweise',endText:'Alles klar, ich melde mich bei der nächsten Veranstaltung wieder. Das Team wurde informiert.',
  signals:['🎪 Signal: 3 Veranstaltungen erkannt (Veranstalter-Webseiten fafga.at, kidu.at, kitzbuehel.com)','🧠 Einordnung: FAFGA (20.–22.9.) + KIDU-Buildathon (20.9.) = Branchen-Events für Betrieb & Team · KitzBeach (10.–13.9.) = Gäste-Event','🔎 Fakten-Check: Termine & Orte laut Veranstalter · nicht bekannt (nicht erfunden): FAFGA-Öffnungszeiten, Ticketpreise','🧠 Chance „Veranstaltungshinweise" · Score 71 → Digest'],
  facts:['FAFGA meets future: 20.–22.9.2026, Messe Innsbruck (Quelle: fafga.at)','KIDU × FAFGA KI-Buildathon: 20.9., Messe Innsbruck (Quelle: kidu.at)','KitzBeach: 10.–13.9., Tennisstadion Kitzbühel (Quelle: kitzbuehel.com)'],
  overview:{subject:'🎪 FAFGA, KI-Buildathon & KitzBeach – Veranstaltungshinweise für dein Team',
    text:'🎪 Veranstaltungen, die ihr für euer Marketing nutzen könnt (recherchiert bei den Veranstaltern):\n\n🏐 Für Gäste\n• Vom 10. bis 13. September findet KitzBeach im Tennisstadion Kitzbühel statt (Beachvolleyball-Staatsmeisterschaften) – schon in 5 Tagen.\n\n🏢 Für euch als Betrieb (Fachpublikum)\n• Vom 20. bis 22. September findet die FAFGA meets future in der Messe Innsbruck statt – in 15 Tagen. Tickets gibt es im Vorverkauf.\n• Am 20. September findet der KIDU × FAFGA KI-Buildathon statt (kostenlos, ab 16 Jahren).\n\nIch habe Aufgaben je Rolle vorbereitet und dein Team angeschrieben:',
    mail:{facts:['FAFGA meets future: 20.–22.9.2026 (Sonntag bis Dienstag, erstmals dreitägig), Messe Innsbruck – Schwerpunkte: KI, Digitalisierung, Nachhaltigkeit, Recruiting, Nahrungsmittel/Getränke, Hotelausstattung (Quelle: fafga.at)','KIDU × FAFGA KI-Buildathon: 20.9., Messe Innsbruck · 100 Plätze, ab 16 Jahren, kostenlos, keine Programmierkenntnisse nötig · Finale ab 15:00 Uhr (Quelle: kidu.at)','KitzBeach 2026: 10.–13.9., Tennisstadion Kitzbühel (Business Cup 10.9., Staatsmeisterschaften 11.–13.9., Trachtensonntag 13.9.) (Quelle: kitzbuehel.com)','FAFGA: Tickets im Vorverkauf über den Webshop (Quelle: fafga.at)','Nicht bekannt, deshalb nicht erwähnt: FAFGA-Öffnungszeiten, Ticketpreise'],src:'Die KI nennt nur, was die Veranstalter selbst veröffentlichen, und erfindet keine Uhrzeiten oder Preise.'}},
  tasks:[
    {id:'scope',who:'maria',icon:'🎯',label:'Umfang wählen',msg:'🎯 Deine Entscheidung: Was machen wir daraus? Der Messe-Beitrag zeigt, dass ihr euch weiterbildet (gut fürs Recruiting). Der KitzBeach-Beitrag ist ein Ausflugstipp für Gäste.',
      options:[O('both','✅ Beides',['beides','alle','ja'],'done',{res:{scope:'both'}}),O('messe','🏢 Nur Messe',['messe','nur'],'done',{res:{scope:'messe'}}),O('later','🗓 Später',['später'],'later',{end:true})]},
    {id:'marco',who:'marco',icon:'🥕',label:'Messe-Wunschliste für die Küche (Sprachnachricht)',msg:'🏢 Hallo Marco, Maria besucht die FAFGA (20.–22.9., Fachmesse in Innsbruck). Ein Schwerpunkt ist „Nahrungsmittel/Getränke". Was sollen wir uns für die Küche ansehen oder wen sollen wir treffen? Sprich kurz eine Wunschliste ein.',
      facts:['FAFGA meets future: 20.–22.9.2026, Messe Innsbruck','Kategorien laut Veranstalter u. a.: Nahrungsmittel/Getränke, Hotelausstattung, KI, Recruiting','Quelle: fafga.at'],thanks:'Deine Wunschliste geht mit auf die Messe. Danke!',
      options:[O('voice','🎤 Wunschliste einsprechen (Demo)',['wunsch','ja','ok'],'accepted',{follow:{ask:'Sprich kurz ein – ich gebe es an Maria weiter. 🎤',media:VOI('0:10','„Ich möchte mit regionalen Lieferanten sprechen und mir neue Ideen für vegetarische Gerichte anschauen."'),res:{kitchen:'regionale Lieferanten und neue Ideen für vegetarische Gerichte'}},reply:'Danke Marco! Die Wunschliste geht mit auf die Messe. 🥕'}),O('no','❌ Nicht dabei',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'ivana',who:'ivana',icon:'🧹',label:'Messe-Wunschliste Hotelausstattung (Sprachnachricht)',msg:'🏢 Hallo Ivana, Maria besucht die FAFGA in Innsbruck (20.–22.9.). „Hotelausstattung" ist eine der Kategorien. Was würde dir die Arbeit im Housekeeping erleichtern? Sprich kurz eine Wunschliste ein.',
      facts:['FAFGA meets future: 20.–22.9.2026, Messe Innsbruck','Kategorie laut Veranstalter: Hotelausstattung','Quelle: fafga.at'],thanks:'Dein Wunsch geht mit auf die Messe. Danke!',
      options:[O('voice','🎤 Wunschliste einsprechen (Demo)',['wunsch','ja','ok'],'accepted',{follow:{ask:'Sprich kurz ein – ich gebe es an Maria weiter. 🎤',media:VOI('0:08','„Ein leichterer Wäschewagen und einen leisen Staubsauger für die Etage."'),res:{housekeeping:'leichtere Wäschewagen und leise Staubsauger'}},reply:'Danke Ivana! Das ist eine tolle Idee für die Messe. 🧹'}),O('no','❌ Nichts dabei',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'sabine',who:'sabine',icon:'🏐',label:'KitzBeach: Infos für Gäste bereithalten',msg:'🏐 Hallo Sabine, vom 10. bis 13. September findet KitzBeach im Tennisstadion Kitzbühel statt (Beachvolleyball-Staatsmeisterschaften). Gäste werden vorher danach fragen. Laut Veranstalter: Tickets online über kitzbeach.at und Kitzbühel Tourismus; für Ticketbesitzer gibt es einen kostenlosen Parkplatz beim Areal; vom Bahnhof Kitzbühel sind es ca. 20 Gehminuten. Kannst du diese Infos an der Rezeption bereithalten?',
      facts:['KitzBeach 2026: 10.–13.9., Tennisstadion Kitzbühel','Tickets online: kitzbeach.at, Kitzbühel Tourismus','Kostenloser Parkplatz für Ticketbesitzer beim Areal; ca. 20 Gehminuten vom Bahnhof Kitzbühel','Quelle: kitzbuehel.com'],thanks:'Deine Infos an der Rezeption helfen den Gästen sehr. Danke!',
      options:[O('yes','✅ Liegt bereit',['ja','bereit','ok'],'done',{res:{kitzInfo:true},reply:'Danke Sabine! Ich erwähne im Post, dass die Rezeption weiterhilft. 🏐'}),O('q','❓ Ich brauche mehr Infos',['infos','frage'],'help',{reply:'Alles klar, ich sage Maria Bescheid.',notify:'🙋 Sabine braucht mehr Infos zu KitzBeach (Tickets/Anreise) für die Rezeption.'})]},
    {id:'lena',who:'lena',icon:'🤖',label:'KIDU-Buildathon: Lust mitzumachen?',msg:'🤖 Hi Lena! Bei der FAFGA in Innsbruck findet am 20. September der KIDU × FAFGA KI-Buildathon statt: kostenlos, ab 16 Jahren, keine Programmierkenntnisse nötig. Man löst in einem Tag mit KI-Tools eine Aufgabe aus der Gastronomie und Hotellerie.\n\nMaria würde dich dafür freistellen. Hast du Lust?',
      facts:['KIDU × FAFGA KI-Buildathon: 20.9., Messe Innsbruck','100 Plätze · ab 16 Jahren · kostenlos · keine Programmierkenntnisse nötig','Finale ab 15:00 Uhr','Quelle: kidu.at'],note:'Teilnahmebedingungen bitte beim Veranstalter prüfen (z. B. Einverständnis bei Minderjährigen).',
      options:[O('yes','✅ Ja, ich möchte!',['ja','möchte','lust'],'accepted',{res:{lena:true},reply:'Super! 🎉 Ich sage Maria Bescheid. Bitte kläre mit ihr die Freistellung.',notify:'🙋 Lena möchte beim KIDU × FAFGA KI-Buildathon mitmachen (kostenlos, ab 16). Bitte Freistellung klären und Teilnahmebedingungen beim Veranstalter prüfen (Einverständnis bei Minderjährigen).'}),O('more','🤔 Erzähl mir mehr',['mehr','wie'],'help',{reply:'Kurz: 1 Tag, gemischte Teams, du bringst ein Problem aus dem Alltag mit, am Ende hast du etwas Klickbares in der Hand. Mehr auf kidu.at. Sag Bescheid, wenn du mitmachen willst!',notify:'ℹ️ Lena überlegt noch, ob sie beim KI-Buildathon mitmacht.'}),O('no','❌ Nicht heute',['nicht','nein'],'declined',{reply:'Kein Problem, danke fürs Bescheid geben! 👍'})]}
  ],
  final:({res,done})=>{
    const both=res.scope==='both';
    const cards=[{title:'Post/Story: Team auf der FAFGA',text:'Wir sind auf der FAFGA meets future in Innsbruck (20.–22.9., Messe Innsbruck)! 🤝\n\nKI, Digitalisierung, Recruiting, Hotelausstattung – wir schauen uns Neuheiten an und bringen Ideen für unsere Gäste und unser Team mit.'+(res.kitchen?'\nFür die Küche: '+res.kitchen+'.':'')+(res.housekeeping?'\nFürs Housekeeping: '+res.housekeeping+'.':'')+(res.lena?'\nUnsere Lehrlinge dürfen beim KIDU KI-Buildathon mitmachen – Weiterbildung ist bei uns Teil des Jobs.':'')+'\n\nWer uns auf der Messe treffen möchte: schreibt uns!\n\n#fafga #fafga26 #hotellerie #gastronomie'}];
    if(both) cards.push({title:'Post: Ausflugstipp KitzBeach',text:'Tipp für alle Sportfans: Vom 10. bis 13. September findet KitzBeach im Tennisstadion Kitzbühel statt – die Beachvolleyball-Staatsmeisterschaften. 🏐\n\nAm Trachtensonntag (13.9.) gibt es Weißwurst & Breze gratis für alle in Tracht. Tickets: online über kitzbeach.at oder Kitzbühel Tourismus. Für Ticketbesitzer gibt es einen kostenlosen Parkplatz beim Areal.'+(res.kitzInfo?'\n\nFragen zur Anreise? Unsere Rezeption hilft gern.':'')+'\n\n#kitzbeach #kitzbühel #beachvolleyball'});
    if(res.lena) cards.push({title:'Hinweis Einverständnis',text:'Lena steht im Einverständnis-Tresor auf „ausstehend" (Eltern-OK fehlt). Deshalb steht im Text nur „unsere Lehrlinge" – Name und Foto erst nach Freigabe.'});
    return {intro:'Perfekt – so sehen die Beiträge aus:',cards,item:{title:'Veranstaltungshinweise: FAFGA · KIDU'+(both?' · KitzBeach':''),channels:['Instagram','Story','LinkedIn']},minutes:25,when:(both?'Ich poste den KitzBeach-Tipp am 8.9. (2 Tage vorher) und den Messe-Beitrag am 18.9. – jeweils um 18:00.':'Ich poste den Messe-Beitrag am 18.9. um 18:00, zwei Tage vor Messebeginn.')};
  }};

/* ---------- 5. Regenwoche ---------- */
const PLAN_REGEN={icon:'🌧',short:'Regenwoche',endText:'Alles klar, kein Drehtag diese Woche. Die Indoor-Tipps kommen trotzdem, sobald du sie freigibst.',
  signals:['🌧 Signal: Mo–Mi Dauerregen, 31 mm (Wetterdienst)','🔀 Kombination Recruiting: Stelle „Koch/Köchin" offen, Saisonstart in ~10 Wochen','🧠 Regentag = Drehtag: weniger Betrieb, konstantes Licht drinnen','🧠 Chance „Regen: Indoor + Team-Drehtag" · Score 70 → Push'],
  facts:['Mo–Mi: 31 mm Regen, 11–13 °C','Offene Stelle: Koch/Köchin (Saisonstart in ~10 Wochen)'],
  overview:{subject:'🌧 Drei Regentage – Indoor-Tipps und ein Drehtag fürs Team',text:'🌧 Mo–Mi Dauerregen (31 mm). Zwei Chancen: Indoor-Tipps für Gäste und ein Drehtag fürs Team (Kochsuche – Saisonstart in ca. 10 Wochen). Ich habe kleine Aufgaben vorbereitet und dein Team angeschrieben:',
    cards:[{title:'Daraus entsteht',text:'Indoor-Karussell für Gäste + Küchenteam-Video für die Kochsuche (geht ans Recruiting-Feature). Veröffentlicht wird nur mit deiner Freigabe.'}],
    mail:{facts:['Mo–Mi: 31 mm Regen, 11–13 °C','Offene Stelle: Koch/Köchin · Saisonstart in ~10 Wochen','Zuletzt Regentag-Post vor 6 Tagen (Neuheit niedrig)'],wx:[{d:'Mo',e:'🌧️',t:'12°'},{d:'Di',e:'🌧️',t:'11°'},{d:'Mi',e:'🌧️',t:'12°'},{d:'Do',e:'☁️',t:'13°'}]}},
  tasks:[
    {id:'dreh',who:'maria',icon:'🎬',label:'Drehtag Di Vormittag freigeben',msg:'🎬 Deine Entscheidung: Soll Marco am Dienstagvormittag 30 Min. für ein Küchenteam-Video (Kochsuche) freigestellt werden?',
      options:[O('ok','✅ Drehtag Di 10 Uhr',['ja','ok','dreh'],'done',{res:{dreh:true}}),O('no','⏰ Nicht diese Woche',['nicht','nein'],'declined',{res:{dreh:false}})]},
    {id:'marco',who:'marco',icon:'🎥',label:'Küchenteam-Video für die Kochsuche (30 Min.)',msg:'🌧 Hallo Marco, Dauerregen bis Mittwoch – ruhiger Vormittag. Maria möchte für die Kochsuche ein kurzes Küchenteam-Video drehen: „Warum ich hier arbeite" (8 s), Mise en place, Team beim Personalessen. Dauert 30 Min. Dein Einverständnis ✔ liegt vor. Wann passt es?',
      facts:['Mo–Mi Dauerregen → ruhiger Vormittag','Offene Stelle: Koch/Köchin','Einverständnis Marco: ✔ (erteilt 12.03., widerrufbar)'],thanks:'Dein Video wird Teil der Kochsuche. Danke!',
      options:[O('yes','✅ Di 10 Uhr',['ja','ok','di'],'accepted',{deliver:D('Super! Schick mir die Clips, wenn du sie hast. 🎥',VID('Küchenteam, Mise en place','👨‍🍳',25,'0:22'),'🎞 Küchenteam-Clips gesichtet · 🛡 Einverständnis Marco ✔ · weitere Personen im Bild nur mit Einverständnis','Danke Marco, starke Clips! Das Video wird Teil der Kochsuche. 🎬',{res:{teamVideo:true}})}),O('later','⏰ Mi 10 Uhr',['mi','später'],'later',{reply:'Alles klar, dann Mittwoch 10 Uhr. Ich erinnere dich.'}),O('no','❌ Diese Woche nicht',['nicht','nein'],'declined',{reply:'Kein Problem, ich frage nächste Woche wieder. 👍'})]},
    {id:'lena',who:'lena',icon:'🍰',label:'Foto: Kaffee & Kuchen in der Stube',msg:'🌧 Hi Lena! Bei Regen sind Stube und Kuchen unser Trumpf. Kleine Aufgabe (2 Min.): ein Stück Kuchen mit Kaffee am Stubentisch fotografieren, ohne Gesichter im Bild.',
      facts:['Mo–Mi Regen','Motiv: Kaffee & Kuchen, Stube','Keine Personen im Bild'],
      options:[O('yes','✅ Mach ich',['ja','mach','ok'],'accepted',{deliver:D('Super, danke! 🙌 Schick das Foto hierher. 📷',PH('Kaffee & Kuchen in der Stube','🍰',20),'👁 Foto Stube: keine Personen erkennbar ✔','Lecker! Danke Lena. 🍰')}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich erinnere dich um 14 Uhr. ⏰'}),O('no','❌ Geht nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'ivana',who:'ivana',icon:'🧖',label:'Ruheraum & Sauna herrichten + Foto',msg:'🌧 Hallo Ivana, bei Regen füllt sich der Wellnessbereich. Bitte Saunen und Ruheraum gegen 15 Uhr frisch herrichten und ein Foto vom Ruheraum machen (ohne Gäste im Bild).',
      facts:['Mo–Mi Regen → Wellness gefragt','Motiv: Ruheraum, keine Gäste im Bild'],
      options:[O('yes','✅ Mach ich',['ja','mach','ok'],'accepted',{deliver:D('Danke Ivana! Schick mir das Foto, wenn alles hergerichtet ist. 📷',PH('Ruheraum','🧖',180),'👁 Foto Ruheraum: keine Personen erkennbar ✔','Sehr einladend! Danke Ivana. 🧖')}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich erinnere dich um 14 Uhr. ⏰'}),O('no','❌ Schaffe ich nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'sabine',who:'sabine',icon:'🗺',label:'Indoor-Ausflugstipps der Region nennen',msg:'🌧 Hallo Sabine, bei Dauerregen fragen Gäste nach Alternativen. Kannst du 1–2 Indoor-Tipps aus der Region nennen (Therme, Museum …)? Ich darf keine erfinden.',
      facts:['Mo–Mi Regen','Gefragt: Indoor-Tipps der Region (nicht erfinden)'],thanks:'Dein Ausflugstipp steht im Regentag-Karussell. Danke!',
      options:[O('ok','✅ Mache ich (Demo)',['ok','ja'],'accepted',{deliver:D('Danke! Schreib mir die Tipps.',null,'📝 Indoor-Tipps der Rezeption übernommen (Quelle: Sabine)','Danke Sabine! 📝',{text:'Therme im Nachbarort (Tageskarte an der Rezeption) und das Bergbauernmuseum im Ort',res:{tips:'Therme im Nachbarort und Bergbauernmuseum'}})}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich erinnere dich morgen früh. ⏰'})]}
  ],
  final:({res,done})=>{ const slides=['Es regnet? Perfekt.']; if(done('ivana')) slides.push('Sauna & Ruheraum'); if(done('lena')) slides.push('Kaffee & Kuchen in der Stube'); slides.push('Spiele & Kamin'); if(done('sabine')) slides.push('Ausflug: '+res.tips);
    return {intro:'Alles beisammen – dein Team hat geliefert! 🌧 So sieht der Beitrag aus:',cards:[{title:'Karussell-Caption',text:'Es regnet? Perfekt. ☔\n\nDinge, die bei uns bei Regen gehen: '+[done('ivana')?'Sauna und Ruheraum':null,done('lena')?'Kaffee & Kuchen in der Stube':null,'Kartenspiele und Kamin',done('sabine')?'Ausflug zu '+res.tips:null].filter(Boolean).join(', ')+'.\n\n#regentag #auszeit #tirol'}],slides,item:{title:'Regentag-Tipps (Team)',channels:['Instagram Karussell']},minutes:25,when:'Ich poste Montag 10:00.',
      also:res.teamVideo?[{title:'Küchenteam-Video (Kochsuche)',channels:['Recruiting-Feature'],status:'wartet',handoff:'Recruiting-Feature (brf_regen_drehtag)'}]:[],alsoMinutes:0}; }};

/* ---------- 6. Anlass in Sicht (Advent) ---------- */
const PLAN_ANLASS={icon:'📅',short:'Advent-Countdown',endText:'Alles klar, ich melde mich in 2 Wochen wieder. Das Team wurde informiert.',
  signals:()=>['📅 Signal: 1. Advent (29.11.) in '+WEEKS_ADVENT()+' Wochen · Vorlauf für Buchungs-Content ≈ 8 Wochen','🛏️ Signal: Adventwochenenden zu 40 % belegt','🧠 Chance „Anlass in Sicht: Advent" · Score 62 → Digest'],
  facts:['1. Advent: 29.11.2026','Adventwochenenden zu 40 % belegt','Empfohlener Vorlauf: 8 Wochen'],
  overview:{subject:()=>'📅 1. Advent in '+WEEKS_ADVENT()+' Wochen – Countdown vorbereiten',text:()=>'📅 Der 1. Advent ist in '+WEEKS_ADVENT()+' Wochen – jetzt ist der ideale Zeitpunkt, den Countdown zu planen. Die Adventwochenenden sind erst zu 40 % belegt.\n\nIch habe kleine Aufgaben vorbereitet und dein Team angeschrieben:',
    mail:{facts:['1. Advent: 29.11.2026','Adventwochenenden zu 40 % belegt','Empfohlener Vorlauf: 8 Wochen'],src:'Serie: 3 Posts in 6 Wochen, ca. 10 Min. Aufwand pro Post.'}},
  tasks:[
    {id:'serie',who:'maria',icon:'🎯',label:'Serie starten – mit oder ohne Angebot',msg:'🎯 Deine Entscheidung: Soll die Countdown-Serie ein Angebot enthalten?',
      options:[O('plain','✅ Ohne Angebot',['ohne','ja'],'done',{res:{offer:false}}),O('offer','💶 Mit Angebot',['angebot','paket'],'done',{res:{offer:true}}),O('later','🗓 Später',['später'],'later',{end:true})]},
    {id:'marco',who:'marco',icon:'🍎',label:'Adventmenü-Idee (Sprachnachricht)',msg:()=>'📅 Hallo Marco, der 1. Advent ist in '+WEEKS_ADVENT()+' Wochen. Für den Countdown-Post brauche ich deine Idee: Was soll der Adventgast bei euch schmecken? 1–2 Sätze per Sprachnachricht reichen.',
      facts:['1. Advent: 29.11.2026','Gefragt: eine Menü-Idee für den Teaser'],thanks:'Deine Menü-Idee ist im Advent-Countdown. Danke!',
      options:[O('voice','🎤 Idee einsprechen (Demo)',['idee','ja'],'accepted',{follow:{ask:'Sprich kurz ein – ich gebe es weiter. 🎤',media:VOI('0:08','„Bratapfel mit Vanillesauce und dazu einen Glühmost."'),res:{dish:'Bratapfel mit Vanillesauce und Glühmost'}},reply:'Danke Marco! Das wird der Teaser für Post 2. 🍎'}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich frage in zwei Wochen wieder. ⏰'})]},
    {id:'sabine',who:'sabine',icon:'📅',label:'Freie Adventwochenenden bestätigen',msg:'📅 Hallo Sabine, die Adventwochenenden sind laut Reservierungssystem erst zu 40 % belegt. Welche Wochenenden sind noch gut buchbar (29.11., 6.12., 13.12.)? Ich darf das nicht raten.',
      facts:['Adventwochenenden zu 40 % belegt (Reservierungssystem)','Wochenenden: 29.11., 6.12., 13.12.'],thanks:'Deine Buchungs-Info steht im Countdown. Danke!',
      options:[O('all','✅ Alle drei',['alle','drei'],'done',{res:{we:'alle drei Adventwochenenden'},reply:'Danke Sabine! Ich schreibe „alle drei Adventwochenenden".'}),O('two','📅 Nur 6.12. & 13.12.',['nur','6','13'],'done',{res:{we:'die Wochenenden am 6.12. und 13.12.'},reply:'Danke! Ich nenne nur die Wochenenden am 6.12. und 13.12.'}),O('none','🚫 Kaum noch frei',['kaum','nein'],'done',{res:{we:null},reply:'Danke für die ehrliche Info – ich lasse „noch Zimmer" weg.',notify:'Sabine: Adventwochenenden sind kaum noch frei – der Post nennt keine Verfügbarkeit.'})]},
    {id:'ivana',who:'ivana',icon:'🕯',label:'Adventdeko-Foto (Eingang)',msg:()=>'📅 Hallo Ivana, in '+WEEKS_ADVENT()+' Wochen wird es adventlich. Wenn der Kranz am Eingang hängt, bitte ein Foto machen (ohne Personen) – Maria nutzt es für den Countdown. Heute nichts zu tun.',
      facts:['1. Advent: 29.11.2026','Motiv: Adventkranz am Eingang, keine Personen'],
      options:[O('ok','👍 Erinnere mich',['ok','ja'],'accepted',{deliver:D('Super! Ich erinnere dich, sobald die Deko steht. (Demo: Foto kommt gleich)',PH('Adventkranz am Eingang','🕯',30),'👁 Foto Adventkranz: keine Personen erkennbar ✔','Wunderschön! Danke Ivana. 🕯')}),O('no','❌ Nicht zuständig',['nicht','nein'],'declined',{reply:'Alles klar, ich frage die Rezeption.'})]},
    {id:'lena',who:'lena',icon:'🍽',label:'Stube adventlich decken (Foto)',msg:()=>'📅 Hi Lena, in '+WEEKS_ADVENT()+' Wochen ist Advent. Wenn die Stube adventlich gedeckt ist (Kerze, Tannenzweig), bitte ein Foto vom Tisch machen, ohne Gesichter. Heute nichts zu tun.',
      facts:['1. Advent: 29.11.2026','Motiv: gedeckter Stubentisch, keine Personen'],
      options:[O('ok','👍 Erinnere mich',['ok','ja'],'accepted',{deliver:D('Super! Ich erinnere dich, sobald gedeckt ist. (Demo: Foto kommt gleich)',PH('Adventlich gedeckter Stubentisch','🕯',25),'👁 Foto Stubentisch: keine Personen erkennbar ✔','Sehr stimmungsvoll! Danke Lena. 🕯')}),O('no','❌ Geht nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]}
  ],
  final:({res,done})=>({intro:'Vorschlag für die Serie:',cards:[{title:'Serienplan',text:'Post 1 (jetzt): „Advent im Alpenblick – wir freuen uns drauf" + '+(done('ivana')?'Foto Adventkranz':done('lena')?'Foto Stubentisch':'Foto vom Haus')+'\nPost 2 (in 3 Wochen): Adventmenü-Teaser'+(res.dish?': '+res.dish:'')+'\nPost 3 (in 5 Wochen): „Noch Zimmer für '+(res.we||'die Adventwochenenden')+'"'+(res.we===null?' – entfällt (kaum Verfügbarkeit)':'')+(res.offer?'\n\nAngebot: [bitte Leistung/Preis eintragen]':'')}],item:{title:'Advent-Countdown (3 Posts)',channels:['Instagram','Story','Newsletter']},minutes:20,when:'Post 1 geht morgen 17:00 raus, die anderen erinnere ich dich rechtzeitig.'})};

/* ---------- 7. Sturmwarnung ---------- */
const PLAN_STURM={icon:'💨',short:'Sturmwarnung',
  signals:['💨 Signal: Böen bis 82 km/h morgen (Wetterdienst-Warnung)','🚦 Sicherheitsregel: Tourenempfehlungen für morgen gesperrt','🧠 Chance „Sturm-Hinweis" · Pflicht → Score 90 → Push sofort'],
  facts:['Böen bis 82 km/h morgen','Quelle: Wetterwarnung (Wetterdienst)'],
  overview:{subject:'💨 Sturmwarnung morgen – Hinweis für Gäste & Aufgaben fürs Team',text:'💨 Warnung: Morgen Sturmböen bis 82 km/h. Ich habe Wander- und Tourentipps für morgen gesperrt.\n\nEin kurzer Hinweis an die Gäste schafft Vertrauen, und das Team bekommt kleine Sicherheitsaufgaben:',
    cards:[{title:'Story-Entwurf',text:'„Achtung: Morgen Sturmböen bis 82 km/h. Bitte Touren verschieben und Wege meiden. Bei uns ist es gemütlich: Sauna, Kaffee & Kuchen, Spielezimmer. Fragen? Rezeption erreichbar."'}],
    mail:{facts:['Böen bis 82 km/h morgen','Quelle: Wetterwarnung (Wetterdienst)','Tourentipps gesperrt bis Warnung endet'],src:'Sicherheitshinweise haben Vorrang vor Werbung: Der Vorschlag kommt auch bei niedrigem Push-Budget.'}},
  tasks:[
    {id:'ivana',who:'ivana',icon:'🪑',label:'Terrasse sichern (Schirme, Möbel)',msg:'💨 Hallo Ivana, morgen Sturmböen bis 82 km/h. Bitte heute Abend Sonnenschirme einklappen, Terrassenmöbel sichern oder einräumen und Fenster im Haus prüfen.',
      facts:['Böen bis 82 km/h morgen','Aufgabe: Terrasse & Fenster sichern'],thanks:'Danke fürs Sichern – Sicherheit geht vor!',
      options:[O('ok','✅ Erledigt bis 18 Uhr',['ok','erledigt','ja'],'done',{reply:'Danke Ivana! 🙌'}),O('help','🙋 Brauche Hilfe',['hilfe'],'help',{reply:'Alles klar, ich sage Maria Bescheid. 🙋',notify:'🙋 Ivana braucht Hilfe beim Sichern der Terrasse (Sturm morgen).'})]},
    {id:'sabine',who:'sabine',icon:'🛎',label:'Aushang & mündlicher Hinweis an der Rezeption',msg:'💨 Hallo Sabine, morgen Sturmböen bis 82 km/h. Bitte den Sicherheitshinweis (Text siehe Marias Vorschlag) an der Rezeption aushängen und Gästen bei Anreise/Frühstück sagen: Touren verschieben, Wege meiden.',
      thanks:'Danke für die klare Info an die Gäste!',
      options:[O('ok','✅ Aushang hängt',['ok','aushang','ja'],'done',{res:{aushang:true},reply:'Danke Sabine! 🙌'}),O('edit','✏️ Text ändern',['änder','text'],'help',{reply:'Alles klar, ich sage Maria Bescheid.',notify:'Sabine möchte den Hinweistext ändern.'})]},
    {id:'marco',who:'marco',icon:'🍲',label:'Suppe & Kuchen für Gäste im Haus',msg:'💨 Hallo Marco, morgen bleiben viele Gäste wegen des Sturms im Haus. Kannst du Suppe und Kuchen für den Nachmittag vorbereiten? Und bitte die Lieferungen für morgen prüfen (Straße).',
      facts:['Böen bis 82 km/h morgen','Viele Gäste bleiben im Haus'],
      options:[O('ok','✅ Suppe & Kuchen geplant',['ok','ja'],'done',{res:{indoorFood:true},reply:'Danke Marco! Ich erwähne das in der Story.'}),O('sup','🚚 Lieferung fraglich',['lieferung'],'help',{reply:'Danke für die Info, ich sage Maria Bescheid.',notify:'🙋 Marco: Lieferung morgen wegen Sturm fraglich – bitte Alternativen prüfen.'}),O('no','❌ Nicht möglich',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'lena',who:'lena',icon:'🎲',label:'Stube für Gäste im Haus vorbereiten',msg:'💨 Hi Lena, morgen bleiben viele Gäste drinnen. Bitte die Stube gemütlich vorbereiten: Spiele, Karten, Decken bereitlegen.',
      options:[O('ok','✅ Erledigt',['ok','ja'],'done',{reply:'Danke Lena! 🎲'}),O('later','⏰ Morgen früh',['später','morgen'],'later',{reply:'Alles klar, ich erinnere dich morgen um 8 Uhr. ⏰'})]}
  ],
  final:({res})=>({intro:'Sicherheits-Story – fertig zum Freigeben:',cards:[{title:'Story',text:'„Achtung: Morgen Sturmböen bis 82 km/h. Bitte Touren verschieben und Wege meiden. Bei uns ist es gemütlich: Sauna'+(res.indoorFood?', Suppe & Kuchen am Nachmittag':', Kaffee & Kuchen')+', Spielezimmer. Fragen? Rezeption erreichbar."'}],item:{title:'Sturm-Hinweis',channels:['Story','Website-Banner']},minutes:8,when:'Story geht sofort raus. Ich hebe die Sperre für Tourentipps auf, sobald die Warnung endet.'})};

/* ---------- 8. Wettbewerbs-Impuls ---------- */
const PLAN_KONKURRENZ={icon:'🔭',short:'Wettbewerbs-Impuls',endText:'Okay, kein Beitrag dazu. Das Team wurde informiert.',
  signals:['🔭 Signal: „Hotel Bergkristall" – Reel „Wandern ab Haus": 2,4× übliche Reichweite (öffentliches Profil)','📊 Eigener Verlauf: seit 38 Tagen kein Wander-Thema','🧠 Nicht kopieren: eigenen Winkel aus Betriebsdaten ableiten (Stärke: Küche/Einkehr)','🧠 Chance „Wettbewerbs-Impuls" · Score 58 → Digest'],
  facts:['Nachbar: Wander-Reel mit 2,4× Reichweite','Euer letztes Wander-Thema: vor 38 Tagen','Nur öffentliche Daten, keine Inhalte übernommen'],
  overview:{subject:'🔭 Wandern-Reel beim Nachbarn läuft stark – euer Winkel?',text:'🔭 Beim Nachbarn (Hotel Bergkristall) läuft ein „Wandern ab Haus"-Reel mit 2,4× der üblichen Reichweite. Ihr habt seit 38 Tagen nichts zum Thema gepostet.\n\nKopieren bringt nichts – aber euer Winkel ist stark: die Jause danach. Ich habe kleine Aufgaben vorbereitet:',
    mail:{facts:['Hotel Bergkristall: Reel „Wandern ab Haus" mit 2,4× Reichweite','Euer letztes Wander-Thema: vor 38 Tagen','Nur öffentliche Daten, keine Inhalte übernommen'],src:'Datenschutz/Ethik: Nur öffentliche Profile; wir leiten Muster ab, kopieren keine Inhalte.'}},
  tasks:[
    {id:'winkel',who:'maria',icon:'🎯',label:'Entscheidung: eigenen Winkel entwickeln?',msg:'🎯 Deine Entscheidung: Wollen wir beim Thema Wandern mit „Nach dem Gipfel gehört der Tisch" einen eigenen Winkel setzen?',
      options:[O('go','🎯 Eigenen Winkel',['winkel','ja'],'done'),O('watch','👀 Nur beobachten',['beobacht'],'declined',{end:true,learn:'👀 Wettbewerbs-Thema auf Beobachtungsliste'}),O('no','🙅 Nicht relevant',['nicht','nein'],'declined',{end:true,learn:'📉 Lerngewicht „Wettbewerb": −0,2'})]},
    {id:'marco',who:'marco',icon:'🥪',label:'Rucksack-Jause packen + Foto',msg:'🔭 Hallo Marco, beim Thema Wandern wollen wir mit dem punkten, was nur wir haben: die Jause danach. Kannst du eine Rucksack-Jause schön packen und ein Foto machen?',
      facts:['Winkel: „Nach dem Gipfel gehört der Tisch"','Motiv: Rucksack-Jause, keine Personen'],thanks:'Deine Jause ist Teil des Wander-Reels. Danke!',
      options:[O('yes','✅ Mach ich',['ja','mach','ok'],'accepted',{deliver:D('Super! Schick mir das Foto, wenn die Jause gepackt ist. 📷',PH('Rucksack-Jause','🥪',35),'👁 Foto Rucksack-Jause: keine Personen erkennbar ✔','Sieht klasse aus, danke Marco! 🥪')}),O('no','❌ Nicht möglich',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'lena',who:'lena',icon:'🍽',label:'Szene: Tisch für Rückkehrer decken',msg:'🔭 Hi Lena, für ein kurzes Reel: ein Tisch für Wanderer, die vom Berg zurückkommen (Brotzeit, Getränke). 2 Min. zum Filmen, ohne Gesichter im Bild.',
      facts:['Winkel: „Nach dem Gipfel gehört der Tisch"','Motiv: gedeckter Tisch, keine Personen'],
      options:[O('yes','✅ Mach ich',['ja','mach','ok'],'accepted',{deliver:D('Super, danke! Schick den Clip hierher. 🎥',VID('Tisch für Wanderer','🍽',40,'0:06'),'🎞 Clip Tisch: keine Personen erkennbar ✔','Sehr einladend! Danke Lena. 🍽')}),O('later','⏰ Später',['später'],'later',{reply:'Alles klar, ich erinnere dich morgen. ⏰'}),O('no','❌ Geht nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'sabine',who:'sabine',icon:'🛎',label:'Vorbestellung der Rucksack-Jause möglich?',msg:'🔭 Hallo Sabine, Maria plant einen Beitrag zur Rucksack-Jause. Ist eine Vorbestellung an der Rezeption möglich (z. B. bis 18 Uhr am Vortag)?',
      facts:['Idee: Rucksack-Jause auf Vorbestellung'],
      options:[O('ok','✅ Ja, bis 18 Uhr Vortag',['ja','ok'],'done',{res:{preorder:'bis 18 Uhr am Vortag'},reply:'Danke Sabine! Ich nenne das im Post.'}),O('no','❌ Bisher nicht',['nicht','nein'],'declined',{reply:'Alles klar, dann ohne Vorbestell-Hinweis.'})]},
    {id:'ivana',who:'ivana',icon:'👟',label:'Trockenraum für Wanderer prüfen',msg:'🔭 Hallo Ivana, kurze Info: Wir werben stärker um Wanderer. Bitte prüfe, dass der Trockenraum für Schuhe und Rucksäcke einsatzbereit ist.',
      options:[O('ok','✅ Ist bereit',['ok','ja'],'done',{reply:'Danke Ivana! 🙌'}),O('help','🙋 Braucht Hilfe',['hilfe'],'help',{reply:'Alles klar, ich sage Maria Bescheid.',notify:'🙋 Ivana: Trockenraum braucht Aufmerksamkeit (Wanderer-Saison).'})]}
  ],
  final:({res})=>({intro:'Euer Winkel – „Nach dem Gipfel gehört der Tisch":',cards:[{title:'Reel-Skript (15 s)',text:'Szene 1: Rucksack-Jause packen (4 s)\nSzene 2: Wanderer kommt zurück (4 s)\nSzene 3: gemeinsamer Tisch, Jause (5 s)\nText: „Nach dem Gipfel gehört der Tisch."\n\nCaption: Wandern kann jeder – wir kümmern uns um das, was danach kommt. Rucksack-Jause auf Vorbestellung'+(res.preorder?' ('+res.preorder+')':'')+'.'}],item:{title:'Wandern mit Einkehr – Reel',channels:['Instagram Reel','TikTok']},minutes:20,when:'Ich erinnere dich am nächsten Schönwettertag zum Drehen.'})};

/* ---------- 9. Neue Bewertung ---------- */
const PRAISE='\n\nÜbrigens: Anna (5⭐) hat das Team gestern „unglaublich herzlich" genannt – danke!';
const PLAN_BEWERTUNG={icon:'⭐',short:'Neue Bewertung',
  signals:['⭐ Neue Bewertung erkannt (Google Business Profile)','🧠 Stimmung: negativ · Thema: Frühstück','📊 Muster: 2. Frühstücks-Kritik in 30 Tagen (aber 41 Lob-Erwähnungen)','⭐ Zusätzlich: 5⭐ von Anna (gestern) – Lob für das Team'],
  facts:['Peter K. (⭐⭐): Frühstück lauwarm, Service langsam','2. Frühstücks-Kritik in 30 Tagen','Anna (5⭐): „Das Team war unglaublich herzlich."'],
  overview:{subject:'⭐⭐ Neue Google-Bewertung (Frühstück) – und Lob fürs Team',text:'⭐⭐ Neue Google-Bewertung von „Peter K.":\n„Frühstück war leider nur lauwarm und der Service langsam."\n\nHinweis: Das ist die zweite Kritik zum Frühstück in 30 Tagen. Gestern gab es aber auch 5⭐ von Anna: „Das Team war unglaublich herzlich." Ich habe Aufgaben je Rolle vorbereitet:',
    mail:{facts:['Peter K. (⭐⭐): „Frühstück lauwarm, Service langsam"','2. Frühstücks-Kritik in 30 Tagen (aber 41 Lob-Erwähnungen)','Anna (5⭐): „Das Team war unglaublich herzlich."']}},
  tasks:[
    {id:'reply',who:'maria',icon:'✍️',label:'Antwort an Peter K. freigeben',msg:'Mein Vorschlag für die öffentliche Antwort:',cards:[{title:'Antwort an Peter K.',text:'Hallo Herr K., vielen Dank für Ihre ehrliche Rückmeldung. Ein lauwarmes Frühstück und lange Wartezeiten entsprechen nicht unserem Anspruch. Wir nehmen das ernst und gehen dem im Team nach. Wir würden uns freuen, Sie bei einem nächsten Besuch besser zu überzeugen. Ihr Team vom Gasthof Alpenblick'}],
      options:[O('send','👍 Senden',['send','ja','ok','passt'],'done',{reply:'Gesendet ✔ (öffentlich auf Google).'}),O('intern','🧑‍🍳 Erst intern klären',['intern','klär'],'later',{reply:'Die Antwort bleibt im Entwurf, bis das Team geklärt hat, was los war. ✔'})]},
    {id:'marco',who:'marco',icon:'🍳',label:'Buffet: Warmhalte-Temperatur prüfen',msg:'⭐ Hallo Marco, ein Gast fand das Frühstück „nur lauwarm" (zweite Rückmeldung in 30 Tagen). Kannst du Warmhaltetemperatur und Nachfüllrhythmus am Buffet prüfen?'+PRAISE,
      facts:['Peter K.: „Frühstück nur lauwarm"','2. Rückmeldung dieser Art in 30 Tagen'],
      options:[O('ok','✅ Prüfe ich heute',['ok','ja','prüf'],'accepted',{reply:'Danke Marco! Ich frage morgen kurz nach dem Ergebnis. 🙌'}),O('help','🙋 Brauche Unterstützung',['hilfe'],'help',{reply:'Alles klar, ich sage Maria Bescheid.',notify:'🙋 Marco braucht Unterstützung bei der Buffet-Prüfung.'})]},
    {id:'lena',who:'lena',icon:'⏱',label:'Frühstück: Wartezeiten beobachten',msg:'⭐ Hi Lena, ein Gast fand den Service beim Frühstück „langsam". Bitte morgen kurz auf Wartezeiten achten und mir sagen, wann es eng wird (z. B. 8:30–9:30).'+PRAISE,
      options:[O('ok','✅ Mach ich',['ok','ja','mach'],'accepted',{reply:'Danke Lena! Ich frage morgen Mittag kurz nach. 🙌'}),O('no','❌ Geht nicht',['nicht','nein'],'declined',{reply:'Kein Problem, danke! 👍'})]},
    {id:'sabine',who:'sabine',icon:'🛎',label:'Peter K. persönlich ansprechen',msg:'⭐ Hallo Sabine, Peter K. hat eine kritische Bewertung geschrieben. Falls er noch im Haus ist oder wieder bucht: Bitte freundlich nachfragen. Ist er noch Gast?'+PRAISE,
      options:[O('ok','✅ Ich spreche ihn an',['ja','ok'],'accepted',{reply:'Danke Sabine! Ein persönliches Wort wirkt am besten. 🙌'}),O('gone','📅 Schon abgereist',['abgereist','nein'],'done',{reply:'Alles klar, dann bleibt es bei der öffentlichen Antwort.'})]},
    {id:'ivana',who:'ivana',icon:'🎉',label:'Lob weitergeben (zur Info)',fyi:true,msg:'🎉 Hallo Ivana, kurz zur Info: Anna hat uns 5⭐ gegeben: „Das Team war unglaublich herzlich." Danke an alle – das gilt auch dir!'}
  ],
  final:()=>({intro:'Zweite Sache: Anna hat gestern 5⭐ gegeben. Das ist Gold fürs Recruiting und für Gäste – als Post? (Zitat mit Vornamen – bitte kurz bestätigen, dass das für euch passt):',cards:[{title:'Karussell: Gästestimme',text:'„Das Team war unglaublich herzlich." – Anna, Gast\n\nDanke, Anna! Diese Worte sind für uns der schönste Lohn. Wer Teil dieses Teams werden möchte: Jobs im Highlight.'}],item:{title:'Gästestimme: Anna (5⭐)',channels:['Instagram','Facebook']},minutes:10,when:'Ich poste morgen 12:00.'})};

const sc_schnee=sc_team(PLAN_SCHNEE), sc_wochenende=sc_team(PLAN_WOCHENENDE), sc_eroeffnung=sc_team(PLAN_EROEFFNUNG), sc_event=sc_team(PLAN_EVENT), sc_regen=sc_team(PLAN_REGEN), sc_anlass=sc_team(PLAN_ANLASS), sc_sturm=sc_team(PLAN_STURM), sc_konkurrenz=sc_team(PLAN_KONKURRENZ), sc_bewertung=sc_team(PLAN_BEWERTUNG);

/* ============================== SZENARIEN: ANDERE FEATURES (Beispiele) ============================== */
const TG = {
 base:'Steinpilz-Risotto – nur bis Sonntag! 🍄\n\nDie Pilze hat uns heute früh der Huber Sepp aus dem Tal gebracht. Frischer geht\'s nicht.\n\nKommt vorbei, solange der Vorrat reicht. Tisch reservieren: Link in Bio.\n\n#steinpilze #regional #tirolerküche',
 kurz:'Steinpilz-Risotto – nur bis Sonntag! 🍄 Pilze vom Huber Sepp, frisch aus dem Tal. Tisch reservieren: Link in Bio.',
 lustig:'Breaking News aus der Küche: Der Sepp hat Pilze gebracht. Marco hat Risotto gemacht. Ihr müsst nur noch kommen. 🍄\n\nNur bis Sonntag! Link in Bio.',
 verkauf:'Nur 4 Tage: Steinpilz-Risotto mit Pilzen vom Huber Sepp. Für Freitag und Samstag gibt es noch Tische – jetzt sichern (Link in Bio).',
 story:'Sticker-Text: „Nur bis Sonntag 🍄" · Umfrage: „Risotto oder Knödel?" · Link-Sticker: Reservierung',
 google:'Tagesgericht diese Woche: Steinpilz-Risotto mit Pilzen vom Huber Sepp. Nur bis Sonntag. Jetzt Tisch reservieren.'
};
async function sc_tagesgericht(S){
  const th='maria';
  await S.me(th,'',{media:{type:'voice',dur:'0:14',transcript:'„Heute gibt\'s Steinpilz-Risotto, die Pilze hat uns der Huber Sepp gebracht. Gibt\'s nur bis Sonntag."'}});
  await S.work(th,['🎧 Sprachnachricht → Text (14 s)','🧠 Brand Brain: Ton „du", Stärke „Zutaten von Bauern aus dem Tal"','📅 Kontext: Herbst, Pilzsaison, Gericht nur Do–So','🛡 Einverständnis: keine Personen erkannt ✔','✍️ 3 Formate erzeugt: Instagram-Post, Story, Google-Beitrag']);
  const cards=v=>[{title:'Instagram-Post',text:TG[v]},{title:'Story',text:TG.story},{title:'Google-Beitrag',text:TG.google}];
  let c = await S.ask(th,'Danke Maria! 🍄 Ich habe dir drei Sachen vorbereitet:',[OK(),EDIT(),LATER()],{cards:cards('base'),wait:300});
  while(c==='edit'){
    const v = await S.ask(th,'Was soll anders werden?',[{id:'kurz',label:'Kürzer',keys:['kürz','kurz']},{id:'lustig',label:'Lustiger',keys:['lustig','humor']},{id:'verkauf',label:'Mehr Verkauf',keys:['verkauf','reserv','mehr']}]);
    c = await S.ask(th,'Neue Version – besser so?',[OK(),EDIT(),LATER()],{cards:cards(v)});
  }
  if(c==='later') return S.bot(th,'Alles klar, ich erinnere dich heute um 17:00. 🗓');
  addInbox([{title:'Steinpilz-Risotto',channels:['Instagram-Post','Story','Google']}],15);
  await S.bot(th,'Perfekt ✔ Geht Donnerstag 18:00 raus – da waren deine letzten Posts am stärksten.');
}
async function sc_zimmer(S){
  const th='maria';
  await S.me(th,'',{media:{type:'photo',label:'Zimmer 12 – Balkon',emoji:'🛏️',hue:28}});
  await S.work(th,['👁 Bilderkennung: Zimmer, Holzbett, Balkon, Bergpanorama, Morgenlicht','🛡 Rechte: keine Personen, kein Kennzeichen erkennbar ✔','🗂 Foto-Bank: gespeichert & getaggt (Zimmer · Aussicht · Herbst)']);
  const c = await S.ask(th,'Schönes Bild! 📸 Zimmer 12 hat das beste Morgenlicht im Haus. Was soll ich damit machen?',[{id:'post',label:'Zimmer des Monats',keys:['post','monat']},{id:'karussell',label:'Karussell (3 Fotos)',keys:['karussell','mehr']},{id:'save',label:'Nur speichern',keys:['speicher','nein']}],{wait:300});
  if(c==='save') return S.bot(th,'Gespeichert in deiner Foto-Bank ✔ Ich schlage es vor, sobald es passt (z. B. bei Schnee).');
  let slides, title='Zimmer des Monats';
  if(c==='karussell'){
    await S.bot(th,'Gern! Schick mir noch 2 Fotos: Bad und ein Detail. 📷');
    await S.me(th,'',{media:{type:'photo',label:'Bad',emoji:'🛁',hue:200},wait:1200});
    await S.me(th,'',{media:{type:'photo',label:'Detail',emoji:'🪟',hue:120},wait:500});
    await S.work(th,['👁 2 Fotos ausgewertet, Reihenfolge sortiert','✍️ Karussell mit 4 Slides + Caption erzeugt']);
    slides=['Titel: Zimmer 12','Balkon & Ausblick','Bad','Detail + Preis']; title='Zimmer 12 – Karussell';
  }
  await approveFlow(S,th,'So sieht der Entwurf aus:',[{title:'Instagram-Caption',text:'Das beste Morgenlicht im Haus. ☀️\n\nZimmer 12 mit Balkon und Bergblick – für Tage, an denen nichts sein muss.\n\nFür Herbstwochenenden gibt es noch Zimmer: Link in Bio.\n\n#zimmermitaussicht #tirol #auszeit'}],{title,channels:['Instagram','Facebook']},12,{slides,when:'Geht Samstag 09:00 raus.'});
}
async function sc_montag(S){
  const th='maria', kw=isoWeek(new Date());
  await S.work(th,['📅 Kalender: 1. Advent in ~10 Wochen','📊 Auswertung letzte Woche (Demo-Daten)','✍️ Montagsbrief zusammengestellt']);
  const c = await S.ask(th,`Guten Morgen, Maria! ☀️ Dein Montagsbrief (KW ${kw})\n\n📈 Letzte Woche: Reichweite +38 %, 3 Bewerbungen.\n\nDiese Woche (≈ 30 Min.):\n1️⃣ Küchenchef-Reel – Marco erzählt\n2️⃣ Herbst-Wandertipp ab Haus\n3️⃣ Google-Beitrag: Erntezeit-Menü\n\nWomit starten wir?`,
    [{id:'1',label:'1️⃣ Küchenchef-Reel',keys:['1','küchenchef','marco']},{id:'2',label:'2️⃣ Wandertipp',keys:['2','wander']},{id:'later',label:'🗓 Alles später',keys:['später','morgen','3']}],{wait:300});
  if(c==='later') return S.bot(th,'Alles klar, ich erinnere dich Mittwoch 17:00 mit der kürzesten Aufgabe. 🗓');
  if(c==='2') return S.bot(th,'Für den Wandertipp brauche ich 3 Fotos oder ein 10-s-Video vom Weg. Wann passt es dir? 🥾');
  const d = await S.ask(th,'Perfekt, starte mit 1️⃣. Ich schicke Marco drei kurze Fragen und melde mich, sobald seine Antworten da sind. 🎤',[{id:'see',label:'▶ Marcos Chat ansehen',keys:['ansehen','zeig']},{id:'ok',label:'👍 Danke',keys:['danke','ok','👍']}],{wait:300});
  if(d==='see') runScenario('interview');
}
async function sc_recruiting(S){
  const th='maria', w=Math.max(1,Math.round((new Date('2026-11-29')-new Date())/6048e5));
  await S.me(th,'',{media:{type:'voice',dur:'0:12',transcript:'„Wir brauchen dringend einen Koch für den Winter, Saisonstart ist Ende November."'}});
  await S.work(th,['🎧 Sprachnachricht → Text','🧠 Stelle erkannt: Koch/Köchin · Wintersaison 2026/27',`📅 Saisonstart 29.11. → noch ca. ${w} Wochen`,'✍️ Paket erzeugt (Übergabe an Recruiting-Feature)']);
  const cards=[{title:'1 · Reel-Skript (Marco, 25 s)',text:'Hook: „Du kochst gern – aber hast genug von Teildiensten?"\nCTA: „Schreib uns auf WhatsApp – Antwort in 48 h."'},{title:'2 · Karussell',text:'Wir suchen · Wer wir sind · Was wir bieten · So läuft die Bewerbung · Jetzt schreiben'},{title:'3 · Stellenanzeige',text:'Koch/Köchin (m/w/d) – Wintersaison 2026/27. Personalhaus, 3 Mahlzeiten, Skipass (Gehalt bitte ergänzen).'}];
  const c = await S.ask(th,`Verstanden, Winterkoch gesucht! ⚠ Der Saisonstart ist in ca. ${w} Wochen. Paket vorbereitet:`,[OK(),EDIT(),LATER()],{cards,wait:300});
  if(c!=='ok') return S.bot(th,'Alles klar, sag mir, was ich ändern soll. 🎤');
  addInbox([{title:'Recruiting: Koch/Köchin Winter',channels:['Reel','Karussell','Google Jobs','WhatsApp-Link']}],90);
  const d = await S.ask(th,'Läuft ✔ Sobald jemand schreibt, screene ich vor und melde mich. 🎯',[{id:'see',label:'▶ Bewerber-Chat ansehen',keys:['ansehen','zeig']},{id:'ok',label:'👍 Danke',keys:['danke','ok']}],{wait:600});
  if(d==='see') runScenario('bewerber');
}
async function sc_interview(S){
  const th='marco';
  const c = await S.ask(th,'Hi Marco 👋 Ich bin der digitale Assistent vom Gasthof Alpenblick. Maria hat mich gebeten, dir 3 kurze Fragen für einen Post über unser Küchenteam zu stellen. Dauert 1 Minute, eine Sprachnachricht reicht. Bist du dabei?',[{id:'y',label:'Klar!',keys:['klar','ja','ok']},{id:'n',label:'Nicht heute',keys:['nicht','nein']}],{wait:600});
  if(c==='n') return S.bot(th,'Kein Problem, ich frage nächste Woche noch einmal. ✔');
  await S.bot(th,'Super! Frage 1 von 3:\n„Warum arbeitest du gern hier?"');
  await S.me(th,'',{media:{type:'voice',dur:'0:11',transcript:'„Weil ich hier wirklich kochen darf und die Maria zuhört, wenn ich was ändern will."'},wait:1300});
  await S.bot(th,'Danke! Frage 2 von 3:\n„Was war dein schönster Moment letzte Saison?"');
  await S.me(th,'',{media:{type:'voice',dur:'0:16',transcript:'„Silvester, als wir um Mitternacht alle zusammen in der Küche gestanden sind und die Gäste geklatscht haben."'},wait:1300});
  await S.bot(th,'Letzte Frage:\n„Was würdest du einem neuen Koch sagen?"');
  await S.me(th,'',{media:{type:'voice',dur:'0:09',transcript:'„Komm vorbei, probier\'s einen Tag aus. Wir haben immer Platz für gute Leute."'},wait:1300});
  await S.work(th,['🎧 3 Sprachnachrichten → Text','🛡 Einverständnis Marco: Foto/Video ✔ (erteilt 12.03.)','✍️ Zitatkarte, Reel-Skript und Recruiting-Caption erzeugt']);
  const d = await S.ask(th,'Danke Marco, tolle Antworten! 🙌 Zitatkarte (leicht gekürzt) – okay für dich?',[{id:'ok',label:'👍 Passt so',keys:['passt','ok','ja']},{id:'edit',label:'✏️ Ändern',keys:['änder','nein']}],{cards:[{title:'Zitatkarte',text:'„Ich darf hier wirklich kochen – und wenn ich etwas ändern will, hört Maria zu."\n— Marco, Küchenchef'}],wait:300});
  if(d==='edit') return S.bot(th,'Schreib mir einfach, wie das Zitat heißen soll. ✔');
  addInbox([{title:'Marco erzählt (Zitatkarte + Reel)',channels:['Instagram','TikTok','Karriere-Seite'],status:'wartet'}],0);
  await S.bot(th,'Prima! Maria bekommt das jetzt zur Freigabe. Danke dir! 😊');
}
async function sc_einverstaendnis(S){
  const th='lena';
  await S.work(th,['📋 Einverständnis-Tresor: Lena ⏳ ausstehend','👪 Alter < 18 → zusätzlich Zustimmung der Eltern nötig']);
  let c = await S.ask(th,'Hi Lena! 👋 Ich bin der digitale Assistent vom Gasthof Alpenblick. Maria würde dich gern in einem kurzen Video zeigen („Woche 1 als Lehrling"). Darf sie das?',[{id:'y',label:'✅ Ja, ich darf',keys:['ja','ok','klar']},{id:'q',label:'❓ Was heißt das?',keys:['was','heißt','?']},{id:'n',label:'❌ Nein',keys:['nein']}],{wait:600});
  if(c==='q') c = await S.ask(th,'Kurz erklärt: Das Video wird auf Instagram, TikTok, Facebook und unserer Website gezeigt. Du kannst jederzeit „STOPP" schreiben – dann wird nichts mehr von dir gezeigt. Da du unter 18 bist, brauche ich auch das OK deiner Eltern.',[{id:'y',label:'✅ Okay, ich darf',keys:['ja','ok']},{id:'n',label:'❌ Lieber nicht',keys:['nein','nicht']}]);
  if(c==='n') return S.bot(th,'Kein Problem, das ist völlig okay. Ich zeige dich nicht. 🙏');
  await S.bot(th,'Danke Lena! 🙌 Ich schicke deinen Eltern jetzt einen Link zur Bestätigung. Bis dahin bleibt alles intern. Du kannst jederzeit „STOPP" schreiben.');
}
async function sc_bewerber(S){
  const th='tim';
  await S.me(th,'Hallo! Ich hab euer Video gesehen. Sucht ihr noch einen Koch?',{wait:400});
  await S.work(th,['🔗 Kontakt aus: Instagram-Reel → Bewerbungslink','🧠 Intent: Bewerbung Koch/Köchin']);
  const c = await S.ask(th,'Hallo Tim! 👋 Ja, wir suchen einen Koch für die Wintersaison. Ich bin der digitale Assistent vom Gasthof Alpenblick und stelle dir 3 kurze Fragen. Maria (die Chefin) meldet sich danach persönlich, meist innerhalb von 48 Stunden. Okay?',[{id:'y',label:'✅ Ja, gerne',keys:['ja','ok','gerne']},{id:'call',label:'📞 Lieber anrufen',keys:['anruf','telefon']}],{wait:300});
  if(c==='call') return S.bot(th,'Kein Problem! Ruf einfach im Haus an. Ich sage Maria Bescheid. 📞');
  await S.bot(th,'Frage 1 von 3: Was hast du bisher gemacht?');
  await S.me(th,'Drei Jahre Hotel in Kitzbühel, zuletzt als Sous-Chef.',{wait:1400});
  await S.bot(th,'Frage 2 von 3: Ab wann könntest du starten?');
  await S.me(th,'Ab 1. Dezember.',{wait:1000});
  const u = await S.ask(th,'Frage 3 von 3: Brauchst du eine Unterkunft?',[{id:'y',label:'🏠 Ja',keys:['ja','unterkunft']},{id:'n',label:'Nein, ich wohne in der Nähe',keys:['nein','nähe']}]);
  state.stats.apps++; renderSide();
  await S.bot(th,'Danke Tim! 🙌 Maria meldet sich bis Mittwoch bei dir.',{wait:700});
  push('maria',{from:'bot',text:'🎯 Neue Bewerbung über WhatsApp',cards:[{title:'Tim · Koch',text:`3 Jahre Hotel Kitzbühel (Sous-Chef)\nStart: ab 1. Dezember\nUnterkunft: ${u==='y'?'ja – Personalhaus hat 2 frei':'nein'}`}]});
}

/* ============================== SZENARIO-LISTE ============================== */
const TEAM_CAST=['maria','ivana','marco','sabine','lena'];
const SC = [
 {id:'schnee', persp:'maria', cast:TEAM_CAST, icon:'❄️', title:'Es hat geschneit', sub:'Neuschnee → Aufgaben für das ganze Team, je nach Rolle', grp:'Aktuelle Geschehnisse', clock:'07:40', run:sc_schnee, delivery:'push', trig:'Neuschnee ≥ 5 cm (Wetterdienst)', aud:'Gäste', subject:'❄️ 8 cm Neuschnee – Postkartenmotiv & Aufgaben fürs Team'},
 {id:'wochenende', persp:'maria', cast:TEAM_CAST, icon:'☀️', title:'Schönes Wochenende', sub:'Schönwetter + freie Zimmer → Buchungen · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'07:30', run:sc_wochenende, delivery:'push', trig:'Schönwetter-Serie + Belegungslücke (Signal-Kombination)', aud:'Gäste', subject:'☀️ Kaiserwetter am Wochenende – und 9 Zimmer sind noch frei'},
 {id:'eroeffnung', persp:'maria', cast:TEAM_CAST, icon:'🆕', title:'Neueröffnung in der Region', sub:'Neue Bahn/Café → Insider-Tipp · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'07:30', run:sc_eroeffnung, delivery:'digest', trig:'Neuer Eintrag im Tourismusverband-Feed (KI-Extraktion)', aud:'Gäste', subject:'🆕 Neu in der Region: Gondelbahn „Almblick" eröffnet am Samstag'},
 {id:'event', persp:'maria', cast:TEAM_CAST, icon:'🎪', title:'Veranstaltungshinweise', sub:'FAFGA, KIDU-Buildathon, KitzBeach · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'07:30', run:sc_event, delivery:'digest', trig:'Events im Umkreis (Veranstalter- und Verbandsseiten)', aud:'Gäste + Team', subject:'🎪 FAFGA, KI-Buildathon & KitzBeach – Veranstaltungshinweise für dein Team'},
 {id:'regen', persp:'maria', cast:TEAM_CAST, icon:'🌧️', title:'Regenwoche', sub:'Indoor-Tipps + Team-Drehtag · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'07:30', run:sc_regen, delivery:'push', trig:'≥ 2 Regentage + offene Stelle (Signal-Kombination)', aud:'Gäste + Team', subject:'🌧 Drei Regentage – Indoor-Tipps und ein Drehtag fürs Team?'},
 {id:'anlass', persp:'maria', cast:TEAM_CAST, icon:'📅', title:'Anlass in Sicht (Advent)', sub:'Kalender + Belegung → Countdown-Serie · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'07:30', run:sc_anlass, delivery:'digest', trig:'Kalender-Anlass innerhalb Vorlauf + Belegung', aud:'Gäste', subject:()=>'📅 1. Advent in '+Math.max(1,Math.round((new Date('2026-11-29')-new Date())/6048e5))+' Wochen – Countdown vorbereiten'},
 {id:'sturm', persp:'maria', cast:TEAM_CAST, icon:'💨', title:'Sturmwarnung', sub:'Sicherheitshinweis · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'16:10', run:sc_sturm, delivery:'push', trig:'Böen ≥ 70 km/h (Pflicht-Hinweis)', aud:'Gäste', subject:'💨 Sturmwarnung morgen – Hinweis für Gäste'},
 {id:'konkurrenz', persp:'maria', cast:TEAM_CAST, icon:'🔭', title:'Wettbewerbs-Impuls', sub:'Nachbar punktet → eigener Winkel · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'07:30', run:sc_konkurrenz, delivery:'digest', trig:'Thema läuft beim Nachbarn stark, bei uns Lücke', aud:'Gäste', subject:'🔭 Wandern-Reel beim Nachbarn läuft stark – euer Winkel?'},
 {id:'bewertung', persp:'maria', cast:TEAM_CAST, icon:'⭐', title:'Neue Bewertung', sub:'Kritik beantworten, Lob nutzen · Aufgaben je Rolle', grp:'Aktuelle Geschehnisse', clock:'09:10', run:sc_bewertung, delivery:'push', trig:'Neue Google-Bewertung', aud:'Gäste + Team', subject:'⭐⭐ Neue Google-Bewertung (Frühstück)'},
 {id:'tagesgericht', persp:'maria', icon:'🍄', title:'Sprachnachricht → Post', sub:'Tagesgericht einsprechen', grp:'Andere Features (Beispiele)', clock:'11:20', run:sc_tagesgericht, user:'🎤 Sprachnachricht: Tagesgericht', trig:'Betreiber sendet Material', aud:'Gäste', subject:'Dein Tagesgericht – 3 Formate fertig'},
 {id:'zimmer', persp:'maria', icon:'📷', title:'Foto → Post', sub:'Bilderkennung, Rechte, Foto-Bank', grp:'Andere Features (Beispiele)', clock:'14:05', run:sc_zimmer, user:'📷 Foto: Zimmer 12', trig:'Betreiber sendet Material', aud:'Gäste', subject:'Dein Foto: Zimmer 12 – Post-Vorschlag'},
 {id:'montag', persp:'maria', icon:'🗓️', title:'Montagsbrief', sub:'Wochenplan als Nachricht', grp:'Andere Features (Beispiele)', clock:'08:00', run:sc_montag, delivery:'push', trig:'Wöchentlich Montag 08:00', aud:'Gäste + Team', subject:()=>'Dein Montagsbrief (KW '+isoWeek(new Date())+')'},
 {id:'recruiting', persp:'maria', icon:'🧑‍🍳', title:'„Wir suchen einen Koch"', sub:'Recruiting-Paket (Nachbar-Feature)', grp:'Andere Features (Beispiele)', clock:'16:30', run:sc_recruiting, user:'🎤 Sprachnachricht: Wir brauchen einen Koch', trig:'Betreiber meldet Bedarf', aud:'Mitarbeitende', subject:'Recruiting-Paket: Koch/Köchin Winter'},
 {id:'interview', persp:'marco', icon:'🎤', title:'Interview mit Mitarbeiter', sub:'3 Fragen per Sprache', grp:'Andere Features (Beispiele)', clock:'13:30', run:sc_interview, trig:'Team-Content-Aufgabe', aud:'Mitarbeitende', subject:'3 kurze Fragen von Maria'},
 {id:'einverstaendnis', persp:'lena', icon:'🛡', title:'Einverständnis & Widerruf', sub:'Foto-/Videoerlaubnis, Eltern-OK', grp:'Andere Features (Beispiele)', clock:'15:45', run:sc_einverstaendnis, trig:'Person soll gezeigt werden', aud:'Team', subject:'Darf Maria dich zeigen?'},
 {id:'bewerber', persp:'tim', cast:['tim','maria'], icon:'🙋', title:'Bewerbung per WhatsApp', sub:'Vorauswahl durch Assistenten', grp:'Andere Features (Beispiele)', clock:'19:20', run:sc_bewerber, user:'💬 „Sucht ihr noch einen Koch?"', trig:'Bewerber schreibt', aud:'Mitarbeitende', subject:'Deine Bewerbung im Gasthof Alpenblick'}
];

/* ============================== RENDER ============================== */
function renderSC(){
  const main=SC.filter(s=>s.grp==='Aktuelle Geschehnisse'), other=SC.filter(s=>s.grp!=='Aktuelle Geschehnisse');
  const btn=s=>`<button class="sc ${state.lastSc===s.id?'active':''}" data-sc="${s.id}"><span class="ic">${s.icon}</span><span><b>${esc(s.title)}</b><span class="s">${esc(s.sub)}</span></span></button>`;
  $('#sclist').innerHTML = `<div class="grp">Aktuelle Geschehnisse (Intelligence)</div>${main.map(btn).join('')}<details class="more" ${other.some(s=>s.id===state.lastSc)?'open':''}><summary>Andere Features (Beispiele)</summary>${other.map(btn).join('')}</details>`;
}
function renderScinfo(){
  const s=SC.find(x=>x.id===state.lastSc), el=$('#scinfo');
  if(!s){ el.innerHTML='<b>Wähle links ein Szenario.</b><div class="hint">Dann siehst du hier den Auslöser – und oben die Personen, die dazu eine Nachricht bekommen (jeweils passend zur Rolle).</div>'; return; }
  const d = s.delivery==='push'?'<span class="pill push">📲 Push (sofort)</span>':s.delivery==='digest'?'<span class="pill digest">📧 Digest 07:30</span>':'<span class="pill">vom Betreiber ausgelöst</span>';
  const team = state.cast.length>1 ? `<span class="pill">👥 ${state.cast.length} Personen, je Rolle angepasst</span>` : `<span class="pill">👤 bisher nur Sicht der Chefin</span>`;
  const auto = state.cast.length>2 ? `<div class="row"><button class="pill push" data-act="autoteam" style="border:0;cursor:pointer" title="Alle Mitarbeitenden antworten automatisch mit der ersten Option (Demo)">⏩ Team antworten lassen (Demo)</button><span class="pill">…oder klicke oben auf die Personen und antworte selbst</span></div>` : '';
  el.innerHTML=`<b>${s.icon} ${esc(s.title)}</b><div class="row"><span class="pill">Auslöser: ${esc(s.trig)}</span><span class="pill">Zielgruppe: ${esc(s.aud)}</span>${d}${team}</div>${auto}`;
}
const TEAM=['maria','ivana','marco','sabine','lena'];
function renderPersp(){
  const bar=$('#persp');
  bar.hidden=false;
  const keys=[...TEAM, ...state.cast.filter(k=>!TEAM.includes(k))];   // ganzes Team immer sichtbar (+ Gäste wie Bewerber:in, wenn beteiligt)
  bar.innerHTML = keys.map(k=>{ const p=PERSP[k], inCast=state.cast.includes(k); return `<button class="pt ${state.persp===k?'active':''}" data-persp="${k}" style="${inCast?'':'opacity:.55'}" title="${inCast?'':'Bei diesem Szenario noch keine Aufgabe für '+esc(p.name)}"><span>${p.emoji}</span>${p.name}<span style="opacity:.7">· ${p.role}</span>${state.unread[k]?`<span class="dot">${state.unread[k]}</span>`:''}</button>`; }).join('');
  const p=PERSP[state.persp]; $('#av').textContent=p.av; $('#pname').textContent=p.bot; $('#psub').textContent=p.sub; $('#mbox').textContent='✉️ Posteingang · '+p.mail;
}
function mediaHtml(m){
  if(!m) return '';
  if(m.type==='voice'){ const bars=Array.from({length:26},(_,i)=>`<i style="height:${6+Math.abs(Math.sin(i*1.7)*14)}px"></i>`).join(''); return `<div class="voice"><span class="play">▶</span><span class="wave">${bars}</span><span>${m.dur}</span></div><div class="demo-note">Transkript (System): ${esc(m.transcript)}</div>`; }
  return `<div class="photo" style="background:linear-gradient(135deg,hsl(${m.hue},45%,62%),hsl(${m.hue+30},40%,38%))">${m.type==='video'?'▶':m.emoji}<small>${m.type==='video'?m.emoji+' ':''}${esc(m.label)}${m.dur?' · '+m.dur:''}</small></div>`;
}
/* Aufgabenboard der Chefin – live: liest den aktuellen Stand bei jedem Rendern */
function boardHtml(board){
  if(!board) return '';
  return `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(128,128,128,.13);font-size:.82rem;white-space:normal"><b style="display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-bottom:4px">Aufgabenverteilung heute</b>${board.map(t=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-top:1px solid rgba(128,128,128,.2)"><span>${t.icon} <b>${esc(PERSP[t.who].name)}</b> · ${esc(t.label)}</span><span style="white-space:nowrap">${BSTATE[t.state]}</span></div>`).join('')}</div>`;
}
function emptyText(th){
  if(!state.lastSc) return 'Noch keine Nachrichten.<br>Wähle links ein Szenario.';
  const p=PERSP[th], sc=SC.find(x=>x.id===state.lastSc);
  if(state.cast.includes(th)) return 'Noch keine Nachricht.';
  return `Für ${esc(p.name)} (${esc(p.role)}) gibt es bei „${esc(sc.title)}" noch keine Aufgabe.<br><br>Dieses Szenario ist bisher nur aus Sicht der Chefin ausgearbeitet. Wie die Rollen-Aufgaben aussehen, siehst du bei „Es hat geschneit".`;
}
function renderThread(){ state.chan==='wa'?renderChat():renderMail(); }
const seen={};   // pro Person: höchste bereits gezeichnete Nachrichten-ID
function keepScroll(el,th,list,fill){
  const prevTop=el.scrollTop, nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<60;
  const lastId=list.length?list[list.length-1].id:0, hasNew=lastId>(seen[th]||0);
  fill(seen[th]||0);
  seen[th]=Math.max(seen[th]||0,lastId);
  el.scrollTop=(nearBottom||hasNew)?el.scrollHeight:prevTop;
}
function renderChat(){
  const th=state.persp, list=state.threads[th], c=$('#chat');
  keepScroll(c,th,list,seenId=>{
  let html = list.length||state.typing[th] ? '' : `<div class="empty">${emptyText(th)}</div>`;
  list.forEach(m=>{
    html += `<div class="msg ${m.from==='me'?'me':''}${m.id>seenId?' anim':''}">${esc(m.text)}${mediaHtml(m.media)}${boardHtml(m.board)}${(m.cards||[]).map(cd=>`<div class="bcard"><b>${esc(cd.title)}</b>${esc(cd.text)}</div>`).join('')}${m.slides?`<div class="slides">${m.slides.map(s=>`<div>${esc(s)}</div>`).join('')}</div>`:''}<span class="tm">${m.time}${m.from==='me'?' ✓✓':''}</span></div>`;
    if(m.buttons) html += `<div class="btnrow">${m.buttons.map(b=>`<button class="wbtn" data-pick="${m.id}:${b.id}">${esc(b.label)}</button>`).join('')}</div>`;
  });
  if(state.typing[th]) html += `<div class="typing"><i></i><i></i><i></i></div>`;
  c.innerHTML=html;
  });
}
function renderMail(){
  const th=state.persp, list=state.threads[th], el=$('#mthread'), p=PERSP[th];
  keepScroll(el,th,list,seenId=>{
  $('#msub').textContent = list.length ? (state.subjects[th]||state.subject) : 'Kein Betreff';
  let html = list.length||state.typing[th] ? '' : `<div class="empty" style="margin:auto">${emptyText(th).replace('Nachricht','E-Mail')}</div>`;
  list.forEach(m=>{
    if(m.from==='me' && m.via==='click') return;
    if(m.from==='bot'){
      const x=m.mail||{};
      html += `<article class="em${m.id>seenId?' anim':''}"><header><div class="r"><b>${esc(p.bot)}</b><span class="t">${m.time}</span></div><span class="to">an ${esc(p.name)} &lt;${esc(p.mail)}&gt;</span></header><div class="eb">${esc(m.text)}${boardHtml(m.board)}${x.wx?`<div class="wxs">${x.wx.map(d=>`<div><b>${d.d}</b>${d.e}<br>${d.t}</div>`).join('')}</div>`:''}${x.facts?`<div class="facts"><b>Signale &amp; Fakten (geprüft)</b><ul style="margin:0;padding:0">${x.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`:''}${(m.cards||[]).map(cd=>`<div class="bcard"><b>${esc(cd.title)}</b>${esc(cd.text)}</div>`).join('')}${m.slides?`<div class="slides">${m.slides.map(s=>`<div>${esc(s)}</div>`).join('')}</div>`:''}${m.buttons?`<div class="mbtns">${m.buttons.map((b,i)=>`<button class="mbtn ${i>0?'s':''}" data-pick="${m.id}:${b.id}">${esc(b.label)}</button>`).join('')}</div><div class="mfoot">Persönliche Einmal-Links, kein Login nötig. Du kannst auch einfach auf diese Mail antworten (z. B. „später").</div>`:''}${m.chosen?`<div class="edone">✔ Aktion per Link: ${esc(m.chosen)}</div>`:''}${x.src?`<div class="mfoot">${esc(x.src)}</div>`:''}</div></article>`;
    } else {
      html += `<article class="em reply${m.id>seenId?' anim':''}"><header><div class="r"><b>Du (${esc(p.name)})</b><span class="t">${m.time}</span></div><span class="to">Antwort${m.media?' mit Anhang':''}</span></header><div class="eb">${m.media?`<span class="att">📎 ${m.media.type==='voice'?'sprachnachricht.m4a':m.media.type==='video'?'video.mp4':'foto.jpg'}</span><br>`:''}${esc(m.text)}${mediaHtml(m.media)}</div></article>`;
    }
  });
  if(state.typing[th]) html += `<div class="etype">Copilot verfasst eine Antwort …</div>`;
  el.innerHTML=html;
  });
}
function renderLog(){
  const el=$('#log'), items=state.log;
  const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<40;
  if(el.children.length>items.length) el.innerHTML='';           // neues Szenario: von vorn
  let added=false;
  items.forEach((l,i)=>{
    let li=el.children[i];
    const icon=l.done?'✓':'<span class="spin"></span>';
    if(li && li.dataset.t!==l.text){ li.remove(); li=null; }      // veralteter Eintrag eines früheren Szenarios
    if(!li){
      li=document.createElement('li'); li.className='anim'; li.dataset.t=l.text; li.dataset.d=l.done?'1':'0';
      li.innerHTML='<span class="st">'+icon+'</span><span>'+esc(l.text)+'</span>';
      el.insertBefore(li,el.children[i]||null); added=true;
    } else if(li.dataset.d!==(l.done?'1':'0')){                  // nur das Symbol tauschen, kein Neuaufbau
      li.dataset.d=l.done?'1':'0'; li.querySelector('.st').innerHTML=icon;
    }
  });
  $('#loghint').hidden = items.length>0;
  if(added&&nearBottom) el.scrollTop=el.scrollHeight;
}
function renderSide(){
  $('#s-posts').textContent=state.stats.posts; $('#s-apps').textContent=state.stats.apps; $('#s-min').textContent=state.stats.min;
  $('#inbox').innerHTML = state.inbox.map(i=>`<li><b>${esc(i.title)}</b><br>${i.channels.map(c=>`<span class="chip">${esc(c)}</span>`).join('')}<br><span class="chip ${i.status==='wartet'?'':'ok'}">${i.status==='wartet'?'⏳ wartet auf Freigabe (Maria)':'✔ freigegeben'}</span></li>`).join('');
  $('#inboxhint').hidden = state.inbox.length>0;
}
function renderChans(){
  document.querySelectorAll('#chans button').forEach(b=>b.classList.toggle('on',b.dataset.chan===state.chan));
  $('#phone').hidden = state.chan!=='wa'; $('#mailwin').hidden = state.chan!=='mail';
}
function renderAll(){ renderSC(); renderScinfo(); renderChans(); renderPersp(); renderThread(); renderLog(); renderSide(); }

/* ============================== EVENTS ============================== */
document.addEventListener('click', e=>{
  const ch=e.target.closest('[data-chan]'); if(ch){ if(state.chan!==ch.dataset.chan){ state.chan=ch.dataset.chan; renderChans(); renderThread(); if(state.lastSc) logLine('🔀 Kanal gewechselt: '+(state.chan==='wa'?'WhatsApp':'E-Mail')+' – gleicher Inhalt, anderes Format'); } return; }
  const sc=e.target.closest('[data-sc]'); if(sc) return runScenario(sc.dataset.sc);
  const pt=e.target.closest('[data-persp]'); if(pt){ state.persp=pt.dataset.persp; state.unread[state.persp]=0; $('#pop').hidden=true; renderPersp(); return renderThread(); }
  const pk=e.target.closest('[data-pick]'); if(pk){ const [id,opt]=pk.dataset.pick.split(':'); return pick(+id,opt); }
  const up=e.target.closest('[data-user]'); if(up) return runScenario(up.dataset.user);
  if(e.target.closest('[data-act="autoteam"]')) return autoTeam();
  if(e.target.closest('#attach')) return togglePop();
  if(e.target.closest('#send')){ const i=$('#txt'); const v=i.value; i.value=''; return onSend(v); }
  if(e.target.closest('#msend')){ const i=$('#mtxt'); const v=i.value; i.value=''; return onSend(v); }
  if(!e.target.closest('#pop')) $('#pop').hidden=true;
});
$('#txt').addEventListener('keydown',e=>{ if(e.key==='Enter'){ const v=e.target.value; e.target.value=''; onSend(v); } });
$('#mtxt').addEventListener('keydown',e=>{ if(e.key==='Enter'){ const v=e.target.value; e.target.value=''; onSend(v); } });
$('#fast').addEventListener('change',e=>{ state.speed=e.target.checked?0.3:1; });
function togglePop(){
  const pop=$('#pop'); if(!pop.hidden){ pop.hidden=true; return; }
  const items=SC.filter(s=>s.user && s.persp===state.persp);
  pop.innerHTML = items.length ? `<p>Was möchtest du senden? (Demo)</p>`+items.map(s=>`<button data-user="${s.id}">${esc(s.user)}</button>`).join('') : `<p>In diesem Chat schreibt der Assistent zuerst. Wähle links ein Szenario.</p>`;
  pop.hidden=false;
}
window.__szenarien={state,runScenario,pick,autoTeam,SC}; // nur für Tests/Debugging
renderAll();
})();
