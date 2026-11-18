import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Heart,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  Watch,
  Weight,
  X,
  AlertTriangle,
  Droplets,
  Utensils,
  TrendingUp,
  Sparkles,
  CircleHelp,
  Eye,
  Sun,
  Download,
} from "lucide-react";
import { api } from "./api";
const disclaimer =
  "General guidance, not a substitute for professional medical advice.";
type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  age?: number;
  conditions?: string[];
};
function Badge({ status = "VERIFIED" }: { status?: string }) {
  return (
    <span className={`badge ${status === "VERIFIED" ? "verified" : "pending"}`}>
      <ShieldCheck size={14} />
      {status === "VERIFIED" ? "Doctor verified" : "Needs review"}
    </span>
  );
}
export default function App() {
  const [me, setMe] = useState<User | null>(null),
    [route, setRoute] = useState("home"),
    [data, setData] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [sos, setSos] = useState(false),
    [large, setLarge] = useState(localStorage.getItem("textSize") || "16px"),
    [contrast, setContrast] = useState(
      localStorage.getItem("contrast") === "true",
    ),
    [mobile, setMobile] = useState(false);
  const navigate = useNavigate(),
    loc = useLocation();
  useEffect(() => {
    const user = localStorage.getItem("nutronics_user");
    if (user) setMe(JSON.parse(user));
  }, []);
  const role = me?.role || "PATIENT";
  const groups: Record<
    string,
    { key: string; label: string; icon: any; url: string }[]
  > = {
    PATIENT: [
      { key: "home", label: "Overview", icon: Home, url: "/patient/home" },
      {
        key: "diet",
        label: "My diet plan",
        icon: Utensils,
        url: "/patient/diet",
      },
      {
        key: "reminders",
        label: "Reminders",
        icon: CalendarCheck,
        url: "/patient/reminders",
      },
      {
        key: "progress",
        label: "My progress",
        icon: TrendingUp,
        url: "/patient/progress",
      },
      {
        key: "assistant",
        label: "Nutrition assistant",
        icon: Sparkles,
        url: "/patient/assistant",
      },
      {
        key: "records",
        label: "Health records",
        icon: FileText,
        url: "/patient/records",
      },
      {
        key: "devices",
        label: "Connected devices",
        icon: Watch,
        url: "/patient/devices",
      },
      {
        key: "profile",
        label: "Profile & settings",
        icon: Settings,
        url: "/patient/profile",
      },
    ],
    DOCTOR: [
      {
        key: "dashboard",
        label: "Overview",
        icon: Home,
        url: "/doctor/dashboard",
      },
      {
        key: "verification",
        label: "Review queue",
        icon: ShieldCheck,
        url: "/doctor/verification",
      },
      {
        key: "guidelines",
        label: "Care guidelines",
        icon: BookOpen,
        url: "/doctor/guidelines",
      },
    ],
    ADMIN: [
      {
        key: "dashboard",
        label: "Overview",
        icon: Home,
        url: "/admin/dashboard",
      },
      {
        key: "users",
        label: "User management",
        icon: Users,
        url: "/admin/users",
      },
      {
        key: "config",
        label: "System settings",
        icon: Settings,
        url: "/admin/config",
      },
    ],
  };
  const nav = groups[role] || groups.PATIENT;
  const key =
    nav.find((i) => loc.pathname === i.url)?.key ||
    (role === "DOCTOR" && loc.pathname.includes("/patients/")
      ? "patient-detail"
      : route);
  const title =
    key === "patient-detail"
      ? "Patient clinical detail"
      : nav.find((i) => i.key === key)?.label || "Welcome to Nutronics";
  const load = async (k = key) => {
    if (!me) return;
    setBusy(true);
    try {
      const path: Record<string, string> = {
        home: "/patient/dashboard",
        diet: "/patient/diet",
        reminders: "/patient/reminders",
        progress: "/patient/progress",
        assistant: "/patient/assistant/history",
        records: "/patient/records",
        devices: "/patient/devices",
        profile: "/patient/profile",
        dashboard: role === "DOCTOR" ? "/doctor/dashboard" : "/admin/stats",
        verification: "/doctor/verification-queue",
        guidelines: "/doctor/guidelines",
        users: "/admin/users",
        config: "/admin/config",
      };
      setData(
        k === "patient-detail"
          ? await api(`/doctor/patients/${loc.pathname.split("/").pop()}`)
          : await api(path[k] || path.home),
      );
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (me) load(key);
  }, [me, key]);
  useEffect(() => {
    document.documentElement.style.setProperty("--base-size", large);
    document.documentElement.classList.toggle("high-contrast", contrast);
    localStorage.setItem("textSize", large);
    localStorage.setItem("contrast", String(contrast));
  }, [large, contrast]);
  const msg = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 3000);
  };
  const logout = () => {
    localStorage.clear();
    setMe(null);
    navigate("/");
  };
  const login = async (email: string, password = "password123") => {
    try {
      const a = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("nutronics_token", a.token);
      localStorage.setItem("nutronics_user", JSON.stringify(a.user));
      setMe(a.user);
      navigate(
        a.user.role === "PATIENT"
          ? "/patient/home"
          : a.user.role === "DOCTOR"
            ? "/doctor/dashboard"
            : "/admin/dashboard",
      );
    } catch (e) {
      msg((e as Error).message);
    }
  };
  const register = async (payload: any) => {
    try {
      const a = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem("nutronics_token", a.token);
      localStorage.setItem("nutronics_user", JSON.stringify(a.user));
      setMe(a.user);
      navigate("/patient/home");
    } catch (e) {
      msg((e as Error).message);
    }
  };
  if (!me && loc.pathname === "/auth/register")
    return <RegisterPage register={register} />;
  if (!me && loc.pathname === "/auth") return <AuthPage login={login} />;
  if (!me && !loc.pathname.startsWith("/auth"))
    return <Landing login={login} />;
  if (!me) return <Landing login={login} />;
  const sosAction = async () => {
    setSos(false);
    try {
      const r = await api("/patient/sos", { method: "POST", body: "{}" });
      msg(`Alert logged. ${r.contacts.length} emergency contact(s) listed.`);
    } catch (e) {
      msg((e as Error).message);
    }
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link
          className="brand"
          to={
            role === "PATIENT"
              ? "/patient/home"
              : role === "DOCTOR"
                ? "/doctor/dashboard"
                : "/admin/dashboard"
          }
        >
          <span className="brand-mark">
            <HeartPulse size={24} />
          </span>
          <span>
            <b>nutronics</b>
            <small>SMART HEALTH COMPANION</small>
          </span>
        </Link>
        <div className="workspace-label">
          {role === "PATIENT"
            ? "YOUR HEALTH"
            : role === "DOCTOR"
              ? "CLINICAL WORKSPACE"
              : "PLATFORM"}
        </div>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.key}
              to={item.url}
              onClick={() => setMobile(false)}
              className={`nav-link ${key === item.key ? "active" : ""}`}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.key === "verification" && data?.items?.length > 0 && (
                <em>{data.items.length}</em>
              )}
            </Link>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="care-card">
            <div className="care-icon">
              <Heart size={17} />
            </div>
            <div>
              <b>Care, made personal.</b>
              <p>Your health journey is yours. Weâ€™re here to help.</p>
            </div>
          </div>
          <button className="nav-link logout" onClick={logout}>
            <LogOut size={18} /> Sign out
          </button>
          <div className="user-mini">
            <div className="avatar">
              {me.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <b>{me.name}</b>
              <small>
                {role === "PATIENT"
                  ? "Patient account"
                  : role === "DOCTOR"
                    ? "Care team"
                    : "Administrator"}
              </small>
            </div>
            <ChevronRight size={16} />
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="crumb">
            <span>Nutronics</span>
            <ChevronRight size={14} />
            <b>{title}</b>
          </div>
          <div className="top-actions">
            <label className="size-control">
              <span>Text</span>
              <select
                aria-label="Text size"
                value={large}
                onChange={(e) => setLarge(e.target.value)}
              >
                <option value="16px">A</option>
                <option value="18px">A+</option>
                <option value="20px">A++</option>
              </select>
            </label>
            <button
              className={`icon-button ${contrast ? "on" : ""}`}
              onClick={() => setContrast(!contrast)}
              aria-label="Toggle high contrast"
            >
              <Eye size={18} />
            </button>
            <button
              className="icon-button notifications"
              aria-label="Notifications"
              onClick={() => msg("Youâ€™re all caught up")}
            >
              <Bell size={19} />
              <i />
            </button>
            {role === "PATIENT" && (
              <button className="sos-button" onClick={() => setSos(true)}>
                <AlertTriangle size={16} /> SOS Emergency
              </button>
            )}
          </div>
        </header>
        <section className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {role === "PATIENT"
                  ? "YOUR PERSONAL HEALTH SPACE"
                  : role === "DOCTOR"
                    ? "PATIENT CARE"
                    : "SYSTEM OVERVIEW"}
              </div>
              <h1>{title}</h1>
              <p>
                {key === "home"
                  ? `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${me.name.split(" ")[0]}. Hereâ€™s your health at a glance.`
                  : "A clearer view of your care, all in one place."}
              </p>
            </div>
            <span className="today-pill">
              <span className="dot" />
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {busy && !data ? (
            <div className="loading">Loading your health informationâ€¦</div>
          ) : (
            <Page
              key={key}
              page={key}
              data={data}
              role={role}
              refresh={() => load(key)}
              notify={msg}
            />
          )}
        </section>
        <footer className="app-footer">
          <span>
            <HeartPulse size={15} /> Nutronics Â· SDG 3: Good Health &
            Well-Being
          </span>
          <span>{disclaimer}</span>
        </footer>
      </main>
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {sos && (
        <div className="modal-back">
          <div className="modal sos-modal">
            <button
              className="close"
              onClick={() => setSos(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="sos-icon">
              <AlertTriangle size={26} />
            </div>
            <div className="eyebrow red">URGENT ASSISTANCE</div>
            <h2>Send an SOS alert?</h2>
            <p>
              This will record an emergency alert and show your saved emergency
              contacts.
            </p>
            <div className="modal-actions">
              <button className="button subtle" onClick={() => setSos(false)}>
                Iâ€™m okay
              </button>
              <button className="button danger" onClick={sosAction}>
                Send SOS alert
              </button>
            </div>
            <small>Demo alerts are recorded locally and do not send SMS.</small>
          </div>
        </div>
      )}
    </div>
  );
}
function Landing({ login }: { login: (email: string) => void }) {
  const [slide, setSlide] = useState(0);
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
            <span>âœ³</span> PERSONALIZED CARE, IN YOUR CORNER
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
              onClick={() => login("patient@nutronics.org")}
            >
              Explore as a patient <ArrowRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() => login("doctor@nutronics.org")}
            >
              Doctor sign in <ChevronRight size={16} />
            </button>
          </div>
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
            <span className="spark-line">âŒâŒâŒ</span>
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
            <span>âœ³</span> WELLNESS, WITH YOU IN MIND
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
            text: "Medication, meals, and waterâ€”right on time.",
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
        <button onClick={() => login("patient@nutronics.org")}>
          Patient <ArrowRight size={15} />
        </button>
        <button onClick={() => login("doctor@nutronics.org")}>
          Doctor <ArrowRight size={15} />
        </button>
        <button onClick={() => login("admin@nutronics.org")}>
          Admin <ArrowRight size={15} />
        </button>
      </div>
      <footer className="landing-footer">
        Â© 2026 Nutronics <span>Â·</span> Thoughtful digital health for everyday
        life
      </footer>
    </div>
  );
}
function Page({
  page,
  data,
  role,
  refresh,
  notify,
}: {
  page: string;
  data: any;
  role: string;
  refresh: () => void;
  notify: (s: string) => void;
}) {
  const [question, setQuestion] = useState(""),
    [reply, setReply] = useState<any>(null),
    [form, setForm] = useState<any>({}),
    [filter, setFilter] = useState("ALL");
  const submit = async (path: string, method = "POST", body: any = {}) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      notify("Saved successfully");
      refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };
  if (page === "home")
    return (
      <>
        <div className="stat-grid">
          <Stat
            label="Your care plan"
            value="On track"
            note="A steady, healthy rhythm"
            icon={HeartPulse}
            tint="mint"
          />
          <Stat
            label="Todayâ€™s reminders"
            value={`${data?.reminders?.filter((r: any) => !r.done).length || 0} to go`}
            note="Youâ€™ve got this"
            icon={Clock}
            tint="peach"
          />
          <Stat
            label="Daily hydration"
            value={`${data?.log?.water || "â€”"} ml`}
            note="A sip at a time"
            icon={Droplets}
            tint="blue"
          />
        </div>
        <div className="dashboard-grid">
          <Card
            title="A little progress, every day"
            subtitle="Your recent care plan adherence"
            icon={TrendingUp}
          >
            <div className="progress-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="41" className="ring-bg" />
                <circle
                  cx="50"
                  cy="50"
                  r="41"
                  className="ring-value"
                  strokeDasharray={`${(data?.adherence || 80) * 2.58} 258`}
                />
              </svg>
              <div>
                <b>{Math.round(data?.adherence || 80)}%</b>
                <small>THIS WEEK</small>
              </div>
            </div>
            <div className="ring-caption">
              <b>Consistency is its own kind of progress.</b>
              <small>Every small choice adds up.</small>
            </div>
          </Card>
          <Card
            title="Todayâ€™s gentle schedule"
            subtitle="Take things one step at a time"
            icon={CalendarCheck}
          >
            <div className="schedule">
              {(data?.reminders || []).slice(0, 4).map((r: any) => (
                <div
                  className={`schedule-item ${r.done ? "done" : ""}`}
                  key={r.id}
                >
                  <button
                    className="check-circle"
                    aria-label={`Mark ${r.label} complete`}
                    onClick={() =>
                      submit(`/patient/reminders/${r.id}`, "PATCH", {
                        done: !r.done,
                      })
                    }
                  >
                    {r.done ? <Check size={15} /> : null}
                  </button>
                  <div>
                    <b>{r.label}</b>
                    <small>
                      {r.kind} Â· {r.time}
                    </small>
                  </div>
                  <span className="time-tag">{r.time}</span>
                </div>
              ))}
            </div>
            <Link className="inline-link" to="/patient/reminders">
              See all reminders <ArrowRight size={15} />
            </Link>
          </Card>
        </div>
        <Card
          title="Thoughtfully planned for you"
          subtitle="Todayâ€™s meals Â· Doctor reviewed"
          icon={Utensils}
        >
          <div className="meal-row">
            {(data?.meals || []).map((m: any) => (
              <div className="meal-card" key={m.id}>
                <span className="meal-time">{m.slot}</span>
                <b>{m.name}</b>
                <small>
                  {m.calories} kcal Â· {m.proteinG}g protein
                </small>
                <Badge status={m.status} />
              </div>
            ))}
          </div>
        </Card>
        <QuickLinks />
      </>
    );
  if (page === "diet")
    return (
      <>
        <div className="tabs">
          <button className="selected">Today</button>
          <button>This week</button>
          <span>7-day plan Â· reviewed by Dr. Priya Menon</span>
        </div>
        <div className="meal-list">
          {(data?.meals || []).map((m: any) => (
            <article className="meal-detail" key={m.id}>
              <div className="meal-illustration">
                <Utensils size={23} />
              </div>
              <div className="meal-info">
                <span className="meal-time">
                  DAY {m.day + 1} Â· {m.slot.toUpperCase()}
                </span>
                <h3>{m.name}</h3>
                <p>
                  {m.servingSize} Â· {m.calories} kcal
                </p>
                <Badge status={m.status} />
              </div>
              <div className="nutrient-row">
                <span>
                  <b>{m.proteinG}g</b>
                  <small>Protein</small>
                </span>
                <span>
                  <b>{m.carbsG}g</b>
                  <small>Carbs</small>
                </span>
                <span>
                  <b>{m.fatG}g</b>
                  <small>Fat</small>
                </span>
                <span>
                  <b>{m.sodiumMg}mg</b>
                  <small>Sodium</small>
                </span>
                <span>
                  <b>{m.sugarG}g</b>
                  <small>Sugar</small>
                </span>
              </div>
              <button
                className="button outline"
                onClick={async () => {
                  const r = await api("/shared/foods");
                  const choice = r.foods.find((x: any) => x.id !== m.food_id);
                  await submit("/patient/diet/swap", "POST", {
                    mealId: m.id,
                    foodId: choice.id,
                  });
                }}
              >
                Swap meal
              </button>
            </article>
          ))}
        </div>
        <p className="disclaimer">{disclaimer}</p>
      </>
    );
  if (page === "reminders")
    return (
      <>
        <div className="toolbar">
          <div className="filter-pills">
            {["ALL", "Medicine", "Water", "Meal"].map((x) => (
              <button
                className={filter === x ? "selected" : ""}
                key={x}
                onClick={() => setFilter(x)}
              >
                {x === "ALL" ? "All reminders" : x}
              </button>
            ))}
          </div>
          <button
            className="button primary"
            onClick={() => {
              const label = prompt("Reminder name");
              if (label)
                submit("/patient/reminders", "POST", {
                  label,
                  kind: "Medicine",
                  time: "12:00",
                });
            }}
          >
            <Plus size={16} /> Add reminder
          </button>
        </div>
        <div className="reminder-list">
          {(data?.reminders || [])
            .filter((r: any) => filter === "ALL" || r.kind === filter)
            .map((r: any) => (
              <div className="reminder-item" key={r.id}>
                <span className={`reminder-icon ${r.kind.toLowerCase()}`}>
                  {r.kind === "Water" ? (
                    <Droplets />
                  ) : r.kind === "Meal" ? (
                    <Utensils />
                  ) : (
                    <Clock />
                  )}
                </span>
                <div className="reminder-text">
                  <b>{r.label}</b>
                  <small>{r.kind} reminder</small>
                </div>
                <span className="time-tag">{r.time}</span>
                <button
                  className="button small subtle"
                  onClick={() =>
                    submit(`/patient/reminders/${r.id}`, "PATCH", {
                      snooze: true,
                    })
                  }
                >
                  Snooze 15m
                </button>
                <button
                  className={`button small ${r.done ? "subtle" : "outline"}`}
                  onClick={() =>
                    submit(`/patient/reminders/${r.id}`, "PATCH", {
                      done: !r.done,
                    })
                  }
                >
                  {r.done ? "Done" : "Mark done"}
                </button>
              </div>
            ))}
        </div>
      </>
    );
  if (page === "progress")
    return (
      <>
        <Card
          title="Your wellbeing, over time"
          subtitle="A gentle look at the trends youâ€™re building"
          icon={TrendingUp}
        >
          <div className="chart">
            {(data?.logs || []).slice(-14).map((l: any, i: number) => (
              <div className="chart-col" key={i}>
                <span style={{ height: `${(l.adherence || 10) * 1.5}px` }} />
                <small>{l.date?.slice(5)}</small>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <i /> Care plan adherence
          </div>
        </Card>
        <Card
          title="Add todayâ€™s check-in"
          subtitle="A few numbers help you notice patterns"
          icon={Plus}
        >
          <div className="form-grid">
            {[
              ["weight", "Weight (kg)"],
              ["water", "Water (ml)"],
              ["calories", "Calories"],
              ["systolic", "Systolic BP"],
              ["diastolic", "Diastolic BP"],
              ["glucose", "Fasting glucose"],
            ].map(([k, l]) => (
              <label key={k}>
                {l}
                <input
                  type="number"
                  onChange={(e) =>
                    setForm({ ...form, [k]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
            <label className="wide">
              Symptoms or notes
              <input
                placeholder="How are you feeling today?"
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              />
            </label>
          </div>
          <button
            className="button primary"
            onClick={() => submit("/patient/progress", "POST", form)}
          >
            Save check-in
          </button>
        </Card>
      </>
    );
  if (page === "assistant")
    return (
      <>
        <div className="assistant-intro">
          <span className="ai-avatar">
            <Sparkles />
          </span>
          <div>
            <b>A little clarity, whenever you need it.</b>
            <p>
              Ask about a food, a meal swap, or medicine timing. New guidance
              may need your doctorâ€™s review.
            </p>
          </div>
        </div>
        <Card
          title="Ask your nutrition assistant"
          subtitle="Personalized to your care profile"
          icon={MessageCircle}
        >
          <div className="chat-history">
            {(data?.messages || []).slice(-5).map((m: any) => (
              <div className="chat-pair" key={m.id}>
                <div className="bubble user-bubble">{m.question}</div>
                <div className="bubble assistant-bubble">
                  {m.answer}
                  <Badge status={m.status} />
                </div>
              </div>
            ))}
            {reply && (
              <div className="bubble assistant-bubble">
                {reply.answer}
                {reply.food && (
                  <div className="macro-mini">
                    {reply.food.calories} kcal Â· {reply.food.proteinG}g protein
                    Â· {reply.food.sodiumMg}mg sodium
                  </div>
                )}
                <Badge status={reply.verificationStatus} />
              </div>
            )}
          </div>
          <div className="suggestions">
            {[
              "Can I eat mango with diabetes?",
              "Low-sodium breakfast swap for idli",
              "When should I take Metformin?",
            ].map((x) => (
              <button key={x} onClick={() => setQuestion(x)}>
                {x}
              </button>
            ))}
          </div>
          <div className="chat-input">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && question) {
                  const r = await api("/patient/assistant/ask", {
                    method: "POST",
                    body: JSON.stringify({ question }),
                  });
                  setReply(r);
                  setQuestion("");
                  refresh();
                }
              }}
              placeholder="Ask about a food or your care planâ€¦"
            />
            <button
              aria-label="Send question"
              onClick={async () => {
                if (!question) return;
                const r = await api("/patient/assistant/ask", {
                  method: "POST",
                  body: JSON.stringify({ question }),
                });
                setReply(r);
                setQuestion("");
                refresh();
              }}
            >
              <ArrowRight />
            </button>
          </div>
        </Card>
        <p className="disclaimer">{disclaimer}</p>
      </>
    );
  if (page === "records")
    return (
      <>
        <Card
          title="Your health records"
          subtitle="Keep important documents close at hand"
          icon={FileText}
        >
          <div className="upload-zone">
            <input
              type="file"
              id="upload"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("category", "Health document");
                  await api("/patient/records", { method: "POST", body: fd });
                  refresh();
                  notify("Record uploaded");
                }
              }}
            />
            <label htmlFor="upload">
              <Plus size={18} /> Upload a record{" "}
              <small>PDF, PNG, JPG, TXT Â· up to 5 MB</small>
            </label>
          </div>
          <div className="record-list">
            {(data?.records || []).map((r: any) => (
              <div className="record-item" key={r.id}>
                <FileText />
                <div>
                  <b>{r.name}</b>
                  <small>
                    {r.category} Â· {r.created_at?.slice(0, 10)}
                  </small>
                </div>
                <a
                  className="icon-button"
                  href={`http://localhost:4000/api/patient/records/${r.id}/download`}
                  onClick={(e) => {
                    e.preventDefault();
                    api(`/patient/records/${r.id}/download`).catch(() => {});
                    window.open(
                      `http://localhost:4000/api/patient/records/${r.id}/download`,
                      "_blank",
                    );
                  }}
                  aria-label="Download record"
                >
                  <Download size={18} />
                </a>
              </div>
            ))}
          </div>
        </Card>
      </>
    );
  if (page === "devices")
    return (
      <Card
        title="Devices that keep you connected"
        subtitle="Simulated device pairing for this demo"
        icon={Watch}
      >
        <div className="device-list">
          {(data?.devices || []).map((d: any) => (
            <div className="device-item" key={d.id}>
              <span className="device-icon">
                <Watch />
              </span>
              <div>
                <b>{d.name}</b>
                <small>
                  {d.paired ? "Connected and ready" : "Available to pair"}
                </small>
              </div>
              {d.paired && (
                <button
                  className="button outline"
                  onClick={async () => {
                    const r = await api(`/patient/devices/${d.id}/sync`, {
                      method: "POST",
                      body: "{}",
                    });
                    await submit("/patient/progress", "POST", r.reading);
                  }}
                >
                  Sync reading
                </button>
              )}
              <button
                className={`button small ${d.paired ? "subtle" : "primary"}`}
                onClick={async () => {
                  await submit(`/patient/devices/${d.id}`, "PATCH", {
                    paired: !d.paired,
                  });
                }}
              >
                {d.paired ? "Unpair" : "Pair"}
              </button>
            </div>
          ))}
        </div>
        <p className="disclaimer">
          Device readings are synthetic in this demo. {disclaimer}
        </p>
      </Card>
    );
  if (page === "profile")
    return (
      <>
        <Card
          title="Your profile"
          subtitle="Help us personalize your care space"
          icon={Settings}
        >
          <div className="form-grid">
            <label>
              Full name
              <input defaultValue={data?.user?.name} id="name" />
            </label>
            <label>
              Age
              <input type="number" defaultValue={data?.user?.age} id="age" />
            </label>
            <label className="wide">
              Health conditions
              <input
                defaultValue={(data?.user?.conditions || []).join(", ")}
                id="conditions"
              />
              <small>Separate conditions with commas.</small>
            </label>
          </div>
          <button
            className="button primary"
            onClick={() =>
              submit("/patient/profile", "PATCH", {
                name: (document.getElementById("name") as HTMLInputElement)
                  .value,
                age: Number(
                  (document.getElementById("age") as HTMLInputElement).value,
                ),
                conditions: (
                  document.getElementById("conditions") as HTMLInputElement
                ).value
                  .split(",")
                  .map((x) => x.trim().toUpperCase())
                  .filter(Boolean),
              })
            }
          >
            Save profile
          </button>
        </Card>
        <Card
          title="Emergency contacts"
          subtitle="People you trust to reach in an urgent moment"
          icon={Heart}
        >
          {(data?.contacts || []).map((c: any) => (
            <div className="record-item" key={c.id}>
              <div className="avatar">{c.name[0]}</div>
              <div>
                <b>{c.name}</b>
                <small>
                  {c.relationship} Â· {c.phone}
                </small>
              </div>
            </div>
          ))}
          <button
            className="button outline"
            onClick={() => {
              const name = prompt("Contact name"),
                phone = prompt("Phone number");
              if (name && phone)
                submit("/patient/contacts", "POST", {
                  name,
                  phone,
                  relationship: "Family",
                });
            }}
          >
            <Plus size={16} /> Add contact
          </button>
        </Card>
      </>
    );
  if (page === "patient-detail")
    return (
      <>
        <div className="stat-grid">
          <Stat
            label="Patient"
            value={data?.patient?.name || "—"}
            note={`Age ${data?.patient?.age || "—"}`}
            icon={HeartPulse}
            tint="mint"
          />
          <Stat
            label="Conditions"
            value={(data?.patient?.conditions || []).length}
            note={(data?.patient?.conditions || []).join(", ")}
            icon={Activity}
            tint="blue"
          />
          <Stat
            label="SOS alerts"
            value={(data?.sos || []).length}
            note="Recent recorded events"
            icon={AlertTriangle}
            tint="peach"
          />
        </div>
        <Card
          title="Progress history"
          subtitle="Recent patient check-ins"
          icon={TrendingUp}
        >
          <div className="chart">
            {(data?.logs || []).slice(-14).map((l: any, i: number) => (
              <div className="chart-col" key={i}>
                <span style={{ height: `${(l.adherence || 10) * 1.5}px` }} />
                <small>{l.date?.slice(5)}</small>
              </div>
            ))}
          </div>
        </Card>
        <Card
          title="Health records"
          subtitle="Patient uploaded documents"
          icon={FileText}
        >
          {(data?.records || []).map((r: any) => (
            <div className="record-item" key={r.id}>
              <FileText />
              <div>
                <b>{r.name}</b>
                <small>
                  {r.category} · {r.created_at?.slice(0, 10)}
                </small>
              </div>
            </div>
          ))}
        </Card>
        <p className="disclaimer">{disclaimer}</p>
      </>
    );
  if (page === "verification")
    return (
      <div className="queue-list">
        {(data?.items || []).map((x: any) => (
          <Card
            key={x.id}
            title={x.question}
            subtitle={`${x.patient_name} Â· ${x.created_at?.slice(0, 10)}`}
            icon={MessageCircle}
          >
            <p>{x.answer}</p>
            <div className="toolbar">
              <button
                className="button primary"
                onClick={() =>
                  submit(`/doctor/verification-queue/${x.id}`, "PATCH", {
                    status: "VERIFIED",
                  })
                }
              >
                <Check size={16} /> Approve
              </button>
              <button
                className="button subtle"
                onClick={() =>
                  submit(`/doctor/verification-queue/${x.id}`, "PATCH", {
                    status: "REJECTED",
                  })
                }
              >
                Reject
              </button>
            </div>
          </Card>
        ))}
      </div>
    );
  if (page === "guidelines")
    return (
      <div className="queue-list">
        {(data?.guidelines || []).map((g: any) => (
          <Card
            title={g.condition.replace("_", " ")}
            subtitle="Editable condition guidance"
            icon={BookOpen}
            key={g.condition}
          >
            <div className="guideline-values">
              <span>
                Max sugar / meal <b>{g.maxSugarGPerMeal}g</b>
              </span>
              <span>
                Max sodium / day <b>{g.maxSodiumMgPerDay}mg</b>
              </span>
              <span>
                Daily calories <b>{g.maxCaloriesPerDay}</b>
              </span>
              <span>
                Min fiber / day <b>{g.minFiberGPerDay}g</b>
              </span>
            </div>
            <p>{g.allowedFoodsNote}</p>
            <Badge />
            <p className="disclaimer">{disclaimer}</p>
          </Card>
        ))}
      </div>
    );
  if (page === "dashboard" && role === "DOCTOR")
    return (
      <>
        <div className="stat-grid">
          <Stat
            label="Patients in your care"
            value={data?.patients?.length || 0}
            note="Active patient accounts"
            icon={Users}
            tint="mint"
          />
          <Stat
            label="Awaiting your review"
            value={data?.queue || 0}
            note="AI answers to review"
            icon={ShieldCheck}
            tint="peach"
          />
        </div>
        <Card
          title="Your patients"
          subtitle="A snapshot of the people in your care"
          icon={Users}
        >
          <div className="table">
            <div className="table-head">
              <span>Patient</span>
              <span>Conditions</span>
              <span>Adherence</span>
              <span>Last active</span>
            </div>
            {(data?.patients || []).map((p: any) => (
              <Link
                to={`/doctor/patients/${p.id}`}
                className="table-row"
                key={p.id}
              >
                <b>{p.name}</b>
                <span>
                  {p.conditions.map((c: string) => (
                    <i className="condition-tag" key={c}>
                      {c.replace("_", " ")}
                    </i>
                  ))}
                </span>
                <span>{p.adherence}%</span>
                <span>{p.lastActive}</span>
              </Link>
            ))}
          </div>
        </Card>
      </>
    );
  if (page === "dashboard" && role === "ADMIN")
    return (
      <>
        <div className="stat-grid">
          <Stat
            label="Active patients"
            value={data?.activePatients || 0}
            note="Patient accounts"
            icon={Users}
            tint="mint"
          />
          <Stat
            label="Care team"
            value={data?.activeDoctors || 0}
            note="Active doctors"
            icon={Stethoscope}
            tint="blue"
          />
          <Stat
            label="SOS this week"
            value={data?.sosThisWeek || 0}
            note="Recorded alerts"
            icon={AlertTriangle}
            tint="peach"
          />
          <Stat
            label="Verified answers"
            value={`${data?.verificationRate || 0}%`}
            note="AI guidance reviewed"
            icon={ShieldCheck}
            tint="mint"
          />
        </div>
        <Card
          title="Care activity"
          subtitle="Average adherence across recent logs"
          icon={Activity}
        >
          <div className="chart">
            {(data?.logs || [])
              .slice(0, 10)
              .reverse()
              .map((l: any, i: number) => (
                <div className="chart-col" key={i}>
                  <span style={{ height: `${(l.adherence || 10) * 1.5}px` }} />
                  <small>{l.date?.slice(5)}</small>
                </div>
              ))}
          </div>
        </Card>
      </>
    );
  if (page === "users")
    return (
      <Card
        title="People on Nutronics"
        subtitle="Manage access to the platform"
        icon={Users}
      >
        <div className="toolbar">
          <input
            placeholder="Search people"
            onChange={(e) => setForm({ ...form, search: e.target.value })}
          />
          <div className="filter-pills">
            {["ALL", "PATIENT", "DOCTOR", "ADMIN"].map((x) => (
              <button
                className={filter === x ? "selected" : ""}
                key={x}
                onClick={() => setFilter(x)}
              >
                {x}
              </button>
            ))}
          </div>
        </div>
        <div className="table">
          {(data?.users || [])
            .filter(
              (u: any) =>
                (filter === "ALL" || u.role === filter) &&
                (!form.search ||
                  u.name.toLowerCase().includes(form.search.toLowerCase())),
            )
            .map((u: any) => (
              <div className="table-row" key={u.id}>
                <b>{u.name}</b>
                <span>{u.email}</span>
                <span>{u.role}</span>
                <button
                  className="button small outline"
                  onClick={() =>
                    submit(`/admin/users/${u.id}`, "PATCH", {
                      active: !u.active,
                    })
                  }
                >
                  {u.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
        </div>
      </Card>
    );
  if (page === "config")
    return (
      <Card
        title="System & AI configuration"
        subtitle="Control local demo services and review status"
        icon={Settings}
      >
        <div className="config-options">
          {Object.entries(data?.config || {}).map(([key, value]: any) => (
            <label className="config-row" key={key}>
              <span>
                <b>{key}</b>
                <small>Platform setting</small>
              </span>
              <input defaultValue={value} id={`cfg-${key}`} />
            </label>
          ))}
        </div>
        <button
          className="button primary"
          onClick={() => {
            const config: any = {};
            Object.keys(data?.config || {}).forEach(
              (k) =>
                (config[k] = (
                  document.getElementById(`cfg-${k}`) as HTMLInputElement
                ).value),
            );
            submit("/admin/config", "PUT", config);
          }}
        >
          Save configuration
        </button>
        <p>
          Verified {data?.verified || 0} Â· Pending {data?.pending || 0} Â·
          Rejected {data?.rejected || 0}
        </p>
      </Card>
    );
  return (
    <Card
      title="Page not found"
      subtitle="That page isnâ€™t available in this demo."
      icon={CircleHelp}
    />
  );
}
function Stat({
  label,
  value,
  note,
  icon: Icon,
  tint,
}: {
  label: string;
  value: any;
  note: string;
  icon: any;
  tint: string;
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tint}`}>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <span>{note}</span>
      </div>
      <ChevronRight className="stat-arrow" size={17} />
    </div>
  );
}
function Card({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  children?: any;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <span className="card-icon">
          <Icon size={18} />
        </span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}
function QuickLinks() {
  return (
    <div className="quick-links">
      {[
        { url: "/patient/diet", icon: Utensils, label: "Your diet plan" },
        { url: "/patient/reminders", icon: Clock, label: "Set a reminder" },
        { url: "/patient/records", icon: FileText, label: "Health records" },
        { url: "/patient/assistant", icon: Sparkles, label: "Ask Nutronics" },
      ].map((x) => (
        <Link to={x.url} className="quick-link" key={x.url}>
          <x.icon size={19} />
          <span>{x.label}</span>
          <ArrowRight size={15} />
        </Link>
      ))}
    </div>
  );
}

function RegisterPage({ register }: { register: (payload: any) => void }) {
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
        <p className="disclaimer">{disclaimer}</p>
        <Link className="inline-link" to="/auth/register">
          New to Nutronics? Create an account <ArrowRight size={14} />
        </Link>
      </main>
    </div>
  );
}
function AuthPage({
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
        <p className="disclaimer">{disclaimer}</p>
        <Link className="inline-link" to="/auth/register">
          New to Nutronics? Create an account <ArrowRight size={14} />
        </Link>
      </main>
    </div>
  );
}
