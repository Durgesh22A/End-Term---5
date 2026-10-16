import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, Clock, Plus, Music4, ListMusic, Download, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { playlistAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import CreatePlaylistModal from '../music/CreatePlaylistModal';

const Sidebar = () => {
  const { isAuthenticated } = useAuth();
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      playlistAPI.getAll()
        .then(({ data }) => setPlaylists(data.playlists || []))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handlePlaylistCreated = (playlist) => {
    setPlaylists(prev => [playlist, ...prev]);
    navigate(`/playlist/${playlist._id}`);
  };

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Music4 size={20} />
          </div>
          <h1>VibeTube</h1>
        </div>

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
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            Settings
          </NavLink>
        </nav>

        {/* Playlists section */}
        <div className="sidebar-playlists">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
            <span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Playlists
            </span>
            <button
              className="btn-icon"
              onClick={() => setShowCreate(true)}
              title="Create playlist"
              style={{ width: 24, height: 24 }}
            >
              <Plus size={16} />
            </button>
          </div>

          {playlists.length === 0 && (
            <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', padding:'4px 8px' }}>
              No playlists yet
            </p>
          )}

          {playlists.map(pl => (
            <NavLink
              key={pl._id}
              to={`/playlist/${pl._id}`}
              className="sidebar-playlist-item"
            >
              <ListMusic size={14} style={{ flexShrink:0 }} />
              <span style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                {pl.name}
              </span>
            </NavLink>
          ))}
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

      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreated={handlePlaylistCreated}
        />
      )}
    </>
  );
};

export default Sidebar;
