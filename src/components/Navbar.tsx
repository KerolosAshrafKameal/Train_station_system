import { Link, useLocation, useNavigate } from 'react-router-dom';

const links = [
  { to: '/',           label: '🏠 Home' },
  { to: '/trains',     label: '🚆 View Trains' },
  { to: '/prebook',    label: '🎫 Pre-Book' },
  { to: '/my-bookings',label: '📜 History' },
];

export default function Navbar({ onLogout }: { onLogout?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('enr_auth');
      navigate('/login');
    }
  };

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #0d1326 0%, #292524 100%)',
      borderBottom: '2px solid #d97706',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#d97706', letterSpacing: 2 }}>ENR</span>
        <span style={{ fontSize: 13, color: '#a8a29e', fontWeight: 500 }}>Egyptian National Railways</span>
      </Link>
      <div style={{ display: 'flex', gap: 4 }}>
        {links.map(l => {
          const active = pathname === l.to;
          return (
            <Link key={l.to} to={l.to} style={{
              padding: '8px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: active ? '#1c1917' : '#d6d3d1',
              background: active ? '#d97706' : 'transparent',
              transition: 'all .2s',
            }}>
              {l.label}
            </Link>
          );
        })}
        <button 
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #ef4444',
            backgroundColor: 'transparent',
            color: '#ef4444',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: '8px',
            transition: 'all .2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#ef4444';
          }}
        >
          🚪 Logout
        </button>
      </div>
    </nav>
  );
}
