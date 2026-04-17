/**
 * Local Chatbot Intent Matcher
 * Performs keyword overlap and string similarity scoring to identify 100% matches
 * before falling back to the LLM (to save cost and latency).
 */

function normalizeArabic(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '') // Remove diacritics
    .trim();
}

export function findLocalMatch(message, prompts) {
  if (!prompts || prompts.length === 0) return null;

  const input = normalizeArabic(message);
  
  // 1. Direct match on label or aliases
  for (const prompt of prompts) {
    if (normalizeArabic(prompt.label) === input) return prompt.id;
    
    if (prompt.aliases && prompt.aliases.some(alias => normalizeArabic(alias) === input)) {
      return prompt.id;
    }
  }

  // 2. Keyword overlap scoring
  const inputTokens = input.split(/\s+/).filter(t => t.length > 2);
  let bestMatch = null;
  let maxScore = 0;

  for (const prompt of prompts) {
    let score = 0;
    const targetText = normalizeArabic(prompt.label + " " + (prompt.aliases?.join(" ") || ""));
    
    for (const token of inputTokens) {
      if (targetText.includes(token)) {
        score += 1;
      }
    }

    // Normalize score by input length
    const finalScore = score / Math.max(inputTokens.length, 1);
    
    if (finalScore > maxScore && finalScore >= 0.75) {
      maxScore = finalScore;
      bestMatch = prompt.id;
    }
  }

  return bestMatch;
}
