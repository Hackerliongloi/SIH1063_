"use client";
import React, { useState } from 'react';
import { Heart, Share2, MessageCircle, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function FeedCard({ item, onLike, onShare }: any) {
  const [liked, setLiked] = useState(item.liked_by_me);
  const [likeCount, setLikeCount] = useState(item.like_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const type = item._type === 'story' ? 'story' : 'feed_item';
      const res = await fetch(`/api/social/content/${type}/${item.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        if (data.liked) setLikeCount((prev: number) => prev + 1);
        else setLikeCount((prev: number) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLiking(false);
    }
  };

  const isStory = item._type === 'story';
  const title = isStory ? item.title : (item.title || item.caption);
  const description = isStory ? item.summary : item.description;
  const media = isStory ? (item.slides?.[0]?.asset_url || '') : (item.primary_asset?.external_url || item.video_url || '');
  const author = item.source || 'Editorial Team';

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
            <h3 className="font-semibold text-slate-800 text-sm">{author}</h3>
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
        <div className="relative w-full aspect-[4/5] bg-slate-100 overflow-hidden">
          {item.video_url || item.mp4_key ? (
            <video 
              src={item.video_url || `/api/storage/${item.mp4_key}`} 
              autoPlay 
              muted 
              loop 
              playsInline
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <img 
              src={media || `/api/storage/${item.primary_asset?.file_key}`} 
              alt={title} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
            />
          )}
          {isStory && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-semibold uppercase tracking-wider border border-white/30 shadow-lg">
              Story
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
