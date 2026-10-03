"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FeedCard } from './FeedCard';
import { StoryTray } from './StoryTray';
import { ShareDialog } from './ShareDialog';
import { StoryViewer } from './StoryViewer';
import { ReelViewer } from './ReelViewer';
import { ArticleViewer } from './ArticleViewer';
import { Filter, AlertCircle, X } from 'lucide-react';

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
  const [activePost, setActivePost] = useState<any | null>(null);
  const [activeArticle, setActiveArticle] = useState<any | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [loadingItem, setLoadingItem] = useState(false);

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
    const viewId = searchParams.get('view_id');
    const viewType = searchParams.get('view_type');
    const sid = searchParams.get('story_id'); // backwards compatibility

    const loadItem = async () => {
      if (!viewId && !sid) return;
      setLoadingItem(true);
      setItemError(null);
      try {
        let res;
        let finalViewType = viewType;

        if (viewId && viewType) {
          if (viewType === 'article') res = await fetch(`/api/stories/${viewId}`);
          else if (viewType === 'story') res = await fetch(`/api/outreach/stories/${viewId}`);
          else if (viewType === 'reel' || viewType === 'post') res = await fetch(`/api/feed/${viewId}`);
        } else if (sid) {
          res = await fetch(`/api/stories/${sid}`);
          if (!res.ok) {
            res = await fetch(`/api/outreach/stories/${sid}`);
            finalViewType = 'story';
          } else {
            finalViewType = 'article';
          }
        }

        if (res && res.ok) {
          const data = await res.json();
          if (!data || data.detail || data.error) {
            setItemError('The requested story is unavailable or could not be loaded.');
          } else {
            // Strict shape validation before rendering to avoid Next.js Error Boundary crashes
            if (finalViewType === 'article') {
              if (data.body_md !== undefined) setActiveArticle(data);
              else setItemError('The article payload is missing expected content.');
            } else if (finalViewType === 'story') {
              if (Array.isArray(data.slides)) setActiveStory(data);
              else setItemError('The outreach story is missing expected slides.');
            } else if (finalViewType === 'reel') {
              setActiveReel(data);
            } else if (finalViewType === 'post') {
              setActivePost(data);
            } else {
              setItemError('Unknown content type.');
            }
          }
        } else {
          setItemError('The requested content could not be found (404) or is unavailable.');
        }
      } catch (e) {
        console.error("Failed to load item from URL parameter:", e);
        setItemError('An unexpected error occurred while loading the content.');
      } finally {
        setLoadingItem(false);
      }
    };
    loadItem();
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
    <div className="w-full bg-slate-50 relative">
      <StoryTray stories={stories} onStoryClick={setActiveStory} />
      
      <main className="max-w-2xl mx-auto px-4 pb-12 space-y-5">
        
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

      {activeArticle && (
        <ArticleViewer 
          article={activeArticle} 
          onClose={() => setActiveArticle(null)} 
        />
      )}

      {activePost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-50 rounded-3xl shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setActivePost(null)} 
              className="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <FeedCard 
              item={activePost} 
              onShare={setShareItem}
              onStoryClick={setActiveStory}
              onReelClick={setActiveReel}
            />
          </div>
        </div>
      )}

      {loadingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin"></div>
            <p className="text-slate-600 font-medium">Loading content...</p>
          </div>
        </div>
      )}

      {itemError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Content Unavailable</h3>
            <p className="text-slate-600 mb-8">{itemError}</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => {
                  setItemError(null);
                  router.push('/community');
                }}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-sky-600/20"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
