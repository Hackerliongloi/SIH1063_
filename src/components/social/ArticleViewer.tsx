"use client";
import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, BookOpen } from 'lucide-react';

interface Source {
  asset_id: number;
  label: string;
  url?: string;
  claim_text: string;
  span_text: string;
}

interface Article {
  id: number;
  title: string;
  body_md: string;
  sources?: Source[];
}

interface ArticleViewerProps {
  article: Article;
  onClose: () => void;
}

export function ArticleViewer({ article, onClose }: ArticleViewerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 md:p-12">
      <div className="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{article.title}</h2>
              <p className="text-xs text-slate-500 font-medium">Article</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 shrink-0"
            aria-label="Close article"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 hide-scrollbar bg-slate-50/50">
          <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {article.title}
            </h1>
            
            <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-sky-600">
              {/* Very basic Markdown parser for paragraphs. In production, use react-markdown */}
              {article.body_md?.split('\n\n').map((paragraph, idx) => {
                if (!paragraph.trim()) return null;
                // Basic header handling
                if (paragraph.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold mt-8 mb-4">{paragraph.slice(2)}</h1>;
                if (paragraph.startsWith('## ')) return <h2 key={idx} className="text-2xl font-bold mt-8 mb-4">{paragraph.slice(3)}</h2>;
                if (paragraph.startsWith('### ')) return <h3 key={idx} className="text-xl font-bold mt-6 mb-3">{paragraph.slice(4)}</h3>;
                
                return (
                  <p key={idx} className="mb-4 text-slate-700 leading-relaxed">
                    {paragraph.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < paragraph.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                );
              })}
            </div>

            {/* Citations/Sources */}
            {article.sources && article.sources.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  Sources & Citations
                </h3>
                <div className="space-y-4">
                  {article.sources.map((source, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 mb-1">
                            {source.label || `Asset #${source.asset_id}`}
                          </p>
                          {source.claim_text && (
                            <p className="text-sm text-slate-600 mb-2 italic">
                              "{source.claim_text}"
                            </p>
                          )}
                          {source.span_text && (
                            <p className="text-xs text-slate-500 border-l-2 border-sky-300 pl-3">
                              Supporting text: {source.span_text}
                            </p>
                          )}
                        </div>
                        {source.url && (
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Source
                          </a>
                        )}
                      </div>
                    </div>
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
