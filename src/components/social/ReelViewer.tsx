"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Volume2, VolumeX, Heart, Share2, ChevronUp, ChevronDown } from 'lucide-react';

interface ReelViewerProps {
  initialItem: any;
  reelsList: any[];
  onClose: () => void;
  onShare: (item: any) => void;
  onLoadMore?: () => void;
}

export function ReelViewer({ initialItem, reelsList, onClose, onShare, onLoadMore }: ReelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const actualList = reelsList.length > 0 
    ? (reelsList.some(r => r.id === initialItem.id) ? reelsList : [initialItem, ...reelsList])
    : [initialItem];

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = actualList.findIndex(r => r.id === initialItem.id);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Initial scroll to the selected item if not the first one
  useEffect(() => {
    if (currentIndex > 0 && containerRef.current) {
      const container = containerRef.current;
      container.scrollTop = currentIndex * container.clientHeight;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < actualList.length) {
      setCurrentIndex(newIndex);
    }

    // Load more when near the bottom
    if (onLoadMore && container.scrollTop + container.clientHeight >= container.scrollHeight - container.clientHeight * 2) {
      onLoadMore();
    }
  };

  const scrollToIndex = (idx: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.scrollTo({ top: idx * container.clientHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < actualList.length - 1) scrollToIndex(currentIndex + 1);
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) scrollToIndex(currentIndex - 1);
      }
      // Space is handled by the active ReelItem via window event if active
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentIndex, actualList.length]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Content Area */}
      <div className="relative w-full max-w-sm h-[100dvh] sm:h-[85vh] sm:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl">
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex flex-col"
        >
          {actualList.map((item, idx) => {
            // Only render items near the viewport to save memory
            const isNear = Math.abs(idx - currentIndex) <= 2;
            return (
              <div key={`${item.id}-${idx}`} className="w-full h-full shrink-0 snap-start relative">
                {isNear && (
                  <ReelItem 
                    item={item} 
                    isActive={idx === currentIndex} 
                    isMuted={isMuted} 
                    toggleMute={() => setIsMuted(!isMuted)}
                    onShare={() => onShare(item)}
                    onPrev={() => idx > 0 && scrollToIndex(idx - 1)}
                    onNext={() => idx < actualList.length - 1 && scrollToIndex(idx + 1)}
                    canPrev={idx > 0}
                    canNext={idx < actualList.length - 1}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReelItem({ item, isActive, isMuted, toggleMute, onShare, onPrev, onNext, canPrev, canNext }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(item.liked_by_me);
  const [likeCount, setLikeCount] = useState(item.like_count || 0);

  useEffect(() => {
    setLiked(item.liked_by_me);
    setLikeCount(item.like_count || 0);
  }, [item]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    } else {
      video.pause();
      setIsPlaying(false);
      video.currentTime = 0;
    }
  }, [isActive]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, togglePlay]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const originalLiked = liked;
    const originalCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);

    try {
      const type = item._type === 'story' ? 'story' : 'feed_item';
      const res = await fetch(`/api/social/content/${type}/${item.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        if (data.like_count !== undefined) {
          setLikeCount(data.like_count);
        }
      } else {
        setLiked(originalLiked);
        setLikeCount(originalCount);
      }
    } catch (err) {
      setLiked(originalLiked);
      setLikeCount(originalCount);
    }
  };

  const videoSrc = item.video_url || (item.mp4_key || item.primary_asset?.file_key ? `/api/storage/${item.mp4_key || item.primary_asset?.file_key}` : null);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white">
      {/* Video Player */}
      <div className="absolute inset-0 z-0 bg-black" onClick={togglePlay}>
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover cursor-pointer"
            playsInline
            loop
            muted={isMuted}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-800">
            <span className="text-4xl mb-4">🎬</span>
            <p className="text-slate-300 text-sm">Media unavailable</p>
          </div>
        )}
      </div>

      {/* Play/Pause Overlay Indicator */}
      {!isPlaying && videoSrc && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Play className="w-10 h-10 ml-1" />
          </div>
        </div>
      )}

      {/* Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20 pointer-events-auto">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
            <Heart className={`w-6 h-6 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
          </div>
          <span className="text-xs font-bold drop-shadow-md">{likeCount}</span>
        </button>
        
        <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold drop-shadow-md">Share</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </div>
        </button>

        {/* Navigation */}
        <div className="flex flex-col gap-2 mt-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onPrev(); }} 
            disabled={!canPrev}
            className="p-2 rounded-full bg-black/40 disabled:opacity-30 hover:bg-black/60 transition-colors"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            disabled={!canNext} 
            className="p-2 rounded-full bg-black/40 disabled:opacity-30 hover:bg-black/60 transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Info Area */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pt-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10">
        {item.source && (
          <div className="flex items-center gap-3 mb-3 pointer-events-auto">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-teal-400 p-[2px]">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-sm font-bold text-sky-700">
                {item.source.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <span className="font-bold drop-shadow-md">{item.source}</span>
          </div>
        )}
        
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
  );
}
