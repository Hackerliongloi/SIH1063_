"use client";
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Heart, Share2 } from 'lucide-react';

interface ReelViewerProps {
  item: any;
  onClose: () => void;
  onShare: (item: any) => void;
}

export function ReelViewer({ item, onClose, onShare }: ReelViewerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(item.liked_by_me);
  const [likeCount, setLikeCount] = useState(item.like_count || 0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => setIsPlaying(false));
      else videoRef.current.pause();
    }
  }, [isPlaying]);

  const handleLike = async () => {
    try {
      const type = item._type === 'story' ? 'story' : 'feed_item';
      const res = await fetch(`/api/social/content/${type}/${item.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount((prev: number) => data.liked ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const videoSrc = item.video_url || `/api/storage/${item.mp4_key || item.primary_asset?.file_key}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Content Area */}
      <div className="relative w-full max-w-sm h-[100dvh] sm:h-[85vh] sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center">
        
        {/* Video Player */}
        <div className="absolute inset-0 cursor-pointer" onClick={() => setIsPlaying(!isPlaying)}>
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            playsInline
            loop
            muted={isMuted}
          />
        </div>

        {/* Play/Pause Overlay Indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm text-white">
              <Play className="w-10 h-10 ml-1" />
            </div>
          </div>
        )}

        {/* Side Actions */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20">
          <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-black/60 transition-colors">
              <Heart className={`w-6 h-6 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-md">{likeCount}</span>
          </button>
          
          <button onClick={() => onShare(item)} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-black/60 transition-colors">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
          </button>

          <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-black/60 transition-colors">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </div>
          </button>
        </div>

        {/* Bottom Info Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none text-white z-10">
          <div className="flex items-center gap-3 mb-3 pointer-events-auto">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-teal-400 p-[2px]">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-sm font-bold text-sky-700">
                {(item.source || 'NP').substring(0, 2).toUpperCase()}
              </div>
            </div>
            <span className="font-bold drop-shadow-md">{item.source || 'Editorial Team'}</span>
          </div>
          
          <h2 className="text-lg font-bold mb-2 drop-shadow-lg">{item.title || item.caption}</h2>
          
          {item.description && item.description !== item.caption && (
            <p className="text-sm text-slate-200 line-clamp-2 drop-shadow-md pointer-events-auto">
              {item.description}
            </p>
          )}

          {item.hashtags && item.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pointer-events-auto">
              {item.hashtags.map((tag: string) => (
                <span key={tag} className="text-xs font-semibold text-white/90 drop-shadow-md">
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
