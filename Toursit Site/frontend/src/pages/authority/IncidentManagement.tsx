import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight, 
  X, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';
import { Incident } from '../../types';

export const IncidentManagement: React.FC = () => {
  const { incidents, updateIncidentStatus } = useSafety();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const filteredIncidents = incidents.filter(inc => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inc.title.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q) ||
        inc.location.address.toLowerCase().includes(q) ||
        inc.reportedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1400px] mx-auto w-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D8E0E8]">
        <div>
          <h1 className="text-xl font-extrabold text-[#0B3D62]">
            Incident Management Ledger
          </h1>
          <p className="text-xs text-[#5C6B78] mt-0.5">
            Field reports, hazard verifications, and cross-sector trail investigations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5C6B78]">Total Tracked:</span>
          <span className="px-2.5 py-1 rounded-full bg-[#0B3D62] text-white font-mono text-xs font-extrabold">
            {incidents.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#D8E0E8] shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-[#F4F7FA] px-3 py-2 rounded-xl border border-[#E8EDF2]">
          <Search className="w-4 h-4 text-[#5C6B78]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, location, description, or reporter..."
            className="w-full bg-transparent text-xs text-[#1A2530] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#5C6B78]">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 rounded-lg bg-[#F4F7FA] border border-[#E8EDF2] font-semibold text-xs text-[#1A2530]"
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="investigating">Investigating</option>
              <option value="dispatched">Dispatched</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#5C6B78]">
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="p-1.5 rounded-lg bg-[#F4F7FA] border border-[#E8EDF2] font-semibold text-xs text-[#1A2530]"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filterable Table */}
      <div className="bg-white rounded-3xl border border-[#D8E0E8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F7FA] border-b border-[#E8EDF2] text-[#5C6B78] uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-4">Incident Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Status</th>
                <th className="p-4">Location</th>
                <th className="p-4">Reported Time</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF2]">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`hover:bg-[#F4F7FA] transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#F4F7FA] font-medium' : ''
                    }`}
                  >
                    <td className="p-4">
                      <span className="font-extrabold text-[#1A2530] block">
                        {inc.title}
                      </span>
                      <span className="text-[10px] text-[#5C6B78]">
                        Reported by: {inc.reportedBy}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize font-semibold text-[#0B3D62] bg-[#E8EDF2] px-2 py-0.5 rounded-md">
                        {inc.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        inc.severity === 'high'
                          ? 'bg-[#D64545]/15 text-[#D64545]'
                          : inc.severity === 'medium'
                          ? 'bg-[#F2A541]/20 text-[#F2A541]'
                          : 'bg-[#3FA34D]/15 text-[#3FA34D]'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        inc.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : inc.status === 'dispatched'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="p-4 max-w-[200px] truncate text-[#5C6B78]">
                      {inc.location.address}
                    </td>
                    <td className="p-4 text-[#5C6B78]">
                      {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(inc);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#E8EDF2] hover:bg-[#0B3D62] hover:text-white text-[#0B3D62] text-[11px] font-bold transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Drawer / Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-[#0B3D62]/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-[#D8E0E8] animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#5C6B78] uppercase">
                    Incident #{selectedIncident.id}
                  </span>
                  <h3 className="text-base font-extrabold text-[#0B3D62]">
                    {selectedIncident.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="w-8 h-8 rounded-full hover:bg-[#F4F7FA] flex items-center justify-center text-[#5C6B78]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Severity Badges */}
              <div className="flex items-center gap-2 my-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                  selectedIncident.severity === 'high'
                    ? 'bg-[#D64545]/15 text-[#D64545]'
                    : 'bg-[#F2A541]/15 text-[#F2A541]'
                }`}>
                  {selectedIncident.severity} Severity
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#1C7293]/15 text-[#1C7293] text-xs font-bold capitalize">
                  {selectedIncident.status}
                </span>
                <span className="text-xs text-[#5C6B78] ml-auto">
                  {selectedIncident.location.sector}
                </span>
              </div>

              {/* Location datum */}
              <div className="bg-[#F4F7FA] p-3 rounded-2xl border border-[#E8EDF2] space-y-1 text-xs mb-4">
                <div className="flex items-center gap-2 text-[#0B3D62] font-bold">
                  <MapPin className="w-4 h-4 text-[#1C7293]" />
                  <span>{selectedIncident.location.address}</span>
                </div>
                <div className="text-[11px] text-[#5C6B78] font-mono">
                  Coordinates: {selectedIncident.location.lat.toFixed(4)}°N, {selectedIncident.location.lng.toFixed(4)}°E
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <span className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Field Description
                </span>
                <p className="text-xs text-[#1A2530] leading-relaxed bg-white p-3 rounded-xl border border-[#E8EDF2]">
                  {selectedIncident.description}
                </p>
              </div>

              {/* Field Media Photo if available */}
              {selectedIncident.imageUrl && (
                <div className="mb-4">
                  <span className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1.5 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-[#1C7293]" />
                    <span>Field Evidence Photo</span>
                  </span>
                  <div className="w-full h-44 rounded-2xl overflow-hidden border border-[#D8E0E8] shadow-sm">
                    <img
                      src={selectedIncident.imageUrl}
                      alt="Hazard media"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Status Update Control */}
              <div className="mt-4 pt-4 border-t border-[#E8EDF2]">
                <span className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-2">
                  Update Operational Status
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['reported', 'investigating', 'dispatched', 'resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        updateIncidentStatus(selectedIncident.id, st);
                        setSelectedIncident({ ...selectedIncident, status: st });
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-colors ${
                        selectedIncident.status === st
                          ? 'bg-[#0B3D62] text-white shadow-sm'
                          : 'bg-[#F4F7FA] text-[#5C6B78] hover:bg-[#E8EDF2]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8EDF2] flex gap-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="w-full py-2.5 rounded-xl bg-[#F4F7FA] text-[#5C6B78] text-xs font-bold hover:bg-[#E8EDF2]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
