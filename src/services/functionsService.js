import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'

function isFunctionUnavailable(error) {
  const message = String(error?.message ?? '')
  const code = String(error?.code ?? '')

  return (
    code.includes('unavailable') ||
    code.includes('not-found') ||
    code.includes('deadline-exceeded') ||
    message.toLowerCase().includes('function not found') ||
    message.toLowerCase().includes('service unavailable') ||
    message.toLowerCase().includes('failed to fetch')
  )
}

function getFriendlyFunctionError(error) {
  const message = String(error?.message ?? '')

  if (isFunctionUnavailable(error)) {
    return 'Functions emulator is not running. Start it with npm run functions:serve.'
  }

  if (message.includes('Gemini API key is not configured in functions/.env')) {
    return 'Gemini key is not configured in functions/.env'
  }

  return `Unable to score submission with backend mock. ${message || 'Unknown backend function error.'}`
}

export async function scoreSubmissionWithBackendMock(submissionId) {
  if (!functions) {
    throw new Error('Firebase Functions is not configured. Check the Firebase frontend configuration first.')
  }

  try {
    const callable = httpsCallable(functions, 'scoreSubmission')
    const response = await callable({ submissionId })
    return response.data
  } catch (error) {
    throw new Error(getFriendlyFunctionError(error))
  }
}

export async function getAiProviderStatus() {
  if (!functions) {
    throw new Error('Firebase Functions is not configured. Check the Firebase frontend configuration first.')
  }

  try {
    const callable = httpsCallable(functions, 'getAiProviderStatus')
    const response = await callable()
    return response.data
  } catch (error) {
    if (isFunctionUnavailable(error)) {
      throw new Error('AI provider status is unavailable. Start the Functions emulator with npm run functions:serve.')
    }

    throw new Error(`Unable to load AI provider status. ${error?.message || 'Unknown backend function error.'}`)
  }
}

export async function scoreSubmissionWithGemini(submissionId) {
  if (!functions) {
    throw new Error('Firebase Functions is not configured. Check the Firebase frontend configuration first.')
  }

  try {
    const callable = httpsCallable(functions, 'scoreSubmissionWithGemini')
    const response = await callable({ submissionId })
    return response.data
  } catch (error) {
    const message = String(error?.message ?? '')

    if (isFunctionUnavailable(error)) {
      throw new Error('Functions emulator is not running. Start it with npm run functions:serve.')
    }

    if (message.includes('Gemini API key is not configured in functions/.env')) {
      throw new Error('Gemini key is not configured in functions/.env')
    }

    if (message.includes('Gemini response')) {
      throw new Error(message)
    }

    throw new Error(`Unable to score submission with Gemini. ${message || 'Unknown backend function error.'}`)
  }
}
