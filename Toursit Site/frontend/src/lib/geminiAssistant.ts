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
  isInstant?: boolean;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI | null {
  if (!API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: API_KEY });
  }
  return genAI;
}

/**
 * High-speed Zero-Latency Edge Intent Matcher (< 5ms)
 * Immediately detects high-priority commands without waiting for cloud LLM roundtrip.
 */
export function matchInstantAction(prompt: string, context: EmergencyContext): AiEmergencyResponse | null {
  const p = prompt.toLowerCase().trim();
  if (!p) return null;

  // 1. SOS Trigger: Any prompt mentioning SOS or critical danger
  if (
    p === 'sos' ||
    p.includes('press sos') || 
    p.includes('trigger sos') || 
    p.includes('activate sos') || 
    p.includes('start sos') ||
    p.includes('send sos') ||
    p.includes('help me') ||
    p.includes('emergency sos') ||
    p.includes('in danger') ||
    p.includes('save me')
  ) {
    return {
      replyText: `🚨 Emergency SOS Activated! Broadcasting your live GPS coordinates at ${context.userLocationName} to police dispatch.`,
      action: 'TRIGGER_SOS',
      actionPayload: {
        reason: prompt.trim() || 'Instant Voice/Text Emergency SOS'
      },
      isInstant: true
    };
  }

  // 2. Emergency Contact Calling
  if (
    p.includes('emergency contact') || 
    p.includes('call contact') || 
    p.includes('call my contact') || 
    p.includes('call my family') || 
    p.includes('call family') || 
    p.includes('call mom') || 
    p.includes('call dad') || 
    p.includes('call brother') || 
    p.includes('call sister') ||
    (context.emergencyContact.name && p.includes(context.emergencyContact.name.toLowerCase()))
  ) {
    const contact = context.emergencyContact;
    return {
      replyText: `📞 Calling ${contact.name} (${contact.relationship}) at ${contact.phone}...`,
      action: 'CALL_EMERGENCY_CONTACT',
      actionPayload: {
        contactName: contact.name,
        phone: contact.phone
      },
      isInstant: true
    };
  }

  // 3. Police Emergency (100)
  if (p.includes('police') || p.includes('call 100') || p === '100') {
    return {
      replyText: '🚓 Connecting you to Police Emergency (100)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'Police (100)',
        phone: '100'
      },
      isInstant: true
    };
  }

  // 4. Medical / Ambulance (108)
  if (p.includes('ambulance') || p.includes('call 108') || p === '108') {
    return {
      replyText: '🚑 Connecting you to Medical Ambulance (108)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'Ambulance (108)',
        phone: '108'
      },
      isInstant: true
    };
  }

  // 5. Fire (101)
  if (p.includes('fire') || p.includes('call 101') || p === '101') {
    return {
      replyText: '🚒 Connecting you to Fire & Rescue (101)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'Fire (101)',
        phone: '101'
      },
      isInstant: true
    };
  }

  // 6. Universal Emergency (112)
  if (p.includes('112') || p.includes('call 112') || p.includes('helpline')) {
    return {
      replyText: '🚨 Connecting you to National Emergency Helpline (112)...',
      action: 'CALL_EMERGENCY_SERVICE',
      actionPayload: {
        serviceName: 'National Emergency (112)',
        phone: '112'
      },
      isInstant: true
    };
  }

  return null;
}

/**
 * Intelligent prompt processing:
 * 1. Executes instantaneous edge actions in < 5ms for critical distress/calling.
 * 2. Uses streamlined Gemini 3.6 Flash for open-ended advice and complex situations.
 */
export async function processEmergencyPrompt(
  prompt: string, 
  context: EmergencyContext
): Promise<AiEmergencyResponse> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return {
      replyText: "Say 'Press SOS', 'Call my emergency contact', or 'Call police/ambulance'.",
      action: 'ADVICE_ONLY',
      isInstant: true
    };
  }

  // STEP 1: Check instant edge action first (< 5ms response time!)
  const instantMatch = matchInstantAction(trimmed, context);
  if (instantMatch) {
    return instantMatch;
  }

  // STEP 2: For complex queries, invoke Gemini 3.6 Flash with minimal latency
  try {
    const ai = getGenAIClient();
    if (!ai) {
      throw new Error('Gemini API key not configured');
    }

    const systemPrompt = `SafeYatra Tourist Emergency AI. Location: ${context.userLocationName}. Contact: ${context.emergencyContact.name} (${context.emergencyContact.phone}).
Categorize intent into:
- TRIGGER_SOS (if in danger, trapped, injured, urgent rescue)
- CALL_EMERGENCY_CONTACT (if asks to call contact/family)
- CALL_EMERGENCY_SERVICE (if asks for police/ambulance/fire/112)
- ADVICE_ONLY (for first aid, advice)
Respond ONLY in JSON:
{"replyText":"short concise answer (1-2 sentences)","action":"TRIGGER_SOS"|"CALL_EMERGENCY_CONTACT"|"CALL_EMERGENCY_SERVICE"|"ADVICE_ONLY","actionPayload":{"phone":"","contactName":"","serviceName":"","reason":""}}`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\nTourist: "${trimmed}"` }] }
      ]
    });

    const rawText = result.text || '';
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed && parsed.action && parsed.replyText) {
      return parsed as AiEmergencyResponse;
    }
  } catch (err) {
    console.warn('[Gemini AI] Edge fallback applied:', err);
  }

  // STEP 3: Fallback general response
  return {
    replyText: "I am your SafeYatra Emergency AI. I can instantly trigger SOS or call your emergency contact. How can I help?",
    action: 'ADVICE_ONLY',
    isInstant: true
  };
}
