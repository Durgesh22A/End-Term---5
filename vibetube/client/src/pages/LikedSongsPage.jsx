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
        <div className="playlist-cover-placeholder">
          <Heart size={60} fill="rgba(255,255,255,0.5)" />
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
