import React, { Suspense } from 'react';
import { CommunityFeed } from '@/components/social/CommunityFeed';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Feed | NPDC',
  description: 'Explore the latest stories, posts, and reels from the polar scientific community.',
};

export default function CommunityPage() {
  return (
    <div className="pt-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Community</h1>
        <p className="text-slate-500 mt-1">Discover updates from our expeditions and researchers</p>
      </div>
      <Suspense fallback={<div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <CommunityFeed />
      </Suspense>
    </div>
  );
}
