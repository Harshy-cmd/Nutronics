import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, HeartPulse, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api';

export function ForgotPasswordPage({ disclaimer }: { disclaimer: string }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
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
        <div className="eyebrow">RECOVERY</div>
        <h1>Reset your password</h1>
        <p>
          Enter the email associated with your account, and we will send you instructions
          to reset your password.
        </p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div>
            <div className="auth-success" style={{ margin: '20px 0' }}>
              <CheckCircle2 size={18} />
              <span>
                If an account exists with that email address, a password reset link has been
                sent. The link expires in 30 minutes.
              </span>
            </div>
            <Link
              to="/auth"
              className="button primary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              Return to Sign In <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

            <button
              className="button primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? 'Sending link…' : 'Send reset link'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to="/auth" className="inline-link">
            Remembered your password? Sign in
          </Link>
        </div>

        <p className="disclaimer">{disclaimer}</p>
      </main>
    </div>
  );
}
