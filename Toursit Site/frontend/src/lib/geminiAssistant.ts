import { GoogleGenAI } from '@google/genai';

export interface EmergencyContext {
  touristName: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  userCoords: [number, number];
  userLocationName: string;
  activeTouristSos: boolean;
}

export type EmergencyActionType = 
  | 'TRIGGER_SOS'
  | 'CALL_EMERGENCY_CONTACT'
  | 'CALL_EMERGENCY_SERVICE'
  | 'ADVICE_ONLY';

export interface EmergencyActionPayload {
  phone?: string;
  contactName?: string;
  serviceName?: string;
  reason?: string;
}

export interface AiEmergencyResponse {
  replyText: string;
  action: EmergencyActionType;
  actionPayload?: EmergencyActionPayload;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: API_KEY });
  }
  return genAI;
}

/**
 * Heuristic fallback for zero-latency / offline response
 */
export function getHeuristicResponse(prompt: string, context: EmergencyContext): AiEmergencyResponse {
  const p = prompt.toLowerCase();

  // 1. SOS Trigger matching
  if (
    p.includes('sos') || 
    p.includes('press sos') || 
    p.includes('trigger sos') || 
    p.includes('activate sos') || 
    p.includes('danger') || 
    p.includes('help me') || 
    p.includes('under attack') ||
    p.includes('i am in danger') ||
    p.includes('distress')
  ) {
    return {
      replyText: `🚨 Emergency SOS Activated! Broadcasting your live coordinates at ${context.userLocationName} to police dispatch.`,
      action: 'TRIGGER_SOS',
      actionPayload: {
        reason: prompt.trim() || 'Voice/Chat Activated Emergency SOS'
      }
    };
  }

  // 2. Emergency contact calling
  if (
    p.includes('emergency contact') || 
    p.includes('call contact') || 
    p.includes('call my') || 
    p.includes('call family') || 
    p.includes('call mom') || 
    p.includes('call dad') || 
    p.includes('call brother') || 
    p.includes('call sister') ||
    (context.emergencyContact.name && p.includes(context.emergencyContact.name.toLowerCase()))
  ) {
    return {
      replyText: `📞 Initiating emergency call to ${context.emergencyContact.name} (${context.emergencyContact.relationship}) at ${context.emergencyContact.phone}.`,
      action: 'CALL_EMERGENCY_CONTACT',
      actionPayload: {
        contactName: context.emergencyContact.name,
        phone: context.emergencyContact.phone
      }
    };
  }

  // 3. Police (100)
  if (p.includes('police') || p.includes('cop') || p.includes('100')) {
    return {
      replyText: '🚓 Connecting you to Police Emergency Services (100)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'Police Emergency (100)',
        phone: '100'
      }
    };
  }

  // 4. Ambulance / Medical (108)
  if (p.includes('ambulance') || p.includes('hospital') || p.includes('doctor') || p.includes('medical') || p.includes('108')) {
    return {
      replyText: '🚑 Connecting you to Medical Ambulance Services (108)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'Medical Emergency (108)',
        phone: '108'
      }
    };
  }

  // 5. Fire (101)
  if (p.includes('fire') || p.includes('101')) {
    return {
      replyText: '🚒 Connecting you to Fire & Rescue Services (101)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'Fire & Rescue (101)',
        phone: '101'
      }
    };
  }

  // 6. Universal (112)
  if (p.includes('112') || p.includes('helpline')) {
    return {
      replyText: '🚨 Connecting you to National Emergency Helpline (112)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'National Emergency (112)',
        phone: '112'
      }
    };
  }

  return {
    replyText: "I am your SafeYatra Emergency AI. You can say 'Press SOS', 'Call my emergency contact', or 'Call police/ambulance'. How can I assist your safety?",
    action: 'ADVICE_ONLY'
  };
}

/**
 * Intelligent prompt processing using Gemini 3.6 Flash
 */
export async function processEmergencyPrompt(
  prompt: string, 
  context: EmergencyContext
): Promise<AiEmergencyResponse> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return getHeuristicResponse('', context);
  }

  try {
    const ai = getGenAIClient();
    const systemPrompt = `You are SafeYatra's Guardian AI Assistant for tourist safety in India.
Current Tourist:
- Name: ${context.touristName}
- Location: ${context.userLocationName} (Lat: ${context.userCoords[0].toFixed(4)}, Lng: ${context.userCoords[1].toFixed(4)})
- Emergency Contact: ${context.emergencyContact.name} (${context.emergencyContact.relationship}, Phone: ${context.emergencyContact.phone})
- Active SOS Status: ${context.activeTouristSos ? 'ACTIVE DISTRESS' : 'NORMAL'}

Emergency Hotlines:
- Universal: 112
- Police: 100
- Ambulance: 108
- Fire: 101

INSTRUCTIONS:
1. Determine if the tourist wants to:
   - "TRIGGER_SOS": If tourist asks to press/trigger SOS, mentions being in danger, trapped, injured, lost, attacked, or urgently needs rescue.
   - "CALL_EMERGENCY_CONTACT": If tourist asks to call their contact, family, friend, guardian, or emergency number.
   - "CALL_EMERGENCY_SERVICE": If tourist asks to call police (100), ambulance (108), fire (101), or universal emergency (112).
   - "ADVICE_ONLY": If tourist is asking for general safety tips, navigation, first aid advice, or asking what to do.

2. You MUST return ONLY a valid raw JSON object matching this schema without markdown fences:
{
  "replyText": "Reassuring, calm speech to the tourist (max 2 sentences)",
  "action": "TRIGGER_SOS" | "CALL_EMERGENCY_CONTACT" | "CALL_EMERGENCY_SERVICE" | "ADVICE_ONLY",
  "actionPayload": {
    "phone": "digits only string",
    "contactName": "string name",
    "serviceName": "string service name",
    "reason": "short distress explanation"
  }
}`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nTourist Request: "${trimmed}"` }] }
      ]
    });

    const rawText = result.text || '';
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed && parsed.action && parsed.replyText) {
      return parsed as AiEmergencyResponse;
    }
  } catch (err) {
    console.warn('[Gemini AI] Falling back to offline heuristic parser:', err);
  }

  // Graceful offline fallback
  return getHeuristicResponse(trimmed, context);
}
