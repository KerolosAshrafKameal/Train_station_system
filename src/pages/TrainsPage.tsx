import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Train, Station, Carriage, Seat } from '../lib/helpers';
import {
  trainTypeLabel, to12h, classLabel, calcPrice, stopsForType, classesForTrainType,
} from '../lib/helpers';

/* ── Shared styles ── */
const card: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(68,64,60,0.85) 0%, rgba(41,37,36,0.95) 100%)',
  border: '1px solid rgba(217,119,6,0.15)', borderRadius: 16, padding: 24,
};
const goldBtn: React.CSSProperties = {
  padding: '10px 22px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer',
  background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#1c1917', fontSize: 14,
  transition: 'transform .15s',
};
const selectStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, background: '#44403c',
  border: '1px solid rgba(217,119,6,0.25)', color: '#f5f5f4', fontSize: 14, width: '100%',
};

export default function TrainsPage() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [carriages, setCarriages] = useState<Carriage[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [filter, setFilter] = useState('all');
  const [direction, setDirection] = useState<'south' | 'north' | ''>('');
  const [selected, setSelected] = useState<Train | null>(null);
  const [fromId, setFromId] = useState<number>(0);
  const [toId, setToId] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [tRes, sRes, cRes, seRes] = await Promise.all([
        supabase.from('trains').select('*').eq('active', true).order('id'),
        supabase.from('stations').select('*').order('dist_km'),
        supabase.from('carriages').select('*').order('number'),
        supabase.from('seats').select('*'),
      ]);
      setTrains(tRes.data ?? []);
      setStations(sRes.data ?? []);
      setCarriages(cRes.data ?? []);
      setSeats(seRes.data ?? []);
      setLoading(false);
    })();

    // Realtime seat updates
    const chan = supabase.channel('seats-rt').on(
      'postgres_changes', { event: '*', schema: 'public', table: 'seats' },
      (payload: any) => {
        setSeats(prev => prev.map(s => s.id === payload.new?.id ? { ...s, ...payload.new } : s));
      }
    ).subscribe();
    return () => { supabase.removeChannel(chan); };
  }, []);

  const NORTH_CITIES = ['cairo', 'alexandria', 'giza', 'zagazig', 'mansoura', 'tanta', 'ismailia', 'port said', 'beni suef', 'benha', 'damanhour', 'kafr el sheikh', 'damietta'];
  const typeFiltered = filter === 'all' ? trains : trains.filter(t => t.type === filter);
  const filtered = direction === '' ? typeFiltered : typeFiltered.filter(t => {
      const from = (t.from_station ?? '').toLowerCase();
      const isNorthOrigin = NORTH_CITIES.some(c => from.includes(c));
      return direction === 'south' ? isNorthOrigin : !isNorthOrigin;
  });

  const types = ['all', 'talgo', 'spanish', 'vip', 'russian', 'sleeper'];

  function trainCarriages(tid: number) { return carriages.filter(c => c.train_id === tid); }
  function carrSeats(cid: number) { return seats.filter(s => s.carriage_id === cid); }
  function freeSeats(cid: number) { return carrSeats(cid).filter(s => !s.is_occupied).length; }

  const availStops = selected ? stopsForType(selected.type, stations) : [];

  const fromSt = stations.find(s => s.id === fromId);
  const toSt = stations.find(s => s.id === toId);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#d97706', marginBottom: 8 }}>🚆 Active Trains</h1>
      <p style={{ color: '#a8a29e', marginBottom: 24, fontSize: 14 }}>Browse schedules, check seat availability, and calculate fares.</p>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13,
            background: filter === t ? '#d97706' : 'rgba(217,119,6,0.1)',
            color: filter === t ? '#1c1917' : '#d97706',
            transition: 'all .2s',
          }}>
            {t === 'all' ? 'All' : trainTypeLabel(t)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <span style={{ color: '#a8a29e', fontSize: 14, fontWeight: 600, padding: '8px 0', marginRight: 8 }}>🧭 Direction:</span>
        {([['', '🔄 All Trains'], ['south', '🔻 Southbound (North → South)'], ['north', '🔺 Northbound (South → North)']] as [string, string][]).map(([val, lbl]) => (
          <div key={val}
            onClick={() => setDirection(val as any)}
            style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: direction === val ? '#d97706' : 'rgba(217,119,6,0.08)',
              color: direction === val ? '#1c1917' : '#d6d3d1',
              border: `1px solid ${direction === val ? '#d97706' : 'rgba(217,119,6,0.2)'}`,
              transition: 'all .2s',
            }}>
            {lbl}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#78716c' }}>Loading trains...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr style={{ fontSize: 12, color: '#78716c', textTransform: 'uppercase', letterSpacing: 1 }}>
                {['ID', 'Name', 'Type', 'Route', 'Departure', 'Arrival', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{
                  background: selected?.id === t.id ? 'rgba(217,119,6,0.12)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 12, cursor: 'pointer', transition: 'background .2s',
                }} onClick={() => { setSelected(t); setFromId(0); setToId(0); }}>
                  <td style={{ padding: '14px 12px', borderRadius: '12px 0 0 12px', fontWeight: 700, color: '#d97706' }}>{t.id}</td>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: '#f5f5f4' }}>{t.name}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: 'rgba(217,119,6,0.12)', color: '#f59e0b',
                    }}>{trainTypeLabel(t.type)}</span>
                  </td>
                  <td style={{ padding: '14px 12px', color: '#d6d3d1' }}>{t.from_station} → {t.to_station}</td>
                  <td style={{ padding: '14px 12px', color: '#a8a29e' }}>{to12h(t.departure)}</td>
                  <td style={{ padding: '14px 12px', color: '#a8a29e' }}>{to12h(t.arrival)}</td>
                  <td style={{ padding: '14px 12px', borderRadius: '0 12px 12px 0' }}>
                    <button style={{ ...goldBtn, padding: '6px 14px', fontSize: 12 }}
                      onClick={e => { e.stopPropagation(); setSelected(t); setFromId(0); setToId(0); }}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div style={{ ...card, marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}>
              {selected.name} <span style={{ fontSize: 14, color: '#78716c' }}>({trainTypeLabel(selected.type)})</span>
            </h2>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#78716c', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          <p style={{ color: '#a8a29e', marginBottom: 20 }}>
            {selected.from_station} → {selected.to_station} &nbsp;|&nbsp; {to12h(selected.departure)} – {to12h(selected.arrival)}
          </p>

          {/* Carriages */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f4', marginBottom: 12 }}>Carriages & Seat Availability</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
            {trainCarriages(selected.id).map(c => {
              const free = freeSeats(c.id);
              const total = c.capacity;
              const pct = total > 0 ? Math.round((free / total) * 100) : 0;
              return (
                <div key={c.id} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16,
                  border: '1px solid rgba(217,119,6,0.1)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f4', marginBottom: 4 }}>
                    Car {c.number} — {classLabel(classesForTrainType(selected.type)[c.class_index] ?? '')}
                  </div>
                  <div style={{ fontSize: 12, color: '#78716c', marginBottom: 8 }}>
                    {c.cabin_type !== 'none' ? `(${c.cabin_type} cabin)` : ''}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, width: `${pct}%`,
                      background: pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444',
                      transition: 'width .4s',
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 6 }}>
                    {free} / {total} free ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price calculator */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f4', marginBottom: 12 }}>💰 Price Calculator</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#78716c', display: 'block', marginBottom: 4 }}>From Station</label>
              <select style={selectStyle} value={fromId} onChange={e => setFromId(+e.target.value)}>
                <option value={0}>Select...</option>
                {availStops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.dist_km} km)</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#78716c', display: 'block', marginBottom: 4 }}>To Station</label>
              <select style={selectStyle} value={toId} onChange={e => setToId(+e.target.value)}>
                <option value={0}>Select...</option>
                {availStops.filter(s => s.id !== fromId).map(s => <option key={s.id} value={s.id}>{s.name} ({s.dist_km} km)</option>)}
              </select>
            </div>
            <div style={{ fontSize: 13, color: '#78716c', paddingBottom: 10 }}>
              {fromSt && toSt ? `${Math.abs(fromSt.dist_km - toSt.dist_km)} km` : ''}
            </div>
          </div>

          {fromSt && toSt && (
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {classesForTrainType(selected.type).map(cls => (
                <div key={cls} style={{
                  background: 'rgba(217,119,6,0.08)', borderRadius: 12, padding: '14px 20px',
                  border: '1px solid rgba(217,119,6,0.2)',
                }}>
                  <div style={{ fontSize: 12, color: '#a8a29e' }}>{classLabel(cls)}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>
                    {calcPrice(selected.type, cls, fromSt.dist_km, toSt.dist_km).toFixed(2)} <span style={{ fontSize: 13 }}>EGP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
