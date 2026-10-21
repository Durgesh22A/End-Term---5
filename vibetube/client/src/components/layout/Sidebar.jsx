import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Heart, Clock, ListMusic, Download, Settings } from 'lucide-react';

const Sidebar = () => {
  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <NavLink to="/" className="sidebar-logo" aria-label="RIFFORA home" end>
          <img className="brand-mark" src="/riffora-mark.svg" alt="" />
          <span className="brand-lockup">
            <strong>RIFFORA</strong>
            <small>Find Your Frequency.</small>
          </span>
        </NavLink>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <Home size={20} />
            Home
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Search size={20} />
            Search
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Library size={20} />
            Your Library
          </NavLink>

          <div className="nav-section-label">Your Music</div>

          <NavLink to="/liked" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Heart size={20} />
            Liked Songs
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Clock size={20} />
            Recently Played
          </NavLink>
          <NavLink to="/downloads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Download size={20} />
            Downloads
          </NavLink>
          <NavLink to="/playlists" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ListMusic size={20} />
            Playlists
          </NavLink>
        </nav>

        <div className="sidebar-settings">
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            Settings
          </NavLink>
        </div>
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} end>
          <Home size={18} /><span>Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Search size={18} /><span>Search</span>
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Library size={18} /><span>Library</span>
        </NavLink>
        <NavLink to="/liked" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Heart size={18} /><span>Liked</span>
        </NavLink>
        <NavLink to="/downloads" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Download size={18} /><span>Offline</span>
        </NavLink>
      </nav>

    </>
  );
};

export default Sidebar;
