import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { PreBooking, Ticket } from '../lib/helpers';
import { classLabel } from '../lib/helpers';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14,
  background: '#44403c', border: '1px solid rgba(217,119,6,0.25)', color: '#f5f5f4',
};

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Active' },
    cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Cancelled' },
    converted: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Converted to Ticket' },
    expired:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Expired' },
  };
  const s = map[status] ?? { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', label: status };
  return (
    <span style={{
      padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
    }}>
      {s.label}
    </span>
  );
}

export default function MyBookingsPage() {
  const [ssn, setSsn] = useState('');
  const [bookings, setBookings] = useState<(PreBooking & { train_name?: string; from_name?: string; to_name?: string })[]>([]);
  const [tickets, setTickets] = useState<(Ticket & { train_name?: string; from_name?: string; to_name?: string })[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Auto-fill SSN if we linked it, but right now we only have email linked.
  // The user still searches by SSN for family members or themselves.

  async function handleSearch() {
    setError(''); setSearched(false);
    if (!ssn || ssn.length !== 14 || !/^\d{14}$/.test(ssn)) { setError('SSN must be exactly 14 digits.'); return; }
    setLoading(true);

    // Fetch bookings
    const { data: bData } = await supabase.from('pre_bookings').select('*').eq('ssn', ssn).order('created_at', { ascending: false });
    const enrichedBookings = [];
    for (const b of (bData ?? [])) {
      // check expiry
      let status = b.status;
      if (status === 'active' && new Date(b.expires_at) < new Date()) {
        // Auto-cancel if 5 hours passed and passenger didn't show up
        await supabase.from('pre_bookings').update({ status: 'cancelled' }).eq('booking_id', b.booking_id);
        await supabase.from('queue_entries').update({ status: 'cancelled' }).eq('booking_id', b.booking_id);
        status = 'cancelled';
      }

      const { data: train } = await supabase.from('trains').select('name').eq('id', b.train_id).single();
      const { data: fromSt } = await supabase.from('stations').select('name').eq('id', b.from_station_id).single();
      const { data: toSt } = await supabase.from('stations').select('name').eq('id', b.to_station_id).single();
      enrichedBookings.push({ ...b, status, train_name: train?.name, from_name: fromSt?.name, to_name: toSt?.name });
    }
    setBookings(enrichedBookings);

    // Fetch tickets
    const { data: tData } = await supabase.from('tickets').select('*').eq('ssn', ssn).order('issued_at', { ascending: false });
    const enrichedTickets = [];
    for (const t of (tData ?? [])) {
      const { data: train } = await supabase.from('trains').select('name').eq('id', t.train_id).single();
      const { data: fromSt } = await supabase.from('stations').select('name').eq('id', t.from_station_id).single();
      const { data: toSt } = await supabase.from('stations').select('name').eq('id', t.to_station_id).single();
      enrichedTickets.push({ ...t, train_name: train?.name, from_name: fromSt?.name, to_name: toSt?.name });
    }
    setTickets(enrichedTickets);

    setSearched(true);
    setLoading(false);
  }

  async function handleCancelPreBooking(bookingId: string) {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingId}?`)) return;
    
    setActionLoading(bookingId);
    try {
      await supabase.from('pre_bookings').update({ status: 'cancelled' }).eq('booking_id', bookingId);
      await supabase.from('queue_entries').update({ status: 'cancelled' }).eq('booking_id', bookingId);
      
      // Update local state
      setBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  function handleEditPreBooking(bookingId: string) {
    navigate(`/prebook?edit=${bookingId}`);
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#d97706', marginBottom: 8 }}>📜 History</h1>
      <p style={{ color: '#a8a29e', marginBottom: 28, fontSize: 14 }}>Look up your pre-bookings and issued tickets by National ID. You can manage active bookings here.</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={ssn}
          onChange={e => setSsn(e.target.value.replace(/\D/g, '').slice(0, 14))}
          placeholder="Enter your 14-digit National ID" maxLength={14} />
        <button onClick={handleSearch} disabled={loading} style={{
          padding: '12px 28px', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer',
          background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#1c1917', fontSize: 14,
        }}>
          {loading ? '...' : '🔍 Search'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', fontSize: 14, marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {searched && bookings.length === 0 && tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#78716c' }}>
          No bookings or tickets found for this SSN.
        </div>
      )}

      {/* Pre-Bookings */}
      {bookings.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f4', marginBottom: 16 }}>🎫 Pre-Bookings</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {bookings.map(b => (
              <div key={b.booking_id} style={{
                background: 'linear-gradient(135deg, rgba(68,64,60,0.85), rgba(41,37,36,0.95))',
                border: '1px solid rgba(217,119,6,0.12)', borderRadius: 16, padding: 24,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}>{b.booking_id}</span>
                  {statusBadge(b.status)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 14 }}>
                  {([
                    ['Passenger', b.passenger_name],
                    ['Train', b.train_name ?? `#${b.train_id}`],
                    ['Route', `${b.from_name} → ${b.to_name}`],
                    ['Class', classLabel(b.class_type)],
                    ['Price', `${Number(b.price).toFixed(2)} EGP`],
                    ['Created', new Date(b.created_at).toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })],
                    ['Expires', new Date(b.expires_at).toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: '#78716c', minWidth: 70 }}>{k}:</span>
                      <span style={{ color: '#d6d3d1', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                
                {/* Actions */}
                {b.status === 'active' && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      onClick={() => handleCancelPreBooking(b.booking_id)}
                      disabled={actionLoading === b.booking_id}
                      style={{
                        padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.5)', 
                        background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all .2s'
                      }}>
                      {actionLoading === b.booking_id ? 'Cancelling...' : '❌ Cancel'}
                    </button>
                    <button 
                      onClick={() => handleEditPreBooking(b.booking_id)}
                      style={{
                        padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.5)', 
                        background: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all .2s'
                      }}>
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tickets */}
      {tickets.length > 0 && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f5f5f4', marginBottom: 16 }}>🎟️ Issued Tickets</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {tickets.map(t => (
              <div key={t.ticket_id} style={{
                background: 'linear-gradient(135deg, rgba(68,64,60,0.85), rgba(41,37,36,0.95))',
                border: `1px solid ${t.active ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.2)'}`,
                borderRadius: 16, padding: 24,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}>{t.ticket_id}</span>
                  {t.active
                    ? <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>Active</span>
                    : <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>Inactive</span>
                  }
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 14 }}>
                  {([
                    ['Passenger', t.passenger_name],
                    ['Train', t.train_name ?? `#${t.train_id}`],
                    ['Route', `${t.from_name} → ${t.to_name}`],
                    ['Class', classLabel(t.class_type)],
                    ['Seat', `Car ${t.carriage_number}, Seat ${t.local_seat}`],
                    ['Platform', `${t.platform}`],
                    ['Price', `${Number(t.price).toFixed(2)} EGP`],
                    ['Issued By', t.issued_by.toUpperCase()],
                    ['Issued At', new Date(t.issued_at).toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: '#78716c', minWidth: 80 }}>{k}:</span>
                      <span style={{ color: '#d6d3d1', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
