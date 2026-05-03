import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const [trainCount, setTrainCount] = useState(0);
  const [seatInfo, setSeatInfo] = useState({ total: 0, free: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { count: tc } = await supabase.from('trains').select('*', { count: 'exact', head: true }).eq('active', true);
      setTrainCount(tc ?? 0);
      const { data: seats } = await supabase.from('seats').select('is_occupied');
      if (seats) {
        setSeatInfo({ total: seats.length, free: seats.filter(s => !s.is_occupied).length });
      }
      setLoading(false);
    })();
  }, []);

  const cards = [
    { icon: '🚆', label: 'Active Trains', value: trainCount },
    { icon: '💺', label: 'Total Seats', value: seatInfo.total },
    { icon: '✅', label: 'Available Seats', value: seatInfo.free },
  ];

  const navCards = [
    { to: '/trains', icon: '🔍', title: 'View Trains', desc: 'Browse all active trains, routes, schedules and available seats.' },
    { to: '/prebook', icon: '🎫', title: 'Pre-Book Ticket', desc: 'Reserve your seat before visiting the station. Valid for 5 hours.' },
    { to: '/my-bookings', icon: '📋', title: 'My Bookings', desc: 'Look up your pre-bookings and issued tickets by National ID.' },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(160deg, #292524 0%, #44403c 40%, #0d1326 100%)',
        padding: '80px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -120, right: -120, width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,6,0.08) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80, width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,6,0.05) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: 12,
            background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)',
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#d97706', letterSpacing: 4 }}>ENR</span>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#f0f4f8', marginBottom: 12, lineHeight: 1.2 }}>
            Egyptian National Railways
          </h1>
          <p style={{ fontSize: 18, color: '#a8a29e', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Smart Train Booking System — Pre-book your tickets from home and travel with ease across Egypt.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {cards.map(c => (
              <div key={c.label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(217,119,6,0.2)',
                borderRadius: 16, padding: '24px 32px', minWidth: 180,
                backdropFilter: 'blur(8px)',
                transition: 'transform .2s, border-color .2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = '#d97706'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217,119,6,0.2)'; }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#d97706' }}>
                  {loading ? '—' : c.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nav Cards */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#f5f5f4', marginBottom: 24, textAlign: 'center' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {navCards.map(c => (
            <Link key={c.to} to={c.to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(68,64,60,0.8) 0%, rgba(41,37,36,0.9) 100%)',
                border: '1px solid rgba(217,119,6,0.15)',
                borderRadius: 16, padding: 28,
                transition: 'all .25s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d97706'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(217,119,6,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217,119,6,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>{c.icon}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#d97706', marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: '#a8a29e', lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '24px 16px', borderTop: '1px solid rgba(217,119,6,0.1)',
        color: '#475569', fontSize: 13,
      }}>
        © 2026 Egyptian National Railways — Smart Booking System
      </footer>
    </div>
  );
}
