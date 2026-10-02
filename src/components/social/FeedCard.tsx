"use client";
import React, { useState } from 'react';
import { Heart, Share2, MessageCircle, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function FeedCard({ item, onLike, onShare, onStoryClick, onReelClick }: any) {
  const [liked, setLiked] = useState(item.liked_by_me);
  const [likeCount, setLikeCount] = useState(item.like_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    
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
    } catch (e) {
      console.error(e);
      setLiked(originalLiked);
      setLikeCount(originalCount);
    } finally {
      setIsLiking(false);
    }
  };

  const isStory = item._type === 'story';
  const isReel = item.kind === 'reel';
  const title = isStory ? item.title : (item.title || item.caption);
  const description = isStory ? item.summary : item.description;
  const media = isStory ? (item.slides?.[0]?.asset_url || '') : (item.primary_asset?.external_url || item.video_url || '');
  const author = item.source || 'NCPOR';

  const handleMediaClick = () => {
    if (isStory && onStoryClick) onStoryClick(item);
    else if (isReel && onReelClick) onReelClick(item);
  };

  return (
    <article className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
      {/* Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-teal-400 p-[2px]">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-sm font-bold text-sky-700">
              {author.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{item.source ? author : 'NCPOR'}</h3>
            <p className="text-xs text-slate-500">
              {new Date(item.published_at || item.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media */}
      {media && (
        <div 
          className={`relative w-full aspect-[4/5] bg-slate-100 overflow-hidden ${(isStory || isReel) ? 'cursor-pointer' : ''}`}
          onClick={handleMediaClick}
        >
          {item.video_url || item.mp4_key ? (
            <div className="relative w-full h-full">
              <video 
                src={item.video_url || `/api/storage/${item.mp4_key}`} 
                autoPlay 
                muted 
                loop 
                playsInline
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
              />
              {isReel && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img 
                src={media || `/api/storage/${item.primary_asset?.file_key}`} 
                alt={title} 
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
              />
              {isStory && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                  <div className="px-6 py-3 rounded-full bg-white/20 backdrop-blur-md text-white font-semibold text-sm shadow-lg">
                    Read Story
                  </div>
                </div>
              )}
            </div>
          )}
          {isStory && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow-lg">
              Story
            </div>
          )}
          {isReel && !isStory && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow-lg">
              Reel
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h2 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2">{title}</h2>
        {description && (
          <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {description}
          </p>
        )}
        
        {/* Hashtags */}
        {item.hashtags && item.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {item.hashtags.map((tag: string) => (
              <span key={tag} className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-md">
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 group/btn transition-colors ${liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
          >
            <Heart className={`w-6 h-6 transition-transform group-hover/btn:scale-110 ${liked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{likeCount}</span>
          </button>
          <button className="flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors group/btn">
            <MessageCircle className="w-6 h-6 transition-transform group-hover/btn:scale-110" />
            <span className="text-sm font-medium">Comment</span>
          </button>
          <button 
            onClick={() => onShare && onShare(item)}
            className="flex items-center gap-2 text-slate-500 hover:text-teal-500 transition-colors group/btn ml-auto"
          >
            <Share2 className="w-6 h-6 transition-transform group-hover/btn:-rotate-12" />
          </button>
        </div>
      </div>
    </article>
  );
}
