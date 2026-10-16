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
          <span style={{ fontSize:28 }}>❤️</span>
          <div>
            <p style={{ fontWeight:600 }}>Liked Songs</p>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Your favorites</p>
          </div>
        </Link>

        <Link to="/history" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'linear-gradient(135deg, rgba(55,65,81,0.4), rgba(31,41,55,0.3))', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-color)', transition:'all var(--transition-fast)', textDecoration:'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <span style={{ fontSize:28 }}>🕐</span>
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
