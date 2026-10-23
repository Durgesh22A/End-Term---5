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
        <div
          className="playlist-cover-placeholder"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle at 24% 18%, rgba(89, 255, 186, 0.22), transparent 36%), linear-gradient(145deg, #162d28 0%, #10201d 48%, #172231 100%)',
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
              <linearGradient id="history-ring" x1="36" y1="31" x2="123" y2="125" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a7ffd4" />
                <stop offset="0.48" stopColor="#39e99a" />
                <stop offset="1" stopColor="#17b978" />
              </linearGradient>
              <linearGradient id="history-wave" x1="36" y1="105" x2="126" y2="123" gradientUnits="userSpaceOnUse">
                <stop stopColor="#35e89b" stopOpacity="0.48" />
                <stop offset="0.5" stopColor="#b2ffda" />
                <stop offset="1" stopColor="#35e89b" stopOpacity="0.48" />
              </linearGradient>
              <filter id="history-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <circle cx="80" cy="80" r="50" fill="none" stroke="rgba(175, 255, 215, 0.1)" strokeWidth="1" />
            <path d="M111 50.5A43 43 0 1 0 121.5 85" fill="none" stroke="url(#history-ring)" strokeWidth="7" strokeLinecap="round" />
            <path d="M110.5 39.5v14.5H125" fill="none" stroke="#a7ffd4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="80" cy="80" r="29" fill="rgba(8, 22, 20, 0.38)" stroke="rgba(178, 255, 218, 0.18)" />
            <path d="M80 61v21l16 10" fill="none" stroke="#c9ffe2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="80" cy="80" r="4" fill="#c9ffe2" />

            <g stroke="url(#history-wave)" strokeWidth="5" strokeLinecap="round" filter="url(#history-glow)">
              <path d="M36 118v-10" />
              <path d="M47 118v-20" />
              <path d="M58 118v-31" />
              <path d="M69 118v-17" />
              <path d="M80 118v-25" />
              <path d="M91 118v-39" />
              <path d="M102 118v-23" />
              <path d="M113 118v-14" />
              <path d="M124 118v-26" />
            </g>
          </svg>
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
