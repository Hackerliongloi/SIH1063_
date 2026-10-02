"use client";
import React, { useEffect, useState } from 'react';
import { FeedCard } from './FeedCard';
import { StoryTray } from './StoryTray';
import { ShareDialog } from './ShareDialog';

export function CommunityFeed() {
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shareItem, setShareItem] = useState<any | null>(null);

  const fetchFeed = async (nextCursor?: string) => {
    try {
      const url = new URL('/api/social/feed', window.location.origin);
      if (nextCursor) url.searchParams.append('cursor', nextCursor);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (nextCursor) {
          setFeedItems(prev => [...prev, ...data.items]);
        } else {
          setFeedItems(data.items);
        }
        setCursor(data.next_cursor);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/social/stories');
      if (res.ok) {
        const data = await res.json();
        setStories(data.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchFeed(), fetchStories()]).then(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await fetchFeed(cursor);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <StoryTray stories={stories} />
      
      <main className="max-w-2xl mx-auto px-4 pb-20 space-y-8">
        {feedItems.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white rounded-3xl border border-slate-100">
            No posts to show right now.
          </div>
        ) : (
          feedItems.map((item, idx) => (
            <FeedCard 
              key={`${item._type}-${item.id}-${idx}`} 
              item={item} 
              onShare={setShareItem}
            />
          ))
        )}

        {cursor && (
          <div className="flex justify-center pt-8 pb-12">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3 bg-white border border-slate-200 hover:border-sky-300 text-slate-700 font-semibold rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </main>

      {shareItem && (
        <ShareDialog item={shareItem} onClose={() => setShareItem(null)} />
      )}
    </div>
  );
}
