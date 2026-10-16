import { Link } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getInitials } from '../utils/formatters';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { isAutoplay, toggleAutoplay } = usePlayer();

  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h1>Settings</h1>
          <p>Manage your profile and listening preferences.</p>
        </div>
      </div>

      <section className="settings-card settings-profile">
        <div className="settings-avatar">{getInitials(user?.name || 'Vibe User')}</div>
        <div>
          <h2>{user?.name || 'VibeTube listener'}</h2>
          <p>{user?.email || 'Signed-in account'}</p>
          {user?.subscription === 'premium' && <span className="status-pill">Premium</span>}
        </div>
        <Link to="/library" className="btn btn-ghost settings-card-action">Your library <ChevronRight size={16} /></Link>
      </section>

      <section className="settings-card">
        <div className="settings-section-title"><PlayCircle size={18} /><h2>Playback</h2></div>
        <button className="settings-row" onClick={toggleAutoplay}>
          <span><strong>Autoplay</strong><small>Continue with similar music when a queue ends.</small></span>
          <span className={`toggle ${isAutoplay ? 'on' : ''}`} aria-label={`Autoplay ${isAutoplay ? 'on' : 'off'}`}><span /></span>
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-section-title"><Bell size={18} /><h2>Account</h2></div>
        <div className="settings-row settings-row-static"><span><strong>Notifications</strong><small>Notifications are managed by your browser.</small></span><span className="settings-value">Browser settings</span></div>
        <div className="settings-row settings-row-static"><span><strong>Authentication</strong><small>Your session uses a secure HTTP-only cookie.</small></span><span className="settings-value">Secure</span></div>
      </section>

      <button className="btn btn-ghost settings-logout" onClick={async () => { await logout(); window.location.assign('/login'); }}>
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
};

export default SettingsPage;
