import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ShieldAlert, QrCode, MapPin, Phone, User, CheckCircle2, Wifi, BatteryCharging } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useSafety } from '../../lib/safetyStore';

export const TouristLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTouristSos, tourist } = useSafety();
  const isNative = Capacitor.isNativePlatform();

  const navItems = [
    { label: 'Home', path: '/tourist', icon: Home },
    { label: 'Map', path: '/tourist/map', icon: MapPin },
    { 
      label: 'SOS Tracker', 
      path: '/tourist/sos', 
      icon: ShieldAlert, 
      badge: activeTouristSos ? 'LIVE' : undefined,
      color: activeTouristSos ? 'text-[#D64545]' : ''
    },
    { label: 'Digital ID', path: '/tourist/id', icon: QrCode },
    { label: 'Helplines', path: '/tourist/resources', icon: Phone },
    { label: 'Profile', path: '/tourist/profile', icon: User }
  ];

  const currentPath = location.pathname;

  // On Native Android device / Android Studio: Full native screen
  if (isNative) {
    return (
      <div className="w-full h-screen min-h-screen bg-white text-[#1A2530] flex flex-col relative overflow-hidden">
        {/* Dynamic Route Content filling device screen */}
        <div className="flex-1 flex flex-col overflow-y-auto pb-16">
          <Outlet />
        </div>

        {/* Persistent Bottom Mobile Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-[#E8EDF2] py-2 px-3 flex items-center justify-around z-30 select-none shadow-md">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/tourist' && currentPath.startsWith(item.path));
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
                  isActive
                    ? 'text-[#0B3D62] font-bold'
                    : 'text-[#5C6B78] hover:text-[#0B3D62]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${item.color || (isActive ? 'text-[#0B3D62]' : 'text-[#5C6B78]')}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-[#D64545] text-white text-[8px] font-black rounded-full animate-ping">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1C7293] mt-0.5" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#1A2530] flex flex-col items-center justify-start pb-20 pt-20 px-3 sm:px-4">
      {/* Container simulating a mobile phone viewport on desktop or fluid on mobile */}
      <div className="w-full max-w-[440px] bg-white rounded-[32px] sm:rounded-[40px] shadow-xl border border-[#D8E0E8] overflow-hidden flex flex-col relative min-h-[760px]">
        {/* Phone Top Status Bar */}
        <div className="w-full bg-[#0B3D62] text-white px-5 pt-3 pb-2 flex items-center justify-between text-xs font-semibold select-none">
          <span>09:41</span>
          <div className="w-24 h-4 bg-[#002743] rounded-full mx-auto hidden sm:block"></div>
          <div className="flex items-center gap-2 text-white/90">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">5G</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Dynamic Route Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Outlet />
        </div>

        {/* Persistent Bottom Mobile Navigation Bar */}
        <nav className="w-full bg-white border-t border-[#E8EDF2] py-2 px-3 flex items-center justify-around z-30 select-none shadow-sm">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/tourist' && currentPath.startsWith(item.path));
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
                  isActive
                    ? 'text-[#0B3D62] font-bold'
                    : 'text-[#5C6B78] hover:text-[#0B3D62]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${item.color || (isActive ? 'text-[#0B3D62]' : 'text-[#5C6B78]')}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-[#D64545] text-white text-[8px] font-black rounded-full animate-ping">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1C7293] mt-0.5" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Trust & Architecture Reassurance Footer */}
      <div className="w-full max-w-[440px] mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-[#5C6B78]">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#1C7293]" />
          ISRO NavIC Precision Geofencing
        </span>
        <span>•</span>
        <span>Offline SMS Distress Fallback</span>
      </div>
    </div>
  );
};
