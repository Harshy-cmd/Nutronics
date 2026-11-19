import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, HeartPulse, AlertCircle } from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';

interface AuthPageProps {
  login: (email: string, password?: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  initialTab?: 'signin' | 'register';
  disclaimer: string;
}

export function AuthPage({
  login,
  register,
  loginWithGoogle,
  initialTab = 'signin',
  disclaimer,
}: AuthPageProps) {
  const [tab, setTab] = useState<'signin' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('45');
  const [conditions, setConditions] = useState('');

  const showDemo = import.meta.env.VITE_SHOW_DEMO === 'true';
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
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Email or password is incorrect');
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
      await loginWithGoogle(credential);
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
          {tab === 'signin' ? 'WELCOME BACK' : 'GET STARTED'}
        </div>
        <h1>
          {tab === 'signin'
            ? 'Sign in to your care space'
            : 'Create your patient account'}
        </h1>
        <p>
          {tab === 'signin'
            ? 'Sign in with your email, password, or Google account.'
            : 'Personalized nutrition and care support, set up around you.'}
        </p>

        {/* Tab Switcher */}
        <div className="auth-tabs">
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
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        {tab === 'signin' && (
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

        {/* Create Account Form */}
        {tab === 'register' && (
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
        {showGoogle && (
          <>
            <div className="auth-divider">or continue with</div>
            <GoogleAuthButton
              onSuccess={handleGoogleSuccess}
              onError={(err) => setError(err)}
            />
          </>
        )}

        {/* Quick Demo Access (only when VITE_SHOW_DEMO is true) */}
        {showDemo && (
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
