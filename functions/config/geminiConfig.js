function normalizeApiKeyValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveGeminiApiKey(secretValue) {
  const directSecret = normalizeApiKeyValue(secretValue)
  if (directSecret) {
    return directSecret
  }

  return normalizeApiKeyValue(process.env.GEMINI_API_KEY_LOCAL)
}

function getGeminiConfig(options = {}) {
  const hasApiKey = resolveGeminiApiKey(options.apiKey).length > 0
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

function getGeminiApiKey(options = {}) {
  return resolveGeminiApiKey(options.apiKey)
}

// The actual real Gemini provider should read backend secrets internally later.
// This helper intentionally does not expose the API key value or print it in logs.

module.exports = {
  getGeminiApiKey,
  getGeminiConfig,
  resolveGeminiApiKey,
}
