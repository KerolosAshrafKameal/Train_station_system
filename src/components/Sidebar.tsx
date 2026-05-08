import { Link, useLocation } from 'react-router-dom';

const SIDEBAR_ITEMS = [
  { to: '/',            icon: '⊞', label: 'Dashboard' },
  { to: '/trains',      icon: '🕐', label: 'Schedules' },
  { to: '/prebook',     icon: '🎫', label: 'Pre-Book Ticket' },
  { to: '/my-bookings', icon: '📋', label: 'History' },
];

interface SidebarProps {
  onNewBooking?: () => void;
}

export default function Sidebar({ onNewBooking }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <>
      <aside className="sidebar">
      {/* ENR Portal branding block */}
      <div style={{
        padding: '0 16px 16px',
        borderBottom: '1px solid var(--sidebar-border)',
        marginBottom: 8,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 0',
        }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--enr-red)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 18,
            flexShrink: 0,
          }}>🚆</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>ENR Portal</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Passenger System
            </div>
          </div>
        </div>
      </div>

      {/* Nav section */}
      <div className="sidebar__section-title">Navigation</div>
      {SIDEBAR_ITEMS.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className={`sidebar__nav-item${
            (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to))
              ? ' sidebar__nav-item--active'
              : ''
          }`}
        >
          <span className="sidebar__nav-icon">{item.icon}</span>
          {item.label}
        </Link>
      ))}

    </aside>
      
      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        {SIDEBAR_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`bottom-nav__item${
              (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to))
                ? ' bottom-nav__item--active'
                : ''
            }`}
          >
            <span className="bottom-nav__icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
