'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
type Message = { id:string; wa_id:string; contact_name:string|null; direction:string; body:string; message_at:string; status:string; error_code:string|null; error_message:string|null };
type Contact = { wa_id:string; contact_name:string|null; body:string; message_at:string; last_inbound:string|null };
type Config = { phoneNumber:string; tokenConfigured:boolean; webhookVerified:boolean };
export default function WhatsAppInbox() {
  const [contacts,setContacts]=useState<Contact[]>([]); const [selected,setSelected]=useState('');
  const [messages,setMessages]=useState<Message[]>([]); const [text,setText]=useState('');
  const [config,setConfig]=useState<Config|null>(null); const [replyAllowed,setReplyAllowed]=useState(false);
  const [error,setError]=useState(''); const [sending,setSending]=useState(false); const [search,setSearch]=useState('');
  const selectedRef=useRef(selected); selectedRef.current=selected;
  const draftRequest=useRef<{to:string;text:string;id:string}|null>(null);
  const load=useCallback(async()=>{
    try {
      const who=selectedRef.current;
      const listResponse=await fetch('/api/admin/whatsapp',{cache:'no-store'}); const list=await listResponse.json();
      if(!listResponse.ok) throw new Error(list.error || 'Unable to load inbox');
      setContacts([...list.contacts].sort((a:Contact,b:Contact)=>Date.parse(b.message_at)-Date.parse(a.message_at)));setConfig(list.config);
      if(who){const response=await fetch(`/api/admin/whatsapp?phone=${encodeURIComponent(who)}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error);if(who===selectedRef.current){setMessages(data.messages);setReplyAllowed(data.replyAllowed);}}
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'Unable to load inbox');}
  },[]);
  useEffect(()=>{void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},10000);return()=>clearInterval(timer);},[load,selected]);
  async function send(){
    if(sending || !selected || !text.trim())return;
    const outgoing=text.trim();
    if(!draftRequest.current || draftRequest.current.to!==selected || draftRequest.current.text!==outgoing)draftRequest.current={to:selected,text:outgoing,id:crypto.randomUUID()};
    setSending(true);setError('');
    try {const response=await fetch('/api/admin/whatsapp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:selected,text:outgoing,requestId:draftRequest.current.id})});const data=await response.json();if(!response.ok)throw new Error(data.error || 'Unable to send');
      if(['failed','unknown','pending'].includes(data.message?.status)){await load();setError(`${data.message.error_code ? 'Meta '+data.message.error_code+': ':''}${data.message.error_message || 'Message is pending. Refresh before sending again.'}`);}else{setText('');draftRequest.current=null;await load();}
    }catch(e){setError(e instanceof Error?e.message:'Send status is uncertain. Refresh before retrying.');}finally{setSending(false);}
  }
  const contact=contacts.find(c=>c.wa_id===selected);
  return <section className="space-y-4">
    <div><h1 className="text-2xl font-bold text-[#741f23]">WhatsApp Inbox</h1><p className="text-sm text-stone-600">{config?.phoneNumber || '+91 9723268666'} · Customer conversations</p></div>
    {config && <div className="rounded-xl border bg-white p-3 text-sm">Incoming verification: {config.webhookVerified?'configured':'app secret needed'} · Outgoing credentials: {config.tokenConfigured?'configured — delivery requires a successful test':'not configured'}</div>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid min-h-[500px] gap-3 md:grid-cols-[280px_1fr]">
      <aside className="rounded-xl border bg-white p-3"><label className="sr-only" htmlFor="wa-search">Search chats</label><input id="wa-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or number" className="w-full rounded-lg border p-2 text-sm"/>
        <div className="mt-3 max-h-[240px] overflow-auto md:max-h-[550px]">{contacts.filter(c=>`${c.wa_id} ${c.contact_name || ''}`.toLowerCase().includes(search.toLowerCase())).map(c=><button key={c.wa_id} onClick={()=>{setSelected(c.wa_id);setMessages([]);setReplyAllowed(false);setText('');draftRequest.current=null;}} className={`mb-2 w-full rounded-lg p-3 text-left ${selected===c.wa_id?'bg-green-50 ring-1 ring-green-700':'bg-stone-50'}`}><strong className="block text-sm">{c.contact_name || '+'+c.wa_id}</strong><span className="block text-xs text-stone-500">+{c.wa_id}</span><span className="block truncate text-sm">{c.body}</span></button>)}{contacts.length===0 && <p className="p-3 text-sm text-stone-500">No saved chats yet. Send this business number a WhatsApp message to start a conversation.</p>}</div>
      </aside>
      <div className="flex min-w-0 flex-col rounded-xl border bg-white p-4">{selected?<><h2 className="font-bold">{contact?.contact_name || '+'+selected}</h2><p className="text-xs text-stone-500">+{selected} · Latest 100 messages · Refreshes every 10 seconds</p><div className="my-4 flex max-h-[500px] min-h-[280px] flex-1 flex-col gap-3 overflow-auto">{messages.map(m=><div key={m.id} className={`max-w-[90%] rounded-xl p-3 ${m.direction==='outbound'?'self-end bg-green-50':'self-start bg-stone-100'}`}><p className="whitespace-pre-wrap break-words text-sm">{m.body}</p><p className="mt-1 text-[11px] text-stone-500">{new Date(m.message_at).toLocaleString('en-IN')} · {m.status}</p>{m.error_message && <p className="mt-1 text-xs text-red-700">{m.error_code && `Meta ${m.error_code}: `}{m.error_message}</p>}</div>)}</div><p className="mb-2 text-xs text-stone-600">{replyAllowed?'Text replies are available within the customer’s 24-hour reply window.':'Reply window closed. Ask the customer to message first; an approved template is needed outside 24 hours.'}</p><label htmlFor="wa-reply" className="sr-only">Your reply</label><textarea id="wa-reply" rows={3} maxLength={4096} value={text} onChange={e=>setText(e.target.value)} disabled={sending} placeholder="Type your reply…" className="w-full rounded-lg border p-3 text-sm"/><div className="mt-2 flex justify-between gap-2"><button onClick={()=>void load()} className="rounded-lg border px-4 py-2 text-sm">Refresh</button><button onClick={()=>void send()} disabled={sending || !replyAllowed || !config?.tokenConfigured || !config?.webhookVerified || !text.trim()} className="rounded-lg bg-green-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-40">{sending?'Sending…':'Send reply'}</button></div></>:<p className="m-auto text-center text-sm text-stone-500">Select a conversation to read messages and reply.</p>}</div>
    </div>
  </section>;
}
