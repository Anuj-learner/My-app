const TRACE_URL='https://qzsgjyrtlitawsgepwwc.supabase.co';
const TRACE_KEY='sb_publishable_Ca8qpAae0tHAnecrXmlozQ_X5BsZeI1';
(function(){
let sb;
const areas=[['books','📚','Reading','Books & essays'],['gym','◒','Gym','Strength & movement'],['dsa','⌘','DSA','Algorithms & code'],['philosophy','◌','Philosophy','Questions & thinkers'],['screen','◉','Cinema','Films & series'],['creative','✦','Creative','Write, build, explore'],['journal','✎','Journaling','Long-form reflection']];
function read(){try{return JSON.parse(localStorage.getItem('ia2')||'null')||{logs:[],notes:[]}}catch{return {logs:[],notes:[]}}}
function write(d){Storage.prototype.setItem.call(localStorage,'ia2',JSON.stringify(d));}
function render(d){
 const today=new Date().toDateString(), logs=d.logs||[], todayLogs=logs.filter(x=>new Date(x.at||x.ts||x.createdAt||Date.now()).toDateString()===today);
 const mins=logs.reduce((n,x)=>n+Number(x.mins??x.minutes??0),0);
 const done=new Set(todayLogs.map(x=>x.area));
 const xp=document.getElementById('xp'), hours=document.getElementById('hours'), pt=document.getElementById('pt'), prog=document.getElementById('prog');
 if(xp)xp.textContent=mins; if(hours)hours.textContent=(mins/60).toFixed(mins%60?'1':'0')+'h'; if(pt)pt.textContent=done.size+' / 7 areas explored'; if(prog)prog.style.width=(done.size/7*100)+'%';
 const orbit=document.getElementById('orbit');
 if(orbit)orbit.innerHTML=areas.map(a=>{const n=todayLogs.filter(x=>x.area===a[0]).reduce((s,x)=>s+Number(x.mins??x.minutes??0),0);return `<div class="card activity"><div class="e">${a[1]}</div><b>${a[2]}</b><div class="small">${n?`${n} min logged` : a[3]}</div><span class="dot ${n?'done':''}"></span></div>`}).join('');
 const tl=document.getElementById('timeline');
 if(tl){const recent=[...logs].sort((a,b)=>new Date(b.at||b.ts||0)-new Date(a.at||a.ts||0)).slice(0,8);tl.innerHTML=recent.length?recent.map(x=>`<div class="row"><div class="time">${new Date(x.at||x.ts||Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div><div class="tag">${(areas.find(a=>a[0]===x.area)||areas[0])[1]}</div><div class="desc"><b>${esc(x.title)}</b><small>${esc(x.note||'')}</small></div><div class="xp">+${Number(x.mins??x.minutes??0)} XP</div></div>`).join(''):'<div class="empty">No signals yet.</div>'}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function push(){if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;const payload=read();const {error}=await sb.from('app_state').upsert({user_id:user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)console.error('Trace sync push failed:',error)}
async function mergePull(){if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;const r=await sb.from('app_state').select('payload').eq('user_id',user.id).maybeSingle();if(r.error){console.error('Trace sync pull failed:',r.error);return}const local=read(), remote=r.data?.payload||{logs:[],notes:[]};const byId=(a,b)=>{const m=new Map();[...a,...b].forEach(x=>m.set(String(x.id??JSON.stringify(x)),x));return [...m.values()]};const merged={...remote,...local,logs:byId(remote.logs||[],local.logs||[]),notes:byId(remote.notes||[],local.notes||[])};write(merged);render(merged);await push()}
function wireActivity(){
 const old=document.getElementById('form');if(!old)return;const form=old.cloneNode(true);old.replaceWith(form);
 const log=document.getElementById('log');if(log){log.onclick=()=>document.getElementById('modal')?.classList.add('open')}
 const close=document.getElementById('close');if(close)close.onclick=()=>document.getElementById('modal')?.classList.remove('open');
 form.addEventListener('submit',async e=>{e.preventDefault();const d=read();const area=document.getElementById('area')?.value||areas[0][0], title=document.getElementById('title')?.value?.trim(), mins=Math.max(1,Number(document.getElementById('mins')?.value||1)), note=document.getElementById('note')?.value?.trim()||'';if(!title)return;d.logs=d.logs||[];d.logs.push({id:crypto.randomUUID(),area,title,mins,note,at:new Date().toISOString()});write(d);render(d);document.getElementById('modal')?.classList.remove('open');form.reset();const mi=document.getElementById('mins');if(mi)mi.value=45;await push();});
}
function setup(){
 const area=document.getElementById('area');if(area&&!area.options.length)area.innerHTML=areas.map(a=>`<option value="${a[0]}">${a[1]} ${a[2]}</option>`).join('');
 wireActivity();render(read());
 const sync=document.getElementById('traceSync');if(sync)sync.onclick=async()=>{if(!sb)return;const {data:{session}}=await sb.auth.getSession();if(session){await mergePull();alert('Trace synced successfully.');return} openAuth()};
}
function openAuth(){let m=document.getElementById('traceSyncModal');if(!m){m=document.createElement('div');m.id='traceSyncModal';m.className='modal';m.innerHTML='<div class="modalbox"><h2>Sync Trace</h2><p class="small">Use the same account on desktop and phone.</p><form id="fixAuth" class="form"><input id="fixEmail" type="email" required placeholder="Email"><input id="fixPass" type="password" required minlength="6" placeholder="Password"><button class="btn primary">Sign in</button><button type="button" class="btn" id="fixCreate">Create account</button><div class="small" id="fixMsg"></div></form></div>';document.body.appendChild(m);m.querySelector('#fixAuth').onsubmit=async e=>{e.preventDefault();const r=await sb.auth.signInWithPassword({email:fixEmail.value,password:fixPass.value});if(r.error){fixMsg.textContent=r.error.message;return}await mergePull();m.classList.remove('open')};m.querySelector('#fixCreate').onclick=async()=>{const r=await sb.auth.signUp({email:fixEmail.value,password:fixPass.value});fixMsg.textContent=r.error?r.error.message:'Account created. Check your email if confirmation is required.'}}m.classList.add('open')}
function boot(){sb=window.supabase.createClient(TRACE_URL,TRACE_KEY);setup();sb.auth.getSession().then(async({data:{session}})=>{if(session)await mergePull()});}
const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=boot;s.onerror=()=>console.error('Supabase client failed to load');document.head.appendChild(s);
})();
