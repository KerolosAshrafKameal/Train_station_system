import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ onLogout }: { onLogout?: () => void }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();
    else { localStorage.removeItem('enr_auth'); navigate('/login'); }
  };

  const passengerName = localStorage.getItem('enr_user_name') || 'Passenger';

  return (
    <nav className="top-nav">
      {/* Brand */}
      <Link to="/" className="top-nav__brand">
        <div className="top-nav__brand-icon">🚆</div>
        <div className="top-nav__brand-text">
          <strong>EGYPTIAN NATIONAL RAILWAYS</strong>
          <span>Smart Booking System</span>
        </div>
      </Link>

      {/* User / Logout */}
      <div className="top-nav__actions">
        <div className="top-nav__user">
          <div className="top-nav__user-avatar">👤</div>
          <span>{passengerName}</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
