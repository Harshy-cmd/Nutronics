import { useEffect, useRef } from 'react';

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (err: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleAuthButton({ onSuccess, onError }: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured. Google Sign-In button is disabled.');
      return;
    }

    const render = () => {
      if (window.google?.accounts?.id && buttonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential?: string }) => {
              if (response.credential) {
                onSuccess(response.credential);
              } else {
                onError?.('Google did not return credentials');
              }
            },
          });

          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 370,
          });
        } catch (e) {
          console.warn('Failed to render Google Sign-In button:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      render();
    } else {
      const timer = setTimeout(render, 400);
      return () => clearTimeout(timer);
    }
  }, [clientId, onSuccess, onError]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="google-btn-wrapper">
      <div ref={buttonRef} />
    </div>
  );
}
