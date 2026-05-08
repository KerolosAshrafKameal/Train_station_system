import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Train, Station, Carriage, Seat } from '../lib/helpers';
import {
  trainTypeLabel, to12h, classLabel, calcPrice, stopsForType, classesForTrainType,
} from '../lib/helpers';
import Sidebar from '../components/Sidebar';

/* ── Shared styles (ENR red/white theme) ── */
const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E8E0E0', borderRadius: 10, padding: 20,
};
const goldBtn: React.CSSProperties = {
  padding: '10px 22px', borderRadius: 7, border: 'none', fontWeight: 700, cursor: 'pointer',
  background: '#8B1A1A', color: '#FFFFFF', fontSize: 13,
  transition: 'background .15s', letterSpacing: '0.03em',
};
const selectStyle: React.CSSProperties = {
  padding: '9px 13px', borderRadius: 7, background: '#FFFFFF',
  border: '1.5px solid #E8E0E0', color: '#1A0A0A', fontSize: 13.5, width: '100%',
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

  /** Display fix: replace "Cairo" with "Alexandria" */
  const fixCity = (name: string) => name?.replace(/cairo/gi, 'Alexandria') ?? name;

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
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
      <div style={{ padding: '28px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#8B1A1A', marginBottom: 4 }}>Active Trains</h1>
      <p style={{ color: '#8C6B6B', marginBottom: 20, fontSize: 13.5 }}>Browse schedules, check seat availability, and calculate fares.</p>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '7px 16px', borderRadius: 20, fontWeight: 600, fontSize: 12,
            cursor: 'pointer', transition: 'all .15s',
            background: filter === t ? '#8B1A1A' : 'rgba(139,26,26,0.08)',
            color: filter === t ? '#FFFFFF' : '#8B1A1A',
            border: `1px solid ${filter === t ? '#8B1A1A' : 'rgba(139,26,26,0.2)'}`,
          }}>
            {t === 'all' ? 'All Types' : trainTypeLabel(t)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <span style={{ color: '#8C6B6B', fontSize: 13, fontWeight: 600, marginRight: 4 }}>Direction:</span>
        {([['', 'All Trains'], ['south', 'Southbound'], ['north', 'Northbound']] as [string, string][]).map(([val, lbl]) => (
          <button key={val}
            onClick={() => setDirection(val as any)}
            style={{
              padding: '6px 14px', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 12,
              background: direction === val ? '#8B1A1A' : 'rgba(139,26,26,0.06)',
              color: direction === val ? '#FFFFFF' : '#5C3D3D',
              border: `1px solid ${direction === val ? '#8B1A1A' : '#E8E0E0'}`,
              transition: 'all .15s',
            }}>
            {lbl}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="fullscreen-loading">
          <div className="train-loader"></div>
          <div className="fullscreen-loading__text">Loading Schedules...</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr style={{ fontSize: 12, color: '#8C6B6B', textTransform: 'uppercase', letterSpacing: 1 }}>
                {['ID', 'Name', 'Type', 'Route', 'Departure', 'Arrival', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{
                  background: selected?.id === t.id ? 'rgba(139,26,26,0.08)' : '#FFFFFF',
                  borderRadius: 12, cursor: 'pointer', transition: 'background .2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }} onClick={() => { setSelected(t); setFromId(0); setToId(0); }}>
                  <td style={{ padding: '14px 12px', borderRadius: '12px 0 0 12px', fontWeight: 700, color: '#8B1A1A' }}>{t.id}</td>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: '#1A0A0A' }}>{t.name}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: 'rgba(139,26,26,0.08)', color: '#8B1A1A',
                    }}>{trainTypeLabel(t.type)}</span>
                  </td>
                  <td style={{ padding: '14px 12px', color: '#5C3D3D' }}>{fixCity(t.from_station)} → {fixCity(t.to_station)}</td>
                  <td style={{ padding: '14px 12px', color: '#8C6B6B' }}>{to12h(t.departure)}</td>
                  <td style={{ padding: '14px 12px', color: '#8C6B6B' }}>{to12h(t.arrival)}</td>
                  <td style={{ padding: '14px 12px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
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
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#8B1A1A' }}>
              {selected.name} <span style={{ fontSize: 14, color: '#8C6B6B' }}>({trainTypeLabel(selected.type)})</span>
            </h2>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#8C6B6B', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          <p style={{ color: '#8C6B6B', marginBottom: 20 }}>
            {fixCity(selected.from_station)} → {fixCity(selected.to_station)} &nbsp;|&nbsp; {to12h(selected.departure)} – {to12h(selected.arrival)}
          </p>

          {/* Carriages */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A0A0A', marginBottom: 12 }}>Carriages & Seat Availability</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
            {trainCarriages(selected.id).map(c => {
              const free = freeSeats(c.id);
              const total = c.capacity;
              const pct = total > 0 ? Math.round((free / total) * 100) : 0;
              return (
                <div key={c.id} style={{
                  background: '#FFFFFF', borderRadius: 12, padding: 16,
                  border: '1px solid #E8E0E0',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A0A0A', marginBottom: 4 }}>
                    Car {c.number} — {classLabel(classesForTrainType(selected.type)[c.class_index] ?? '')}
                  </div>
                  <div style={{ fontSize: 12, color: '#8C6B6B', marginBottom: 8 }}>
                    {c.cabin_type !== 'none' ? `(${c.cabin_type} cabin)` : ''}
                  </div>
                  <div style={{ background: '#E8E0E0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, width: `${pct}%`,
                      background: pct > 50 ? '#16A34A' : pct > 20 ? '#F59E0B' : '#DC2626',
                      transition: 'width .4s',
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#8C6B6B', marginTop: 6 }}>
                    {free} / {total} free ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price calculator */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A0A0A', marginBottom: 12 }}>💰 Price Calculator</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#8C6B6B', display: 'block', marginBottom: 4 }}>From Station</label>
              <select style={selectStyle} value={fromId} onChange={e => setFromId(+e.target.value)}>
                <option value={0}>Select...</option>
                {availStops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.dist_km} km)</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8C6B6B', display: 'block', marginBottom: 4 }}>To Station</label>
              <select style={selectStyle} value={toId} onChange={e => setToId(+e.target.value)}>
                <option value={0}>Select...</option>
                {availStops.filter(s => s.id !== fromId).map(s => <option key={s.id} value={s.id}>{s.name} ({s.dist_km} km)</option>)}
              </select>
            </div>
            <div style={{ fontSize: 13, color: '#8C6B6B', paddingBottom: 10 }}>
              {fromSt && toSt ? `${Math.abs(fromSt.dist_km - toSt.dist_km)} km` : ''}
            </div>
          </div>

          {fromSt && toSt && (
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {classesForTrainType(selected.type).map(cls => (
                <div key={cls} style={{
                  background: 'rgba(139,26,26,0.06)', borderRadius: 12, padding: '14px 20px',
                  border: '1px solid rgba(139,26,26,0.15)',
                }}>
                  <div style={{ fontSize: 12, color: '#8C6B6B' }}>{classLabel(cls)}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#8B1A1A' }}>
                    {calcPrice(selected.type, cls, fromSt.dist_km, toSt.dist_km).toFixed(2)} <span style={{ fontSize: 13 }}>EGP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
      </main>
    </div>
  );
}
