import React,{useState,useEffect} from 'react';

import {createRoot} from 'react-dom/client';

import {createClient} from '@supabase/supabase-js';

import {LayoutDashboard,Users,MessageSquareText,Sparkles,Settings,Search,Bell,Plus,ArrowUpRight,Clock3,CheckCircle2,Menu,X,Send,ChevronRight} from 'lucide-react';

import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const demoLeads=[

 {id:'demo-1',name:'Arjun Mehta',company:'Nova Labs',email:'arjun@novalabs.io',status:'Qualified',score:92,last:'2 hours ago'},

 {id:'demo-2',name:'Priya Sharma',company:'Growthly',email:'priya@growthly.in',status:'Interested',score:84,last:'5 hours ago'},

 {id:'demo-3',name:'Rahul Sen',company:'Orbit Systems',email:'rahul@orbitsystems.com',status:'New',score:71,last:'Yesterday'},

 {id:'demo-4',name:'Sneha Roy',company:'PixelCraft',email:'sneha@pixelcraft.co',status:'Follow-up',score:78,last:'Yesterday'}

];

function AuthScreen(){

 const [mode,setMode]=useState('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');

 const submit=async e=>{e.preventDefault();setBusy(true);setError('');

   if(!supabase){setError('Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to client/.env');setBusy(false);return;}

   const result=mode==='login'

    ? await supabase.auth.signInWithPassword({email,password})

    : await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});

   if(result.error)setError(result.error.message); else if(mode==='signup' && !result.data.session)setError('Account created. Check your email to confirm your account.');

   setBusy(false);

 };

 return <div className="auth-page"><div className="auth-card"><div className="auth-brand"><div className="logo">L</div><span>LeadPilot <b>AI</b></span></div><h1>{mode==='login'?'Welcome back':'Create your workspace'}</h1><p>{mode==='login'?'Sign in to manage your leads.':'Start managing and following up with your leads.'}</p>

 <form onSubmit={submit}>{mode==='signup'&&<label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required/></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" minLength="6" required/></label>{error&&<div className="auth-error">{error}</div>}<button className="primary auth-submit" disabled={busy}>{busy?'Please wait...':mode==='login'?'Sign in':'Create account'}</button></form>

 <button className="switch-auth" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('')}}>{mode==='login'?"Don't have an account? Sign up":"Already have an account? Sign in"}</button></div></div>

}

function App(){

 const [session,setSession]=useState(null),[ready,setReady]=useState(!supabase);

 const [page,setPage]=useState('Dashboard'); const [mobile,setMobile]=useState(false); const [selected,setSelected]=useState(null);

 const [leads,setLeads]=useState(demoLeads);

 const loadLeads=async user=>{

   if(!supabase||!user){setLeads(demoLeads);return;}

   const {data,error}=await supabase.from('leads').select('*').order('created_at',{ascending:false});

   if(!error)setLeads((data||[]).map(l=>({...l,last:l.last_activity?new Date(l.last_activity).toLocaleString():'Just now'})));

 };

 useEffect(()=>{ if(!supabase){setReady(true);return;} supabase.auth.getSession().then(({data})=>{setSession(data.session);loadLeads(data.session?.user);setReady(true)}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);loadLeads(s?.user)}); return()=>subscription.unsubscribe()},[]);

 const nav=[['Dashboard',LayoutDashboard],['Leads',Users],['AI Follow-ups',Sparkles],['Conversations',MessageSquareText],['Settings',Settings]];

 if(!ready)return <div className="loading">Loading LeadPilot AI...</div>;

 if(supabase&&!session)return <AuthScreen/>;

 return <div className="app">

  <aside className={mobile?'sidebar open':'sidebar'}>

   <div className="brand"><div className="logo">L</div><span>LeadPilot <b>AI</b></span><button className="close" onClick={()=>setMobile(false)}><X/></button></div>

   <div className="workspace"><div className="avatar">A</div><div><small>Workspace</small><strong>My Business</strong></div><ChevronRight size={16}/></div>

   <nav>{nav.map(([n,I])=><button key={n} className={page===n?'active':''} onClick={()=>{setPage(n);setMobile(false)}}><I size={18}/><span>{n}</span>{n==='AI Follow-ups'&&<em>AI</em>}</button>)}</nav>

   <div className="upgrade"><Sparkles size={18}/><strong>Unlock more leads</strong><p>Upgrade your plan to automate more follow-ups.</p><button>View plans</button></div>

   <div className="profile"><div className="avatar">AD</div><div><strong>{session?.user?.user_metadata?.full_name||'Anirban'}</strong><small>{session?'Free plan':'Demo mode'}</small></div>{session&&<button className="signout" onClick={()=>supabase.auth.signOut()}><Settings size={17}/></button>}</div>

  </aside>

  {mobile&&<div className="overlay" onClick={()=>setMobile(false)}/>}

  <main>

   <header><button className="menu" onClick={()=>setMobile(true)}><Menu/></button><div className="crumb">{page}</div><div className="header-actions"><button className="icon"><Search/></button><button className="icon"><Bell/><i/></button><div className="topavatar">AD</div></div></header>

   {page==='Dashboard'&&<Dashboard leads={leads} setPage={setPage} setSelected={setSelected}/>}

   {page==='Leads'&&<Leads leads={leads} setLeads={setLeads} setSelected={setSelected} session={session}/>}

   {page==='AI Follow-ups'&&<Followups leads={leads} session={session} setLeads={setLeads}/>}

   {page==='Conversations'&&<Conversations session={session}/>}

   {page==='Settings'&&<SettingsPage/>}

  </main>

{selected&&(

  <LeadModal

    lead={selected}

    close={()=>setSelected(null)}

    setLeads={setLeads}

    session={session}

  />

)} </div>

}

function Dashboard({leads,setPage,setSelected}){

 return <section className="content">

  <div className="welcome"><div><p className="eyebrow">THURSDAY, OCTOBER 8</p><h1>Good evening, Anirban 👋</h1><p>Here's what's happening with your leads today.</p></div><button className="primary" onClick={()=>setPage('Leads')}><Plus size={17}/> Add lead</button></div>

  <div className="stats">

   <Stat title="Total leads" value="248" change="+12.5%" icon={Users}/><Stat title="Qualified" value="64" change="+8.2%" icon={CheckCircle2}/><Stat title="Follow-ups due" value="18" change="6 today" icon={Clock3}/><Stat title="AI conversations" value="1,284" change="+24.8%" icon={Sparkles}/>

  </div>

  <div className="grid">

   <div className="panel chart"><div className="panel-head"><div><h2>Lead activity</h2><p>Leads added over the last 7 days</p></div><select><option>Last 7 days</option></select></div><div className="bars">{[42,60,48,74,58,88,68].map((v,i)=><div key={i} className="barcol"><div className="bar" style={{height:v+'%'}}></div><span>{['Fri','Sat','Sun','Mon','Tue','Wed','Thu'][i]}</span></div>)}</div></div>

   <div className="panel"><div className="panel-head"><div><h2>Follow-ups due</h2><p>Leads that need attention</p></div><button className="textbtn" onClick={()=>setPage('Leads')}>View all</button></div>

    <div className="mini-list">{leads.slice(0,3).map(l=><button key={l.id} className="mini" onClick={()=>setSelected(l)}><div className="person">{l.name.split(' ').map(x=>x[0]).join('')}</div><div><strong>{l.name}</strong><span>{l.company}</span></div><time>{l.last}</time></button>)}</div>

   </div>

  </div>

  <div className="panel recent"><div className="panel-head"><div><h2>Recent leads</h2><p>Your latest prospects</p></div><button className="textbtn" onClick={()=>setPage('Leads')}>View all leads →</button></div>

   <table><thead><tr><th>Lead</th><th>Status</th><th>Score</th><th>Last activity</th><th></th></tr></thead><tbody>{leads.map(l=><tr key={l.id}><td><div className="leadcell"><div className="person">{l.name.split(' ').map(x=>x[0]).join('')}</div><div><strong>{l.name}</strong><span>{l.company}</span></div></div></td><td><span className={'pill '+l.status.toLowerCase().replace(' ','-')}>{l.status}</span></td><td><b>{l.score}</b>/100</td><td>{l.last}</td><td><button className="arrow" onClick={()=>setSelected(l)}><ArrowUpRight/></button></td></tr>)}</tbody></table>

  </div>

 </section>

}

function Stat({title,value,change,icon:I}){return <div className="stat"><div className="stat-icon"><I/></div><p>{title}</p><h2>{value}</h2><span>{change}</span></div>}

function Leads({leads,setLeads,setSelected,session}){

  const [open,setOpen]=useState(false);

  const [name,setName]=useState('');

  const [company,setCompany]=useState('');

  const [email,setEmail]=useState('');

  const [phone,setPhone]=useState('');

  const [requirement,setRequirement]=useState('');

  const [budget,setBudget]=useState('');

  const add=async e=>{

    e.preventDefault();

    if(!name)return;

    const item={

      name,

      company,

      email,

      phone,

      requirement,

      budget,

      status:'New',

      score:50,

      last:'Just now'

    };

    if(supabase&&session){

      const {data,error}=await supabase

        .from('leads')

        .insert({

          user_id:session.user.id,

          name,

          company,

          email,

          phone,

          requirement,

          budget

        })

        .select()

        .single();

      if(!error&&data){

        setLeads([

          {

            ...data,

            last:'Just now'

          },

          ...leads

        ]);

        setName('');

        setCompany('');

        setEmail('');

        setPhone('');

        setRequirement('');

        setBudget('');

        setOpen(false);

        return;

      }

      if(error){

        console.error('Failed to add lead:',error);

      }

    }

    setLeads([item,...leads]);

    setName('');

    setCompany('');

    setEmail('');

    setPhone('');

    setRequirement('');

    setBudget('');

    setOpen(false);

  };

  return (

    <section className="content">

      <div className="page-title">

        <div>

          <h1>Leads</h1>

          <p>Manage and qualify your prospects.</p>

        </div>

        <button

          className="primary"

          onClick={()=>setOpen(true)}

        >

          <Plus size={17}/>

          Add lead

        </button>

      </div>

      <div

        className="modal-bg"

        style={{display:open?"grid":"none"}}

        onClick={()=>setOpen(false)}

      >

        <div

          className="modal"

          onClick={e=>e.stopPropagation()}

        >

          <button

            className="modal-close"

            onClick={()=>setOpen(false)}

          >

            <X/>

          </button>

          <h2>Add a lead</h2>

          <form onSubmit={add}>

            <label>

              Name

              <input

                value={name}

                onChange={e=>setName(e.target.value)}

                placeholder="Full name"

                required

              />

            </label>

            <label>

              Company

              <input

                value={company}

                onChange={e=>setCompany(e.target.value)}

                placeholder="Company"

              />

            </label>

            <label>

              Email

              <input

                type="email"

                value={email}

                onChange={e=>setEmail(e.target.value)}

                placeholder="Email"

              />

            </label>

            <label>

              Phone

              <input

                value={phone}

                onChange={e=>setPhone(e.target.value)}

                placeholder="+91 98765 43210"

              />

            </label>

            <label>

              Requirement

              <textarea

                value={requirement}

                onChange={e=>setRequirement(e.target.value)}

                placeholder="What does the lead need?"

                rows="3"

                style={{height:'80px',minHeight:'80px',resize:'vertical'}}

              />

            </label>

            <label>

              Budget

              <input

                value={budget}

                onChange={e=>setBudget(e.target.value)}

                placeholder="₹50,000"

              />

            </label>

            <button

              className="primary full"

              type="submit"

            >

              Add lead

            </button>

          </form>

        </div>

      </div>

      <div className="toolbar">

        <div className="search">

          <Search size={17}/>

          <input placeholder="Search leads..."/>

        </div>

        <button>All statuses ▾</button>

        <button>Sort: Recent ▾</button>

      </div>

      <div className="panel">

        <table>

          <thead>

            <tr>

              <th>Lead</th>

              <th>Email</th>

              <th>Status</th>

              <th>AI score</th>

              <th>Activity</th>

              <th></th>

            </tr>

          </thead>

          <tbody>

            {leads.map(l=>(

              <tr key={l.id}>

                <td>

                  <div className="leadcell">

                    <div className="person">

                      {l.name

                        .split(' ')

                        .map(x=>x[0])

                        .join('')}

                    </div>

                    <div>

                      <strong>{l.name}</strong>

                      <span>{l.company}</span>

                    </div>

                  </div>

                </td>

                <td>{l.email}</td>

                <td>

                  <span

                    className={

                      'pill '+

                      l.status

                        .toLowerCase()

                        .replace(' ','-')

                    }

                  >

                    {l.status}

                  </span>

                </td>

                <td>

                  <b>{l.score}</b>/100

                </td>

                <td>{l.last}</td>

                <td>

                  <button

                    className="arrow"

                    onClick={()=>setSelected(l)}

                  >

                    <ArrowUpRight/>

                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </section>

  );

}

function Followups({leads,session,setLeads}){
  const [tone,setTone]=useState('Professional');
  const [selectedLeadId,setSelectedLeadId]=useState('');
  const [context,setContext]=useState('They showed interest in our lead automation platform.');
  const [text,setText]=useState('Select a lead and click "Generate with AI" to create a personalized follow-up.');
  const [loading,setLoading]=useState(false);
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [history,setHistory]=useState([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [scheduled,setScheduled]=useState([]);
  const [scheduledLoading,setScheduledLoading]=useState(false);
  const [scheduleOption,setScheduleOption]=useState('tomorrow');

  const selectedLead=leads.find(lead=>String(lead.id)===String(selectedLeadId))||leads[0];

  useEffect(()=>{
    if(leads.length>0&&!selectedLeadId)setSelectedLeadId(String(leads[0].id));
  },[leads,selectedLeadId]);

  const loadHistory=async(leadId=selectedLead?.id)=>{
    if(!supabase||!session?.user?.id||!leadId||String(leadId).startsWith('demo-')){
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try{
      const {data:conversation,error:conversationError}=await supabase.from('conversations').select('id').eq('user_id',session.user.id).eq('lead_id',leadId).maybeSingle();
      if(conversationError)throw conversationError;
      if(!conversation){setHistory([]);return;}
      const {data,error:messageError}=await supabase.from('messages').select('id,sender,content,status,created_at').eq('conversation_id',conversation.id).eq('user_id',session.user.id).order('created_at',{ascending:false});
      if(messageError)throw messageError;
      setHistory(data||[]);
    }catch(err){
      console.error('Load follow-up history error:',err);
      setHistory([]);
    }finally{setHistoryLoading(false);}
  };

  const loadScheduled=async(leadId=selectedLead?.id)=>{
    if(!supabase||!session?.user?.id||!leadId||String(leadId).startsWith('demo-')){
      setScheduled([]);
      return;
    }
    setScheduledLoading(true);
    try{
      const {data,error}=await supabase.from('scheduled_followups').select('id,message,scheduled_for,status,created_at').eq('user_id',session.user.id).eq('lead_id',leadId).order('scheduled_for',{ascending:true});
      if(error)throw error;
      setScheduled(data||[]);
    }catch(err){
      console.error('Load scheduled follow-ups error:',err);
      setScheduled([]);
    }finally{setScheduledLoading(false);}
  };

  useEffect(()=>{
    setHistory([]);
    setScheduled([]);
    if(selectedLead?.id){
      loadHistory(selectedLead.id);
      loadScheduled(selectedLead.id);
    }
  },[selectedLead?.id,session?.user?.id]);

  const generateFollowup=async()=>{
    if(!selectedLead){setError('Please add a lead first.');return;}
    setLoading(true);
    setSent(false);
    setError('');
    setSuccess('');
    try{
      const response=await fetch('http://localhost:5000/api/ai/follow-up',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          name:selectedLead.name,
          business:selectedLead.company,
          requirement:selectedLead.requirement||selectedLead.notes||context||'Potential customer interested in our service.',
          budget:selectedLead.budget||'Not provided',
          tone,
          qualificationStatus:selectedLead.status||'New',
          qualificationScore:selectedLead.score??50,
          additionalContext:context
        })
      });
      const data=await response.json();
      if(!response.ok||!data.success)throw new Error(data.error||'Failed to generate follow-up.');
      if(!data.message||!data.message.trim())throw new Error('AI generated an empty message. Please try again.');
      setText(data.message.trim());
    }catch(err){
      console.error('AI follow-up error:',err);
      setError(err.message||'Unable to generate the follow-up. Please try again.');
    }finally{setLoading(false);}
  };

  const getScheduleDate=()=>{
    const days={tomorrow:1,twoDays:2,threeDays:3,sevenDays:7};
    const date=new Date();
    date.setDate(date.getDate()+(days[scheduleOption]||1));
    date.setHours(9,0,0,0);
    return date;
  };

  const scheduleFollowup=async()=>{
    if(!selectedLead){setError('Please select a lead first.');return;}
    const cleanMessage=text.trim();
    if(!cleanMessage||cleanMessage.startsWith('Select a lead and click')){setError('Generate a follow-up message first.');return;}
    if(!selectedLead.email){setError('This lead does not have an email address.');return;}
    if(!supabase||!session){setError('You must be signed in to schedule a follow-up.');return;}
    setSending(true);
    setError('');
    setSuccess('');
    try{
      const scheduledFor=getScheduleDate().toISOString();
      const {error:scheduleError}=await supabase.from('scheduled_followups').insert({
        user_id:session.user.id,
        lead_id:selectedLead.id,
        message:cleanMessage,
        scheduled_for:scheduledFor,
        status:'scheduled'
      });
      if(scheduleError)throw scheduleError;
      setSuccess(`Follow-up scheduled for ${getScheduleDate().toLocaleString()}.`);
      setText('Select a lead and click "Generate with AI" to create a personalized follow-up.');
      setSent(false);
      await loadScheduled(selectedLead.id);
    }catch(err){
      console.error('Schedule follow-up error:',err);
      setError(err.message||'Failed to schedule the follow-up.');
    }finally{setSending(false);}
  };

  const cancelScheduled=async(id)=>{
    if(!supabase||!session)return;
    try{
      const {error}=await supabase.from('scheduled_followups').update({status:'cancelled'}).eq('id',id).eq('user_id',session.user.id);
      if(error)throw error;
      await loadScheduled(selectedLead?.id);
    }catch(err){
      console.error('Cancel scheduled follow-up error:',err);
      setError(err.message||'Failed to cancel the scheduled follow-up.');
    }
  };

  const sendFollowup=async()=>{
    if(!selectedLead){setError('Please select a lead first.');return;}
    const cleanMessage=text.trim();
    if(!cleanMessage||cleanMessage.startsWith('Select a lead and click')){setError('Generate a follow-up message first.');return;}
    if(!selectedLead.email){setError('This lead does not have an email address.');return;}
    if(!supabase||!session){setError('You must be signed in to send a follow-up.');return;}
    if(sent){setError('This follow-up has already been sent.');return;}
    setSending(true);
    setError('');
    setSuccess('');
    let messageId=null;
    try{
      const {data:conversation,error:conversationError}=await supabase.from('conversations').upsert({user_id:session.user.id,lead_id:selectedLead.id,updated_at:new Date().toISOString()},{onConflict:'user_id,lead_id'}).select().single();
      if(conversationError)throw conversationError;
      const {data:existingMessages,error:duplicateError}=await supabase.from('messages').select('id').eq('conversation_id',conversation.id).eq('user_id',session.user.id).eq('content',cleanMessage).eq('status','sent').limit(1);
      if(duplicateError)throw duplicateError;
      if(existingMessages?.length>0){
        setSent(true);
        setSuccess('This exact follow-up has already been sent to this lead.');
        await loadHistory(selectedLead.id);
        return;
      }
      const {data:message,error:messageError}=await supabase.from('messages').insert({conversation_id:conversation.id,user_id:session.user.id,sender:'ai',content:cleanMessage,status:'draft'}).select().single();
      if(messageError)throw messageError;
      messageId=message.id;
      const emailResponse=await fetch('http://localhost:5000/api/email/send-follow-up',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({to:selectedLead.email,leadName:selectedLead.name,subject:'Following up on your enquiry',message:cleanMessage})
      });
      const emailData=await emailResponse.json();
      if(!emailResponse.ok||!emailData.success)throw new Error(emailData.error||'Failed to send the email.');
      const {error:statusError}=await supabase.from('messages').update({status:'sent'}).eq('id',messageId).eq('user_id',session.user.id);
      if(statusError)throw statusError;
      const now=new Date().toISOString();
      await supabase.from('conversations').update({updated_at:now}).eq('id',conversation.id).eq('user_id',session.user.id);
      const {error:leadError}=await supabase.from('leads').update({status:'Follow-up',last_activity:now}).eq('id',selectedLead.id).eq('user_id',session.user.id);
      if(leadError)throw leadError;
      if(setLeads)setLeads(currentLeads=>currentLeads.map(lead=>lead.id===selectedLead.id?{...lead,status:'Follow-up',last_activity:now,last:'Just now'}:lead));
      setSent(true);
      setSuccess(`Follow-up email sent to ${selectedLead.name}.`);
      await loadHistory(selectedLead.id);
    }catch(err){
      console.error('Send follow-up error:',err);
      if(messageId&&supabase&&session)await supabase.from('messages').update({status:'failed'}).eq('id',messageId).eq('user_id',session.user.id);
      setError(err.message||'Failed to send the follow-up email. Please try again.');
      await loadHistory(selectedLead.id);
    }finally{setSending(false);}
  };

  return <section className="content">
    <div className="page-title"><div><h1>AI Follow-ups</h1><p>Generate personalized messages for your leads in seconds.</p></div></div>
    <div className="ai-grid">
      <div className="panel">
        <div className="ai-head"><div className="spark"><Sparkles/></div><div><h2>Create a follow-up</h2><p>AI will personalize the message using your lead context.</p></div></div>
        <label>Lead<select value={selectedLeadId} onChange={e=>{setSelectedLeadId(e.target.value);setSent(false);setError('');setSuccess('');setText('Select a lead and click "Generate with AI" to create a personalized follow-up.');}} disabled={loading||sending}>{leads.length===0?<option value="">No leads available</option>:leads.map(lead=><option key={lead.id} value={lead.id}>{lead.name} — {lead.company||'No company'}</option>)}</select></label>
        <label>Tone<div className="tone">{['Professional','Friendly','Short & direct'].map(x=><button type="button" key={x} className={tone===x?'selected':''} onClick={()=>{setTone(x);setSent(false);setSuccess('');}} disabled={loading||sending}>{x}</button>)}</div></label>
        <label>Context<textarea value={context} onChange={e=>{setContext(e.target.value);setSent(false);setSuccess('');}} placeholder="What should the AI mention?" disabled={loading||sending}/></label>
        {error&&<div className="auth-error">{error}</div>}
        {success&&<div style={{padding:'12px',borderRadius:'10px',background:'#ecfdf5',color:'#047857',fontSize:'13px',marginBottom:'12px'}}>{success}</div>}
        <button className="primary generate" onClick={generateFollowup} disabled={loading||sending||!selectedLead}><Sparkles size={17}/>{loading?'Generating...':'Generate with AI'}</button>
      </div>
      <div className="panel preview">
        <div className="panel-head"><div><h2>Generated message</h2><p>Ready to review and send</p></div><span className="ai-badge">AI generated</span></div>
        <div className="messagebox">{text.split('\n').map((x,i)=><div key={i}>{x||'\u00A0'}</div>)}</div>
        <div className="preview-actions">
          <button type="button" onClick={generateFollowup} disabled={loading||sending||!selectedLead}>{loading?'Generating...':'Regenerate'}</button>
          <button type="button" className="primary" onClick={sendFollowup} disabled={sending||loading||!selectedLead||!text.trim()||text.startsWith('Select a lead and click')||sent}><Send size={16}/>{sending?'Sending...':sent?'Sent ✓':'Send follow-up'}</button>
        </div>
        <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'1px solid #e5e7eb'}}>
          <label>Schedule follow-up
            <select value={scheduleOption} onChange={e=>setScheduleOption(e.target.value)} disabled={loading||sending}>
              <option value="tomorrow">Tomorrow at 9:00 AM</option>
              <option value="twoDays">In 2 days at 9:00 AM</option>
              <option value="threeDays">In 3 days at 9:00 AM</option>
              <option value="sevenDays">In 7 days at 9:00 AM</option>
            </select>
          </label>
          <button type="button" className="primary" onClick={scheduleFollowup} disabled={sending||loading||!selectedLead||!text.trim()||text.startsWith('Select a lead and click')}><Clock3 size={16}/>{sending?'Saving...':'Schedule follow-up'}</button>
          <p style={{fontSize:'12px',color:'#6b7280',marginTop:'8px'}}>The message will be stored and sent automatically when the scheduler is connected.</p>
        </div>
      </div>
    </div>
    <div className="panel" style={{marginTop:'16px'}}>
      <div className="panel-head"><div><h2>Scheduled follow-ups</h2><p>Upcoming messages for {selectedLead?.name||'this lead'}.</p></div>{selectedLead&&<span className="ai-badge">{scheduled.filter(x=>x.status==='scheduled').length} scheduled</span>}</div>
      {scheduledLoading?<div style={{padding:'20px 0',color:'#6b7280',fontSize:'14px'}}>Loading scheduled follow-ups...</div>:scheduled.length===0?<div style={{padding:'20px 0',color:'#6b7280',fontSize:'14px'}}>No scheduled follow-ups for this lead.</div>:<div style={{display:'flex',flexDirection:'column',gap:'12px'}}>{scheduled.map(item=><div key={item.id} style={{padding:'14px',border:'1px solid #e5e7eb',borderRadius:'12px',background:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:'12px',alignItems:'center',marginBottom:'8px'}}><strong>{new Date(item.scheduled_for).toLocaleString()}</strong><span style={{padding:'4px 8px',borderRadius:'999px',fontSize:'11px',fontWeight:600,background:item.status==='scheduled'?'#eff6ff':item.status==='cancelled'?'#f3f4f6':'#ecfdf5',color:item.status==='scheduled'?'#1d4ed8':item.status==='cancelled'?'#6b7280':'#047857'}}>{item.status}</span></div>
        <div style={{whiteSpace:'pre-wrap',lineHeight:1.55,fontSize:'14px',color:'#374151'}}>{item.message}</div>
        {item.status==='scheduled'&&<button type="button" onClick={()=>cancelScheduled(item.id)} style={{marginTop:'10px',border:0,background:'transparent',color:'#b91c1c',cursor:'pointer',fontSize:'12px',fontWeight:600}}>Cancel schedule</button>}
      </div>)}</div>}
    </div>
    <div className="panel" style={{marginTop:'16px'}}>
      <div className="panel-head"><div><h2>Follow-up history</h2><p>{selectedLead?`Previous messages sent to ${selectedLead.name}.`:'Select a lead to view previous follow-ups.'}</p></div>{selectedLead&&<span className="ai-badge">{history.length} {history.length===1?'message':'messages'}</span>}</div>
      {historyLoading?<div style={{padding:'20px 0',color:'#6b7280',fontSize:'14px'}}>Loading follow-up history...</div>:history.length===0?<div style={{padding:'20px 0',color:'#6b7280',fontSize:'14px'}}>No follow-ups have been sent to this lead yet.</div>:<div style={{display:'flex',flexDirection:'column',gap:'12px'}}>{history.map(message=>{const status=message.status||'sent';const statusStyles={sent:{background:'#ecfdf5',color:'#047857'},failed:{background:'#fef2f2',color:'#b91c1c'},draft:{background:'#f3f4f6',color:'#4b5563'},delivered:{background:'#eff6ff',color:'#1d4ed8'}};const badge=statusStyles[status]||statusStyles.draft;return <div key={message.id} style={{padding:'14px',border:'1px solid #e5e7eb',borderRadius:'12px',background:'#fff'}}><div style={{display:'flex',justifyContent:'space-between',gap:'12px',alignItems:'center',marginBottom:'8px'}}><strong>{message.sender==='ai'?'LeadPilot AI':message.sender==='lead'?selectedLead?.name||'Lead':'You'}</strong><span style={{...badge,padding:'4px 8px',borderRadius:'999px',fontSize:'11px',fontWeight:600}}>{status}</span></div><div style={{whiteSpace:'pre-wrap',lineHeight:1.55,fontSize:'14px',color:'#374151'}}>{message.content}</div><div style={{marginTop:'8px',fontSize:'12px',color:'#9ca3af'}}>{new Date(message.created_at).toLocaleString()}</div></div>})}</div>}
    </div>
  </section>;
}

function Conversations({ session }) {

  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(true);

  const [messagesLoading, setMessagesLoading] = useState(false);

  const [error, setError] = useState('');

  const loadConversations = async () => {

    if (!supabase || !session?.user?.id) {

      setConversations([]);

      setLoading(false);

      return;

    }

    setLoading(true);

    setError('');

    try {

      const { data, error: conversationError } = await supabase

        .from('conversations')

        .select(`

          id,

          lead_id,

          created_at,

          updated_at,

          leads (

            id,

            name,

            company,

            email

          )

        `)

        .eq('user_id', session.user.id)

        .order('updated_at', { ascending: false });

      if (conversationError) {

        throw conversationError;

      }

      setConversations(data || []);

      if (

        selectedConversation &&

        !data?.some((item) => item.id === selectedConversation.id)

      ) {

        setSelectedConversation(null);

        setMessages([]);

      }

    } catch (err) {

      console.error('Load conversations error:', err);

      setError(

        err.message || 'Failed to load conversations.'

      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    loadConversations();

  }, [session]);

  const openConversation = async (conversation) => {

    setSelectedConversation(conversation);

    setMessages([]);

    setMessagesLoading(true);

    setError('');

    try {

      const { data, error: messageError } = await supabase

        .from('messages')

        .select('id, sender, content, status, created_at')

        .eq('conversation_id', conversation.id)

        .eq('user_id', session.user.id)

        .order('created_at', { ascending: true });

      if (messageError) {

        throw messageError;

      }

      setMessages(data || []);

    } catch (err) {

      console.error('Load messages error:', err);

      setError(

        err.message || 'Failed to load conversation messages.'

      );

    } finally {

      setMessagesLoading(false);

    }

  };

  const lead = selectedConversation?.leads;

  return (

    <section className="content">

      <div className="page-title">

        <div>

          <h1>Conversations</h1>

          <p>

            Keep track of your AI-assisted lead conversations.

          </p>

        </div>

      </div>

      {error && (

        <div className="auth-error">

          {error}

        </div>

      )}

      {loading ? (

        <div className="panel">

          <p>Loading conversations...</p>

        </div>

      ) : conversations.length === 0 ? (

        <div className="panel">

          <h2>No conversations yet</h2>

          <p>

            Generate and send an AI follow-up from the AI

            Follow-ups page to create your first conversation.

          </p>

        </div>

      ) : (

        <div

          style={{

            display: 'grid',

            gridTemplateColumns: selectedConversation

              ? 'minmax(280px, 0.9fr) minmax(360px, 1.4fr)'

              : '1fr',

            gap: '16px',

            alignItems: 'start',

          }}

        >

          <div className="conversation panel">

            {conversations.map((conversation) => {

              const conversationLead = conversation.leads;

              const isSelected =

                selectedConversation?.id === conversation.id;

              return (

                <button

                  key={conversation.id}

                  type="button"

                  className="conversation-row"

                  onClick={() =>

                    openConversation(conversation)

                  }

                  style={{

                    width: '100%',

                    border: '0',

                    background: isSelected

                      ? 'rgba(99, 88, 235, 0.08)'

                      : 'transparent',

                    cursor: 'pointer',

                    textAlign: 'left',

                  }}

                >

                  <div className="person">

                    {(conversationLead?.name || 'Lead')

                      .split(' ')

                      .map((x) => x[0])

                      .join('')}

                  </div>

                  <div>

                    <strong>

                      {conversationLead?.name || 'Unknown lead'}

                    </strong>

                    <span>

                      {conversationLead?.company ||

                        'No company'}{' '}

                      · Last message{' '}

                      {new Date(

                        conversation.updated_at

                      ).toLocaleString()}

                    </span>

                  </div>

                  <span className="pill interested">

                    Active

                  </span>

                  <ChevronRight />

                </button>

              );

            })}

          </div>

          {selectedConversation && (

            <div className="panel">

              <div className="panel-head">

                <div>

                  <h2>

                    {lead?.name || 'Conversation'}

                  </h2>

                  <p>

                    {lead?.company || 'No company'}

                    {lead?.email

                      ? ` · ${lead.email}`

                      : ''}

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => {

                    setSelectedConversation(null);

                    setMessages([]);

                  }}

                >

                  Close

                </button>

              </div>

              <div

                style={{

                  display: 'flex',

                  flexDirection: 'column',

                  gap: '12px',

                  minHeight: '260px',

                  maxHeight: '480px',

                  overflowY: 'auto',

                  padding: '12px 0',

                }}

              >

                {messagesLoading ? (

                  <p>Loading messages...</p>

                ) : messages.length === 0 ? (

                  <p>No messages in this conversation yet.</p>

                ) : (

                  messages.map((message) => (

                    <div

                      key={message.id}

                      style={{

                        alignSelf:

                          message.sender === 'ai'

                            ? 'flex-end'

                            : 'flex-start',

                        maxWidth: '78%',

                        padding: '12px 14px',

                        borderRadius: '14px',

                        background:

                          message.sender === 'ai'

                            ? '#eeeaff'

                            : '#f3f4f6',

                      }}

                    >

                      <small

                        style={{

                          display: 'block',

                          marginBottom: '5px',

                          fontWeight: 600,

                        }}

                      >

                        {message.sender === 'ai'

                          ? 'LeadPilot AI'

                          : message.sender === 'lead'

                            ? lead?.name || 'Lead'

                            : 'You'}

                      </small>

                      <div

                        style={{

                          whiteSpace: 'pre-wrap',

                          lineHeight: 1.5,

                        }}

                      >

                        {message.content}

                      </div>

                      <small

                        style={{

                          display: 'block',

                          marginTop: '6px',

                          opacity: 0.6,

                        }}

                      >

                        {new Date(

                          message.created_at

                        ).toLocaleString()}

                      </small>

                    </div>

                  ))

                )}

              </div>

            </div>

          )}

        </div>

      )}

    </section>

  );

}

function SettingsPage(){return <section className="content"><div className="page-title"><div><h1>Settings</h1><p>Manage your workspace and preferences.</p></div></div><div className="settings-grid"><div className="panel"><h2>Workspace</h2><label>Business name<input value="My Business" readOnly/></label><label>Industry<select><option>Technology</option><option>Marketing</option><option>Real Estate</option></select></label><button className="primary">Save changes</button></div><div className="panel"><h2>AI preferences</h2><div className="toggle"><div><strong>Personalized follow-ups</strong><span>Use lead context when generating messages.</span></div><input type="checkbox" defaultChecked/></div><div className="toggle"><div><strong>Auto score leads</strong><span>Automatically score new leads with AI.</span></div><input type="checkbox" defaultChecked/></div></div></div></section>}

function LeadModal({ lead, close, setLeads, session }) {

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [qualification, setQualification] = useState({

    score: lead.score,

    status: lead.status,

    reason: lead.notes || 'No AI qualification yet.',

  });

  const qualifyLead = async () => {

    if (!lead) return;

    setLoading(true);

    setError('');

    try {

      // Ask Gemini to qualify the lead

      const response = await fetch(

        'http://localhost:5000/api/ai/qualify-lead',

        {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json',

          },

          body: JSON.stringify({

            name: lead.name,

            business: lead.company,

            email: lead.email,

            phone: lead.phone,

            requirement:

              lead.requirement ||

              lead.notes ||

              'Potential customer interested in our service.',

            budget:

              lead.budget ||

              'Not provided',

          }),

        }

      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(

          data.error || 'Failed to qualify lead.'

        );

      }

      const updatedQualification = {

        score: data.score,

        status: data.status,

        reason: data.reason,

      };

      setQualification(updatedQualification);

      // Save qualification to Supabase

      if (supabase && session) {

        const { error: updateError } = await supabase

          .from('leads')

          .update({

            score: data.score,

            status: data.status,

            notes: data.reason,

            last_activity: new Date().toISOString(),

          })

          .eq('id', lead.id)

          .eq('user_id', session.user.id);

        if (updateError) {

          throw updateError;

        }

      }

      // Update LeadPilot UI immediately

      setLeads((currentLeads) =>

        currentLeads.map((item) =>

          item.id === lead.id

            ? {

                ...item,

                score: data.score,

                status: data.status,

                notes: data.reason,

                last_activity: new Date().toISOString(),

                last: 'Just now',

              }

            : item

        )

      );

    } catch (err) {

      console.error('Lead qualification error:', err);

      setError(

        err.message ||

          'Unable to qualify this lead. Please try again.'

      );

    } finally {

      setLoading(false);

    }

  };

  const statusClass =

    qualification.status?.toLowerCase() || 'new';

  return (

    <div className="modal-bg" onClick={close}>

      <div

        className="modal"

        onClick={(e) => e.stopPropagation()}

      >

        <button

          className="modal-close"

          onClick={close}

        >

          <X />

        </button>

        <div className="leadhero">

          <div className="bigperson">

            {lead.name

              .split(' ')

              .map((x) => x[0])

              .join('')}

          </div>

          <div>

            <h2>{lead.name}</h2>

            <p>

              {lead.company || 'No company'} ·{' '}

              {lead.email || 'No email'}

            </p>

          </div>

        </div>

        <div className="modalstats">

          <div>

            <small>AI score</small>

            <strong>

              {qualification.score}/100

            </strong>

          </div>

          <div>

            <small>Status</small>

            <span

              className={`pill ${statusClass}`}

            >

              {qualification.status}

            </span>

          </div>

          <div>

            <small>Last activity</small>

            <strong>

              {loading ? 'Analyzing...' : lead.last}

            </strong>

          </div>

        </div>

        <div className="summary">

          <h3>Lead details</h3>

          <p>

            <strong>Requirement:</strong> {lead.requirement || 'Not provided'}

          </p>

          <p>

            <strong>Budget:</strong> {lead.budget || 'Not provided'}

          </p>

        </div>

        <div className="summary">

          <h3>AI qualification</h3>

          <p>

            {qualification.reason}

          </p>

        </div>

        {error && (

          <div className="auth-error">

            {error}

          </div>

        )}

        <button

          className="primary full"

          onClick={qualifyLead}

          disabled={loading}

        >

          <Sparkles size={17} />

          {loading

            ? 'Analyzing lead...'

            : 'Qualify with AI'}

        </button>

      </div>

    </div>

  );

}createRoot(document.getElementById('root')).render(<App/>);
