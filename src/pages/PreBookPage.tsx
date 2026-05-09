import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Train, Station } from '../lib/helpers';
import {
  classesForTrainType, classLabel, trainTypeLabel,
  stopsForType, calcPrice, priorityRank, priorityLabel, priorityColor,
  fmtBookingId, to12h,
} from '../lib/helpers';
import Sidebar from '../components/Sidebar';

/* ── ENR red/white styles ── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 7, fontSize: 13.5,
  background: '#FFFFFF', border: '1.5px solid #E8E0E0', color: '#1A0A0A',
  fontFamily: 'inherit', outline: 'none',
};
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#8C6B6B', display: 'block', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' };
const radioRow: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' };
const radioLabel: (active: boolean) => React.CSSProperties = (active) => ({
  padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 12,
  background: active ? '#8B1A1A' : 'rgba(139,26,26,0.07)',
  color: active ? '#FFFFFF' : '#5C3D3D',
  border: `1px solid ${active ? '#8B1A1A' : '#E8E0E0'}`,
  transition: 'all .15s', userSelect: 'none',
});
const goldBtn: React.CSSProperties = {
  padding: '11px 24px', borderRadius: 7, border: 'none', fontWeight: 700, cursor: 'pointer',
  background: '#8B1A1A', color: '#FFFFFF', fontSize: 13,
  width: '100%', marginTop: 8, transition: 'background .15s', letterSpacing: '0.04em',
};

type Result = {
  bookingId: string;
  name: string; ssn: string; trainName: string;
  from: string; to: string; cls: string; price: number;
  priority: number; expiresAt: string;
  isWaitlist: boolean;
};

export default function PreBookPage() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  /* form */
  const [name, setName] = useState(localStorage.getItem('enr_user_name') || '');
  const [ssn, setSsn] = useState('');
  
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const dateOptions = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dateOptions.push(d.toISOString().split('T')[0]);
  }

  const [trainId, setTrainId] = useState<number>(0);
  const [fromId, setFromId] = useState<number>(0);
  const [toId, setToId] = useState<number>(0);
  const [cls, setCls] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const [isWaitlist, setIsWaitlist] = useState(false);
  const [showWaitlistPrompt, setShowWaitlistPrompt] = useState(false);
  const [direction, setDirection] = useState<'south' | 'north' | ''>('');

  const NORTH_CITIES = ['cairo', 'alexandria', 'giza', 'zagazig', 'mansoura', 'tanta',
    'ismailia', 'port said', 'beni suef', 'benha', 'damanhour', 'kafr el sheikh', 'damietta'];

  const filteredTrains = direction === ''
    ? trains
    : trains.filter(t => {
        const from = (t.from_station ?? '').toLowerCase();
        const isNorthOrigin = NORTH_CITIES.some(c => from.includes(c));
        return direction === 'south' ? isNorthOrigin : !isNorthOrigin;
      });

  useEffect(() => {
    (async () => {
      const [tR, sR] = await Promise.all([
        supabase.from('trains').select('*').eq('active', true).order('id'),
        supabase.from('stations').select('*').order('dist_km'),
      ]);
      setTrains(tR.data ?? []);
      setStations(sR.data ?? []);
      
      if (editId) {
        const { data: bData } = await supabase.from('pre_bookings').select('*').eq('booking_id', editId).single();
        if (bData) {
          const rawName = bData.passenger_name || '';
          setName(rawName.replace(/\s*_\d{4}-\d{2}-\d{2}_\s*/, ''));
          const m = rawName.match(/_(\d{4}-\d{2}-\d{2})_/);
          if (m) setTravelDate(m[1]);
          setSsn(bData.ssn);
          setTrainId(bData.train_id);
          setFromId(bData.from_station_id);
          setToId(bData.to_station_id);
          setCls(bData.class_type);
        }
      }
      
      setLoading(false);
    })();
  }, [editId]);

  const selTrain = trains.find(t => t.id === trainId);
  const availStops = selTrain ? stopsForType(selTrain.type, stations) : [];
  const classes = selTrain ? classesForTrainType(selTrain.type) : [];
  const fromSt = stations.find(s => s.id === fromId);
  const toSt = stations.find(s => s.id === toId);
  const price = (selTrain && fromSt && toSt && cls) ? calcPrice(selTrain.type, cls, fromSt.dist_km, toSt.dist_km) : null;

  async function handleSubmit(e: React.FormEvent, bypassWaitlistCheck = false) {
    e.preventDefault();
    setError('');
    if (!name || !ssn || !trainId || !fromId || !toId || !cls) { setError('Please fill all fields.'); return; }
    if (ssn.length !== 14 || !/^\d{14}$/.test(ssn)) { setError('SSN must be exactly 14 digits.'); return; }
    if (fromId === toId) { setError('From and To stations must differ.'); return; }

    setSubmitting(true);
    try {
      if (!bypassWaitlistCheck) {
         // Check available seats
         const { data: availSeats, error: availErr } = await supabase.rpc('get_available_seats', { p_train_id: trainId, p_class_type: cls });
         if (availErr) console.warn("Could not fetch seat availability", availErr);
         
         if (availSeats === 0) {
           setShowWaitlistPrompt(true);
           setSubmitting(false);
           return;
         }
      }

      // Check SSN not in active ticket
      const { data: activeTickets } = await supabase.from('tickets').select('ticket_id').eq('ssn', ssn).eq('active', true);
      if (activeTickets && activeTickets.length > 0) { setError('This SSN already has an active ticket.'); setSubmitting(false); return; }

      // Check SSN not in active pre-booking (skip current booking when editing)
      const activeBookingsQuery = supabase.from('pre_bookings').select('booking_id').eq('ssn', ssn).eq('status', 'active');
      const { data: activeBookings } = editId
        ? await activeBookingsQuery.neq('booking_id', editId)
        : await activeBookingsQuery;
      if (activeBookings && activeBookings.length > 0) { setError('This SSN already has an active pre-booking.'); setSubmitting(false); return; }

      const finalName = `${name} _${travelDate}_`;
      const priority = 4;          // Default — overridden at Station Gate

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 60 * 1000);

      let bookingId = editId || '';

      if (editId) {
        // UPDATE EXISTING BOOKING
        const { error: updErr } = await supabase.from('pre_bookings').update({
          passenger_name: finalName,
          train_id: trainId,
          from_station_id: fromId, to_station_id: toId,
          class_type: cls,
          price: price ?? 20
        }).eq('booking_id', editId);
        if (updErr) throw updErr;

        await supabase.from('queue_entries').update({
          passenger_name: finalName,
          travel_date: travelDate,
          train_id: trainId,
          from_station_id: fromId, to_station_id: toId,
          class_type: cls
        }).eq('booking_id', editId);

      } else {
        // INSERT NEW BOOKING
        const { data: bookVal, error: rpcErr } = await supabase.rpc('get_and_increment_counter', { counter_key: 'book_counter' });
        if (rpcErr || bookVal === null) {
          console.warn('RPC failed or missing, using random ID fallback', rpcErr);
          const rand = Math.floor(Math.random() * 900000) + 100000;
          bookingId = `BK${rand}`;
        } else {
          bookingId = fmtBookingId(bookVal as number);
        }

        const { error: insErr } = await supabase.from('pre_bookings').insert({
          booking_id: bookingId,
          ssn, passenger_name: finalName,
          train_id: trainId,
          from_station_id: fromId, to_station_id: toId,
          class_type: cls,
          price: price ?? 20,
          status: 'active',
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });
        if (insErr) throw insErr;

        const { data: maxQ } = await supabase.from('queue_entries').select('arrival_order').order('arrival_order', { ascending: false }).limit(1);
        const nextOrder = (maxQ && maxQ.length > 0) ? maxQ[0].arrival_order + 1 : 1;

        await supabase.from('queue_entries').insert({
          passenger_name: finalName, ssn,
          passenger_type: 'youth',   
          travel_date: travelDate,
          priority: 4,               
          arrival_order: nextOrder,
          queue_type: 'prebook',
          booking_id: bookingId,
          train_id: trainId,
          from_station_id: fromId, to_station_id: toId,
          class_type: cls,
          status: 'pending',         
        });
        
        // Save to localStorage so MyBookingsPage can find it even if the name differs
        const myBookingsStr = localStorage.getItem('my_booking_ids') || '[]';
        try {
          const myBookings = JSON.parse(myBookingsStr);
          if (!myBookings.includes(bookingId)) {
            myBookings.push(bookingId);
            localStorage.setItem('my_booking_ids', JSON.stringify(myBookings));
          }
        } catch (e) {
          localStorage.setItem('my_booking_ids', JSON.stringify([bookingId]));
        }
      }

      setResult({
        bookingId, name, ssn,
        trainName: selTrain?.name ?? '',
        from: fromSt?.name ?? '', to: toSt?.name ?? '',
        cls, price: price ?? 20,
        priority: 4, expiresAt: expiresAt.toISOString(),
        isWaitlist: showWaitlistPrompt
      });
      setIsWaitlist(showWaitlistPrompt);
      setShowWaitlistPrompt(false);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (showWaitlistPrompt) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 24px' }}>
        <div style={{
          background: '#FFFFFF',
          border: '2px solid #ef4444', borderRadius: 20, padding: 36, textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>Train is Full</h2>
          <p style={{ color: '#8C6B6B', marginBottom: 24 }}>There are no seats available for the selected class on this train.</p>
          <div style={{ background: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
            <p style={{ color: '#dc2626', fontSize: 14 }}>You can join the <strong>Waitlist</strong>. We will secure your spot in the queue, but a seat is <strong>NOT guaranteed</strong> unless there are cancellations at the station.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowWaitlistPrompt(false)} style={{ ...goldBtn, background: 'transparent', border: '1px solid #E8E0E0', color: '#5C3D3D' }}>Cancel</button>
            <button onClick={(e) => handleSubmit(e, true)} style={{ ...goldBtn, background: '#ef4444', color: '#fff' }}>Join Waitlist</button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 24px' }}>
        <div style={{
          background: '#FFFFFF',
          border: `2px solid ${isWaitlist ? '#f97316' : '#8B1A1A'}`, borderRadius: 20, padding: 36, textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{isWaitlist ? '⏳' : '✅'}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: isWaitlist ? '#f97316' : '#8B1A1A', marginBottom: 8 }}>
            {isWaitlist ? 'Added to Waitlist!' : (editId ? 'Booking Updated!' : 'Booking Confirmed!')}
          </h2>
          <p style={{ color: '#8C6B6B', marginBottom: 24 }}>
            {isWaitlist ? 'You are on the waitlist. Proceed to the station for standby.' : 'Your pre-booking has been saved successfully.'}
          </p>

          <div style={{ background: 'rgba(139,26,26,0.06)', borderRadius: 14, padding: 20, textAlign: 'left', marginBottom: 20 }}>
            {([
              ['Booking ID', result.bookingId],
              ['Passenger', result.name],
              ['Travel Date', travelDate],
              ['SSN', result.ssn],
              ['Train', result.trainName],
              ['Route', `${result.from} → ${result.to}`],
              ['Class', classLabel(result.cls)],
              ['Price', `${result.price.toFixed(2)} EGP`],
              ['Booking Time', new Date().toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })]
            ] as [string,string][]).map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E8E0E0' }}>
                <span style={{ fontSize: 13, color: '#8C6B6B' }}>{k}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A0A0A' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, color: '#f59e0b', marginBottom: 20, fontWeight: 600 }}>
            ⏰ Expires at: {new Date(result.expiresAt).toLocaleString('en-EG', { timeZone: 'Africa/Cairo' })}
            <div style={{ marginTop: 8, fontSize: 14, color: '#dc2626', padding: '10px', background: 'rgba(220,38,38,0.1)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)' }}>
              <strong>⚠️ IMPORTANT:</strong> This Pre-Booking is valid for <strong>5 HOURS ONLY</strong>. You must go to the station and book your ticket before it expires.
            </div>
          </div>

          <div style={{
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 12, padding: 16, fontSize: 14, color: '#1d4ed8', lineHeight: 1.5,
          }}>
            📍 Please go to <strong>Admin 2 counter</strong> at the station with your Booking ID: <strong>{result.bookingId}</strong> to approve and issue your ticket.
          </div>

          <button onClick={() => { setResult(null); setName(localStorage.getItem('enr_user_name') || ''); setSsn(''); setCls(''); setTrainId(0); setFromId(0); setToId(0); }}
            style={{ ...goldBtn, marginTop: 24 }}>
            Book Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#8B1A1A', marginBottom: 4 }}>{editId ? 'Edit Pre-Booking' : 'Pre-Book Ticket'}</h1>
      <p style={{ color: '#8C6B6B', marginBottom: 24, fontSize: 13.5 }}>{editId ? `Updating details for booking ${editId}.` : 'Reserve a seat before visiting the station. Booking valid for 5 hours.'}</p>

      {loading ? (
        <div className="fullscreen-loading" style={{ minHeight: '40vh' }}>
          <div className="train-loader"></div>
          <div className="fullscreen-loading__text">Loading Details...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          background: '#FFFFFF',
          border: '1px solid #E8E0E0', borderRadius: 10, padding: 28,
        }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', fontSize: 14, marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" />
            </div>
            <div>
              <label style={labelStyle}>National ID (SSN) — 14 digits</label>
              <input style={inputStyle} value={ssn} onChange={e => setSsn(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="e.g. 29901011234567" maxLength={14} disabled={!!editId} />
            </div>
            <div>
              <label style={labelStyle}>Travel Date</label>
              <select style={inputStyle} value={travelDate} onChange={e => setTravelDate(e.target.value)}>
                {dateOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {/* Direction Filter */}
            <div>
              <label style={labelStyle}>🧭 Direction</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {([['', '🔄 All Trains'], ['south', '🔻 Southbound (North → South)'], ['north', '🔺 Northbound (South → North)']] as [string, string][]).map(([val, lbl]) => (
                  <div key={val}
                    onClick={() => { setDirection(val as any); setTrainId(0); setFromId(0); setToId(0); setCls(''); }}
                    style={{
                      padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      background: direction === val ? '#8B1A1A' : 'rgba(139,26,26,0.06)',
                      color: direction === val ? '#FFFFFF' : '#5C3D3D',
                      border: `1px solid ${direction === val ? '#8B1A1A' : 'rgba(139,26,26,0.2)'}`,
                      transition: 'all .2s',
                    }}>
                    {lbl}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Select Train</label>
              <select style={inputStyle} value={trainId} onChange={e => { setTrainId(+e.target.value); setFromId(0); setToId(0); setCls(''); }}>
                <option value={0}>Choose a train...</option>
                {filteredTrains.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.from_station} → {t.to_station} ({to12h(t.departure)})</option>
                ))}
              </select>
            </div>
            {selTrain && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>From Station</label>
                    <select style={inputStyle} value={fromId} onChange={e => setFromId(+e.target.value)}>
                      <option value={0}>Select...</option>
                      {availStops.filter(s => s.id !== toId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>To Station</label>
                    <select style={inputStyle} value={toId} onChange={e => setToId(+e.target.value)}>
                      <option value={0}>Select...</option>
                      {availStops.filter(s => s.id !== fromId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Class</label>
                  <div style={radioRow}>
                    {classes.map(c => (
                      <div key={c} style={radioLabel(cls === c)} onClick={() => setCls(c)}>{classLabel(c)}</div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {price !== null && (
            <div style={{
              marginTop: 24, background: 'rgba(139,26,26,0.06)', borderRadius: 14, padding: 20,
              border: '1px solid rgba(139,26,26,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, color: '#8C6B6B' }}>Estimated Price</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#8B1A1A' }}>{price.toFixed(2)} <span style={{ fontSize: 14 }}>EGP</span></div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8C6B6B' }}>Priority</div>
                <div style={{ fontWeight: 700, color: '#5C3D3D', fontSize: 13 }}>
                  ℹ️ Priority set at Station Gate on arrival
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} style={{ ...goldBtn, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Processing...' : (editId ? 'Update Pre-Booking' : 'Confirm Pre-Booking')}
          </button>
        </form>
      )}
      </div>
      </main>
    </div>
  );
}
