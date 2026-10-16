import { Play, Plus, MoreVertical, Heart, ListMusic, Music, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlayer } from '../../context/PlayerContext';
import { userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import AddToPlaylistModal from './AddToPlaylistModal';
import toast from 'react-hot-toast';
import { downloadSong, getDownload, getDownloadAvailability } from '../../utils/downloadStore';
import Artwork from './Artwork';

/**
 * SongCard — the grid card with thumbnail, play overlay, and a ⋮ context menu.
 *
 * Props:
 *  song:         { videoId, title, artist, thumbnail, duration }
 *  queue:        optional array — set as the playback queue when this card is played
 *  onLikeChange: optional callback when like status changes (used in LikedSongsPage)
 *
 * Design decision: The ⋮ menu opens on click (not hover) because hover menus
 * are bad UX on touch devices. The menu closes when you click anywhere outside
 * (handled by the document click listener + useRef pattern).
 */
const SongCard = ({ song, queue, onLikeChange }) => {
  const { playSong, addToQueue } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(song?.liked || false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState('idle');
  const [downloadError, setDownloadError] = useState('');
  const downloadControllerRef = useRef(null);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);

  // Close menu when clicking outside
  // WHY useEffect + document listener? Because React's onBlur doesn't work well
  // for div-based dropdowns. Listening on document captures all clicks.
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !menuButtonRef.current?.contains(e.target)) {
        setShowMenu(false);
      }
    };
    const updatePosition = () => {
      const rect = menuButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isMobile = window.innerWidth <= 640;
      if (isMobile) {
        setMenuPosition({ isMobile: true });
        return;
      }
      const width = 220;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      if (openUpward) {
        const maxHeight = Math.min(320, Math.max(140, spaceAbove));
        setMenuPosition({ isMobile: false, left, bottom: window.innerHeight - rect.top + 6, width, maxHeight });
      } else {
        const maxHeight = Math.min(320, Math.max(140, spaceBelow));
        setMenuPosition({ isMobile: false, left, top: rect.bottom + 6, width, maxHeight });
      }
    };
    updatePosition();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showMenu]);


  useEffect(() => {
    if (!isAuthenticated || !song?.videoId) return undefined;
    let active = true;
    userAPI.getLikeStatus(song.videoId)
      .then(({ data }) => { if (active) setLiked(Boolean(data.liked)); })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated, song?.videoId]);

  if (!song) return null;
  const downloadAvailability = getDownloadAvailability(song);

  const handlePlay = (e) => {
    e.stopPropagation();
    playSong(song, queue || null);
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
        toast.success('Added to liked songs ❤️');
      }
      onLikeChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setShowMenu(false);
  };

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    addToQueue(song);
    toast.success('Added to queue');
    setShowMenu(false);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!downloadAvailability.allowed) return;
    try {
      if (await getDownload(song.videoId)) {
        setDownloadStatus('success');
        toast('This song is already downloaded', { icon: '✓' });
        setShowMenu(false);
        return;
      }
      setDownloadStatus('downloading');
      setDownloadError('');
      setDownloadProgress(0);
      downloadControllerRef.current = new AbortController();
      await downloadSong(song, setDownloadProgress, downloadControllerRef.current.signal);
      setDownloadStatus('success');
      toast.success('Song downloaded for offline playback');
    } catch (error) {
      if (error.name === 'AbortError') {
        setDownloadStatus('idle');
      } else {
        setDownloadStatus('failed');
        setDownloadError(error.message || 'Download failed');
        toast.error(error.message || 'Download failed');
      }
    } finally {
      downloadControllerRef.current = null;
      setDownloadProgress(null);
      setShowMenu(false);
    }
  };

  const cancelDownload = (e) => {
    e.stopPropagation();
    downloadControllerRef.current?.abort();
  };

  const downloadLabel = downloadStatus === 'failed'
    ? 'Retry download'
    : downloadStatus === 'success'
      ? 'Downloaded'
      : downloadAvailability.allowed ? 'Download' : downloadAvailability.reason;

  return (
    <>
      <div className="song-card" onClick={handlePlay}>
        {/* Thumbnail */}
        <div className="thumbnail-wrap">
          <Artwork song={song} alt={song.title} loading="lazy" />

          {/* Play overlay — shown on card hover */}
          <div className="play-overlay">
            <button className="play-btn" onClick={handlePlay} title="Play">
              <Play size={20} fill="white" />
            </button>
          </div>

          {/* Like button — top right corner on hover */}
          <button
            className={`like-btn btn-icon ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.65)',
              borderRadius: '50%', width: 28, height: 28,
            }}
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Card info */}
        <div className="card-info">
          <h4 title={song.title}>{song.title}</h4>
          <p title={song.artist}>{song.artist}</p>
          {song.duration && (
            <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop: 2 }}>{song.duration}</p>
          )}
        </div>

        {/* ⋮ Context Menu */}
        <div
          style={{ position: 'relative', padding: '0 8px 8px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={menuButtonRef}
            className="btn-icon"
            style={{ width: '100%', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}
            onClick={(e) => { e.stopPropagation(); setShowMenu(p => !p); }}
            title="More options"
          >
            <MoreVertical size={14} />
            <span>More</span>
          </button>

          {showMenu && menuPosition && createPortal((
            <>
              {menuPosition.isMobile && (
                <div
                  className="song-menu-backdrop"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                />
              )}
              <div
                ref={menuRef}
                className={`song-card-menu ${menuPosition.isMobile ? 'song-card-menu-mobile' : ''}`}
                style={menuPosition.isMobile ? undefined : {
                  left: menuPosition.left,
                  top: menuPosition.top,
                  bottom: menuPosition.bottom,
                  width: menuPosition.width,
                  maxHeight: menuPosition.maxHeight,
                }}
              >
                {menuPosition.isMobile && (
                  <div className="song-menu-mobile-header">
                    <Artwork song={song} size="small" alt={song.title} className="song-menu-mobile-thumb" />
                    <div className="song-menu-mobile-meta">
                      <p className="song-menu-mobile-title">{song.title}</p>
                      <p className="song-menu-mobile-artist">{song.artist}</p>
                    </div>
                  </div>
                )}
                {/* Play */}
                <button
                  className="dropdown-item"
                  onClick={(e) => { e.stopPropagation(); playSong(song, queue || null); setShowMenu(false); }}
                >
                  <Play size={14} /> Play now
                </button>

                {/* Add to queue */}
                <button
                  className="dropdown-item"
                  onClick={handleAddToQueue}
                >
                  <ListMusic size={14} /> Add to queue
                </button>
                <button
                  className="dropdown-item"
                  onClick={downloadStatus === 'downloading' ? cancelDownload : handleDownload}
                  disabled={!downloadAvailability.allowed || downloadStatus === 'success'}
                  title={downloadAvailability.allowed ? (downloadError || 'Download for offline playback') : downloadAvailability.reason}
                >
                  <Download size={14} />
                  {downloadStatus === 'downloading'
                    ? `Cancel download${downloadProgress === null ? ' · waiting' : ` · ${Math.round(downloadProgress * 100)}%`}`
                    : downloadLabel}
                </button>

                {/* Add to playlist */}
                <button
                  className="dropdown-item"
                  onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(true); setShowMenu(false); }}
                >
                  <Plus size={14} /> Add to playlist
                </button>

                {/* Like / Unlike */}
                <button
                  className={`dropdown-item ${liked ? 'liked-item' : ''}`}
                  onClick={handleLike}
                >
                  <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                  {liked ? 'Unlike' : 'Like'}
                </button>
              </div>
            </>
          ), document.body)}

        </div>
      </div>

      {/* Add to Playlist modal — rendered outside the card to avoid z-index issues */}
      {showPlaylistModal && (
        <AddToPlaylistModal
          song={song}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </>
  );
};

export default SongCard;
