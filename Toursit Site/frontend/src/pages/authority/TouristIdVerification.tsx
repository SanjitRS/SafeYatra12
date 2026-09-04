import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  HeartPulse, 
  PhoneCall, 
  User, 
  QrCode,
  FileCheck
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const TouristIdVerification: React.FC = () => {
  const { tourist } = useSafety();
  const [tokenInput, setTokenInput] = useState('SY-99214-IN');
  const [verifiedRecord, setVerifiedRecord] = useState<any>({
    token: 'SY-99214-IN',
    name: 'Aarav Sharma',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    verificationStatus: 'GOVERNMENT VERIFIED PASS',
    permitType: 'Solo High-Altitude Trek Permit',
    bloodGroup: 'B+',
    emergencyContact: '+91 98765 43211 (Sister - Priya Sharma)',
    medicalConditions: ['Mild Asthma (Carry Salbutamol Inhaler)', 'Penicillin Allergy'],
    stayRegistered: 'Snow Crest Inn, Old Manali (Rm 204)',
    validUntil: '28 Oct 2025',
    verifiedTimestamp: '2025-10-24 07:15 IST by Checkpost 11'
  });

  const handleLookup = (tokenToSearch: string) => {
    if (tokenToSearch.includes('84920')) {
      setVerifiedRecord({
        token: 'SY-84920',
        name: 'Priya Sharma',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
        verificationStatus: 'GOVERNMENT VERIFIED PASS',
        permitType: 'Standard Valley Trekker',
        bloodGroup: 'B+',
        emergencyContact: '+91 98112 40912 (Spouse)',
        medicalConditions: ['Mild Asthma (Inhaler user)'],
        stayRegistered: 'Pine Crest Resort, Old Manali',
        validUntil: '28 Oct 2025',
        verifiedTimestamp: '2025-10-24 06:40 IST by Patrol Unit 4'
      });
    } else {
      setVerifiedRecord({
        token: tokenToSearch || 'SY-99214-IN',
        name: tourist.name,
        photoUrl: tourist.photoUrl,
        verificationStatus: 'GOVERNMENT VERIFIED PASS',
        permitType: 'Solo Mountain Explorer',
        bloodGroup: tourist.bloodGroup,
        emergencyContact: `${tourist.emergencyContact.phone} (${tourist.emergencyContact.name})`,
        medicalConditions: tourist.medicalConditions,
        stayRegistered: tourist.stayLocation,
        validUntil: tourist.validUntil,
        verifiedTimestamp: 'Just now by Field Officer'
      });
    }
  };

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1000px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D8E0E8]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1C7293]" />
            <h1 className="text-xl font-extrabold text-[#0B3D62]">
              Digital Tourist ID Verification
            </h1>
          </div>
          <p className="text-xs text-[#5C6B78] mt-0.5">
            Minimal-data field scanner for mountain checkpoints, rescue marshals, and local hospital triage
          </p>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-[#1C7293] bg-[#1C7293]/10 px-3 py-1 rounded-full">
          <Lock className="w-3.5 h-3.5" />
          <span>Privacy Enforced (Minimal Disclosure)</span>
        </div>
      </div>

      {/* Input Search Box */}
      <div className="bg-white p-5 rounded-3xl border border-[#D8E0E8] shadow-sm flex flex-col gap-3">
        <label className="text-xs font-bold text-[#1A2530] uppercase tracking-wider block">
          Scan QR or Input 8-Character Secure Pass Token
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#F4F7FA] px-3.5 py-2.5 rounded-2xl border border-[#D8E0E8]">
            <Search className="w-4 h-4 text-[#5C6B78]" />
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. SY-99214-IN, SY-84920"
              className="w-full bg-transparent font-mono font-bold text-xs text-[#1A2530] focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleLookup(tokenInput)}
            className="px-6 py-2.5 rounded-2xl bg-[#0B3D62] hover:bg-[#134B73] text-white text-xs font-bold transition-colors shadow-sm"
          >
            Verify Pass
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-2 pt-1 text-xs text-[#5C6B78]">
          <span>Quick Samples:</span>
          <button
            onClick={() => {
              setTokenInput('SY-99214-IN');
              handleLookup('SY-99214-IN');
            }}
            className="text-xs font-mono font-bold text-[#1C7293] hover:underline"
          >
            SY-99214-IN (Aarav)
          </button>
          <span>•</span>
          <button
            onClick={() => {
              setTokenInput('SY-84920');
              handleLookup('SY-84920');
            }}
            className="text-xs font-mono font-bold text-[#D64545] hover:underline"
          >
            SY-84920 (Priya - SOS active)
          </button>
        </div>
      </div>

      {/* Verified Minimal Safety Record Card */}
      {verifiedRecord && (
        <div className="bg-white rounded-3xl border-2 border-[#0B3D62] shadow-md overflow-hidden">
          {/* Top Verification Header Strip */}
          <div className="bg-[#0B3D62] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest block text-emerald-300">
                  {verifiedRecord.verificationStatus}
                </span>
                <span className="text-xs text-cyan-100">
                  Himachal Tourism Protection Grid
                </span>
              </div>
            </div>
            <span className="font-mono font-extrabold text-sm text-[#F2A541] bg-[#002743] px-3 py-1 rounded-xl">
              {verifiedRecord.token}
            </span>
          </div>

          {/* Body Content */}
          <div className="p-6 flex flex-col md:flex-row gap-6">
            {/* Photo */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-32 h-32 rounded-2xl overflow-hidden border border-[#D8E0E8] shadow-sm bg-gray-100">
                <img
                  src={verifiedRecord.photoUrl}
                  alt={verifiedRecord.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-mono text-[#5C6B78]">
                ID Match Confirmed
              </span>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-extrabold text-[#0B3D62]">
                  {verifiedRecord.name}
                </h3>
                <span className="text-xs font-semibold text-[#1C7293]">
                  {verifiedRecord.permitType}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-[#F4F7FA] p-3 rounded-2xl border border-[#E8EDF2]">
                  <span className="text-[10px] font-bold uppercase text-[#5C6B78] block">
                    Blood Group
                  </span>
                  <span className="text-sm font-black text-[#D64545]">
                    {verifiedRecord.bloodGroup}
                  </span>
                </div>

                <div className="bg-[#F4F7FA] p-3 rounded-2xl border border-[#E8EDF2]">
                  <span className="text-[10px] font-bold uppercase text-[#5C6B78] block">
                    Emergency Contact
                  </span>
                  <span className="text-xs font-bold text-[#0B3D62]">
                    {verifiedRecord.emergencyContact}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200 text-xs">
                <span className="text-[10px] font-bold uppercase text-[#B45309] block mb-0.5">
                  Critical Medical Alerts
                </span>
                <ul className="list-disc list-inside font-bold text-[#1A2530] space-y-0.5">
                  {verifiedRecord.medicalConditions.map((m: string, idx: number) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-[#5C6B78] pt-2 border-t border-[#E8EDF2]">
                <span>Registered Lodging: <strong>{verifiedRecord.stayRegistered}</strong></span>
                <span className="font-bold text-[#3FA34D]">Valid until {verifiedRecord.validUntil}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
