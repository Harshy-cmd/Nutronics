import { useState, useId } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, HeartPulse, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';

export function ResetPasswordPage({ disclaimer }: { disclaimer: string }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordHelpId = useId();

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    if (pwd.length < 8) return { label: 'Must be at least 8 characters', color: '#bd4436' };
    const hasNum = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    if (hasNum && hasLetter && pwd.length >= 10) {
      return { label: 'Strong password', color: '#167d73' };
    }
    if (hasNum && hasLetter) {
      return { label: 'Good password', color: '#4c9879' };
    }
    return { label: 'Include numbers and letters for a stronger password', color: '#bd8a49' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing from the URL.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.message ||
          'Invalid or expired password reset link. Please request a new one.'
      );
    } finally {
      setLoading(false);
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
        <Link to="/auth" className="text-button">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
      </header>

      <main className="auth-card">
        <span className="card-icon">
          <HeartPulse size={20} />
        </span>
        <div className="eyebrow">NEW PASSWORD</div>
        <h1>Create a new password</h1>
        <p>Choose a secure password of at least 8 characters for your account.</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div>
            <div className="auth-success" style={{ margin: '20px 0' }}>
              <CheckCircle2 size={18} />
              <span>
                Your password has been reset successfully. You can now sign in with your
                new credentials.
              </span>
            </div>
            <Link
              to="/auth"
              className="button primary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              Sign In Now <ArrowRight size={16} />
            </Link>
          </div>
        ) : !token ? (
          <div>
            <div className="auth-error" style={{ margin: '20px 0' }}>
              <AlertCircle size={18} />
              <span>
                This reset link is incomplete or missing a valid token. Please request a
                new password reset link.
              </span>
            </div>
            <Link
              to="/auth/forgot-password"
              className="button primary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              Request New Link <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              New password
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
              Confirm new password
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </label>

            <button
              className="button primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? 'Updating password…' : 'Reset password'}{' '}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        <p className="disclaimer">{disclaimer}</p>
      </main>
    </div>
  );
}
