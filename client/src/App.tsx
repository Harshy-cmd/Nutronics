import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  FileText,
  Heart,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Utensils,
  Watch,
  X,
} from "lucide-react";
import { api } from "./api";
import { DISCLAIMER } from "./constants";
import type { User } from "./types";
import { Card } from "./components/Card";
import { Landing } from "./pages/Landing";
import { AuthPage } from "./pages/AuthPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PatientDashboard } from "./pages/PatientDashboard";
import { DietPlan } from "./pages/DietPlan";
import { Reminders } from "./pages/Reminders";
import { Progress } from "./pages/Progress";
import { Assistant } from "./pages/Assistant";
import { HealthRecords } from "./pages/HealthRecords";
import { ConnectedDevices } from "./pages/ConnectedDevices";
import { Profile } from "./pages/Profile";
import { DoctorDashboard } from "./pages/DoctorDashboard";
import { DoctorQueue } from "./pages/DoctorQueue";
import { DoctorPatientDetail } from "./pages/DoctorPatientDetail";
import { DoctorGuidelines } from "./pages/DoctorGuidelines";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminPanel } from "./pages/AdminPanel";

function PageRouter({
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
  if (page === "home")
    return <PatientDashboard data={data} refresh={refresh} notify={notify} />;
  if (page === "diet")
    return <DietPlan data={data} refresh={refresh} notify={notify} />;
  if (page === "reminders")
    return <Reminders data={data} refresh={refresh} notify={notify} />;
  if (page === "progress")
    return <Progress data={data} refresh={refresh} notify={notify} />;
  if (page === "assistant") return <Assistant data={data} refresh={refresh} />;
  if (page === "records")
    return <HealthRecords data={data} refresh={refresh} notify={notify} />;
  if (page === "devices")
    return <ConnectedDevices data={data} refresh={refresh} notify={notify} />;
  if (page === "profile")
    return <Profile data={data} refresh={refresh} notify={notify} />;
  if (page === "patient-detail") return <DoctorPatientDetail data={data} />;
  if (page === "verification")
    return <DoctorQueue data={data} refresh={refresh} notify={notify} />;
  if (page === "guidelines") return <DoctorGuidelines data={data} />;
  if (page === "dashboard" && role === "DOCTOR")
    return <DoctorDashboard data={data} />;
  if (page === "dashboard" && role === "ADMIN")
    return <AdminDashboard data={data} />;
  if (page === "users")
    return <AdminUsers data={data} refresh={refresh} notify={notify} />;
  if (page === "config")
    return <AdminPanel data={data} refresh={refresh} notify={notify} />;

  return (
    <Card
      title="Page not found"
      subtitle="That page isn’t available in this demo."
      icon={CircleHelp}
    />
  );
}

export default function App() {
  const [me, setMe] = useState<User | null>(null);
  const [route] = useState("home");
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [sos, setSos] = useState(false);
  const [large, setLarge] = useState(
    localStorage.getItem("textSize") || "16px",
  );
  const [contrast, setContrast] = useState(
    localStorage.getItem("contrast") === "true",
  );
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

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
              <p>Your health journey is yours. We’re here to help.</p>
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
              onClick={() => msg("You’re all caught up")}
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
                  ? `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${me.name.split(" ")[0]}. Here’s your health at a glance.`
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
            <div className="loading">Loading your health information…</div>
          ) : (
            <PageRouter
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
            <HeartPulse size={15} /> Nutronics · SDG 3: Good Health & Well-Being
          </span>
          <span>{DISCLAIMER}</span>
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
                I’m okay
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
