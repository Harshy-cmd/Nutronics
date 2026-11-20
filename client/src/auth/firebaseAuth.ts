const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();

export const firebaseAuthEnabled = Boolean(apiKey && import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim());

type FirebaseAuthResponse = {
  idToken?: string;
  error?: { message?: string };
};

async function firebaseRequest<T extends FirebaseAuthResponse>(method: string, body: object): Promise<T> {
  if (!apiKey) throw new Error('Firebase sign-in is not configured for this deployment.');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as T;
  if (!response.ok) {
    const code = result.error?.message || '';
    if (code.includes('OPERATION_NOT_ALLOWED')) {
      throw new Error('Enable this sign-in method in Firebase Authentication settings, then try again.');
    }
    if (code.includes('API_KEY_INVALID')) {
      throw new Error('Firebase API key is invalid. Check the VITE_FIREBASE_API_KEY deployment setting.');
    }
    if (code.includes('INVALID_OOB_CODE') || code.includes('EXPIRED_OOB_CODE')) {
      throw new Error('This sign-in link is invalid or expired. Request a new link.');
    }
    throw new Error('Firebase could not complete sign-in. Check the Firebase Authentication settings.');
  }
  return result;
}

export async function sendFirebaseEmailLink(email: string, returnPath: string) {
  const continueUrl = new URL(returnPath, window.location.origin).toString();
  await firebaseRequest('sendOobCode', {
    requestType: 'EMAIL_SIGNIN',
    email,
    continueUrl,
    canHandleCodeInApp: true,
  });
}

export async function completeFirebaseEmailLink(email: string, oobCode: string): Promise<string> {
  const result = await firebaseRequest('signInWithEmailLink', { email, oobCode });
  if (!result.idToken) throw new Error('Firebase did not return a sign-in token.');
  return result.idToken;
}

export async function exchangeGoogleCredentialForFirebaseToken(googleIdToken: string): Promise<string> {
  const result = await firebaseRequest('signInWithIdp', {
    postBody: new URLSearchParams({ id_token: googleIdToken, providerId: 'google.com' }).toString(),
    requestUri: window.location.origin,
    returnIdpCredential: true,
    returnSecureToken: true,
  });
  if (!result.idToken) throw new Error('Firebase did not return a sign-in token.');
  return result.idToken;
}
