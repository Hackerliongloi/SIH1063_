"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Heart, Share2, MessageCircle } from 'lucide-react';
import { ShareDialog } from '@/components/social/ShareDialog';

export default function ReelsPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareItem, setShareItem] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = async () => {
    try {
      const res = await fetch('/api/social/reels');
      if (res.ok) {
        const data = await res.json();
        setReels(data.items);
        setCursor(data.next_cursor);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-slate-900 flex justify-center">
        <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mt-20"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen pt-16">
      <div className="h-[calc(100vh-4rem)] w-full max-w-lg mx-auto snap-y snap-mandatory overflow-y-scroll hide-scrollbar flex flex-col" ref={containerRef}>
        {reels.map((reel) => (
          <div key={reel.id} className="relative w-full h-full snap-start shrink-0 flex items-center justify-center bg-black overflow-hidden">
            <video 
              src={reel.video_url || `/api/storage/${reel.mp4_key}`}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
            
            {/* Right action bar */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
              <button className="group flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-rose-500/80 transition-colors">
                  <Heart className={`w-6 h-6 ${reel.liked_by_me ? 'fill-rose-500 text-rose-500' : ''}`} />
                </div>
                <span className="text-xs font-semibold drop-shadow-md">{reel.like_count || 0}</span>
              </button>
              <button className="group flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold drop-shadow-md">0</span>
              </button>
              <button onClick={() => setShareItem(reel)} className="group flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Share2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold drop-shadow-md">{reel.share_count || 0}</span>
              </button>
            </div>

            {/* Bottom info text */}
            <div className="absolute bottom-6 left-4 pr-20 z-10 text-white w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full border-2 border-white/50 bg-gradient-to-tr from-sky-400 to-teal-400 flex items-center justify-center text-sm font-bold shadow-lg">
                  {reel.source?.substring(0, 2).toUpperCase() || 'ED'}
                </div>
                <span className="font-bold tracking-wide drop-shadow-md">{reel.source || 'Editorial Team'}</span>
                <button className="px-3 py-1 bg-transparent border border-white/60 rounded-full text-xs font-bold hover:bg-white/20 backdrop-blur-sm transition-colors">
                  Follow
                </button>
              </div>
              
              <p className="text-sm line-clamp-2 w-[85%] font-medium drop-shadow-md leading-snug">
                {reel.title || reel.caption}
              </p>
              
              {reel.hashtags && reel.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 w-[85%]">
                  {reel.hashtags.map((tag: string) => (
                    <span key={tag} className="text-xs font-bold drop-shadow-md">
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {shareItem && <ShareDialog item={shareItem} onClose={() => setShareItem(null)} />}
    </div>
  );
}
