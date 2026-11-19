import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, HeartPulse } from "lucide-react";
import { DISCLAIMER } from "../constants";

export function AuthPage({
  login,
}: {
  login: (email: string, password?: string) => void;
}) {
  const [email, setEmail] = useState("patient@nutronics.org"),
    [password, setPassword] = useState("password123");

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
        <div className="eyebrow">WELCOME BACK</div>
        <h1>Sign in to your care space</h1>
        <p>Use a demo account or sign in with your credentials.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login(email, password);
          }}
        >
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="button primary">
            Sign in <ArrowRight size={16} />
          </button>
        </form>
        <div className="auth-demos">
          <b>Quick demo access</b>
          <button onClick={() => login("patient@nutronics.org")}>
            Patient demo
          </button>
          <button onClick={() => login("doctor@nutronics.org")}>
            Doctor demo
          </button>
          <button onClick={() => login("admin@nutronics.org")}>
            Admin demo
          </button>
        </div>
        <p className="disclaimer">{DISCLAIMER}</p>
        <Link className="inline-link" to="/auth/register">
          New to Nutronics? Create an account <ArrowRight size={14} />
        </Link>
      </main>
    </div>
  );
}
