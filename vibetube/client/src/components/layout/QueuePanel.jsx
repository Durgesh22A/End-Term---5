import { X, Music } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import Artwork from '../music/Artwork';

const QueuePanel = () => {
  const { queue, currentSong, playFromQueue, removeFromQueue, setShowQueue } = usePlayer();

  return (
    <div className="queue-panel glass">
      <div className="queue-header">
        <h3>Queue</h3>
        <button className="btn-icon" onClick={() => setShowQueue(false)}>
          <X size={18} />
        </button>
      </div>

      <div className="queue-list">
        {queue.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <Music size={32} />
            <p style={{ marginTop: 8 }}>Queue is empty</p>
          </div>
        )}

        {queue.map((song, index) => {
          const isActive = currentSong?.videoId === song.videoId;
          return (
            <div
              key={`${song.videoId}-${index}`}
              className={`song-row ${isActive ? 'active' : ''}`}
              onClick={() => playFromQueue(index)}
            >
              <div className="song-row-index">
                {isActive ? (
                  <div className="now-playing-bars">
                    <span /><span /><span />
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{index + 1}</span>
                )}
              </div>
              <Artwork song={song} size="small" alt={song.title} className="song-row-thumb" />
              <div className="song-row-meta">
                <p className="song-row-title">{song.title}</p>
                <p className="song-row-artist">{song.artist}</p>
              </div>
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); removeFromQueue(song.videoId); }}
                title="Remove from queue"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueuePanel;
