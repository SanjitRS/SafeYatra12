import React, { useState } from 'react';
import { ArrowLeft, PhoneCall, ShieldCheck, HeartPulse, ShieldAlert, Mountain, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EMERGENCY_HELPLINES } from '../../lib/mockData';

export const SafetyResources: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openGuideline, setOpenGuideline] = useState<number | null>(0);

  const guidelines = [
    {
      title: 'National Emergency Response Protocol (Dial 112)',
      badge: 'ERSS India',
      steps: [
        'Dial 112 anywhere in India for unified Police, Fire, Ambulance, or Disaster dispatch.',
        'Stay on the line while the automated GIS dispatch locates your nearest response vehicle.',
        'Speak clearly and describe your landmark or share digital coordinates via SafeYatra.'
      ]
    },
    {
      title: 'Incredible India Tourist Support (Dial 1363)',
      badge: 'Tourism Desk',
      steps: [
        'Available 24x7 in 12 languages (Hindi, English, Spanish, French, German, Japanese, etc.).',
        'Provides emergency transit assistance, foreign tourist guidance, and local authority liaison.',
        'Can also be reached toll-free from any landline or mobile at 1800-11-1363.'
      ]
    },
    {
      title: 'Severe Weather & Disaster Protocol (Dial 1070)',
      badge: 'NDMA Control',
      steps: [
        'National Disaster Management Authority control room coordinates emergency rescue.',
        'Follow official alerts for cyclone warnings, cloudbursts, flash floods, or seismic activity.',
        'Move to designated cyclone/flood shelters and avoid low-lying bridges or dry stream beds.'
      ]
    }
  ];

  const filteredHelplines = selectedCategory === 'all'
    ? EMERGENCY_HELPLINES
    : EMERGENCY_HELPLINES.filter(h => h.category === selectedCategory);

  return (
    <div className="flex flex-col w-full p-4 pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
        <button
          onClick={() => navigate('/tourist')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D62]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <span className="text-xs font-extrabold text-[#0B3D62] uppercase tracking-wider">
          Emergency Helplines
        </span>
        <span className="text-[10px] font-bold text-[#3FA34D]">Govt. of India</span>
      </div>

      <div className="mt-3">
        <h3 className="text-base font-extrabold text-[#0B3D62]">
          Central Government Approved Helplines
        </h3>
        <p className="text-xs text-[#5C6B78] mt-0.5">
          Official Government of India national speed dials. Tap any number to call instantly (&lt; 3s).
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar">
        {[
          { id: 'all', label: 'All Helplines' },
          { id: 'national', label: 'National & Tourism' },
          { id: 'medical', label: 'Medical & Ambulance' },
          { id: 'women_safety', label: 'Women Safety' },
          { id: 'mountain_rescue', label: 'Disaster & Rescue' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === tab.id
                ? 'bg-[#0B3D62] text-white'
                : 'bg-white text-[#5C6B78] border border-[#E8EDF2] hover:bg-[#F4F7FA]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scannable Emergency Number Cards (3-second reachability) */}
      <div className="space-y-2.5 mt-1">
        {filteredHelplines.map((helpline) => (
          <div
            key={helpline.id}
            className="p-3.5 bg-white rounded-2xl border border-[#D8E0E8] shadow-sm flex items-center justify-between hover:border-[#1C7293] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#0B3D62]/10 flex items-center justify-center text-[#0B3D62] group-hover:bg-[#1C7293] group-hover:text-white transition-colors">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase text-[#1C7293] tracking-wide block">
                  {helpline.department}
                </span>
                <h4 className="text-xs font-bold text-[#1A2530] truncate mt-0.5">
                  {helpline.name}
                </h4>
                <span className="text-[10px] text-[#5C6B78] block">
                  {helpline.availability}
                </span>
              </div>
            </div>

            <a
              href={`tel:${helpline.number}`}
              className="ml-2 px-3 py-2 rounded-xl bg-[#0B3D62] text-white hover:bg-[#134B73] font-mono font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#F2A541]" />
              <span>{helpline.number}</span>
            </a>
          </div>
        ))}
      </div>

      {/* Scannable Alpine Survival Guidelines */}
      <div className="mt-6">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0B3D62] mb-2.5">
          Emergency Survival Guidelines
        </h4>

        <div className="space-y-2">
          {guidelines.map((guide, idx) => {
            const isOpen = openGuideline === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E8EDF2] overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenGuideline(isOpen ? null : idx)}
                  className="w-full p-3.5 flex items-center justify-between text-left"
                >
                  <div>
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-[#F2A541]/15 text-[#F2A541] mr-2">
                      {guide.badge}
                    </span>
                    <span className="text-xs font-bold text-[#1A2530]">{guide.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#5C6B78]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#5C6B78]" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-[#F4F7FA] text-xs text-[#5C6B78] space-y-1.5">
                    {guide.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#1C7293]/15 text-[#1C7293] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <p className="text-[11px] leading-relaxed text-[#1A2530]">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
