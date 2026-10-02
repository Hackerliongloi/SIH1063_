"use client";
import React, { useState } from 'react';
import { X, Search, Send, CheckCircle2 } from 'lucide-react';

export function ShareDialog({ item, onClose }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<Set<string>>(new Set());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/social/users?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShare = async (username: string) => {
    try {
      const type = item._type === 'story' ? 'story_id' : 'feed_item_id';
      const res = await fetch('/api/social/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_username: username,
          [type]: item.id
        })
      });
      if (res.ok) {
        setSharedUsers(prev => new Set(prev).add(username));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">Share</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSearch} className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 transition-shadow text-slate-800"
            />
            <button type="submit" className="hidden">Search</button>
          </form>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {isSearching ? (
              <div className="text-center text-slate-500 py-4">Searching...</div>
            ) : results.length === 0 ? (
              <div className="text-center text-slate-500 py-4">Search to find users</div>
            ) : (
              results.map((user: any) => {
                const isShared = sharedUsers.has(user.username);
                return (
                  <div key={user.username} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
                        {user.display_name?.substring(0,2).toUpperCase() || user.username.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{user.display_name}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => !isShared && handleShare(user.username)}
                      disabled={isShared}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                        isShared 
                          ? 'bg-teal-50 text-teal-600 cursor-default' 
                          : 'bg-sky-500 hover:bg-sky-600 text-white shadow-md hover:shadow-lg shadow-sky-500/20'
                      }`}
                    >
                      {isShared ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Sent
                        </>
                      ) : (
                        <>
                          Send <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
