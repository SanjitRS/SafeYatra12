import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ArrowLeft, Download, Share2, CheckCircle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSafety } from '../../lib/safetyStore';

export const DigitalTouristId: React.FC = () => {
  const navigate = useNavigate();
  const { tourist } = useSafety();

  return (
    <div className="flex flex-col w-full p-4 min-h-[640px]">
      {/* Top Bar with Minimal Chrome */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
        <button
          onClick={() => navigate('/tourist')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D62] hover:text-[#1C7293]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#1C7293]" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B3D62]">
            Verified Pass
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#3FA34D]/15 text-[#3FA34D] text-[10px] font-extrabold uppercase">
          Active
        </span>
      </div>

      {/* Main High-Contrast Pass Card */}
      <div className="bg-white rounded-3xl p-5 border-2 border-[#0B3D62] shadow-lg mt-3 flex flex-col items-center relative overflow-hidden">
        {/* Pass Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0B3D62] block">
              Govt. of India • SafeYatra Grid
            </span>
            <span className="text-[11px] font-bold text-[#5C6B78]">
              Himachal Tourism Protection Pass
            </span>
          </div>
          <span className="text-xs font-mono font-extrabold text-[#0B3D62] bg-[#F4F7FA] px-2 py-1 rounded-lg">
            {tourist.id}
          </span>
        </div>

        {/* Tourist Photo & Primary Details */}
        <div className="w-full flex items-center gap-4 my-4">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#E8EDF2] border border-[#0B3D62]/20 shrink-0 shadow-sm">
            <img
              src={tourist.photoUrl}
              alt={tourist.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-[#0B3D62] truncate">
              {tourist.name}
            </h3>
            <span className="text-xs text-[#5C6B78] block">
              {tourist.nationality} • Age {tourist.age}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#D64545]/15 text-[#D64545] text-[10px] font-bold">
                Blood: {tourist.bloodGroup}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#1C7293]/15 text-[#1C7293] text-[10px] font-bold">
                Solo Permit
              </span>
            </div>
          </div>
        </div>

        {/* Crisp Large QR Code Container for Rapid Glance Officer Scan */}
        <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-[#0B3D62]/30 shadow-inner flex flex-col items-center justify-center my-2 w-full max-w-[260px]">
          <QRCodeSVG
            value={tourist.qrPayload}
            size={200}
            level="H"
            includeMargin={true}
            fgColor="#0B3D62"
            bgColor="#FFFFFF"
          />
          <div className="mt-2 text-center">
            <span className="text-[10px] font-mono font-bold text-[#5C6B78] tracking-widest uppercase">
              SCAN TO VERIFY TELEMETRY
            </span>
          </div>
        </div>

        {/* Safety-Critical Information Ledger */}
        <div className="w-full mt-3 pt-3 border-t border-[#E8EDF2] space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#5C6B78]">Emergency Contact:</span>
            <span className="font-bold text-[#0B3D62]">{tourist.emergencyContact.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#5C6B78]">Medical Flag:</span>
            <span className="font-bold text-[#D64545]">
              {tourist.medicalConditions[0] || 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#5C6B78]">Validity:</span>
            <span className="font-bold text-[#3FA34D]">Valid until {tourist.validUntil}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#5C6B78]">Registered Stay:</span>
            <span className="font-bold text-[#1A2530] truncate max-w-[180px]">
              {tourist.stayLocation}
            </span>
          </div>
        </div>
      </div>

      {/* Offline Verification Notice */}
      <div className="mt-4 p-3 rounded-2xl bg-[#1C7293]/10 border border-[#1C7293]/20 flex items-start gap-2.5">
        <CheckCircle className="w-4 h-4 text-[#1C7293] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#0B3D62] leading-tight">
          <strong>Cryptographically Signed:</strong> Authorities and mountain checkposts can scan and verify this pass without active cellular connectivity using their SafeYatra handheld reader.
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button 
          onClick={() => alert('Digital Pass saved to offline secure storage.')}
          className="flex-1 py-2.5 rounded-xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors flex items-center justify-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Save Offline Pass</span>
        </button>
        <button 
          onClick={() => alert(`Shareable verification link copied: https://safeyatra.in/verify/${tourist.id}`)}
          className="px-4 py-2.5 rounded-xl bg-white border border-[#D8E0E8] text-[#0B3D62] text-xs font-bold hover:bg-[#F4F7FA] transition-colors flex items-center justify-center"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
