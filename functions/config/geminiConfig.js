function getGeminiConfig() {
  const hasApiKey = typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim().length > 0
  const model =
    typeof process.env.GEMINI_MODEL === 'string' && process.env.GEMINI_MODEL.trim().length > 0
      ? process.env.GEMINI_MODEL.trim()
      : 'gemini-1.5-flash'

  return {
    hasApiKey,
    model,
    provider: 'gemini',
  }
}

function getGeminiApiKey() {
  return typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY.trim() : ''
}

// The actual real Gemini provider should read backend secrets internally later.
// This helper intentionally does not expose the API key value or print it in logs.

module.exports = {
  getGeminiApiKey,
  getGeminiConfig,
}
