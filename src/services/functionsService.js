import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase.js'

function getFriendlyFunctionError(error) {
  const message = String(error?.message ?? '')
  const code = String(error?.code ?? '')

  if (
    code.includes('unavailable') ||
    code.includes('not-found') ||
    code.includes('deadline-exceeded') ||
    message.toLowerCase().includes('function not found') ||
    message.toLowerCase().includes('service unavailable') ||
    message.toLowerCase().includes('failed to fetch')
  ) {
    return 'Backend function is not running. Start Firebase emulator or deploy the function later.'
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
