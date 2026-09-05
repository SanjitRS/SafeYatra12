import React, { useState } from 'react';
import { ArrowLeft, User, Phone, HeartPulse, MapPin, Calendar, ChevronDown, ChevronUp, Save, Check, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSafety } from '../../lib/safetyStore';

export const ProfileSafetyInfo: React.FC = () => {
  const navigate = useNavigate();
  const { tourist, updateTouristProfile, logoutTourist } = useSafety();

  const [openCard, setOpenCard] = useState<'itinerary' | 'contact' | 'medical' | 'stay'>('contact');
  const [isSaved, setIsSaved] = useState(false);

  // Form states initialized with tourist data
  const [formData, setFormData] = useState({
    name: tourist.name,
    phone: tourist.phone,
    emergencyName: tourist.emergencyContact.name,
    emergencyPhone: tourist.emergencyContact.phone,
    emergencyRel: tourist.emergencyContact.relationship,
    bloodGroup: tourist.bloodGroup,
    medicalCondition: tourist.medicalConditions.join(', '),
    stayLocation: tourist.stayLocation,
    validUntil: tourist.validUntil
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTouristProfile({
      name: formData.name,
      phone: formData.phone,
      bloodGroup: formData.bloodGroup,
      medicalConditions: formData.medicalCondition.split(',').map(s => s.trim()),
      emergencyContact: {
        name: formData.emergencyName,
        phone: formData.emergencyPhone,
        relationship: formData.emergencyRel
      },
      stayLocation: formData.stayLocation,
      validUntil: formData.validUntil
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const toggle = (card: 'itinerary' | 'contact' | 'medical' | 'stay') => {
    setOpenCard(openCard === card ? ('' as unknown as typeof card) : card);
  };

  return (
    <div className="flex flex-col w-full p-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
        <button
          onClick={() => navigate('/tourist')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D62]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <span className="text-xs font-extrabold text-[#0B3D62] uppercase tracking-wider">
          Safety Profile & Contacts
        </span>
        <div className="w-4" />
      </div>

      <p className="text-xs text-[#5C6B78] mt-3 leading-relaxed">
        Responders only access this data when you trigger SOS or scan your pass at a checkpoint.
      </p>

      <form onSubmit={handleSave} className="mt-4 space-y-3">
        {/* Section 1: Emergency Contacts (Collapsible Card) */}
        <div className="bg-white rounded-2xl border border-[#D8E0E8] overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggle('contact')}
            className="w-full p-3.5 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1C7293]/15 flex items-center justify-center text-[#1C7293]">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1A2530]">Emergency Contacts</h4>
                <span className="text-[10px] text-[#5C6B78]">
                  Primary: {formData.emergencyName} ({formData.emergencyPhone})
                </span>
              </div>
            </div>
            {openCard === 'contact' ? (
              <ChevronUp className="w-4 h-4 text-[#5C6B78]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#5C6B78]" />
            )}
          </button>

          {openCard === 'contact' && (
            <div className="p-3.5 pt-0 border-t border-[#F4F7FA] space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Primary Contact Full Name & Relationship
                </label>
                <input
                  type="text"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#E8EDF2] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Emergency Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#E8EDF2] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Medical Info & Allergies (Collapsible Card) */}
        <div className="bg-white rounded-2xl border border-[#D8E0E8] overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggle('medical')}
            className="w-full p-3.5 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D64545]/15 flex items-center justify-center text-[#D64545]">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1A2530]">Medical & Blood Group</h4>
                <span className="text-[10px] text-[#5C6B78]">
                  Blood: {formData.bloodGroup} • {tourist.medicalConditions[0] || 'None'}
                </span>
              </div>
            </div>
            {openCard === 'medical' ? (
              <ChevronUp className="w-4 h-4 text-[#5C6B78]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#5C6B78]" />
            )}
          </button>

          {openCard === 'medical' && (
            <div className="p-3.5 pt-0 border-t border-[#F4F7FA] space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Blood Group
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#E8EDF2] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
                >
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Medical Conditions, Allergies & Critical Medications
                </label>
                <textarea
                  rows={2}
                  value={formData.medicalCondition}
                  onChange={(e) => setFormData({ ...formData, medicalCondition: e.target.value })}
                  placeholder="e.g. Mild Asthma (Inhaler user), Penicillin allergy, Diabetic..."
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#E8EDF2] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Itinerary & Local Stay (Collapsible Card) */}
        <div className="bg-white rounded-2xl border border-[#D8E0E8] overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => toggle('itinerary')}
            className="w-full p-3.5 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#3FA34D]/15 flex items-center justify-center text-[#3FA34D]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1A2530]">Stay & Trek Itinerary</h4>
                <span className="text-[10px] text-[#5C6B78]">
                  {formData.stayLocation}
                </span>
              </div>
            </div>
            {openCard === 'itinerary' ? (
              <ChevronUp className="w-4 h-4 text-[#5C6B78]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#5C6B78]" />
            )}
          </button>

          {openCard === 'itinerary' && (
            <div className="p-3.5 pt-0 border-t border-[#F4F7FA] space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Hotel / Homestay / Camp Registration
                </label>
                <input
                  type="text"
                  value={formData.stayLocation}
                  onChange={(e) => setFormData({ ...formData, stayLocation: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#E8EDF2] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Trip Validity End Date
                </label>
                <input
                  type="text"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#E8EDF2] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Changes Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-2xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors flex items-center justify-center gap-2 mt-4"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Safety Profile Updated & Synced!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Profile Updates</span>
            </>
          )}
        </button>

        {/* Switch Profile / Log Out Button */}
        <button
          type="button"
          onClick={() => {
            logoutTourist();
            navigate('/tourist/auth');
          }}
          className="w-full py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-[#D64545] border border-red-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 mt-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Switch Profile / Sign In with Another ID</span>
        </button>
      </form>
    </div>
  );
};
