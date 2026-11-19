import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, HeartPulse } from "lucide-react";
import { DISCLAIMER } from "../constants";

export function RegisterPage({
  register,
}: {
  register: (payload: any) => void;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [age, setAge] = useState("68"),
    [conditions, setConditions] = useState("DIABETES, HYPERTENSION");

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
          Sign in
        </Link>
      </header>
      <main className="auth-card">
        <span className="card-icon">
          <HeartPulse size={20} />
        </span>
        <div className="eyebrow">GET STARTED</div>
        <h1>Create your patient account</h1>
        <p>Your care space, set up around you.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            register({
              name,
              email,
              password,
              age: Number(age),
              conditions: conditions
                .split(",")
                .map((x) => x.trim().toUpperCase())
                .filter(Boolean),
            });
          }}
        >
          <label>
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
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
              minLength={8}
            />
          </label>
          <label>
            Age
            <input
              type="number"
              min="18"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
          </label>
          <label>
            Conditions, separated by commas
            <input
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
            />
          </label>
          <button className="button primary">
            Create account <ArrowRight size={16} />
          </button>
        </form>
        <p className="disclaimer">{DISCLAIMER}</p>
        <Link className="inline-link" to="/auth/register">
          New to Nutronics? Create an account <ArrowRight size={14} />
        </Link>
      </main>
    </div>
  );
}
