import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Music, Play } from 'lucide-react';
import { userAPI } from '../api';
import SongRow from '../components/music/SongRow';
import { usePlayer } from '../context/PlayerContext';
import toast from 'react-hot-toast';

const LikedSongsPage = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentSong, playSong } = usePlayer();

  const fetchLiked = async () => {
    setLoading(true);
    try {
      const { data } = await userAPI.getLikedSongs();
      setSongs(data.likedSongs || []);
    } catch {
      toast.error('Failed to load liked songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLiked(); }, []);

  const playAll = () => {
    if (songs.length) playSong(songs[0], songs);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="playlist-header">
        <div
          className="playlist-cover-placeholder"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle at 78% 18%, rgba(89, 255, 186, 0.2), transparent 35%), linear-gradient(145deg, #172c29 0%, #11211e 50%, #182231 100%)',
            boxShadow: 'inset 0 1px 0 rgba(209, 255, 231, 0.14), 0 18px 34px rgba(0, 0, 0, 0.32)',
            overflow: 'hidden',
          }}
        >
          <svg
            viewBox="0 0 160 160"
            role="presentation"
            style={{ width: '82%', height: '82%', filter: 'drop-shadow(0 0 10px rgba(58, 240, 163, 0.28))' }}
          >
            <defs>
              <linearGradient id="liked-heart" x1="45" y1="40" x2="117" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#caffdf" />
                <stop offset="0.5" stopColor="#43eba0" />
                <stop offset="1" stopColor="#18b978" />
              </linearGradient>
              <linearGradient id="liked-wave" x1="34" y1="109" x2="126" y2="125" gradientUnits="userSpaceOnUse">
                <stop stopColor="#35e89b" stopOpacity="0.45" />
                <stop offset="0.5" stopColor="#b2ffda" />
                <stop offset="1" stopColor="#35e89b" stopOpacity="0.45" />
              </linearGradient>
              <filter id="liked-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <circle cx="80" cy="80" r="50" fill="none" stroke="rgba(175, 255, 215, 0.1)" strokeWidth="1" />
            <path
              d="M80 112.5 48.8 83.2C36 71.2 37.3 50 53.4 43.1c10.3-4.4 21.4-.8 26.6 8.1 5.2-8.9 16.3-12.5 26.6-8.1 16.1 6.9 17.4 28.1 4.6 40.1L80 112.5Z"
              fill="rgba(16, 50, 40, 0.48)"
              stroke="url(#liked-heart)"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M61 63c4.4-5.8 11.7-7.2 17-3.5" fill="none" stroke="rgba(218, 255, 235, 0.72)" strokeWidth="4" strokeLinecap="round" />

            <g stroke="url(#liked-wave)" strokeWidth="5" strokeLinecap="round" filter="url(#liked-glow)">
              <path d="M35 120v-10" />
              <path d="M46 120v-22" />
              <path d="M57 120v-15" />
              <path d="M68 120v-32" />
              <path d="M80 120v-19" />
              <path d="M92 120v-38" />
              <path d="M104 120v-24" />
              <path d="M115 120v-14" />
              <path d="M126 120v-28" />
            </g>
          </svg>
        </div>
        <div className="playlist-info">
          <p style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)' }}>Playlist</p>
          <h1>Liked Songs</h1>
          <p>{songs.length} songs</p>
          <div className="playlist-actions">
            {songs.length > 0 && (
              <button className="btn btn-primary" onClick={playAll}>
                <Play size={16} fill="white" /> Play All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Song list */}
      {songs.length === 0 ? (
        <div className="empty-state">
          <Heart size={48} />
          <h3>No liked songs yet</h3>
          <p>Hit the ❤️ on any song to save it here.</p>
          <Link to="/search" className="btn btn-primary" style={{ marginTop:16 }}>
            Find music
          </Link>
        </div>
      ) : (
        <div>
          {songs.map((song, i) => (
            <SongRow
              key={song.videoId}
              song={{ ...song, liked: true }}
              index={i}
              queue={songs}
              isActive={currentSong?.videoId === song.videoId}
              onLikeChange={fetchLiked}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedSongsPage;
