import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  Volume2, 
  XCircle, 
  Radio, 
  PhoneCall, 
  AlertCircle,
  ArrowLeft,
  VolumeX
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const SosFlow: React.FC = () => {
  const navigate = useNavigate();
  const { 
    activeTouristSos, 
    triggerTouristSos, 
    cancelTouristSos, 
    tourist,
    playEmergencyChime 
  } = useSafety();

  const [confirmingSend, setConfirmingSend] = useState(false);
  const [beaconActive, setBeaconActive] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPin, setCancelPin] = useState('');
  const [cancelReason, setCancelReason] = useState('Accidental button press');
  const [pinError, setPinError] = useState(false);

  // Auto-send if tourist navigated here without active SOS
  useEffect(() => {
    if (!activeTouristSos && !confirmingSend) {
      setConfirmingSend(true);
      const timer = setTimeout(() => {
        triggerTouristSos('High-Priority Distress Beacon Triggered');
        setConfirmingSend(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeTouristSos, confirmingSend, triggerTouristSos]);

  // Handle beacon sound loop simulation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (beaconActive) {
      playEmergencyChime();
      interval = setInterval(() => {
        playEmergencyChime();
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [beaconActive, playEmergencyChime]);

  const handleCancelSubmit = () => {
    if (cancelPin === '1234' || cancelPin.length === 4) {
      if (activeTouristSos) {
        cancelTouristSos(activeTouristSos.id, cancelReason);
      }
      setShowCancelModal(false);
      navigate('/tourist');
    } else {
      setPinError(true);
    }
  };

  // State 1: Short, calm initial sending state
  if (confirmingSend || !activeTouristSos) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[580px] text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-[#D64545]/20 animate-ping absolute inset-0" />
          <div className="w-24 h-24 rounded-full bg-[#0B3D62] flex items-center justify-center text-white relative shadow-xl">
            <Radio className="w-10 h-10 animate-pulse text-[#F2A541]" />
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-[#0B3D62]">
          Sending your location to authorities…
        </h2>
        <p className="text-sm text-[#5C6B78] max-w-xs mt-2 leading-relaxed">
          Locking precise GPS coordinates and routing direct telemetry packet to Emergency Command & Quick Response Dispatch.
        </p>

        <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-[#1C7293] bg-[#1C7293]/10 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#1C7293] animate-ping" />
          <span>Satellite Telemetry Uplink active</span>
        </div>

        <button
          onClick={() => navigate('/tourist')}
          className="mt-10 text-xs font-bold text-[#5C6B78] hover:text-[#0B3D62] underline"
        >
          Cancel Distress Broadcast
        </button>
      </div>
    );
  }

  // State 2: Active Distress Status & Stepper
  const status = activeTouristSos.status;
  const isAcknowledged = status === 'acknowledged' || status === 'assigned' || status === 'resolved';
  const isAssigned = status === 'assigned' || status === 'resolved';

  return (
    <div className="flex flex-col w-full p-4 pb-8 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
        <button
          onClick={() => navigate('/tourist')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D62]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D64545] animate-ping" />
          <span className="text-xs font-extrabold text-[#D64545] uppercase tracking-wider">
            Distress Broadcast Active
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#5C6B78]">
          #{activeTouristSos.id}
        </span>
      </div>

      {/* Primary Dispatch Reassurance Card */}
      <div className="bg-[#0B3D62] text-white rounded-3xl p-5 shadow-lg mt-4 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-200 tracking-wider">
              Emergency Response Active
            </span>
            <h3 className="text-lg font-extrabold mt-0.5">
              {isAssigned
                ? 'Rescue Unit Dispatched'
                : isAcknowledged
                ? 'Acknowledged by Control HQ'
                : 'Signal Transmitted'}
            </h3>
            <p className="text-xs text-cyan-100 mt-1 leading-relaxed">
              {isAssigned
                ? `${activeTouristSos.assignedUnit?.name || 'Unit Alpha-2'} is en route to your coordinates.`
                : 'Your distress coordinates have reached the watch room. Please remain stationary if safe.'}
            </p>
          </div>
          {isAssigned && (
            <div className="text-right shrink-0">
              <span className="text-2xl font-black text-[#F2A541] block">
                0{activeTouristSos.assignedUnit?.etaMinutes || 4}:15
              </span>
              <span className="text-[9px] uppercase tracking-wider text-cyan-200 font-bold">
                Estimated ETA
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-cyan-800/60 flex items-center justify-between text-xs text-cyan-200 font-mono">
          <span>Lat: {activeTouristSos.location.lat.toFixed(4)}°N, {activeTouristSos.location.lng.toFixed(4)}°E</span>
          <span>Alt: {activeTouristSos.altitudeM}m</span>
        </div>
      </div>

      {/* Three-Stage Real-Time Stepper */}
      <div className="bg-white rounded-3xl p-5 border border-[#D8E0E8] shadow-sm mt-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6B78] block mb-4">
          Response Transmission Stepper
        </span>

        <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8EDF2]">
          {/* Step 1: Sent */}
          <div className="flex items-start gap-3 relative">
            <div className="w-6 h-6 rounded-full bg-[#1C7293] text-white flex items-center justify-center shrink-0 z-10 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1A2530]">Distress Signal Transmitted</span>
                <span className="text-[10px] text-[#5C6B78]">Confirmed</span>
              </div>
              <p className="text-[11px] text-[#5C6B78]">
                GPS & biometric packet forwarded to Regional Emergency Command & Tactical Patrol Grid.
              </p>
            </div>
          </div>

          {/* Step 2: Acknowledged */}
          <div className="flex items-start gap-3 relative">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm ${
              isAcknowledged ? 'bg-[#1C7293] text-white' : 'bg-[#E8EDF2] text-[#5C6B78]'
            }`}>
              {isAcknowledged ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isAcknowledged ? 'text-[#1A2530]' : 'text-[#5C6B78]'}`}>
                  Acknowledged by Command
                </span>
                {isAcknowledged && (
                  <span className="text-[10px] text-[#3FA34D] font-bold">Officer Assigned</span>
                )}
              </div>
              <p className="text-[11px] text-[#5C6B78]">
                {isAcknowledged
                  ? 'Dispatcher verified location and alerted closest emergency response patrol.'
                  : 'Awaiting dispatcher queue triage (typically < 30 seconds).'}
              </p>
            </div>
          </div>

          {/* Step 3: Responder Assigned */}
          <div className="flex items-start gap-3 relative">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm ${
              isAssigned ? 'bg-[#D64545] text-white animate-pulse' : 'bg-[#E8EDF2] text-[#5C6B78]'
            }`}>
              <Navigation className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isAssigned ? 'text-[#D64545]' : 'text-[#5C6B78]'}`}>
                  Patrol En Route
                </span>
                {isAssigned && (
                  <span className="px-1.5 py-0.2 rounded bg-[#D64545]/15 text-[#D64545] text-[9px] font-extrabold">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#5C6B78]">
                {isAssigned
                  ? `Response Unit ${activeTouristSos.assignedUnit?.name || 'Patrol-Alpha'} advancing to your coordinates. Distance: ~${activeTouristSos.assignedUnit?.distanceMeters || 650}m.`
                  : 'Rescue vehicle will be assigned automatically upon tactical dispatch.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Beacon Tool */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D8E0E8] shadow-sm mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            beaconActive ? 'bg-[#D64545] text-white animate-bounce' : 'bg-[#1C7293]/10 text-[#1C7293]'
          }`}>
            {beaconActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-xs font-bold text-[#1A2530] block">
              Audible Distress Siren
            </span>
            <span className="text-[10px] text-[#5C6B78]">
              High-frequency audio beacon for search dogs & rescue
            </span>
          </div>
        </div>

        <button
          onClick={() => setBeaconActive(!beaconActive)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            beaconActive
              ? 'bg-[#D64545] text-white shadow-md'
              : 'bg-[#F4F7FA] text-[#0B3D62] hover:bg-[#E8EDF2]'
          }`}
        >
          {beaconActive ? 'STOP SIREN' : 'START SIREN'}
        </button>
      </div>

      {/* Cancel / False Alarm Option */}
      <div className="mt-6">
        <button
          onClick={() => setShowCancelModal(true)}
          className="w-full py-3 rounded-2xl bg-white border border-[#D8E0E8] hover:bg-gray-50 text-[#5C6B78] hover:text-[#1A2530] text-xs font-bold transition-colors flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4 text-gray-400" />
          <span>Cancel Distress Alert (False Alarm)</span>
        </button>
      </div>

      {/* Cancel False Alarm PIN Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-[#0B3D62]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-[#D8E0E8]">
            <div className="flex items-center gap-2 text-[#0B3D62] mb-2">
              <AlertCircle className="w-5 h-5 text-[#F2A541]" />
              <h4 className="font-extrabold text-sm">Cancel Distress Alert</h4>
            </div>

            <p className="text-xs text-[#5C6B78] mb-4 leading-relaxed">
              To verify this is not an accidental cancellation or coerced request, enter your 4-digit security PIN (Default: <strong>1234</strong>).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs text-[#1A2530] font-medium focus:outline-none"
                >
                  <option>Accidental button press</option>
                  <option>Situation resolved by local guide</option>
                  <option>Medical condition stabilized</option>
                  <option>Reached safe shelter without assistance</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1">
                  Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={cancelPin}
                  onChange={(e) => {
                    setCancelPin(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter 1234"
                  className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-center font-mono font-bold text-sm tracking-widest text-[#1A2530] focus:outline-none focus:border-[#1C7293]"
                />
                {pinError && (
                  <span className="text-[10px] text-[#D64545] font-bold block mt-1">
                    Invalid PIN. Please enter 1234.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#F4F7FA] text-[#5C6B78] text-xs font-bold hover:bg-[#E8EDF2]"
              >
                Keep Alert Active
              </button>
              <button
                onClick={handleCancelSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#D64545] text-white text-xs font-bold hover:bg-red-700"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
