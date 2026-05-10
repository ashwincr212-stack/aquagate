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
    return 'Backend function is not running. Start the Functions emulator with npm run functions:serve.'
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
