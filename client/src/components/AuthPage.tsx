import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, HeartPulse, AlertCircle } from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';

interface AuthPageProps {
  login: (email: string, password?: string, portalRole?: 'DOCTOR' | 'ADMIN') => Promise<void>;
  register: (payload: any) => Promise<void>;
  loginWithGoogle: (credential: string, portalRole?: 'DOCTOR' | 'ADMIN') => Promise<void>;
  requestOtp: (email: string, portalRole: 'DOCTOR' | 'ADMIN') => Promise<void>;
  loginWithOtp: (email: string, code: string, portalRole: 'DOCTOR' | 'ADMIN') => Promise<void>;
  portalRole?: 'DOCTOR' | 'ADMIN';
  initialTab?: 'signin' | 'register';
  disclaimer: string;
}

export function AuthPage({
  login,
  register,
  loginWithGoogle,
  requestOtp,
  loginWithOtp,
  portalRole,
  initialTab = 'signin',
  disclaimer,
}: AuthPageProps) {
  const [tab, setTab] = useState<'signin' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('45');
  const [conditions, setConditions] = useState('');

  const showDemo = import.meta.env.DEV && import.meta.env.VITE_SHOW_DEMO === 'true';
  const showGoogle = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const passwordHelpId = useId();

  // Password strength hint
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    if (pwd.length < 8) return { label: 'Too short (min 8 characters)', color: '#bd4436' };
    const hasNum = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    if (hasNum && hasLetter && pwd.length >= 10) {
      return { label: 'Strong password', color: '#167d73' };
    }
    if (hasNum && hasLetter) {
      return { label: 'Good password', color: '#4c9879' };
    }
    return { label: 'Include both letters and numbers for a stronger password', color: '#bd8a49' };
  };

  const strength = tab === 'register' ? getPasswordStrength(password) : null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password, portalRole);
    } catch (err: any) {
      setError(err.message || 'Email or password is incorrect');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!portalRole) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await requestOtp(email.trim(), portalRole);
      setOtpSent(true);
      setNotice('If an eligible account exists, a sign-in code has been sent.');
    } catch (err: any) {
      setError(err.message || 'Could not send a sign-in code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalRole) return;
    setError('');
    setSubmitting(true);
    try {
      await loginWithOtp(email.trim(), otp.trim(), portalRole);
    } catch (err: any) {
      setError(err.message || 'The code is invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setSubmitting(true);
    try {
      const conds = conditions
        .split(',')
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean);

      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        age: Number(age) || 30,
        conditions: conds,
      });
    } catch (err: any) {
      setError(err.message || 'Unable to register. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setSubmitting(true);
    try {
      await loginWithGoogle(credential, portalRole);
    } catch (err: any) {
      setError(err.message || 'Google sign-in could not be completed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing auth-view">
      <header className="landing-nav">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <HeartPulse size={24} />
          </span>
          <span>
            <b>nutronics</b>
            <small>SMART HEALTH COMPANION</small>
          </span>
        </Link>
        <Link to="/" className="text-button">
          Back to home
        </Link>
      </header>

      <main className="auth-card">
        <span className="card-icon">
          <HeartPulse size={20} />
        </span>
        <div className="eyebrow">
          {portalRole ? `${portalRole} PORTAL` : tab === 'signin' ? 'WELCOME BACK' : 'GET STARTED'}
        </div>
        <h1>
          {portalRole
            ? portalRole === 'DOCTOR' ? 'Doctor sign in' : 'Administrator sign in'
            : tab === 'signin'
            ? 'Sign in to your care space'
            : 'Create your patient account'}
        </h1>
        <p>
          {portalRole
            ? 'Use your provisioned staff account. Choose a password, email code, or Google sign-in.'
            : tab === 'signin'
            ? 'Sign in with your email, password, or Google account.'
            : 'Personalized nutrition and care support, set up around you.'}
        </p>

        {/* Tab Switcher */}
        {!portalRole && <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'signin' ? 'active' : ''}
            onClick={() => {
              setTab('signin');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'active' : ''}
            onClick={() => {
              setTab('register');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>}

        {portalRole && (
          <div className="auth-tabs" role="tablist" aria-label="Staff sign-in method">
            <button type="button" className={authMethod === 'password' ? 'active' : ''} onClick={() => { setAuthMethod('password'); setError(''); setNotice(''); }}>
              Password
            </button>
            <button type="button" className={authMethod === 'otp' ? 'active' : ''} onClick={() => { setAuthMethod('otp'); setError(''); setNotice(''); }}>
              Email code
            </button>
          </div>
        )}

        {notice && <div className="auth-notice" role="status">{notice}</div>}
        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        {tab === 'signin' && authMethod === 'password' && (
          <form onSubmit={handleSignIn}>
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password</span>
                <Link
                  to="/auth/forgot-password"
                  style={{ fontSize: '10px', color: 'var(--teal)', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button className="button primary" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {portalRole && authMethod === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <label>
              Work email
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@work.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setOtpSent(false); setNotice(''); }}
              />
            </label>
            {otpSent && (
              <label>
                6-digit sign-in code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
            )}
            {!otpSent ? (
              <button type="button" className="button primary" disabled={submitting || !email.trim()} onClick={() => void handleRequestOtp()} style={{ width: '100%' }}>
                {submitting ? 'Sending code…' : 'Send sign-in code'} <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button className="button primary" disabled={submitting || otp.length !== 6} style={{ width: '100%' }}>
                  {submitting ? 'Verifying…' : 'Verify and sign in'} <ArrowRight size={16} />
                </button>
                <button type="button" className="text-button" disabled={submitting} onClick={() => void handleRequestOtp()}>
                  Send a new code
                </button>
              </>
            )}
          </form>
        )}

        {/* Create Account Form */}
        {!portalRole && tab === 'register' && (
          <form onSubmit={handleRegister}>
            <label>
              Full name
              <input
                required
                minLength={2}
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={passwordHelpId}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {strength && (
                <span id={passwordHelpId} className="password-hint" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              )}
            </label>

            <label>
              Age
              <input
                type="number"
                min={18}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </label>

            <label>
              Health conditions (optional, comma-separated)
              <input
                placeholder="e.g. Diabetes, Hypertension"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              />
            </label>

            <button className="button primary" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Creating account…' : 'Create patient account'}{' '}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Google Sign-in */}
        {showGoogle && tab === 'signin' && (
          <>
            <div className="auth-divider">or continue with</div>
            <GoogleAuthButton
              onSuccess={handleGoogleSuccess}
              onError={(err) => setError(err)}
            />
          </>
        )}

        {/* Quick Demo Access (only when VITE_SHOW_DEMO is true) */}
        {!portalRole && showDemo && (
          <div className="auth-demos">
            <b>Quick demo access</b>
            <button
              type="button"
              onClick={() => login('patient@nutronics.org', 'password123')}
            >
              Patient demo
            </button>
            <button
              type="button"
              onClick={() => login('doctor@nutronics.org', 'password123')}
            >
              Doctor demo
            </button>
            <button
              type="button"
              onClick={() => login('admin@nutronics.org', 'password123')}
            >
              Admin demo
            </button>
          </div>
        )}

        <p className="disclaimer">{disclaimer}</p>
      </main>
    </div>
  );
}
