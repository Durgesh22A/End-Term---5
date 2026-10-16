import { Play, Heart, Plus, Trash2, ListPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import AddToPlaylistModal from './AddToPlaylistModal';
import Artwork from './Artwork';

/**
 * SongRow — list-view row used in Liked Songs, History, Playlist detail.
 * Props:
 *   song, index, queue, isActive, onLikeChange, onRemove (optional)
 */
const SongRow = ({ song, index, queue, isActive, onLikeChange, onRemove, showRemove }) => {
  const { playSong, addToQueue } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(song?.liked || false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !song?.videoId) return undefined;
    let active = true;
    userAPI.getLikeStatus(song.videoId)
      .then(({ data }) => { if (active) setLiked(Boolean(data.liked)); })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated, song?.videoId]);

  if (!song) return null;

  const handlePlay = () => {
    playSong(song, queue || [song]);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) { toast.error('Log in to like songs'); return; }
    try {
      if (liked) {
        await userAPI.unlikeSong(song.videoId);
        setLiked(false);
        toast.success('Removed from liked songs');
      } else {
        await userAPI.likeSong(song.videoId, {
          title: song.title, thumbnail: song.thumbnail,
          artist: song.artist, duration: song.duration,
        });
        setLiked(true);
        toast.success('Liked ❤️');
      }
      onLikeChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <>
      <div
      className={`song-row ${isActive ? 'active' : ''}`}
      onClick={handlePlay}
      style={{ position: 'relative' }}
    >
      <div className="song-row-index">
        {isActive ? (
          <div className="now-playing-bars">
            <span /><span /><span />
          </div>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>

      <Artwork song={song} size="small" alt={song.title} className="song-row-thumb" loading="lazy" />

      <div className="song-row-meta">
        <p className="song-row-title">{song.title}</p>
        <p className="song-row-artist">{song.artist}</p>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        {song.duration && <span className="song-row-duration">{song.duration}</span>}

        <button
          className={`btn-icon like-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          title={liked ? 'Unlike' : 'Like'}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>

        <button
          className="btn-icon"
          onClick={(e) => { e.stopPropagation(); addToQueue(song); toast.success('Added to queue'); }}
          title="Add to queue"
        >
          <Plus size={15} />
        </button>

        <button
          className="btn-icon"
          onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(true); }}
          title="Add to playlist"
        >
          <ListPlus size={15} />
        </button>

        {showRemove && onRemove && (
          <button
            className="btn-icon"
            onClick={(e) => { e.stopPropagation(); onRemove(song.videoId); }}
            title="Remove"
            style={{ color: 'var(--error)' }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
      </div>
      {showPlaylistModal && <AddToPlaylistModal song={song} onClose={() => setShowPlaylistModal(false)} />}
    </>
  );
};

export default SongRow;
