import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Key, Lock, ArrowRight, Compass } from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const AuthorityAuth: React.FC = () => {
  const navigate = useNavigate();
  const { authorityOfficer } = useSafety();

  const [badgeId, setBadgeId] = useState(authorityOfficer.badgeId);
  const [passkey, setPasskey] = useState('••••••••');
  const [station, setStation] = useState(authorityOfficer.station);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/authority');
  };

  const handleQuickLogin = (badge: string, sta: string) => {
    setBadgeId(badge);
    setStation(sta);
    navigate('/authority');
  };

  return (
    <div className="min-h-screen bg-[#002743] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#D8E0E8]">
        {/* Emblem / Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0B3D62] text-white flex items-center justify-center mb-3 shadow-md">
            <Compass className="w-9 h-9 text-[#F2A541]" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1C7293]">
            State Disaster Management & Police Grid
          </span>
          <h2 className="text-xl font-extrabold text-[#0B3D62] mt-0.5">
            SafeYatra Command Console
          </h2>
          <p className="text-xs text-[#5C6B78] mt-1">
            Restricted to authorized dispatchers, rangers, and medical emergency teams
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#5C6B78] uppercase block mb-1">
              Officer Badge ID
            </label>
            <div className="flex items-center gap-2 bg-[#F4F7FA] border border-[#D8E0E8] rounded-xl p-2.5">
              <ShieldAlert className="w-4 h-4 text-[#0B3D62]" />
              <input
                type="text"
                required
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="e.g. HP-POL-7729"
                className="w-full bg-transparent font-mono font-bold text-xs text-[#1A2530] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#5C6B78] uppercase block mb-1">
              Assigned Watch Station
            </label>
            <input
              type="text"
              required
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-medium focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#5C6B78] uppercase block mb-1">
              Command Cryptographic Passkey
            </label>
            <div className="flex items-center gap-2 bg-[#F4F7FA] border border-[#D8E0E8] rounded-xl p-2.5">
              <Lock className="w-4 h-4 text-[#0B3D62]" />
              <input
                type="password"
                required
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-xs text-[#1A2530] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Authenticate into Tactical Grid</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-4 border-t border-[#E8EDF2]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B78] block mb-2 text-center">
            One-Click Test Dispatcher Credentials
          </span>
          <div className="space-y-1.5">
            <button
              onClick={() => handleQuickLogin('HP-POL-7729', 'Manali District Emergency Command HQ')}
              className="w-full p-2 rounded-xl bg-[#F4F7FA] hover:bg-[#E8EDF2] border border-[#E8EDF2] text-left transition-colors text-xs flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-[#0B3D62] block">Insp. Rajesh Thakur</span>
                <span className="text-[10px] text-[#5C6B78]">Badge #HP-POL-7729 • Manali HQ</span>
              </div>
              <span className="text-[10px] font-extrabold text-[#1C7293]">Enter →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
