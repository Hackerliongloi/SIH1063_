"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Clapperboard, LoaderCircle, RefreshCw, Send, Trash2, Video } from "lucide-react";

type VideoAsset = { id:number; title:string; status:string; file_key?:string|null };
type Reel = { id:number; title:string; caption:string; description?:string; status:string; video_url?:string|null; primary_asset_id?:number|null; sources?:{supported:boolean}[]; created_at?:string; webhook_delivery_status?:{id?:number;state:string;attempts:number;last_error:string|null} };
type Session = { role:"admin"|"editor"|"reviewer" };

async function request<T>(url:string,init?:RequestInit):Promise<T> {
  const response=await fetch(url,{...init,cache:"no-store",headers:{"Content-Type":"application/json",...(init?.headers||{})}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(typeof payload?.detail==="string"?payload.detail:`Request failed (${response.status})`);
  return payload as T;
}

export default function AdminReelsPage(){
  const [assets,setAssets]=useState<VideoAsset[]>([]);
  const [reels,setReels]=useState<Reel[]>([]);
  const [session,setSession]=useState<Session|null>(null);
  const [selectedVideo,setSelectedVideo]=useState<Record<number,string>>({});
  const [title,setTitle]=useState("");
  const [caption,setCaption]=useState("");
  const [videoId,setVideoId]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const reload=useCallback(async()=>{
    setError("");
    try{
      const [assetData,reelData,user]=await Promise.all([
        request<{items:VideoAsset[]}>('/api/assets?type=video&status=ready&page_size=100'),
        request<Reel[]>('/api/feed/manage?kind=reel&limit=100'),
        request<Session>('/api/auth/session'),
      ]);
      setAssets(Array.isArray(assetData.items)?assetData.items.filter(asset=>Boolean(asset.file_key)):[]);
      setReels(Array.isArray(reelData)?reelData:[]);
      setSession(user);
    }catch(e){setError(e instanceof Error?e.message:'Could not load reel studio.');}
  },[]);

  useEffect(()=>{const timer=window.setTimeout(()=>{void reload();},0);return()=>window.clearTimeout(timer);},[reload]);

  async function createReel(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      const reel=await request<Reel>('/api/feed/items',{method:'POST',body:JSON.stringify({kind:'reel',title:title.trim(),caption:caption.trim(),description:'Research outreach reel',primary_asset_id:Number(videoId),hashtags:[],ai_assisted:false})});
      await request(`/api/feed/items/${reel.id}/media`,{method:'PUT',body:JSON.stringify([{asset_id:Number(videoId),kind:'video',alt_text:title.trim()}])});
      setTitle("");setCaption("");setVideoId("");setMessage('Reel draft created. Submit it for review when it is ready.');await reload();
    }catch(e){setError(e instanceof Error?e.message:'Could not create the reel.');}
    finally{setBusy(false);}
  }

  async function attachVideo(reel:Reel){
    const id=selectedVideo[reel.id];if(!id)return;
    setBusy(true);setError("");setMessage("");
    try{
      await request(`/api/feed/items/${reel.id}/media`,{method:'PUT',body:JSON.stringify([{asset_id:Number(id),kind:'video',alt_text:reel.title}])});
      setMessage('Video attached to reel draft.');await reload();
    }catch(e){setError(e instanceof Error?e.message:'Could not attach the video.');}
    finally{setBusy(false);}
  }

  async function transition(reel:Reel,action:string){
    setBusy(true);setError("");setMessage("");
    try{
      await request(`/api/feed/items/${reel.id}/transition`,{method:'POST',body:JSON.stringify({action})});
      setMessage(`Reel ${action==='publish'?'published':action==='submit'?'submitted for review':action==='approve'?'approved':'updated'}.`);await reload();
    }catch(e){setError(e instanceof Error?e.message:'Could not update reel status.');}
    finally{setBusy(false);}
  }

  async function deleteReel(reel:Reel){
    if(!window.confirm(`Delete reel “${reel.title||`#${reel.id}`}”? This cannot be undone.`))return;
    setBusy(true);setError("");setMessage("");
    try{await request(`/api/feed/items/${reel.id}`,{method:"DELETE"});setMessage("Reel deleted.");await reload();}
    catch(e){setError(e instanceof Error?e.message:"Could not delete the reel.");}
    finally{setBusy(false);}
  }

  async function retryWebhook(reel:Reel){
    const eventId=reel.webhook_delivery_status?.id;if(!eventId)return;
    setBusy(true);setError("");setMessage("");
    try{await request(`/api/webhooks/outbox/${eventId}/retry`,{method:"POST"});setMessage("Webhook delivery queued for retry.");await reload();}
    catch(e){setError(e instanceof Error?e.message:"Could not retry webhook delivery.");}
    finally{setBusy(false);}
  }

  const canCreate=session?.role==='admin'||session?.role==='editor';
  const canReview=session?.role==='admin'||session?.role==='reviewer';
  return <main className="min-h-[70vh] bg-[#f5f8fb] px-4 py-8 text-slate-800 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3982a8]">Admin studio</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-[#143b5e]"><Clapperboard className="h-7 w-7"/>Research reels</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Attach a video, add its caption, and publish it through editorial review. Reel videos must be uploaded to the repository first.</p></div>
        <button type="button" onClick={()=>void reload()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#143b5e]"><RefreshCw className="h-4 w-4"/>Refresh</button>
      </header>

      {message&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error&&<p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {canCreate&&<form onSubmit={createReel} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[#143b5e]">Create a reel draft</h2>
        <p className="mt-1 text-sm text-slate-600">Upload a video under <Link className="font-semibold text-[#12679a] underline" href="/admin/content">Content</Link> first, then select it here.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">Video asset<select required value={videoId} onChange={e=>setVideoId(e.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Choose a ready video</option>{assets.map(asset=><option key={asset.id} value={asset.id}>{asset.title}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Reel title<input required maxLength={300} value={title} onChange={e=>setTitle(e.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="A day at Maitri Station"/></label>
          <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">Caption<textarea required maxLength={10000} rows={3} value={caption} onChange={e=>setCaption(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Describe the science and what viewers will see."/></label>
        </div>
        <button disabled={busy||!assets.length} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#12679a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Video className="h-4 w-4"/>{busy?'Saving…':'Save reel draft'}</button>
        {!assets.length&&<p className="mt-3 text-xs text-slate-500">No ready videos yet. Add an MP4 under Admin → Content and wait for processing to finish.</p>}
      </form>}

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[#143b5e]">Reel workflow</h2><span className="text-xs text-slate-500">{reels.length} items</span></div>
        {!reels.length?<div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No reel drafts yet. Create one above or generate a reel script in AI Studio.</div>:reels.map(reel=><article key={reel.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-bold text-[#143b5e]">{reel.title||`Reel #${reel.id}`}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-600">{reel.status.replace('_',' ')}</span>{reel.webhook_delivery_status&&<span title={reel.webhook_delivery_status.last_error||""} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">Webhook: {reel.webhook_delivery_status.state}</span>}</div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{reel.caption}</p></div>{reel.status==='published'&&<Link href="/community?type=reel" className="inline-flex items-center gap-1 text-sm font-semibold text-[#12679a]">View public reels<ArrowUpRight className="h-4 w-4"/></Link>}</div>
          {reel.video_url?<video className="mt-4 max-h-72 w-auto max-w-full rounded-lg bg-slate-950" src={reel.video_url} controls playsInline preload="metadata"/>:<div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><span>Attach a video before publishing:</span><select aria-label={`Choose video for ${reel.title}`} value={selectedVideo[reel.id]||''} onChange={e=>setSelectedVideo({...selectedVideo,[reel.id]:e.target.value})} disabled={reel.status!=='draft'&&reel.status!=='changes_requested'} className="min-h-9 rounded border border-amber-300 bg-white px-2 text-sm"><option value="">Choose a video</option>{assets.map(asset=><option key={asset.id} value={asset.id}>{asset.title}</option>)}</select><button type="button" disabled={busy||!selectedVideo[reel.id]||!['draft','changes_requested'].includes(reel.status)} onClick={()=>void attachVideo(reel)} className="rounded bg-amber-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Attach video</button></div>}
          <div className="mt-4 flex flex-wrap gap-2">
            {(reel.status==='draft'||reel.status==='changes_requested')&&canCreate&&<button type="button" disabled={busy||!reel.video_url} onClick={()=>void transition(reel,'submit')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#12679a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5"/>Submit for review</button>}
            {reel.status==='in_review'&&canReview&&<><button type="button" disabled={busy||!reel.video_url} onClick={()=>void transition(reel,'approve')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button><button type="button" disabled={busy} onClick={()=>void transition(reel,'request_changes')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Request changes</button></>}
            {reel.status==='approved'&&session?.role==='admin'&&<button type="button" disabled={busy||!reel.video_url} onClick={()=>void transition(reel,'publish')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Publish reel</button>}
            {reel.status==='published'&&session?.role==='admin'&&<button type="button" disabled={busy} onClick={()=>void transition(reel,'unpublish')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Unpublish</button>}
            {reel.webhook_delivery_status?.state==='dead_letter'&&reel.webhook_delivery_status.id&&(session?.role==='admin'||session?.role==='editor')&&<button type="button" disabled={busy} onClick={()=>void retryWebhook(reel)} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Retry webhook</button>}
            {reel.status!=='published'&&(session?.role==='admin'||session?.role==='editor')&&<button type="button" disabled={busy} onClick={()=>void deleteReel(reel)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5"/>Delete</button>}
            {reel.status==='in_review'&&!canReview&&<span className="inline-flex items-center gap-1 text-xs text-slate-500"><LoaderCircle className="h-3.5 w-3.5"/>Awaiting reviewer approval</span>}
          </div>
        </article>)}
      </section>
    </div>
  </main>;
}
