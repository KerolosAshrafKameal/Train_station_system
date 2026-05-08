import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

interface UpcomingTrain {
  id: number;
  name: string;
  destination: string;
  departure: string;
  train_type: string;
  status: string;
}

function toAMPM(time24: string): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getStatus(trainName: string, idx: number): 'ON TIME' | 'BOARDING' | 'DELAYED' {
  // Deterministic mock statuses
  const cycle = ['ON TIME', 'BOARDING', 'DELAYED'] as const;
  return cycle[idx % 3];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; dotCls: string }> = {
    'ON TIME': { cls: 'badge badge--green', dotCls: 'status-dot--on' },
    'BOARDING': { cls: 'badge badge--yellow', dotCls: 'status-dot--board' },
    'DELAYED': { cls: 'badge badge--red', dotCls: 'status-dot--delay' },
  };
  const { cls, dotCls } = map[status] ?? map['ON TIME'];
  return (
    <span className={`status-dot ${dotCls}`} style={{ fontSize: 11, fontWeight: 700 }}>
      <span className={cls}>{status}</span>
    </span>
  );
}

function ClassBadge({ type }: { type: string }) {
  const t = (type || '').toUpperCase();
  if (t.includes('TALGO') || t.includes('VIP'))   return <span className="badge badge--red">FIRST CLASS</span>;
  if (t.includes('SLEEP'))                         return <span className="badge badge--blue">SLEEPER</span>;
  if (t.includes('SPAN') || t.includes('SPANISH')) return <span className="badge badge--yellow">EXECUTIVE</span>;
  return <span className="badge badge--blue">STANDARD</span>;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [trains, setTrains] = useState<UpcomingTrain[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: tData } = await supabase
          .from('trains')
          .select('id, name, to, departure_time, train_type')
          .eq('active', true)
          .order('departure_time', { ascending: true })
          .limit(8);

        if (tData) {
          setTrains(
            tData.map((t: any, i: number) => ({
              id: t.id,
              name: t.name,
              destination: t.to,
              departure: toAMPM(t.departure_time),
              train_type: t.train_type,
              status: getStatus(t.name, i),
            }))
          );
          setStats(s => ({ ...s, active: tData.length }));
        }

        const { count: bookCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true });

        setStats(s => ({ ...s, bookings: bookCount ?? 0, total: (tData?.length ?? 0) }));
      } catch (_) {
        // Supabase not reachable — just show empty state gracefully
      }
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Active Trains',  value: loading ? '—' : stats.active.toLocaleString() },
    { label: 'Total Bookings', value: loading ? '—' : stats.bookings.toLocaleString() },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* ── HERO ─────────────────────────────────── */}
        <section className="hero">
          <img
            src="/assets/hero-train.png"
            alt="ENR High-Speed Train"
            className="hero__img"
          />
          <div className="hero__overlay" />
          <div className="hero__content">
            <div className="hero__tag">
              🚆 Smart Booking System
            </div>
            <h1 className="hero__title">
              Egyptian National Railways –<br />Smart Booking System
            </h1>
            <p className="hero__desc">
              Experience the next generation of rail travel. Precision scheduling,
              seamless ticket management, and elite service for the modern traveler.
            </p>
            <div className="hero__actions">
              <Link to="/prebook" className="btn-hero-primary" id="hero-reserve-btn">
                Reserve Journey
              </Link>
              <Link to="/trains" className="btn-hero-outline" id="hero-explore-btn">
                Explore Stations
              </Link>
            </div>
          </div>
        </section>

        {/* ── ACTION CARDS ─────────────────────────── */}
        <div className="action-cards">
          <Link to="/trains" className="action-card" id="action-view-trains">
            <div className="action-card__icon">🚆</div>
            <span className="action-card__label">View Trains</span>
          </Link>
          <Link to="/prebook" className="action-card" id="action-book-ticket">
            <div className="action-card__icon">🎫</div>
            <span className="action-card__label">Book Ticket</span>
          </Link>
          <Link to="/prebook" className="action-card" id="action-prebook">
            <div className="action-card__icon">📅</div>
            <span className="action-card__label">Pre-Book</span>
          </Link>
          <button
            className="action-card"
            id="action-my-bookings"
            onClick={() => navigate('/my-bookings')}
            style={{ border: 'none' }}
          >
            <div className="action-card__icon">📋</div>
            <span className="action-card__label">My Bookings</span>
          </button>
        </div>

        {/* ── BODY: TABLE + LIVE STATUS ─────────────── */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>

          {/* Departures Table */}
          <div className="departures-card">
            <div className="departures-card__header">
              <div className="departures-card__title">
                <div className="departures-card__title-bar" />
                UPCOMING DEPARTURES – CAIRO CENTRAL
              </div>
              <Link to="/trains" className="departures-card__view-all" id="view-all-schedules-link">
                View All Schedules
              </Link>
            </div>
            {loading ? (
              <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ) : trains.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No trains available at the moment.
              </div>
            ) : (
              <table className="enr-table">
                <thead>
                  <tr>
                    <th>Train</th>
                    <th>Destination</th>
                    <th>Departure</th>
                    <th>Class</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trains.map((t, i) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>{t.destination}</td>
                      <td style={{ fontWeight: 600 }}>{t.departure}</td>
                      <td><ClassBadge type={t.train_type} /></td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Live Status Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stat cards */}
            {statCards.map(s => (
              <div key={s.label} className="card card--pad">
                <div className="stat-card__label">{s.label}</div>
                <div className="stat-card__value">{s.value}</div>
              </div>
            ))}

            {/* Network Status */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--green)', display: 'inline-block',
                  }} />
                  NETWORK LIVE STATUS
                </div>
              </div>
              <div className="card__body" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'System Status',     val: 'Operational' },
                  { label: 'Active Trains',      val: loading ? '—' : `${stats.active}` },
                  { label: 'Total Bookings',     val: loading ? '—' : stats.bookings.toLocaleString() },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '6px 0',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Link */}
            <Link to="/prebook" className="btn-primary" id="home-quick-prebook-btn"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              🎫 Pre-Book a Ticket
            </Link>
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────── */}
        <footer className="footer">
          © 2026 Egyptian National Railways — Smart Booking System
        </footer>
      </main>
    </div>
  );
}
