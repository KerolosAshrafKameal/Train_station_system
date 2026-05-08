/* ── Station helpers ── */
export interface Station {
  id: number;
  name: string;
  dist_km: number;
  is_governorate: boolean;
  is_vip_stop: boolean;
}

export interface Train {
  id: number;
  name: string;
  type: string;
  from_station: string;
  to_station: string;
  departure: string;
  arrival: string;
  active: boolean;
}

export interface Carriage {
  id: number;
  train_id: number;
  number: number;
  class_index: number;
  capacity: number;
  cabin_type: string;
}

export interface Seat {
  id: number;
  carriage_id: number;
  seat_number: number;
  is_occupied: boolean;
}

export interface PreBooking {
  booking_id: string;
  ssn: string;
  passenger_name: string;
  train_id: number;
  from_station_id: number;
  to_station_id: number;
  class_type: string;
  price: number;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface QueueEntry {
  id: number;
  passenger_name: string;
  ssn: string;
  passenger_type: string;
  travel_date: string;
  priority: number;
  arrival_order: number;
  queue_type: string;
  booking_id: string | null;
  ticket_tag: string | null;
  train_id: number;
  from_station_id: number;
  to_station_id: number;
  class_type: string;
  status: string;
}

export interface Ticket {
  ticket_id: string;
  booking_id: string | null;
  ssn: string;
  passenger_name: string;
  train_id: number;
  from_station_id: number;
  to_station_id: number;
  class_type: string;
  seat_number: number;
  carriage_number: number;
  local_seat: number;
  platform: number;
  price: number;
  issued_by: string;
  issued_at: string;
  active: boolean;
}

/* ── class helpers ── */
export function classesForTrainType(type: string): string[] {
  switch (type) {
    case 'talgo':   return ['1st', '2nd'];
    case 'spanish': return ['1st', '2nd', '3rd'];
    case 'vip':     return ['1st', '2nd', '3rd'];
    case 'russian': return ['1st', '2nd', '3rd'];
    case 'sleeper': return ['single', 'double'];
    default:        return [];
  }
}

export function classLabel(cls: string): string {
  switch (cls) {
    case '1st': return '1st Class';
    case '2nd': return '2nd Class';
    case '3rd': return '3rd Class';
    case 'single': return 'Single Cabin';
    case 'double': return 'Double Cabin';
    default: return cls;
  }
}

export function trainTypeLabel(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ── Price calc (client side mirror) ── */
const RATES: Record<string, Record<string, number>> = {
  talgo:   { '1st': 1.14, '2nd': 0.85 },
  vip:     { '1st': 0.43, '2nd': 0.28, '3rd': 0.18 },
  spanish: { '1st': 0.40, '2nd': 0.26, '3rd': 0.16 },
  russian: { '1st': 0.32, '2nd': 0.26, '3rd': 0.22 },
  sleeper: { single: 1.80, double: 1.30 },
};

export function calcPrice(trainType: string, cls: string, fromKm: number, toKm: number): number {
  const rate = RATES[trainType]?.[cls] ?? 0;
  const price = Math.abs(fromKm - toKm) * rate;
  return Math.max(price, 20);
}

/* ── Station filtering by train type ── */
export function stopsForType(type: string, stations: Station[]): Station[] {
  switch (type) {
    case 'talgo':
    case 'sleeper':
      return stations.filter(s => s.is_governorate);
    case 'spanish':
    case 'vip':
      return stations.filter(s => s.is_vip_stop);
    case 'russian':
      return stations; // all 38
    default:
      return stations;
  }
}

/* ── Priority rank ── */
export function priorityRank(passengerType: string, travelDate: string): number {
  if (passengerType === 'elderly' && travelDate === 'today') return 1;
  if (passengerType === 'elderly' && travelDate === 'future') return 2;
  if (passengerType === 'youth'   && travelDate === 'today') return 3;
  if (passengerType === 'youth'   && travelDate === 'future') return 4;
  if (passengerType === 'normal'  && travelDate === 'today') return 5;
  return 6;
}

export function priorityLabel(rank: number): string {
  switch (rank) {
    case 1: return 'Critical Priority';
    case 2: return 'High Priority';
    case 3: return 'Normal Priority';
    case 4: return 'Low Priority';
    default: return '';
  }
}

export function priorityColor(rank: number): string {
  switch (rank) {
    case 1: return '#ef4444';
    case 2: return '#f97316';
    case 3: return '#3b82f6';
    case 4: return '#6b7280';
    default: return '#6b7280';
  }
}

/* ── Time helpers ── */
export function to12h(t: string): string {
  if (!t) return '';
  const clean = t.replace('+1', '');
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  const suffix = t.includes('+1') ? ' (+1 day)' : '';
  return `${h}:${m} ${ampm}${suffix}`;
}

/* ── Booking ID formatter ── */
export function fmtBookingId(counter: number): string {
  return 'BK' + String(counter).padStart(6, '0');
}

export function fmtTicketId(counter: number): string {
  return 'TK' + String(counter).padStart(6, '0');
}
