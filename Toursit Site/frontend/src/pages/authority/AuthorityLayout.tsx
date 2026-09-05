import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  Map, 
  Users, 
  ShieldCheck, 
  Radio
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const AuthorityLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSosAlerts, incidents, authorityOfficer } = useSafety();

  const activeSosCount = activeSosAlerts.filter(a => a.status !== 'resolved' && a.status !== 'cancelled').length;
  const currentPath = location.pathname;

  const navItems = [
    {
      label: 'Telemetry Overview',
      path: '/authority',
      icon: Activity,
      exact: true
    },
    {
      label: 'SOS Dispatch Queue',
      path: '/authority/live-sos',
      icon: AlertTriangle,
      badge: activeSosCount > 0 ? `${activeSosCount} Live` : undefined,
      badgeColor: 'bg-[#D64545] text-white'
    },
    {
      label: 'Incident Ledger',
      path: '/authority/incidents',
      icon: Users,
      badge: `${incidents.length}`
    },
    {
      label: 'Geofence & GIS',
      path: '/authority/zones',
      icon: Map
    },
    {
      label: 'Digital ID Verification',
      path: '/authority/verify-id',
      icon: ShieldCheck
    }
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#1A2530] pt-16 flex">
      {/* Left Operational Sidebar Navigation (Sleek Interface Deep Navy Chrome) */}
      <aside className="w-60 bg-[#0B3D62] flex-col justify-between hidden lg:flex fixed left-0 top-16 bottom-0 z-30 select-none py-6 px-4 text-white shrink-0 shadow-lg">
        <div className="flex flex-col gap-6 overflow-y-auto">
          {/* Logo & Section Title */}
          <div>
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-9 h-9 bg-[#1C7293] rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white leading-tight">SafeYatra</h1>
                <p className="text-[10px] text-cyan-200 font-medium tracking-wide">Command Center</p>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-[#1C7293] font-bold mb-2 px-2">
              Navigation
            </p>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = item.exact 
                  ? currentPath === item.path 
                  : currentPath.startsWith(item.path);
                const Icon = item.icon;

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all text-left ${
                      isActive
                        ? 'bg-[#1C7293]/30 font-medium text-white border-l-4 border-[#F2A541] shadow-sm'
                        : 'opacity-60 hover:opacity-100 text-white transition-opacity'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isActive && activeSosCount > 0 && item.path === '/authority/live-sos' ? (
                        <div className="w-2 h-2 rounded-full bg-[#D64545] animate-pulse shrink-0" />
                      ) : (
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F2A541]' : 'text-current'}`} />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${item.badgeColor || 'bg-white/20 text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tactical Dispatch & Telemetry Status */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-2 px-2">
              Dispatch Telemetry
            </p>
            <div className="p-3 rounded-xl bg-[#002743]/80 border border-cyan-500/20 text-xs space-y-2">
              <div className="flex items-center justify-between text-cyan-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  NavIC Satellites
                </span>
                <span className="font-mono text-emerald-400 font-bold">L5/S Lock</span>
              </div>
              <div className="flex items-center justify-between text-cyan-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Emergency Grid
                </span>
                <span className="font-mono text-white text-[11px]">112 / 100 Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Officer Account Card (from Sleek Interface design) */}
        <div className="bg-[#1C7293]/20 p-4 rounded-xl border border-white/10 mt-4">
          <p className="text-[10px] uppercase tracking-widest text-[#1C7293] font-bold mb-1">
            Officer Account
          </p>
          <p className="text-sm font-semibold text-white truncate">{authorityOfficer.name}</p>
          <p className="text-xs opacity-60 text-cyan-200 truncate">{authorityOfficer.station}</p>
        </div>
      </aside>

      {/* Main Command Canvas */}
      <main className="flex-1 lg:pl-60 flex flex-col w-full overflow-x-hidden min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  );
};
