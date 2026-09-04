import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, UserCheck, Smartphone } from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const TouristAuth: React.FC = () => {
  const navigate = useNavigate();
  const { updateTouristProfile } = useSafety();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('Aarav Sharma');
  const [email, setEmail] = useState('aarav.sharma@safeyatra.in');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTouristProfile({
      name,
      email,
      phone
    });
    navigate('/tourist');
  };

  const loadPreset = (presetName: string, presetPhone: string, presetEmail: string) => {
    setName(presetName);
    setPhone(presetPhone);
    setEmail(presetEmail);
    updateTouristProfile({
      name: presetName,
      phone: presetPhone,
      email: presetEmail
    });
    navigate('/tourist');
  };

  return (
    <div className="flex flex-col w-full p-6 items-center justify-center min-h-[640px]">
      {/* Brand Icon */}
      <div className="w-14 h-14 rounded-2xl bg-[#0B3D62] text-white flex items-center justify-center mb-4 shadow-md">
        <ShieldCheck className="w-8 h-8 text-cyan-300" />
      </div>

      <h2 className="text-xl font-extrabold text-[#0B3D62]">
        SafeYatra Tourist Companion
      </h2>
      <p className="text-xs text-[#5C6B78] text-center max-w-xs mt-1">
        Fast-track onboarding so your SOS panic button and digital safety telemetry are active within seconds.
      </p>

      {/* Auth Mode Toggle */}
      <div className="w-full max-w-sm mt-6 p-1 rounded-xl bg-[#E8EDF2] flex items-center">
        <button
          type="button"
          onClick={() => setIsRegister(false)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            !isRegister ? 'bg-white text-[#0B3D62] shadow-sm' : 'text-[#5C6B78]'
          }`}
        >
          Quick Login
        </button>
        <button
          type="button"
          onClick={() => setIsRegister(true)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            isRegister ? 'bg-white text-[#0B3D62] shadow-sm' : 'text-[#5C6B78]'
          }`}
        >
          Express Signup
        </button>
      </div>

      {/* Form with Minimal Fields Upfront */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm mt-4 space-y-3">
        {isRegister && (
          <div>
            <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-medium focus:outline-none focus:border-[#1C7293]"
            />
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
            Mobile Number (for SMS distress)
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-medium focus:outline-none focus:border-[#1C7293]"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aarav@safeyatra.in"
            className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-medium focus:outline-none focus:border-[#1C7293]"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#5C6B78] uppercase block mb-1">
            Password / PIN
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-medium focus:outline-none focus:border-[#1C7293]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors flex items-center justify-center gap-2 mt-4"
        >
          <span>{isRegister ? 'Activate SafeYatra Companion' : 'Enter Safety Deck'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* One-Tap Demo Profiles */}
      <div className="w-full max-w-sm mt-6 pt-4 border-t border-[#E8EDF2]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B78] block mb-2 text-center">
          Instant Demo Presets
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => loadPreset('Aarav Sharma', '+91 98765 43210', 'aarav@safeyatra.in')}
            className="p-2 rounded-xl bg-white border border-[#D8E0E8] text-left hover:border-[#1C7293] transition-colors text-xs"
          >
            <span className="font-bold text-[#0B3D62] block">Aarav Sharma</span>
            <span className="text-[10px] text-[#5C6B78]">Solo Trekker (Standard)</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('Priya Sharma', '+91 98112 40912', 'priya@safeyatra.in')}
            className="p-2 rounded-xl bg-white border border-[#D8E0E8] text-left hover:border-[#1C7293] transition-colors text-xs"
          >
            <span className="font-bold text-[#D64545] block">Priya Sharma</span>
            <span className="text-[10px] text-[#5C6B78]">Active Distress Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
