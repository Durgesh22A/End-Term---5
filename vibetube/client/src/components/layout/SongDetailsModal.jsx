import { useEffect, useMemo, useState } from 'react';
import {
  X, ListMusic, Music2, Play, Pause, SkipBack, SkipForward,
  Heart, ListPlus,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { userAPI, youtubeAPI } from '../../api';
import { formatTime } from '../../utils/formatters';
import AddToPlaylistModal from '../music/AddToPlaylistModal';
import toast from 'react-hot-toast';
import Artwork from '../music/Artwork';

const parseSyncedLyrics = (lyrics) => {
  if (!Array.isArray(lyrics)) return [];
  return lyrics
    .map((line) => {
      if (typeof line === 'string') return null;
      const time = Number(line.time ?? line.startTime ?? line.timestamp);
      const text = line.text ?? line.words ?? line.lyrics;
      return Number.isFinite(time) && typeof text === 'string' ? { time, text } : null;
    })
    .filter(Boolean);
};

const SongDetailsModal = () => {
  const {
    currentSong, isPlaying, duration, currentTime,
    togglePlay, playNext, playPrev, seekTo, addToQueue, setShowQueue, setShowDetails,
  } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [lyricsState, setLyricsState] = useState({ status: 'loading', lyrics: '', syncedLyrics: [], message: '' });

  useEffect(() => {
    if (!isAuthenticated || !currentSong?.videoId) {
      setLiked(false);
      return undefined;
    }
    let active = true;
    userAPI.getLikeStatus(currentSong.videoId)
      .then(({ data }) => { if (active) setLiked(Boolean(data.liked)); })
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated, currentSong?.videoId]);

  useEffect(() => {
    if (!currentSong) return undefined;
    const controller = new AbortController();
    setLyricsState({ status: 'loading', lyrics: '', syncedLyrics: [], message: '' });
    youtubeAPI.lyrics(currentSong.title, currentSong.artist || '', controller.signal)
      .then(({ data }) => {
        const syncedLyrics = parseSyncedLyrics(data.syncedLyrics || data.lines);
        setLyricsState({
          status: data.status || (data.lyrics ? 'available' : 'unavailable'),
          lyrics: data.lyrics || '',
          syncedLyrics,
          message: data.message || '',
        });
      })
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLyricsState({ status: 'error', lyrics: '', syncedLyrics: [], message: 'Lyrics could not be loaded right now.' });
        }
      });
    return () => controller.abort();
  }, [currentSong?.videoId, currentSong?.title, currentSong?.artist]);

  useEffect(() => {
    if (!currentSong) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [currentSong]);

  const activeLine = useMemo(() => {
    if (!lyricsState.syncedLyrics.length) return -1;
    return lyricsState.syncedLyrics.reduce((active, line, index) =>
      line.time <= currentTime ? index : active, -1);
  }, [lyricsState.syncedLyrics, currentTime]);

  const handleLike = async () => {
    if (!currentSong) return;
    if (!isAuthenticated) {
      toast.error('Log in to like songs');
      return;
    }
    try {
      if (liked) {
        await userAPI.unlikeSong(currentSong.videoId);
        setLiked(false);
        toast.success('Removed from liked songs');
      } else {
        await userAPI.likeSong(currentSong.videoId, currentSong);
        setLiked(true);
        toast.success('Added to liked songs');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update liked songs');
    }
  };

  if (!currentSong) return null;

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <div className="details-overlay" role="dialog" aria-modal="true" aria-label="Now playing">
      <section className="details-sheet now-playing-sheet">
        <button className="btn-icon details-close" onClick={() => setShowDetails(false)} title="Close details">
          <X size={20} />
        </button>

        <div className="now-playing-layout">
          <div className="now-playing-main">
            <div className="details-artwork">
              <Artwork song={currentSong} size="large" alt={currentSong.title} />
            </div>
            <div className="details-copy">
              <span className="eyebrow">NOW PLAYING</span>
              <h2>{currentSong.title}</h2>
              <p>{currentSong.artist || 'Unknown artist'}</p>
              {(currentSong.album || currentSong.albumName || currentSong.releaseYear) && (
                <div className="details-meta">
                  {currentSong.album || currentSong.albumName}
                  {currentSong.releaseYear && <span>{currentSong.releaseYear}</span>}
                </div>
              )}
            </div>
            <div className="now-playing-actions">
              <button className={`btn-icon like-btn ${liked ? 'liked' : ''}`} onClick={handleLike} title={liked ? 'Unlike' : 'Like'}>
                <Heart size={19} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button className="btn-icon" onClick={() => setShowPlaylistModal(true)} title="Add to playlist">
                <ListPlus size={19} />
              </button>
              <button className="btn-icon" onClick={() => { addToQueue(currentSong); toast.success('Added to queue'); }} title="Add to queue">
                <ListMusic size={19} />
              </button>
            </div>
            <div className="modal-progress">
              <div className="progress-bar" onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                seekTo(((event.clientX - rect.left) / rect.width) * duration);
              }} role="slider" aria-valuenow={currentTime} aria-valuemin="0" aria-valuemax={duration} tabIndex="0">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="modal-progress-times"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
            <div className="modal-player-controls">
              <button className="btn-icon" onClick={playPrev} title="Previous"><SkipBack size={23} /></button>
              <button className="player-play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
              </button>
              <button className="btn-icon" onClick={playNext} title="Next"><SkipForward size={23} /></button>
            </div>
          </div>

          <div className="lyrics-panel">
            <div className="section-header">
              <div>
                <span className="eyebrow">WORDS &amp; MUSIC</span>
                <h3>Lyrics</h3>
              </div>
              <button className="btn-icon" onClick={() => { setShowQueue(true); setShowDetails(false); }} title="Open queue">
                <ListMusic size={18} />
              </button>
            </div>
            {lyricsState.status === 'loading' && <div className="lyrics-state"><div className="spinner" /> Loading lyrics...</div>}
            {lyricsState.status === 'available' && lyricsState.syncedLyrics.length > 0 && (
              <div className="lyrics-synced">
                {lyricsState.syncedLyrics.map((line, index) => (
                  <button className={`lyrics-line ${index === activeLine ? 'active' : ''}`} key={`${line.time}-${index}`} onClick={() => seekTo(line.time)}>
                    {line.text}
                  </button>
                ))}
              </div>
            )}
            {lyricsState.status === 'available' && !lyricsState.syncedLyrics.length && (
              <pre className="lyrics-text">{lyricsState.lyrics}</pre>
            )}
            {lyricsState.status === 'unavailable' && (
              <div className="lyrics-empty"><Music2 size={30} /><strong>Lyrics aren&apos;t available yet</strong><p>No verified lyrics were found for this track.</p></div>
            )}
            {lyricsState.status === 'error' && <div className="lyrics-empty lyrics-error"><strong>Lyrics couldn&apos;t be loaded</strong><p>{lyricsState.message}</p></div>}
          </div>
        </div>
      </section>
      {showPlaylistModal && <AddToPlaylistModal song={currentSong} onClose={() => setShowPlaylistModal(false)} />}
    </div>
  );
};

export default SongDetailsModal;
