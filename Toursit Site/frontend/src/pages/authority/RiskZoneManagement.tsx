import React, { useState } from 'react';
import { 
  Map, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Layers,
  Trash2
} from 'lucide-react';
import { TacticalMap } from '../../components/common/TacticalMap';
import { useSafety } from '../../lib/safetyStore';
import { RiskZone } from '../../types';

export const RiskZoneManagement: React.FC = () => {
  const { riskZones, verifyRiskZone, addRiskZone } = useSafety();

  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'verified'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);

  // Form for new zone
  const [newZoneName, setNewZoneName] = useState('Jogini Upper Gully C');
  const [newCategory, setNewCategory] = useState<'landslide' | 'flood' | 'ravine' | 'safe_corridor'>('landslide');
  const [newRiskLevel, setNewRiskLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [newAdvisory, setNewAdvisory] = useState('Active scree fall observed by trail runners');

  const filteredZones = riskZones.filter(zone => {
    if (activeTab === 'ai') return zone.isAiSuggested && !zone.isVerified;
    if (activeTab === 'verified') return zone.isVerified;
    return true;
  });

  const handleCreateZone = (e: React.FormEvent) => {
    e.preventDefault();
    const mockCoordinates: [number, number][] = [
      [32.2410, 77.1720],
      [32.2470, 77.1750],
      [32.2450, 77.1810],
      [32.2390, 77.1780]
    ];

    addRiskZone({
      name: newZoneName,
      category: newCategory,
      riskLevel: newRiskLevel,
      coordinates: mockCoordinates,
      advisoryText: newAdvisory,
      isAiSuggested: false,
      isVerified: true
    });

    setShowAddModal(false);
  };

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1720px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D8E0E8]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0B3D62]" />
            <h1 className="text-xl font-extrabold text-[#0B3D62]">
              Geofence & GIS Risk Zone Editor
            </h1>
          </div>
          <p className="text-xs text-[#5C6B78] mt-0.5">
            Audit AI satellite hazard suggestions, adjust polygon coordinates, and enforce boundary alerts
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-[#0B3D62] text-white hover:bg-[#134B73] text-xs font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Draw New Geofence Zone</span>
        </button>
      </div>

      {/* Main Grid: Map on Left (7 cols) + Zones Ledger on Right (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Map View */}
        <div className="xl:col-span-7 bg-white rounded-3xl p-5 border border-[#D8E0E8] shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-[#0B3D62]">
              Tactical Polygon Projection
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border-2 border-[#D64545] bg-[#D64545]/30" />
                <span>Verified Geofence</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded border-2 border-dashed border-[#F2A541] bg-[#F2A541]/30" />
                <span>AI Suggested (Hatched)</span>
              </span>
            </div>
          </div>

          <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#D8E0E8]">
            <TacticalMap
              center={[32.2472, 77.1852]}
              zoom={13}
              riskZones={riskZones}
              filterMode="hazards"
              className="w-full h-full"
            />
          </div>

          <p className="text-[11px] text-[#5C6B78] italic">
            * Dashed boundaries represent AI-inferred soil saturation risks detected via satellite radar. Officers must verify field conditions before upgrading to active warning broadcast.
          </p>
        </div>

        {/* Zones Management List */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 border border-[#D8E0E8] shadow-sm flex flex-col gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E8EDF2]">
              <span className="text-sm font-extrabold text-[#0B3D62]">
                Monitored Geofences ({filteredZones.length})
              </span>

              <div className="flex items-center gap-1 bg-[#F4F7FA] p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'all'
                      ? 'bg-[#0B3D62] text-white shadow-sm'
                      : 'text-[#5C6B78]'
                  }`}
                >
                  All ({riskZones.length})
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeTab === 'ai'
                      ? 'bg-[#F2A541] text-[#0B3D62] shadow-sm'
                      : 'text-[#5C6B78]'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Pending</span>
                </button>
                <button
                  onClick={() => setActiveTab('verified')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'verified'
                      ? 'bg-[#1C7293] text-white shadow-sm'
                      : 'text-[#5C6B78]'
                  }`}
                >
                  Verified
                </button>
              </div>
            </div>

            {/* Zone Cards */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredZones.map((zone) => {
                const isAi = zone.isAiSuggested && !zone.isVerified;
                const isHigh = zone.riskLevel === 'high';

                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isAi
                        ? 'border-dashed border-[#F2A541] bg-amber-50/30'
                        : isHigh
                        ? 'border-[#D64545]/40 bg-white'
                        : 'border-[#D8E0E8] bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[#1A2530]">
                            {zone.name}
                          </h4>
                          {isAi && (
                            <span className="px-2 py-0.5 rounded-full bg-[#F2A541]/20 text-[#0B3D62] text-[10px] font-extrabold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#F2A541]" />
                              AI SATELLITE RADAR
                            </span>
                          )}
                          {zone.isVerified && (
                            <span className="px-2 py-0.5 rounded-full bg-[#3FA34D]/15 text-[#3FA34D] text-[10px] font-bold">
                              Verified
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#5C6B78] capitalize block mt-0.5">
                          Category: {zone.category.replace('_', ' ')} • Level: <strong className={isHigh ? 'text-[#D64545]' : 'text-[#F2A541]'}>{zone.riskLevel.toUpperCase()}</strong>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#5C6B78] mt-2 leading-relaxed">
                      {zone.advisoryText}
                    </p>

                    {isAi && (
                      <div className="mt-3 pt-2.5 border-t border-amber-200 flex items-center justify-between">
                        <span className="text-[11px] text-[#5C6B78]">
                          Confidence Score: <strong>91.4%</strong>
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              verifyRiskZone(zone.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verify & Enforce</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Draw New Geofence Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0B3D62]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border border-[#D8E0E8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
              <h3 className="text-base font-bold text-[#0B3D62]">
                Create New Geofence Polygon
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#5C6B78]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateZone} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Zone Identifier / Sector Name
                </label>
                <input
                  type="text"
                  required
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] font-bold text-xs"
                  >
                    <option value="landslide">Landslide Prone</option>
                    <option value="ravine">Unmarked Ravine</option>
                    <option value="flood">Flash Flood Basin</option>
                    <option value="safe_corridor">Safe Corridor</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                    Risk Level
                  </label>
                  <select
                    value={newRiskLevel}
                    onChange={(e) => setNewRiskLevel(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] font-bold text-xs"
                  >
                    <option value="high">High Risk (Red)</option>
                    <option value="medium">Medium Risk (Amber)</option>
                    <option value="low">Low Risk (Green)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Automatic Audio Advisory for Breaching Tourists
                </label>
                <textarea
                  rows={2}
                  value={newAdvisory}
                  onChange={(e) => setNewAdvisory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F4F7FA] text-[#5C6B78] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0B3D62] text-white font-bold hover:bg-[#134B73]"
                >
                  Save & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
