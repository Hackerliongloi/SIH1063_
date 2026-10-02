"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UserCircle2 } from 'lucide-react';

export default function UserProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/social/users/${username}`);
        if (res.ok) {
          setProfile(await res.json());
        } else {
          setError('Profile not found');
        }
      } catch (err) {
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-slate-50 flex justify-center">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mt-20"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="pt-32 min-h-screen bg-slate-50 flex justify-center">
        <div className="text-center text-slate-500 bg-white p-10 rounded-3xl border border-slate-100 shadow-sm max-w-sm w-full">
          <UserCircle2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-700">User Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">This account doesn't exist or has been deactivated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto px-4 pb-20">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-sky-400 to-teal-400"></div>
          
          <div className="relative pt-12 text-center">
            <div className="w-32 h-32 mx-auto rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-lg mb-4">
              {profile.avatar_asset_id ? (
                <img src={`/api/assets/${profile.avatar_asset_id}/media`} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-100 to-teal-100 text-sky-700 font-bold text-4xl">
                  {profile.display_name?.substring(0, 1).toUpperCase() || profile.username.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            
            <h1 className="text-3xl font-extrabold text-slate-800">{profile.display_name || profile.username}</h1>
            <p className="text-sky-600 font-medium mt-1">@{profile.username}</p>
            
            {profile.bio && (
              <p className="mt-6 text-slate-600 max-w-md mx-auto leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-slate-500 py-16 bg-white rounded-3xl border border-slate-100">
          <p className="text-lg font-medium text-slate-600">No public posts</p>
          <p className="text-sm mt-2">Public users are currently not able to create posts.</p>
        </div>
      </main>
    </div>
  );
}
