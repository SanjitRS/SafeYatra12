import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  ArrowLeft, 
  Send, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const ReportIncident: React.FC = () => {
  const navigate = useNavigate();
  const { reportIncident, tourist, userCoords, userLocationName } = useSafety();

  const [type, setType] = useState<'rockslide' | 'washout' | 'wildlife' | 'medical' | 'theft'>('rockslide');
  const [description, setDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState(
    userLocationName || `${userCoords[0].toFixed(4)}°N, ${userCoords[1].toFixed(4)}°E`
  );

  React.useEffect(() => {
    if (userLocationName && (!locationAddress || locationAddress.startsWith('Locating'))) {
      setLocationAddress(userLocationName);
    }
  }, [userLocationName, locationAddress]);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { id: 'rockslide', label: 'Rockslide / Debris', icon: '🪨' },
    { id: 'washout', label: 'Trail Washout', icon: '🌊' },
    { id: 'wildlife', label: 'Wild Animal Sighting', icon: '🐻' },
    { id: 'medical', label: 'Injured Trekker', icon: '🩹' },
    { id: 'theft', label: 'Theft / Harassment', icon: '⚠️' }
  ];

  const handlePhotoMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    await reportIncident({
      title: `${categories.find(c => c.id === type)?.label} reported by tourist`,
      type,
      description,
      severity,
      status: 'reported',
      location: {
        lat: userCoords[0],
        lng: userCoords[1],
        address: locationAddress,
        sector: 'Sector 2 - High Trail'
      },
      reportedBy: tourist.name,
      imageUrl: photoPreview || undefined
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[580px]">
        <div className="w-16 h-16 rounded-full bg-[#3FA34D]/15 flex items-center justify-center text-[#3FA34D] mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-extrabold text-[#0B3D62]">
          Incident Transmitted to Patrol
        </h3>

        <p className="text-xs text-[#5C6B78] max-w-xs mt-2 leading-relaxed">
          Your report has been pinned onto the Tactical GIS Command map for district forest rangers and mountain marshals to verify.
        </p>

        <div className="mt-6 bg-[#F4F7FA] rounded-2xl p-4 w-full text-left space-y-2 text-xs border border-[#E8EDF2]">
          <div className="flex justify-between">
            <span className="text-[#5C6B78]">Category:</span>
            <span className="font-bold text-[#0B3D62] capitalize">{type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5C6B78]">Location:</span>
            <span className="font-bold text-[#1A2530] truncate max-w-[180px]">{locationAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5C6B78]">Status:</span>
            <span className="font-bold text-[#1C7293]">Under Review by HQ</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/tourist')}
          className="w-full mt-6 py-3 rounded-2xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors"
        >
          Return to Companion Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full p-4 pb-8">
      <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF2]">
        <button
          onClick={() => navigate('/tourist')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D62]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-extrabold text-[#0B3D62] uppercase tracking-wider">
          Report Hazard / Incident
        </span>
        <div className="w-4" />
      </div>

      <p className="text-xs text-[#5C6B78] mt-3 leading-relaxed">
        Crowdsourced reports instantly notify nearby trekkers and alert local rescue posts.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Incident Type Select */}
        <div>
          <label className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1.5">
            Hazard Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setType(cat.id as typeof type)}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                  type === cat.id
                    ? 'bg-[#0B3D62] text-white border-[#0B3D62] shadow-sm'
                    : 'bg-white text-[#1A2530] border-[#E8EDF2] hover:bg-[#F4F7FA]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1.5">
            Urgency / Severity Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'Low (Advisory)', color: 'text-[#3FA34D]' },
              { id: 'medium', label: 'Medium (Caution)', color: 'text-[#F2A541]' },
              { id: 'high', label: 'High (Immediate Danger)', color: 'text-[#D64545]' }
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeverity(s.id as typeof severity)}
                className={`py-2 px-1 rounded-xl border text-center text-[10px] font-bold transition-all ${
                  severity === s.id
                    ? 'bg-[#1C7293] text-white border-[#1C7293]'
                    : 'bg-white text-[#5C6B78] border-[#E8EDF2]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-filled Location Pin */}
        <div>
          <label className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1.5">
            Location Coordinates
          </label>
          <div className="flex items-center gap-2 bg-[#F4F7FA] border border-[#E8EDF2] rounded-xl p-2.5">
            <MapPin className="w-4 h-4 text-[#1C7293] shrink-0" />
            <input
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              className="w-full bg-transparent text-xs text-[#1A2530] font-medium focus:outline-none"
              placeholder="Trail marker or sector description"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1.5">
            Details & Description
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the hazard (e.g. fallen pine tree blocking bridge, rock debris on steep curve, injured hiker requiring splint)..."
            className="w-full p-3 rounded-xl bg-white border border-[#D8E0E8] text-xs text-[#1A2530] placeholder:text-[#5C6B78]/60 focus:outline-none focus:border-[#1C7293]"
          />
        </div>

        {/* Optional Photo Upload */}
        <div>
          <label className="text-[11px] font-bold text-[#5C6B78] uppercase block mb-1.5">
            Attach Field Photo (Optional)
          </label>
          <label className="flex items-center justify-center p-4 border-2 border-dashed border-[#D8E0E8] rounded-2xl bg-[#F4F7FA] cursor-pointer hover:bg-[#E8EDF2] transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoMock}
            />
            {photoPreview ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden">
                <img src={photoPreview} alt="Field preview" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">Change</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center text-xs text-[#5C6B78]">
                <Camera className="w-6 h-6 text-[#1C7293] mb-1" />
                <span className="font-bold text-[#0B3D62]">Tap to snap or upload hazard photo</span>
                <span className="text-[10px] text-[#5C6B78]">Supports JPEG, PNG up to 10MB</span>
              </div>
            )}
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className="w-full py-3 rounded-2xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{submitting ? 'Transmitting to Dispatch...' : 'Publish Incident to Command'}</span>
        </button>
      </form>
    </div>
  );
};
