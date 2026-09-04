/**
 * AI Incident & Emergency Classifier
 * Analyzes free-text reports and emergency SOS descriptions to determine:
 * - Predicted Severity (low, medium, high, critical)
 * - Urgency Priority Score (1 - 10)
 * - Detected threat/hazard keywords
 * - Recommended Authority Dispatch Action
 * - Complete prompt and reasoning trace (visible for demo / hackathon presentation)
 */

const SYSTEM_PROMPT = `
You are an expert AI Emergency Dispatch & Risk Assessment Officer for an International Tourist Safety Platform.
Your task is to analyze incoming tourist incident descriptions or SOS distress messages, assess immediate physical threat, determine the severity rating, calculate a priority dispatch score from 1 to 10, and provide clear operational recommendations for local authorities.

Classification Guidelines:
- CRITICAL (Score 9-10): Life-threatening emergencies, armed assault, kidnapping, severe medical trauma, structural collapse, active shooter, active fire.
- HIGH (Score 7-8): Mugging with weapon visible, physical harassment, injury requiring emergency room, tourist stranded in remote hazardous zone, stalking in isolated area.
- MEDIUM (Score 4-6): Theft of belongings/passports, verbal harassment, non-life-threatening medical symptoms, property damage, fraud/scam with no immediate violence.
- LOW (Score 1-3): Lost directions, minor lost property, noise complaint, inquiries regarding safety resources.
`.trim();

const KEYWORD_TAXONOMY = {
  critical: [
    'gun', 'knife', 'stab', 'shot', 'weapon', 'bleeding', 'unconscious', 'hostage',
    'kidnap', 'choking', 'heart attack', 'fire', 'explosion', 'active shooter', 'collapse',
    'drowning', 'dying', 'kill', 'emergency', 'help me'
  ],
  high: [
    'mugged', 'robbery', 'assault', 'hit', 'attack', 'stalking', 'followed', 'threat',
    'fracture', 'broken', 'ambulance', 'poison', 'stranded', 'isolated', 'dangerous',
    'surrounded', 'sexual assault', 'trapped'
  ],
  medium: [
    'theft', 'stolen', 'pickpocket', 'wallet', 'bag', 'scam', 'conned', 'fever',
    'dizzy', 'harassment', 'shouting', 'lost passport', 'broken window', 'vandalism'
  ],
  low: [
    'lost', 'direction', 'hotel', 'misplaced', 'delayed', 'info', 'guide', 'noise',
    'inquiry', 'advice'
  ]
};

/**
 * Intelligent Rule & Lexical NLP Classifier (offline-capable)
 */
function classifyWithLocalNLP(text, incidentType = 'other') {
  const lower = text.toLowerCase();
  const detectedKeywords = [];

  let score = 3; // Baseline score
  let predictedSeverity = 'low';

  // Check critical keywords
  const criticalMatches = KEYWORD_TAXONOMY.critical.filter((kw) => lower.includes(kw));
  const highMatches = KEYWORD_TAXONOMY.high.filter((kw) => lower.includes(kw));
  const mediumMatches = KEYWORD_TAXONOMY.medium.filter((kw) => lower.includes(kw));
  const lowMatches = KEYWORD_TAXONOMY.low.filter((kw) => lower.includes(kw));

  detectedKeywords.push(...criticalMatches, ...highMatches, ...mediumMatches, ...lowMatches);

  if (criticalMatches.length > 0 || incidentType === 'assault' && highMatches.length > 0) {
    score = Math.min(10, 8 + criticalMatches.length);
    predictedSeverity = 'critical';
  } else if (highMatches.length > 0 || ['assault', 'medical', 'hazard'].includes(incidentType)) {
    score = Math.min(8, 6 + highMatches.length);
    predictedSeverity = score >= 8 ? 'critical' : 'high';
  } else if (mediumMatches.length > 0 || ['theft', 'scam', 'harassment'].includes(incidentType)) {
    score = Math.min(6, 4 + mediumMatches.length);
    predictedSeverity = 'medium';
  } else {
    score = Math.max(1, 2 + lowMatches.length);
    predictedSeverity = 'low';
  }

  // Sentiment / Urgency amplifications
  if (text.includes('!') || text.toUpperCase() === text && text.length > 5) {
    score = Math.min(10, score + 1);
  }

  // Recommended actions
  let suggestedAction = 'Log incident and monitor status.';
  if (predictedSeverity === 'critical') {
    suggestedAction = 'IMMEDIATE DISPATCH: Alert nearest armed patrol and medical emergency response unit. Open live GPS tracking channel.';
  } else if (predictedSeverity === 'high') {
    suggestedAction = 'PRIORITY DISPATCH: Dispatch local tourist police unit for on-scene investigation and contact emergency contact.';
  } else if (predictedSeverity === 'medium') {
    suggestedAction = 'STANDARD INVESTIGATION: File police report, assist with consular notification or insurance documentation.';
  } else {
    suggestedAction = 'ROUTINE LOGGING: Provide safety advisory and nearest tourist assistance booth info.';
  }

  const promptConstructed = `
[SYSTEM PROMPT]
${SYSTEM_PROMPT}

[INPUT PAYLOAD]
Type: ${incidentType}
Description: "${text}"

[AI REASONING TRACE]
Matches: ${detectedKeywords.join(', ') || 'none'}
Calculated Priority Score: ${score}/10
Assigned Severity: ${predictedSeverity.toUpperCase()}
`.trim();

  return {
    predictedSeverity,
    urgencyScore: score,
    confidence: Number((0.85 + Math.min(0.12, detectedKeywords.length * 0.03)).toFixed(2)),
    detectedKeywords: [...new Set(detectedKeywords)],
    suggestedAction,
    explanation: `Classified as ${predictedSeverity.toUpperCase()} based on ${detectedKeywords.length} threat indicators: [${detectedKeywords.join(', ') || 'contextual heuristics'}]. Priority score: ${score}/10.`,
    promptUsed: promptConstructed
  };
}

/**
 * Main AI classification function
 * Uses Anthropic/OpenAI API if keys exist, with seamless graceful fallback to NLP heuristic engine.
 */
async function classifyIncidentOrSOS(text, incidentType = 'other') {
  if (!text || typeof text !== 'string') {
    return {
      predictedSeverity: 'low',
      urgencyScore: 2,
      confidence: 0.7,
      detectedKeywords: [],
      suggestedAction: 'Routine review',
      explanation: 'No detailed text provided.',
      promptUsed: SYSTEM_PROMPT
    };
  }

  // If Anthropic API key is provided
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Classify this tourist incident: Type: "${incidentType}", Description: "${text}". Respond strictly with a JSON object: {"predictedSeverity": "low|medium|high|critical", "urgencyScore": 1-10, "detectedKeywords": [], "suggestedAction": "string", "explanation": "string"}`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.content?.[0]?.text;
        const parsed = JSON.parse(rawContent.match(/\{[\s\S]*\}/)[0]);
        return {
          ...parsed,
          confidence: 0.95,
          promptUsed: `${SYSTEM_PROMPT}\n\nUser Input: ${text}`
        };
      }
    } catch (e) {
      console.warn('[AI Classifier] External LLM API failed, falling back to local NLP engine:', e.message);
    }
  }

  // Offline / Built-in high-performance classifier
  return classifyWithLocalNLP(text, incidentType);
}

module.exports = {
  classifyIncidentOrSOS,
  SYSTEM_PROMPT
};
