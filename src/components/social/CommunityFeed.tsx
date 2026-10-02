"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FeedCard } from './FeedCard';
import { StoryTray } from './StoryTray';
import { ShareDialog } from './ShareDialog';
import { StoryViewer } from './StoryViewer';
import { ReelViewer } from './ReelViewer';
import { Filter } from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'post', label: 'Posts' },
  { id: 'reel', label: 'Reels' },
  { id: 'story', label: 'Science Stories' }
];

export function CommunityFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || 'all';

  const [activeTab, setActiveTab] = useState(initialType);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shareItem, setShareItem] = useState<any | null>(null);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [activeReel, setActiveReel] = useState<any | null>(null);

  const fetchFeed = useCallback(async (nextCursor?: string, type?: string) => {
    try {
      const currentType = type || activeTab;
      
      let endpoint = '/api/social/feed';
      if (currentType === 'story') endpoint = '/api/social/stories';
      else if (currentType === 'reel') endpoint = '/api/social/reels';

      const url = new URL(endpoint, window.location.origin);
      if (nextCursor) url.searchParams.append('cursor', nextCursor);
      
      // The mixed feed doesn't natively take a 'type' query param in the backend for 'post', 
      // but we can filter it on the client if it's 'post'. 
      // However, to keep it simple, if 'post', we just fetch mixed feed and filter.
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        
        let items = data.items;
        if (currentType === 'post') {
          items = items.filter((item: any) => item._type === 'feed_item' && item.kind !== 'reel');
        }

        if (nextCursor) {
          setFeedItems(prev => [...prev, ...items]);
        } else {
          setFeedItems(items);
        }
        setCursor(data.next_cursor);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

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
    setLoading(true);
    setFeedItems([]);
    setCursor(null);
    Promise.all([fetchFeed(undefined, activeTab), fetchStories()]).then(() => setLoading(false));
  }, [activeTab, fetchFeed]);

  useEffect(() => {
    const sid = searchParams.get('story_id');
    if (sid) {
      fetch(`/api/stories/${sid}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setActiveStory(data);
          }
        })
        .catch(console.error);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams);
    if (tabId === 'all') params.delete('type');
    else params.set('type', tabId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await fetchFeed(cursor);
    setLoadingMore(false);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 relative">
      <StoryTray stories={stories} onStoryClick={setActiveStory} />
      
      <main className="max-w-2xl mx-auto px-4 pb-20 space-y-8">
        
        {/* Filter Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          <div className="flex items-center gap-2 text-slate-400 mr-2 shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === tab.id 
                  ? 'bg-sky-500 text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="w-full flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center text-slate-500 py-16 bg-white rounded-3xl border border-slate-100 flex flex-col items-center gap-3 shadow-sm">
            <span className="text-4xl">📭</span>
            <p className="font-medium">No posts to show right now.</p>
          </div>
        ) : (
          feedItems.map((item, idx) => (
            <FeedCard 
              key={`${item._type}-${item.id}-${idx}`} 
              item={item} 
              onShare={setShareItem}
              onStoryClick={setActiveStory}
              onReelClick={setActiveReel}
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
      
      {activeStory && (
        <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />
      )}
      
      {activeReel && (
        <ReelViewer 
          initialItem={activeReel} 
          reelsList={feedItems.filter(item => item.kind === 'reel' || item._type === 'reel')}
          onClose={() => setActiveReel(null)} 
          onShare={setShareItem} 
          onLoadMore={cursor ? handleLoadMore : undefined}
        />
      )}
    </div>
  );
}
