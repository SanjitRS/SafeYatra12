import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  ShieldAlert, 
  PhoneCall, 
  Sparkles, 
  AlertTriangle, 
  Activity, 
  Volume2, 
  VolumeX, 
  Radio, 
  CheckCircle2,
  PhoneForwarded,
  UserCheck
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';
import { processEmergencyPrompt, AiEmergencyResponse, EmergencyContext } from '../../lib/geminiAssistant';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  actionTaken?: string;
  actionDetails?: any;
}

export const AiEmergencyAssistant: React.FC = () => {
  const navigate = useNavigate();
  const { 
    tourist, 
    userCoords, 
    userLocationName, 
    activeTouristSos, 
    triggerTouristSos, 
    playEmergencyChime 
  } = useSafety();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Namaste ${tourist.name.split(' ')[0]}! I am your SafeYatra Emergency AI Guardian. Say 'Press SOS', 'Call my emergency contact', or ask for emergency safety guidance.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Initialize Web Speech API for voice recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-IN'; // Indian English / Global default

      recog.onstart = () => {
        setIsListening(true);
      };

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          handleUserSubmission(transcript);
        }
      };

      recog.onerror = (e: any) => {
        console.warn('[SpeechRecognition] Error:', e.error);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  // Text-to-Speech synthesizer
  const speakText = (text: string) => {
    if (!speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // safe fallback
    }
  };

  const toggleVoiceListening = () => {
    if (!speechSupported) {
      alert('Voice recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Speech recognition start failed:', e);
      }
    }
  };

  // Central submission handler
  const handleUserSubmission = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isProcessing) return;

    setInputText('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    const context: EmergencyContext = {
      touristName: tourist.name,
      emergencyContact: tourist.emergencyContact,
      userCoords,
      userLocationName,
      activeTouristSos: !!activeTouristSos
    };

    try {
      const response: AiEmergencyResponse = await processEmergencyPrompt(trimmed, context);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionTaken: response.action,
        actionDetails: response.actionPayload
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakText(response.replyText);

      // Execute Action autonomously
      await executeEmergencyAction(response);
    } catch (err) {
      console.error('AI assistant processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeEmergencyAction = async (response: AiEmergencyResponse) => {
    const { action, actionPayload } = response;

    if (action === 'TRIGGER_SOS') {
      playEmergencyChime();
      const reason = actionPayload?.reason || 'AI Assistant Voice/Text Emergency Trigger';
      await triggerTouristSos(reason);
      setIsOpen(false);
      navigate('/tourist/sos');
    } else if (action === 'CALL_EMERGENCY_CONTACT') {
      const phoneToCall = actionPayload?.phone || tourist.emergencyContact.phone;
      if (phoneToCall) {
        window.location.href = `tel:${phoneToCall.replace(/\s+/g, '')}`;
      }
    } else if (action === 'CALL_EMERGENCY_SERVICE') {
      const servicePhone = actionPayload?.phone || '112';
      window.location.href = `tel:${servicePhone}`;
    }
  };

  return (
    <>
      {/* Floating AI Emergency Assistant Trigger Button */}
      <div className="fixed bottom-20 right-4 sm:right-6 z-40 flex items-center gap-2 select-none">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center p-3.5 rounded-full bg-gradient-to-tr from-[#0B3D62] via-[#1C7293] to-[#2A9D8F] text-white shadow-xl hover:scale-105 active:scale-95 transition-all border-2 border-white/80 cursor-pointer"
          title="SafeYatra Emergency AI Voice & Chat Assistant"
        >
          {/* Subtle emergency pulsing halo */}
          <span className="absolute -inset-1 rounded-full bg-[#1C7293]/40 animate-ping opacity-75"></span>
          
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse absolute -top-1 -right-1" />
            <Bot className="w-6 h-6 text-white" />
          </div>

          <span className="hidden sm:inline-block ml-2 text-xs font-extrabold pr-1 text-white">
            AI Guardian
          </span>
        </button>
      </div>

      {/* Interactive AI Assistant Modal / Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-[440px] h-[85vh] sm:h-[680px] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-[#D8E0E8] relative animate-in slide-in-from-bottom-8">
            
            {/* Header */}
            <div className="bg-[#0B3D62] text-white p-4 flex items-center justify-between border-b border-[#134B73] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1C7293] to-[#2A9D8F] flex items-center justify-center text-white shadow-inner">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-white leading-tight">
                      SafeYatra AI Guardian
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-400/30">
                      Gemini 3.6 Flash
                    </span>
                  </div>
                  <p className="text-[10px] text-cyan-200">
                    Voice & SOS Autonomous Responder
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className="p-1.5 rounded-lg text-cyan-200 hover:text-white hover:bg-white/10 transition-colors"
                  title={speechEnabled ? 'Mute AI voice' : 'Enable AI voice speech'}
                >
                  {speechEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </button>

                <button
                  onClick={() => {
                    if (isListening) recognitionRef.current?.stop();
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Emergency Action Prompts Bar */}
            <div className="bg-[#F4F7FA] px-3 py-2 border-b border-[#E8EDF2] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 select-none">
              <button
                onClick={() => handleUserSubmission('Press the SOS button now!')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D64545] text-white text-[11px] font-bold shrink-0 hover:bg-red-700 transition-colors shadow-xs active:scale-95 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>🚨 Press SOS</span>
              </button>

              <button
                onClick={() => handleUserSubmission('Call my emergency contact')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0B3D62] text-white text-[11px] font-bold shrink-0 hover:bg-[#134B73] transition-colors shadow-xs active:scale-95 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span>📞 Call Contact</span>
              </button>

              <button
                onClick={() => handleUserSubmission('Call police')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D8E0E8] text-[#0B3D62] text-[11px] font-bold shrink-0 hover:bg-[#E8EDF2] transition-colors shadow-xs active:scale-95 cursor-pointer"
              >
                <span>🚓 Police (100)</span>
              </button>

              <button
                onClick={() => handleUserSubmission('Call ambulance')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#D8E0E8] text-[#0B3D62] text-[11px] font-bold shrink-0 hover:bg-[#E8EDF2] transition-colors shadow-xs active:scale-95 cursor-pointer"
              >
                <span>🚑 Ambulance (108)</span>
              </button>
            </div>

            {/* Chat Conversation History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCFDFE]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#0B3D62] text-white rounded-tr-xs'
                        : 'bg-white border border-[#E8EDF2] text-[#1A2530] shadow-xs rounded-tl-xs'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Action Execution Visual Badges */}
                    {msg.actionTaken === 'TRIGGER_SOS' && (
                      <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-900">
                        <div className="flex items-center gap-1.5 font-extrabold text-[11px] text-rose-700">
                          <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                          <span>SOS BEACON TRANSMITTED</span>
                        </div>
                        <p className="text-[10px] text-rose-800">
                          3D Coordinates (<strong>{userCoords[0].toFixed(4)}, {userCoords[1].toFixed(4)}</strong>) dispatched to Police HQ & Mountain Rescue.
                        </p>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            navigate('/tourist/sos');
                          }}
                          className="w-full py-1 bg-[#D64545] text-white font-bold rounded-lg text-[10px] text-center hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          Open Live SOS Dispatch Tracker →
                        </button>
                      </div>
                    )}

                    {msg.actionTaken === 'CALL_EMERGENCY_CONTACT' && (
                      <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-900">
                        <div className="flex items-center justify-between font-extrabold text-[11px] text-emerald-800">
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {msg.actionDetails?.contactName || tourist.emergencyContact.name} ({tourist.emergencyContact.relationship})
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-mono">
                          Phone: {msg.actionDetails?.phone || tourist.emergencyContact.phone}
                        </div>
                        <a
                          href={`tel:${(msg.actionDetails?.phone || tourist.emergencyContact.phone).replace(/\s+/g, '')}`}
                          className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-[11px] hover:bg-emerald-700 transition-colors shadow-xs"
                        >
                          <PhoneForwarded className="w-3.5 h-3.5" />
                          <span>Tap to Dial Emergency Contact</span>
                        </a>
                      </div>
                    )}

                    {msg.actionTaken === 'CALL_EMERGENCY_SERVICE' && (
                      <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-blue-900">
                        <div className="flex items-center justify-between font-extrabold text-[11px] text-blue-800">
                          <span>{msg.actionDetails?.serviceName || 'Emergency Service'}</span>
                          <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                            {msg.actionDetails?.phone || '112'}
                          </span>
                        </div>
                        <a
                          href={`tel:${msg.actionDetails?.phone || '112'}`}
                          className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-[#0B3D62] text-white font-bold rounded-lg text-[11px] hover:bg-[#134B73] transition-colors shadow-xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Tap to Call {msg.actionDetails?.serviceName || '112'}</span>
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-[#5C6B78] px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-[#5C6B78] bg-white border border-[#E8EDF2] p-2.5 rounded-2xl w-fit animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Gemini AI is analyzing emergency intent...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Voice Waveform Activity Banner */}
            {isListening && (
              <div className="bg-rose-50 border-t border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-800 animate-pulse shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-bold text-[11px]">Listening to your voice... Speak now!</span>
                </div>
                <button
                  onClick={toggleVoiceListening}
                  className="text-[10px] font-bold text-rose-700 bg-rose-200 hover:bg-rose-300 px-2 py-0.5 rounded-md"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Input & Voice Controls */}
            <div className="p-3 bg-white border-t border-[#E8EDF2] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleVoiceListening}
                className={`p-2.5 rounded-xl transition-all ${
                  isListening
                    ? 'bg-rose-600 text-white animate-bounce shadow-md'
                    : 'bg-[#F4F7FA] text-[#0B3D62] hover:bg-[#E8EDF2] border border-[#D8E0E8]'
                }`}
                title={isListening ? 'Stop listening' : 'Start speaking'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#1C7293]" />}
              </button>

              <input
                type="text"
                placeholder={isListening ? 'Listening...' : 'Type "press SOS" or "call contact"...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUserSubmission(inputText);
                  }
                }}
                disabled={isProcessing}
                className="flex-1 bg-[#F4F7FA] border border-[#D8E0E8] rounded-xl px-3.5 py-2.5 text-xs text-[#1A2530] placeholder:text-[#5C6B78] outline-hidden focus:border-[#1C7293] focus:bg-white transition-all"
              />

              <button
                type="button"
                onClick={() => handleUserSubmission(inputText)}
                disabled={!inputText.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-[#0B3D62] text-white disabled:opacity-40 hover:bg-[#134B73] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
