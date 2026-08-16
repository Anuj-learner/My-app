const TRACE_SUPABASE_URL='https://qzsgjyrtlitawsgepwwc.supabase.co';
const TRACE_SUPABASE_KEY='sb_publishable_Ca8qpAae0tHAnecrXmlozQ_X5BsZeI1';
const TRACE_OWNER_USER_ID='69426c35-da44-467f-971f-4c4c26cd75da';
(function(){
  if(window.__TRACE_SUPABASE_SYNC_BOOTED)return;
  window.__TRACE_SUPABASE_SYNC_BOOTED=true;

  let sb=null, channel=null, hydrating=false, oldSet=null, booted=false;
  const localKey='ia2';
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload=boot;
  script.onerror=()=>console.error('Trace: Supabase client failed to load');
  document.head.appendChild(script);

  function msg(t){const el=document.getElementById('tsMsg');if(el)el.textContent=t}

  function addUI(){
    if(document.getElementById('traceUser'))return;
    const b=document.createElement('button');
    b.id='traceUser';b.className='btn trace-user';b.setAttribute('aria-label','Account status');
    b.innerHTML='<span class="trace-user-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"></circle><path d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5"></path></svg></span><span class="trace-user-dot"></span>';
    b.title='Checking account…';
    const style=document.createElement('style');
    style.textContent='.trace-user{position:relative;width:40px;height:40px;padding:0;display:grid;place-items:center;border-radius:50%;margin-left:4px}.trace-user-icon{display:grid;place-items:center;color:#8e97a8}.trace-user-dot{position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-radius:50%;background:#4b5361;border:2px solid #10131a}.trace-user.signed-in{border-color:#b7ff6a;background:#141b12}.trace-user.signed-in .trace-user-icon{color:#b7ff6a}.trace-user.signed-in .trace-user-dot{background:#b7ff6a;box-shadow:0 0 8px #b7ff6a88}.trace-user.signed-out .trace-user-dot{background:#657083}@media(max-width:560px){.trace-user{width:36px;height:36px}.trace-user-dot{right:4px;bottom:4px}}';
    document.head.appendChild(style);
    const tabs=document.querySelector('.tabs');if(tabs)tabs.appendChild(b);
    b.onclick=()=>openAuth();
    updateUserUI(null);
  }

  async function getUser(){
    if(!sb)return null;
    try{const r=await sb.auth.getUser();return r.data?.user||null}catch(e){console.error('Trace getUser error',e);return null}
  }

  async function updateUserUI(user){
    const b=document.getElementById('traceUser');if(!b)return;
    if(user===undefined)user=await getUser();
    if(user&&user.id===TRACE_OWNER_USER_ID){
      b.classList.add('signed-in');b.classList.remove('signed-out');b.title='Logged in · Trace owner';
    }else{
      b.classList.add('signed-out');b.classList.remove('signed-in');b.title='Not logged in · Click to sign in';
    }
  }

  function openAuth(){
    let m=document.getElementById('traceSyncModal');
    if(!m){
      m=document.createElement('div');m.id='traceSyncModal';m.className='modal';
      m.innerHTML='<div class="modalbox"><div class="top"><div><div class="ey">Your private Trace</div><h2 style="margin:4px 0">Account</h2></div><button class="btn" id="tsClose">×</button></div><p class="small" style="line-height:1.6">Trace is currently private to its owner. Sign in on every device with the same account and your activities, journal and statistics will follow you.</p><form class="form" id="tsForm"><input id="tsEmail" type="email" required autocomplete="email" placeholder="Email"><input id="tsPass" type="password" required minlength="6" autocomplete="current-password" placeholder="Password"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="tsSignIn" type="submit">Sign in</button><button class="btn" type="button" id="tsSignOut">Sign out</button></div><div class="small" id="tsMsg"></div></form></div>';
      document.body.appendChild(m);
      m.querySelector('#tsClose').onclick=()=>m.classList.remove('open');
      m.onclick=e=>{if(e.target===m)m.classList.remove('open')};
      m.querySelector('#tsForm').onsubmit=handleSignIn;
      m.querySelector('#tsSignOut').onclick=handleSignOut;
    }
    m.classList.add('open');
    updateUserUI();
  }

  async function handleSignIn(e){
    e.preventDefault();
    const btn=document.getElementById('tsSignIn');
    const email=document.getElementById('tsEmail').value.trim();
    const password=document.getElementById('tsPass').value;
    btn.disabled=true;msg('Signing in…');
    try{
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error){msg(error.message);return}
      const user=data?.user;
      if(!user){msg('Sign-in returned no user. Please try again.');return}
      if(user.id!==TRACE_OWNER_USER_ID){
        await sb.auth.signOut();
        msg('This Trace is private to its owner.');
        updateUserUI(null);
        return;
      }

      // Authentication is intentionally independent from cloud sync.
      // A sync/realtime problem must never turn a successful login into a failed login.
      updateUserUI(user);
      msg('Signed in ✓');
      mCloseSoon();
      void syncAfterLogin();
    }catch(err){
      console.error('Trace sign-in error',err);
      msg('Sign-in failed. Please try again.');
    }finally{btn.disabled=false}
  }

  function mCloseSoon(){setTimeout(()=>document.getElementById('traceSyncModal')?.classList.remove('open'),450)}

  async function handleSignOut(){
    try{await sb.auth.signOut()}finally{
      if(channel)sb.removeChannel(channel);
      channel=null;updateUserUI(null);msg('Signed out. Your cloud data remains safe.');
    }
  }

  async function pull(){
    const user=await getUser();
    if(!user||user.id!==TRACE_OWNER_USER_ID)return false;
    try{
      const r=await sb.from('app_state').select('payload,updated_at').eq('user_id',user.id).maybeSingle();
      if(r.error){console.error('Trace pull error',r.error);return false}
      if(r.data?.payload){
        hydrating=true;oldSet(localKey,JSON.stringify(r.data.payload));hydrating=false;
        if(typeof window.render==='function')window.render();
        window.dispatchEvent(new CustomEvent('trace:remote-sync'));
        return true;
      }
    }catch(e){console.error('Trace pull exception',e)}
    return false;
  }

  async function push(raw){
    if(hydrating)return false;
    try{
      const user=await getUser();
      if(!user||user.id!==TRACE_OWNER_USER_ID)return false;
      const payload=JSON.parse(raw);
      const r=await sb.from('app_state').upsert({user_id:user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(r.error){console.error('Trace push error',r.error);return false}
      return true;
    }catch(e){console.error('Trace push exception',e);return false}
  }

  async function syncAfterLogin(){
    try{
      const raw=localStorage.getItem(localKey);
      if(raw&&!localStorage.getItem('traceCloudInitialized')){
        const ok=await withTimeout(push(raw),7000);
        if(ok)localStorage.setItem('traceCloudInitialized','1');
      }else{
        const pulled=await withTimeout(pull(),7000);
        if(pulled)localStorage.setItem('traceCloudInitialized','1');
      }
      subscribeRealtime();
    }catch(e){
      console.warn('Trace background sync unavailable:',e);
      subscribeRealtime();
    }
  }

  function withTimeout(promise,ms){
    return Promise.race([promise,new Promise(resolve=>setTimeout(()=>resolve(false),ms))]);
  }

  function subscribeRealtime(){
    if(!sb)return;
    if(channel)sb.removeChannel(channel);
    channel=sb.channel('trace-owner-state').on('postgres_changes',{event:'*',schema:'public',table:'app_state',filter:'user_id=eq.'+TRACE_OWNER_USER_ID},payload=>{
      if(payload.eventType==='DELETE')return;
      const remote=payload.new?.payload;
      if(remote){
        hydrating=true;oldSet(localKey,JSON.stringify(remote));hydrating=false;
        if(typeof window.render==='function')window.render();
        window.dispatchEvent(new CustomEvent('trace:remote-sync'));
      }
    }).subscribe(status=>{if(status==='SUBSCRIBED')console.log('Trace: live sync connected');});
  }

  async function boot(){
    if(booted)return;
    if(!window.supabase)return;
    booted=true;
    sb=window.supabase.createClient(TRACE_SUPABASE_URL,TRACE_SUPABASE_KEY);
    addUI();
    oldSet=localStorage.setItem.bind(localStorage);
    localStorage.setItem=function(k,v){oldSet(k,v);if(k===localKey&&!hydrating)void push(v)};

    const {data:{session}}=await sb.auth.getSession();
    if(session?.user?.id===TRACE_OWNER_USER_ID){
      updateUserUI(session.user);
      void syncAfterLogin();
    }else if(session){
      await sb.auth.signOut();
      updateUserUI(null);
    }else updateUserUI(null);

    sb.auth.onAuthStateChange((event,session)=>{
      const user=session?.user?.id===TRACE_OWNER_USER_ID?session.user:null;
      updateUserUI(user);
      if(event==='SIGNED_IN'&&user)void syncAfterLogin();
      if(event==='SIGNED_OUT'){
        if(channel)sb.removeChannel(channel);
        channel=null;
      }
    });
  }
})();
