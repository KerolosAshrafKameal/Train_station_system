import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { PreBooking, Ticket } from '../lib/helpers';
import { classLabel } from '../lib/helpers';
import Sidebar from '../components/Sidebar';

const inputStyle: React.CSSProperties = {
  padding: '9px 13px', borderRadius: 7, fontSize: 13.5,
  background: '#FFFFFF', border: '1.5px solid #E8E0E0', color: '#1A0A0A',
  fontFamily: 'inherit', outline: 'none',
};

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Active' },
    cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Cancelled' },
    converted: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Abrove' },
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
  const [bookings, setBookings] = useState<(PreBooking & { travel_date?: string; train_name?: string; from_name?: string; to_name?: string; ticket?: any })[]>([]);
  const [tickets, setTickets] = useState<(Ticket & { travel_date?: string; train_name?: string; from_name?: string; to_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const userName = localStorage.getItem('enr_user_name') || '';



  useEffect(() => {
    async function fetchHistory() {
      if (!userName) {
        setLoading(false);
        return;
      }
      
      try {
        const storedIdsStr = localStorage.getItem('my_booking_ids') || '[]';
        let storedIds: string[] = [];
        try { storedIds = JSON.parse(storedIdsStr); } catch (e) {}

        // Fetch bookings matching the logged-in user's name OR local booking IDs
        let query = supabase.from('pre_bookings').select('*');
        if (storedIds.length > 0) {
          query = query.or(`passenger_name.ilike.%${userName.trim()}%,booking_id.in.(${storedIds.join(',')})`);
        } else {
          query = query.ilike('passenger_name', `%${userName.trim()}%`);
        }
        
        const { data: bData } = await query.order('created_at', { ascending: false });
        const enrichedBookings = [];
        for (const b of (bData ?? [])) {
          let status = b.status;
          if (status === 'active' && new Date(b.expires_at) < new Date()) {
            await supabase.from('pre_bookings').update({ status: 'cancelled' }).eq('booking_id', b.booking_id);
            await supabase.from('queue_entries').update({ status: 'cancelled' }).eq('booking_id', b.booking_id);
            status = 'cancelled';
          }

          const { data: train } = await supabase.from('trains').select('name').eq('id', b.train_id).single();
          const { data: fromSt } = await supabase.from('stations').select('name').eq('id', b.from_station_id).single();
          const { data: toSt } = await supabase.from('stations').select('name').eq('id', b.to_station_id).single();
          
          let ticketDetails = null;
          if (status === 'converted' || status === 'Abrove') {
            const { data: tkt } = await supabase.from('tickets').select('*').eq('booking_id', b.booking_id).single();
            if (tkt) {
                const rawTktName = tkt.passenger_name || '';
                const m2 = rawTktName.match(/_(\d{4}-\d{2}-\d{2})_/);
                tkt.passenger_name = rawTktName.replace(/\s*_\d{4}-\d{2}-\d{2}_\s*/, '');
                if (m2) tkt.travel_date = m2[1];
                ticketDetails = tkt;
            }
          }
          
          const rawName = b.passenger_name || '';
          const cleanName = rawName.replace(/\s*_\d{4}-\d{2}-\d{2}_\s*/, '');
          const m = rawName.match(/_(\d{4}-\d{2}-\d{2})_/);
          const travelDate = m ? m[1] : 'Future';
          
          enrichedBookings.push({ ...b, passenger_name: cleanName, travel_date: travelDate, status, train_name: train?.name, from_name: fromSt?.name, to_name: toSt?.name, ticket: ticketDetails });
        }
        setBookings(enrichedBookings);

        // Fetch tickets matching the logged-in user's name OR local booking IDs that were NOT created from a Pre-Booking
        let tQuery = supabase.from('tickets').select('*').is('booking_id', null);
        if (storedIds.length > 0) {
          tQuery = tQuery.or(`passenger_name.ilike.%${userName.trim()}%,booking_id.in.(${storedIds.join(',')})`);
        } else {
          tQuery = tQuery.ilike('passenger_name', `%${userName.trim()}%`);
        }
        const { data: tData } = await tQuery.order('issued_at', { ascending: false });
        const enrichedTickets = [];
        for (const t of (tData ?? [])) {
          const { data: train } = await supabase.from('trains').select('name').eq('id', t.train_id).single();
          const { data: fromSt } = await supabase.from('stations').select('name').eq('id', t.from_station_id).single();
          const { data: toSt } = await supabase.from('stations').select('name').eq('id', t.to_station_id).single();
          
          const rawTktName = t.passenger_name || '';
          const cleanName = rawTktName.replace(/\s*_\d{4}-\d{2}-\d{2}_\s*/, '');
          const m = rawTktName.match(/_(\d{4}-\d{2}-\d{2})_/);
          const travelDate = m ? m[1] : 'Unknown';
          
          enrichedTickets.push({ ...t, passenger_name: cleanName, travel_date: travelDate, train_name: train?.name, from_name: fromSt?.name, to_name: toSt?.name });
        }
        setTickets(enrichedTickets);
      } catch (err) {
        setError('Failed to load history.');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [userName]);

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
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#8B1A1A', marginBottom: 4 }}>History</h1>
        <p style={{ color: '#8C6B6B', marginBottom: 24, fontSize: 13.5 }}>View all your past bookings, active pre-bookings, and issued tickets.</p>

        {loading ? (
          <div className="fullscreen-loading" style={{ minHeight: '50vh' }}>
            <div className="train-loader"></div>
            <div className="fullscreen-loading__text">Loading History...</div>
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(139,26,26,0.07)', border: '1px solid rgba(139,26,26,0.25)', borderRadius: 8, padding: '11px 16px', color: '#8B1A1A', fontSize: 13.5, marginBottom: 16 }}>
            {error}
          </div>
        ) : bookings.length === 0 && tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8C6B6B', fontSize: 14 }}>
            No bookings or tickets found in your history.
          </div>
        ) : null}

        {/* Pre-Bookings */}
        {bookings.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A0A0A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>Pre-Bookings</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {bookings.map(b => (
              <div key={b.booking_id} style={{
                background: '#FFFFFF',
                border: '1px solid #E8E0E0', borderRadius: 10, padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#8B1A1A' }}>{b.booking_id}</span>
                  {statusBadge(b.status)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 24px', fontSize: 13.5 }}>
                  {([
                    ['Passenger', b.passenger_name],
                    ['Travel Date', b.travel_date],
                    ['Train', b.train_name ?? `#${b.train_id}`],
                    ['Route', `${b.from_name} → ${b.to_name}`],
                    ['Class', classLabel(b.class_type)],
                    ['Price', `${Number(b.price).toFixed(2)} EGP`],
                    ...(b.ticket ? [
                      ['Seat', `Car ${b.ticket.carriage_number}, Seat ${b.ticket.local_seat}`],
                      ['Platform', `${b.ticket.platform}`],
                      ['Ticket ID', b.ticket.ticket_id]
                    ] : [
                      ['Created', new Date(b.created_at).toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })],
                      ['Expires', new Date(b.expires_at).toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })]
                    ])
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: '#8C6B6B', minWidth: 70, fontSize: 12, fontWeight: 600 }}>{k}:</span>
                      <span style={{ color: '#1A0A0A', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {b.status === 'active' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid #F0EAEA' }}>
                    <button
                      onClick={() => handleCancelPreBooking(b.booking_id)}
                      disabled={actionLoading === b.booking_id}
                      style={{
                        padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(139,26,26,0.3)',
                        background: 'rgba(139,26,26,0.07)', color: '#8B1A1A', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                      {actionLoading === b.booking_id ? 'Cancelling...' : 'Cancel'}
                    </button>
                    <button
                      onClick={() => handleEditPreBooking(b.booking_id)}
                      style={{
                        padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(37,99,235,0.3)',
                        background: 'rgba(37,99,235,0.07)', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Issued Tickets */}
      {tickets.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A0A0A', marginBottom: 14 }}>Issued Tickets</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {tickets.map(t => (
              <div key={t.ticket_id} style={{
                background: '#FFFFFF',
                border: `1.5px solid ${t.active ? 'rgba(22,163,74,0.3)' : '#E8E0E0'}`,
                borderRadius: 10, padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#8B1A1A' }}>{t.ticket_id}</span>
                  {t.active
                    ? <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'rgba(22,163,74,0.10)', color: '#166534', border: '1px solid rgba(22,163,74,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active</span>
                    : <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.10)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cancelled</span>
                  }
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 24px', fontSize: 13.5 }}>
                  {([
                    ['Passenger', t.passenger_name],
                    ['Travel Date', t.travel_date],
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
                      <span style={{ color: '#8C6B6B', minWidth: 80, fontSize: 12, fontWeight: 600 }}>{k}:</span>
                      <span style={{ color: '#1A0A0A', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
      </main>
    </div>
  );
}
