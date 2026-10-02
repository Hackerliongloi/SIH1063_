"use client";
import React, { useEffect, useState } from 'react';
import { FeedCard } from '@/components/social/FeedCard';
import { ShareDialog } from '@/components/social/ShareDialog';
import { StoryViewer } from '@/components/social/StoryViewer';
import { ReelViewer } from '@/components/social/ReelViewer';

export default function InboxPage() {
  const [shares, setShares] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareItem, setShareItem] = useState<any | null>(null);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [activeReel, setActiveReel] = useState<any | null>(null);

  const fetchInbox = async () => {
    try {
      const res = await fetch('/api/social/inbox');
      if (res.ok) {
        const data = await res.json();
        setShares(data.items);
        setCursor(data.next_cursor);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [globalReels, setGlobalReels] = useState<any[]>([]);
  const [reelsCursor, setReelsCursor] = useState<string | null>(null);

  const fetchGlobalReels = async (nextCursor?: string) => {
    try {
      const url = new URL('/api/social/reels', window.location.origin);
      if (nextCursor) url.searchParams.append('cursor', nextCursor);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (nextCursor) {
          setGlobalReels(prev => {
            const newItems = data.items.filter((item: any) => !prev.find(p => p.id === item.id));
            return [...prev, ...newItems];
          });
        } else {
          setGlobalReels(data.items);
        }
        setReelsCursor(data.next_cursor);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInbox();
    fetchGlobalReels();
  }, []);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-slate-50 flex justify-center">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mt-20"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 bg-slate-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 mb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Shared with You</h1>
        <p className="text-slate-500 mt-1">Posts and stories shared by the community</p>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-20 space-y-8">
        {shares.length === 0 ? (
          <div className="text-center text-slate-500 py-16 bg-white rounded-3xl border border-slate-100">
            <p className="text-lg font-medium text-slate-600">Your inbox is empty</p>
            <p className="text-sm mt-2">When someone shares a post with you, it will appear here.</p>
          </div>
        ) : (
          shares.map((share) => (
            <div key={share.share_id} className="relative group">
              <div className="absolute -top-3 -left-3 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
                Shared by @{share.sender_username}
              </div>
              <FeedCard 
                item={share.content} 
                onShare={setShareItem}
                onStoryClick={setActiveStory}
                onReelClick={setActiveReel} 
              />
            </div>
          ))
        )}
      </main>

      {shareItem && (
        <ShareDialog item={shareItem} onClose={() => setShareItem(null)} />
      )}
      
      {activeStory && (
        <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />
      )}
      
      {activeReel && (
        <ReelViewer 
          initialItem={activeReel} 
          reelsList={globalReels} 
          onClose={() => setActiveReel(null)} 
          onShare={setShareItem} 
          onLoadMore={reelsCursor ? () => fetchGlobalReels(reelsCursor) : undefined}
        />
      )}
    </div>
  );
}
