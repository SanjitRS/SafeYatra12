import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, PhoneCall, Radio, User, Activity } from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const GlobalHeader: React.FC = () => {
  const navigate = useNavigate();
  const { activeSosAlerts, authorityOfficer } = useSafety();

  const criticalCount = activeSosAlerts.filter(a => a.status === 'triggered').length;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-[#0B3D62] text-white shadow-md select-none border-b border-[#134B73]">
      <div className="w-full px-4 lg:px-6 h-full flex items-center justify-between gap-3">
        {/* Brand & Authority Designation */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/authority')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1C7293] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[17px] tracking-tight leading-tight flex items-center gap-1.5">
                SafeYatra
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D64545] font-semibold text-white uppercase tracking-wider">
                  Authority
                </span>
              </span>
              <span className="text-[10px] text-cyan-200 font-medium tracking-wide">
                Tactical Command & Dispatch Operations
              </span>
            </div>
          </button>

          {/* Telemetry Status Pills */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/15">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#002743]/60 text-[11px] font-medium text-cyan-200 border border-cyan-400/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Socket Live</span>
              <span className="text-white/50 text-[9px] font-mono">24ms</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#002743]/60 text-[11px] font-medium text-cyan-200 border border-cyan-400/20">
              <Radio className="w-3 h-3 text-cyan-300" />
              <span>ISRO NavIC / GPS Lock</span>
            </div>
          </div>
        </div>

        {/* Center Tactical Notice */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#002743]/80 border border-cyan-500/20 text-xs text-cyan-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-white">Emergency Response Radar Active</span>
          <span className="text-cyan-400 text-[11px]">| State Disaster Operations Grid</span>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2.5">
          {/* 112 Hotline */}
          <a
            href="tel:112"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D64545] text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>112 Direct</span>
          </a>

          {/* Notification Counter */}
          <div className="relative">
            <button 
              onClick={() => navigate('/authority/live-sos')}
              className="w-9 h-9 rounded-full bg-[#002743] hover:bg-[#1C7293] flex items-center justify-center text-white transition-colors"
              title="Active Alert Queue"
            >
              <Activity className="w-4 h-4 text-cyan-200" />
            </button>
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D64545] text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#0B3D62] animate-pulse">
                {criticalCount}
              </span>
            )}
          </div>

          <div className="h-6 w-px bg-white/20 hidden sm:block" />

          {/* Officer Info */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">
                {authorityOfficer.name}
              </span>
              <span className="text-[10px] text-cyan-200 font-mono">
                {authorityOfficer.callsign} • {authorityOfficer.station}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#002743] border border-cyan-400/40 flex items-center justify-center text-cyan-200 text-xs font-extrabold">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
