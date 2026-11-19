import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Droplets,
  HeartPulse,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function Landing({ login }: { login: (email: string) => Promise<void> }) {
  const [loginError, setLoginError] = useState("");
  const startDemo = async (email: string) => {
    setLoginError("");
    try {
      await login(email);
    } catch (error) {
      setLoginError((error as Error).message || "Could not sign in. Try again.");
    }
  };

  return (
    <div className="landing">
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
        <span className="sdg-pill">
          <span>3</span> GOOD HEALTH & WELL-BEING
        </span>
      </header>
      <main className="hero">
        <div className="hero-copy">
          <div className="hero-tag">
            <span>✳</span> PERSONALIZED CARE, IN YOUR CORNER
          </div>
          <h1>
            Feel more confident
            <br />
            in your <em>everyday care.</em>
          </h1>
          <p className="hero-sub">
            A calmer way to manage the little things that make a big difference.
            Doctor-reviewed guidance, gentle reminders, and your health story in
            one place.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() => void startDemo("patient@nutronics.org")}
            >
              Explore as a patient <ArrowRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() => void startDemo("doctor@nutronics.org")}
            >
              Doctor sign in <ChevronRight size={16} />
            </button>
          </div>
          {loginError && (
            <div className="auth-error" role="alert">
              {loginError}
            </div>
          )}
          <div className="trust-row">
            <div className="trust-avatars">
              <span>A</span>
              <span>M</span>
              <span>K</span>
            </div>
            <div>
              <b>Care that feels more connected</b>
              <small>Designed for patients, families & care teams</small>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <div className="halo halo-one" />
          <div className="halo halo-two" />
          <div className="hero-orb">
            <div className="orb-core">
              <HeartPulse size={57} />
              <span>
                your health,
                <br />
                in harmony
              </span>
            </div>
          </div>
          <div className="float-card card-heart">
            <span className="mini-icon mint">
              <Activity size={16} />
            </span>
            <div>
              <small>DAILY WELLNESS</small>
              <b>One step at a time</b>
            </div>
            <span className="spark-line">~~~</span>
          </div>
          <div className="float-card card-verified">
            <span className="mini-icon green">
              <ShieldCheck size={17} />
            </span>
            <div>
              <small>YOUR CARE PLAN</small>
              <b>Doctor reviewed</b>
            </div>
            <Check size={16} className="green-text" />
          </div>
          <div className="float-card card-reminder">
            <span className="mini-icon pale">
              <Clock size={17} />
            </span>
            <div>
              <small>A GENTLE NUDGE</small>
              <b>Time for a little water</b>
            </div>
            <Droplets size={17} className="teal-text" />
          </div>
          <div className="art-caption">
            <span>✳</span> WELLNESS, WITH YOU IN MIND
          </div>
        </div>
      </main>
      <section className="feature-strip">
        <div className="feature-intro">
          <div className="eyebrow">A LITTLE MORE PEACE OF MIND</div>
          <h2>Care that fits into real life.</h2>
        </div>
        {[
          {
            icon: ShieldCheck,
            title: "Guidance you can trust",
            text: "A doctor-reviewed approach to everyday nutrition.",
          },
          {
            icon: Clock,
            title: "Small reminders, big help",
            text: "Medication, meals, and water—right on time.",
          },
          {
            icon: HeartPulse,
            title: "Your story, all together",
            text: "Keep track of progress and health records.",
          },
        ].map((f, i) => (
          <div className="feature" key={f.title}>
            <span className={`feature-icon fi-${i}`}>
              <f.icon size={20} />
            </span>
            <div>
              <b>{f.title}</b>
              <p>{f.text}</p>
            </div>
          </div>
        ))}
      </section>
      <div className="demo-banner">
        <span>
          <Sparkles size={17} /> Try the local demo with one click
        </span>
        <button onClick={() => void startDemo("patient@nutronics.org")}>
          Patient <ArrowRight size={15} />
        </button>
        <button onClick={() => void startDemo("doctor@nutronics.org")}>
          Doctor <ArrowRight size={15} />
        </button>
        <button onClick={() => void startDemo("admin@nutronics.org")}>
          Admin <ArrowRight size={15} />
        </button>
      </div>
      <footer className="landing-footer">
        © 2026 Nutronics <span>·</span> Thoughtful digital health for everyday
        life
      </footer>
    </div>
  );
}
