import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Play } from 'lucide-react';
import { historyAPI } from '../api';
import SongRow from '../components/music/SongRow';
import { usePlayer } from '../context/PlayerContext';
import toast from 'react-hot-toast';

const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { currentSong, playSong } = usePlayer();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await historyAPI.get(100);
      setHistory(data.history || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleClear = async () => {
    setClearing(true);
    try {
      await historyAPI.clear();
      setHistory([]);
      setShowClearModal(false);
      toast.success('History cleared');
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setClearing(false);
    }
  };

  const playAll = () => {
    if (history.length) playSong(history[0], history);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      <div className="playlist-header">
        <div className="playlist-cover-placeholder" style={{ background:'linear-gradient(135deg, #374151, #1f2937)' }}>
          <Clock size={60} color="rgba(255,255,255,0.5)" />
        </div>
        <div className="playlist-info">
          <p style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)' }}>History</p>
          <h1>Recently Played</h1>
          <p>{history.length} songs</p>
          <div className="playlist-actions">
            {history.length > 0 && (
              <>
                <button className="btn btn-primary" onClick={playAll}>
                  <Play size={16} fill="white" /> Play All
                </button>
                <button className="btn btn-ghost" onClick={() => setShowClearModal(true)} style={{ color:'var(--error)' }}>
                  <Trash2 size={16} /> Clear History
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} />
          <h3>No listening history yet</h3>
          <p>Songs you play will appear here.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop:16 }}>
            Discover music
          </Link>
        </div>
      ) : (
        <div>
          {history.map((entry, i) => (
            <SongRow
              key={`${entry.videoId}-${entry.playedAt}`}
              song={entry}
              index={i}
              queue={history}
              isActive={currentSong?.videoId === entry.videoId}
            />
          ))}
        </div>
      )}

      {showClearModal && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="clear-history-title">
          <section className="confirm-modal">
            <div className="confirm-icon"><Trash2 size={22} /></div>
            <h2 id="clear-history-title">Clear listening history?</h2>
            <p>This will remove all recently played songs from your history. This action cannot be undone.</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setShowClearModal(false)} disabled={clearing}>Cancel</button>
              <button className="btn btn-danger" onClick={handleClear} disabled={clearing}>
                {clearing ? 'Clearing...' : 'Clear History'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
