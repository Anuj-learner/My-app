// Trace live cloud observer: database is the source of truth for cross-device updates.
(function(){
  const URL='https://qzsgjyrtlitawsgepwwc.supabase.co';
  const KEY='sb_publishable_Ca8qpAae0tHAnecrXmlozQ_X5BsZeI1';
  const OWNER='69426c35-da44-467f-971f-4c4c26cd75da';
  const LOCAL='ia2';
  let client=null, applying=false, lastUpdated=null;
  const wait=()=>window.supabase?boot():setTimeout(wait,250);
  async function boot(){
    if(window.__TRACE_LIVE_OBSERVER)return; window.__TRACE_LIVE_OBSERVER=true;
    client=window.supabase.createClient(URL,KEY);
    const session=(await client.auth.getSession()).data.session;
    if(session?.user?.id!==OWNER)return;
    await pull();
    client.channel('trace-live-cloud')
      .on('postgres_changes',{event:'*',schema:'public',table:'app_state',filter:'user_id=eq.'+OWNER},()=>pull())
      .subscribe();
    setInterval(pull,5000);
  }
  async function pull(){
    if(applying)return;
    try{
      const {data,error}=await client.from('app_state').select('payload,updated_at').eq('user_id',OWNER).maybeSingle();
      if(error||!data?.payload)return;
      if(lastUpdated && data.updated_at===lastUpdated)return;
      const current=localStorage.getItem(LOCAL);
      const incoming=JSON.stringify(data.payload);
      if(current===incoming){lastUpdated=data.updated_at;return;}
      applying=true;
      localStorage.setItem(LOCAL,incoming);
      lastUpdated=data.updated_at;
      applying=false;
      if(typeof window.render==='function')window.render();
      window.dispatchEvent(new CustomEvent('trace:cloud-updated',{detail:{updatedAt:data.updated_at}}));
    }catch(e){applying=false;console.warn('Trace cloud observer:',e)}
  }
  wait();
})();
