"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play, ExternalLink } from 'lucide-react';
import { getMediaUrl } from '@/lib/media';

interface Slide {
  id: number;
  position: number;
  kind: 'text' | 'image' | 'video';
  title: string;
  body: string;
  asset_url?: string;
  file_key?: string;
  thumb_key?: string;
  alt_text?: string;
  duration_seconds: number;
}

interface Source {
  slide_id: number;
  label: string;
  source_url?: string;
  claim_text: string;
  span_text: string;
}

interface Story {
  id: number;
  title: string;
  summary: string;
  slides: Slide[];
  sources: Source[];
}

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
}

export function StoryViewer({ story, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const currentSlide = story.slides[currentIndex];
  const duration = currentSlide?.duration_seconds * 1000 || 5000;

  const handleNext = useCallback(() => {
    if (currentIndex < story.slides.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, story.slides.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === ' ') setIsPaused(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = 0;
      return;
    }

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      
      setProgress(prev => {
        const next = prev + (delta / duration) * 100;
        if (next >= 100) {
          handleNext();
          return 0;
        }
        return next;
      });
      lastTimeRef.current = time;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentIndex, duration, handleNext, isPaused]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    }
  }, [isPaused, currentIndex]);

  if (!currentSlide) return null;

  const currentSources = story.sources?.filter(s => s.slide_id === currentSlide.id) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[85vh] sm:rounded-3xl overflow-hidden bg-slate-900 flex flex-col shadow-2xl">
        
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex gap-1">
          {story.slides.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75"
                style={{ 
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Controls */}
        <div className="absolute top-6 left-0 right-0 p-4 z-20 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-fuchsia-600 p-[2px]">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold">
                NP
              </div>
            </div>
            <span className="font-semibold text-sm drop-shadow-md">{story.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPaused(!isPaused)} className="p-2 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors focus:outline-none focus:ring-2 focus:ring-white">
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors focus:outline-none focus:ring-2 focus:ring-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Interactions Areas (Prev/Next) */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-1/3 h-full cursor-pointer" onClick={() => setIsPaused(!isPaused)} />
          <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Media / Content */}
        <div className="flex-1 relative w-full h-full bg-slate-800">
          {currentSlide.kind === 'video' && (currentSlide.asset_url || currentSlide.file_key) ? (
            <video
              ref={videoRef}
              src={currentSlide.asset_url || getMediaUrl(currentSlide.file_key) || undefined}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              autoPlay
              loop
              muted={false}
            />
          ) : currentSlide.kind === 'image' && (currentSlide.asset_url || currentSlide.file_key) ? (
            <img
              src={currentSlide.asset_url || getMediaUrl(currentSlide.file_key) || undefined}
              alt={currentSlide.alt_text || currentSlide.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
              <div className="text-center text-white">
                <h2 className="text-3xl font-bold mb-4">{currentSlide.title}</h2>
              </div>
            </div>
          )}

          {/* Overlaid Gradient for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />

          {/* Text Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20 pointer-events-none text-white">
            {currentSlide.kind !== 'text' && currentSlide.title && (
              <h2 className="text-xl font-bold mb-2 drop-shadow-lg">{currentSlide.title}</h2>
            )}
            {currentSlide.body && (
              <p className="text-sm font-medium leading-relaxed drop-shadow-md text-slate-100 max-h-40 overflow-y-auto pointer-events-auto hide-scrollbar">
                {currentSlide.body}
              </p>
            )}
            
            {/* Citations */}
            {currentSources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20 pointer-events-auto">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Sources</p>
                <div className="flex flex-col gap-2">
                  {currentSources.map((source, i) => (
                    <a
                      key={i}
                      href={source.source_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-md transition-colors"
                      onClick={(e) => {
                        if (!source.source_url) e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <span className="truncate max-w-[200px]">{source.label || source.claim_text}</span>
                      {source.source_url && <ExternalLink className="w-3 h-3 shrink-0" />}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
