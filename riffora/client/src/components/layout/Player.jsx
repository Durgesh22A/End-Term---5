import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, ListMusic, Music, Heart,
  Radio, MonitorSpeaker, ListPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../api';
import { formatTime } from '../../utils/formatters';
import QueuePanel from './QueuePanel';
import SongDetailsModal from './SongDetailsModal';
import AddToPlaylistModal from '../music/AddToPlaylistModal';
import toast from 'react-hot-toast';
import Artwork from '../music/Artwork';

const Player = () => {
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const {
    currentSong, isPlaying, duration, currentTime,
    volume, isMuted, showQueue, isLooping, isShuffled, isAutoplay,
    showDetails, deviceStatus,
    playerError,
    failedSongId,
    needsPlaybackResume,
    togglePlay, playNext, playPrev, seekTo,
    setVolumeLevel, toggleMute,
    setShowQueue, setIsLooping, setIsShuffled,
    toggleAutoplay, setShowDetails, chooseAudioDevice, resumePlayback,
  } = usePlayer();

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
        await userAPI.likeSong(currentSong.videoId, {
          title: currentSong.title,
          thumbnail: currentSong.thumbnail,
          artist: currentSong.artist,
          duration: currentSong.duration,
        });
        setLiked(true);
        toast.success('Added to liked songs');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update liked songs');
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  };

  const handleDeviceSelect = async () => {
    const message = await chooseAudioDevice();
    toast(message, { icon: '🔊' });
  };

  return (
    <>
      <div className="player">
        {/* ── Left: Song Info ── */}
        <div className="player-song-info">
          <Artwork song={currentSong} size="small" alt={currentSong?.title || ''} className="player-thumb" />
          {currentSong && (
            <button
              className="player-song-meta player-song-details-trigger"
              onClick={() => setShowDetails(true)}
              title="Open song details and lyrics"
            >
              <p className="player-song-title">{currentSong.title}</p>
              <p className="player-song-artist">{currentSong.artist}</p>
            </button>
          )}
          {!currentSong && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nothing playing
            </p>
          )}
          {currentSong && (
            <>
              <button className={`btn-icon like-btn ${liked ? 'liked' : ''}`} onClick={handleLike} title={liked ? 'Unlike' : 'Like'}>
                <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button className="btn-icon" onClick={() => setShowPlaylistModal(true)} title="Add to playlist">
                <ListPlus size={17} />
              </button>
            </>
          )}
        </div>

        {/* ── Center: Controls ── */}
        <div className="player-controls">
          <div className="player-buttons">
            <button
              className={`btn-icon ${isShuffled ? 'active' : ''}`}
              onClick={() => setIsShuffled(p => !p)}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button className="btn-icon" onClick={playPrev} title="Previous">
              <SkipBack size={18} />
            </button>

            <button className="player-play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
            </button>

            <button className="btn-icon" onClick={playNext} title="Next">
              <SkipForward size={18} />
            </button>

            <button
              className={`btn-icon ${isLooping ? 'active' : ''}`}
              onClick={() => setIsLooping(p => !p)}
              title="Loop"
            >
              <Repeat size={16} />
            </button>
            <button
              className={`btn-icon ${isAutoplay ? 'active' : ''}`}
              onClick={toggleAutoplay}
              title={`Autoplay ${isAutoplay ? 'on' : 'off'}`}
            >
              <Radio size={16} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="progress-bar-wrap">
            <span>{formatTime(currentTime)}</span>
            <div className="progress-bar" onClick={handleProgressClick} title="Seek">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
          {playerError && (
            <div className="player-error" role="status">
              <span>{playerError}</span>
              {failedSongId === currentSong?.videoId && <button type="button" onClick={playNext}>Try next track</button>}
            </div>
          )}
          {needsPlaybackResume && currentSong && !playerError && (
            <div className="player-resume" role="status">
              <span>Playback was restored at {formatTime(currentTime)}. Your browser needs a confirmation to continue.</span>
              <button type="button" onClick={resumePlayback}>Resume playback</button>
            </div>
          )}
        </div>

        {/* ── Right: Volume + Queue ── */}
        <div className="player-extras">
          <button
            className={`btn-icon ${showQueue ? 'active' : ''}`}
            onClick={() => setShowQueue(p => !p)}
            title="Queue"
          >
            <ListMusic size={18} />
          </button>

          <div className="volume-wrap">
            <button className="btn-icon" onClick={toggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolumeLevel(parseInt(e.target.value))}
              className="volume-slider"
              title="Volume"
            />
          </div>
          <button className="btn-icon device-output" onClick={handleDeviceSelect} title={deviceStatus}>
            <MonitorSpeaker size={17} />
          </button>
        </div>
      </div>

      {showQueue && <QueuePanel />}
      {showDetails && <SongDetailsModal />}
      {showPlaylistModal && currentSong && (
        <AddToPlaylistModal song={currentSong} onClose={() => setShowPlaylistModal(false)} />
      )}
    </>
  );
};

export default Player;
