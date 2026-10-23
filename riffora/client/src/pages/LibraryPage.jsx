import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Library, Plus, ListMusic } from 'lucide-react';
import { playlistAPI } from '../api';
import CreatePlaylistModal from '../components/music/CreatePlaylistModal';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Artwork from '../components/music/Artwork';

const LibraryPage = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const { data } = await playlistAPI.getAll();
      setPlaylists(data.playlists || []);
    } catch {
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlaylists(); }, []);

  const handlePlaylistCreated = (playlist) => {
    setPlaylists(prev => [playlist, ...prev]);
    navigate(`/playlist/${playlist._id}`);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <h1 style={{ fontSize:'1.8rem', fontFamily:'var(--font-heading)' }}>Your Library</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Playlist
        </button>
      </div>

      {/* Quick access */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:40 }}>
        <Link to="/liked" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'linear-gradient(135deg, rgba(234,88,12,0.2), rgba(247,147,26,0.1))', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-color)', transition:'all var(--transition-fast)', textDecoration:'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <span aria-hidden="true" style={{ display:'flex', width:36, height:36, flexShrink:0 }}>
            <svg viewBox="0 0 48 48" role="presentation" style={{ width:'100%', height:'100%', filter:'drop-shadow(0 0 5px rgba(58, 240, 163, 0.25))' }}>
              <defs>
                <linearGradient id="library-liked-heart" x1="12" y1="10" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#caffdf" />
                  <stop offset="0.5" stopColor="#43eba0" />
                  <stop offset="1" stopColor="#18b978" />
                </linearGradient>
              </defs>
              <path d="M24 34.5 10.5 22C5 17.8 5.5 10.5 12.4 8c4.5-1.6 9.4 0 11.6 3.8C26.2 8 31.1 6.4 35.6 8c6.9 2.5 7.4 9.8 1.9 14L24 34.5Z" fill="rgba(16, 50, 40, 0.52)" stroke="url(#library-liked-heart)" strokeWidth="3" strokeLinejoin="round" />
              <g stroke="#b2ffda" strokeWidth="2.4" strokeLinecap="round" opacity="0.88">
                <path d="M10 42v-4" /><path d="M15 42v-8" /><path d="M20 42v-5" /><path d="M25 42v-10" />
                <path d="M30 42v-6" /><path d="M35 42v-9" /><path d="M40 42v-4" />
              </g>
            </svg>
          </span>
          <div>
            <p style={{ fontWeight:600 }}>Liked Songs</p>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Your favorites</p>
          </div>
        </Link>

        <Link to="/history" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'linear-gradient(135deg, rgba(55,65,81,0.4), rgba(31,41,55,0.3))', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-color)', transition:'all var(--transition-fast)', textDecoration:'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <span aria-hidden="true" style={{ display:'flex', width:36, height:36, flexShrink:0 }}>
            <svg viewBox="0 0 48 48" role="presentation" style={{ width:'100%', height:'100%', filter:'drop-shadow(0 0 5px rgba(58, 240, 163, 0.25))' }}>
              <defs>
                <linearGradient id="library-history-ring" x1="10" y1="9" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a7ffd4" />
                  <stop offset="0.52" stopColor="#39e99a" />
                  <stop offset="1" stopColor="#17b978" />
                </linearGradient>
              </defs>
              <path d="M34.5 13.5A13.5 13.5 0 1 0 38 25" fill="none" stroke="url(#library-history-ring)" strokeWidth="3.4" strokeLinecap="round" />
              <path d="M34.5 9v5.5H40" fill="none" stroke="#a7ffd4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 16v8l5.7 3.5" fill="none" stroke="#c9ffe2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <g stroke="#b2ffda" strokeWidth="2.4" strokeLinecap="round" opacity="0.88">
                <path d="M10 42v-4" /><path d="M15 42v-8" /><path d="M20 42v-5" /><path d="M25 42v-10" />
                <path d="M30 42v-6" /><path d="M35 42v-9" /><path d="M40 42v-4" />
              </g>
            </svg>
          </span>
          <div>
            <p style={{ fontWeight:600 }}>Recently Played</p>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Your history</p>
          </div>
        </Link>
      </div>

      {/* Playlists */}
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:'1.1rem', marginBottom:16, color:'var(--text-secondary)' }}>Your Playlists</h2>

        {playlists.length === 0 ? (
          <div className="empty-state">
            <ListMusic size={48} />
            <h3>No playlists yet</h3>
            <p>Create a playlist to organize your favorite songs.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop:16 }}>
              <Plus size={16} /> Create Playlist
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16 }}>
            {playlists.map(pl => (
              <Link
                key={pl._id}
                to={`/playlist/${pl._id}`}
                style={{ display:'flex', flexDirection:'column', background:'var(--bg-card)', borderRadius:'var(--radius-lg)', overflow:'hidden', border:'1px solid var(--border-color)', transition:'all var(--transition-base)', textDecoration:'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Cover */}
                <div style={{ aspectRatio:'1', background: pl.thumbnail ? 'none' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                  {pl.thumbnail ? <Artwork song={{ thumbnail: pl.thumbnail }} size="large" alt={pl.name} /> : <ListMusic size={40} color="rgba(255,255,255,0.6)" />}
                </div>
                <div style={{ padding:'12px 14px' }}>
                  <p style={{ fontWeight:600, fontSize:'0.9rem', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{pl.name}</p>
                  <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>Playlist</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreated={handlePlaylistCreated}
        />
      )}
    </div>
  );
};

export default LibraryPage;
