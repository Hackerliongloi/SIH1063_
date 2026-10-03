"use client";
import React from 'react';

export function StoryTray({ stories, onStoryClick }: any) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 py-4 mb-4 overflow-hidden">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
          Active Stories
        </h2>
        <div className="flex gap-5 overflow-x-auto pb-2 pt-1 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {stories.map((story: any) => (
            <button
              key={story.id}
              onClick={() => onStoryClick && onStoryClick(story)}
              className="flex flex-col items-center gap-2 snap-center group focus:outline-none shrink-0"
            >
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[3px] group-hover:scale-105 transition-transform duration-300 shadow-md">
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-slate-100">
                  {story.slides?.[0]?.asset_url || story.slides?.[0]?.thumb_key ? (
                    <img 
                      src={story.slides[0].asset_url || `/api/storage/${story.slides[0].thumb_key || story.slides[0].file_key}`} 
                      alt={story.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-rose-500 font-bold text-xl">
                      {story.title.substring(0, 1)}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-slate-700 truncate w-24 text-center group-hover:text-slate-900">
                {story.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
