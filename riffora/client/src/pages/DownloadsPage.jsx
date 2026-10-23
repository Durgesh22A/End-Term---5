import { useEffect, useRef, useState } from 'react';
import { Download, HardDrive, Play, Pause, Trash2, Music, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteDownload, getStorageEstimate, importAudioFile, listDownloads } from '../utils/downloadStore';
import { usePlayer } from '../context/PlayerContext';
import Artwork from '../components/music/Artwork';
import { useNavigate } from 'react-router-dom';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const DownloadsPage = () => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const refresh = async () => {
    try {
      setDownloads(await listDownloads());
      setStorage(await getStorageEstimate());
    } catch {
      toast.error('Offline storage is unavailable in this browser.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    window.addEventListener('riffora-downloads-changed', refresh);
    return () => window.removeEventListener('riffora-downloads-changed', refresh);
  }, []);

  const remove = async (song) => {
    try {
      await deleteDownload(song.videoId);
      await refresh();
      toast.success('Download removed');
    } catch {
      toast.error('Could not remove download');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      await importAudioFile(file);
      await refresh();
      toast.success('Audio file saved for offline playback');
    } catch (error) {
      toast.error(error.message || 'Could not save audio file');
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="downloads-page">
      <div className="section-header downloads-header">
        <div>
          <span className="eyebrow">OFFLINE LIBRARY</span>
          <h1>Downloads</h1>
          <p>Authorized audio saved on this device.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="storage-badge">
            <HardDrive size={16} />
            {storage ? `${formatBytes(storage.usage)} used${storage.quota ? ` of ${formatBytes(storage.quota)}` : ''}` : 'Storage usage unavailable'}
          </div>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleImport} hidden />
          <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload size={16} /> {importing ? 'Saving…' : 'Import audio file'}
          </button>
        </div>
      </div>

      {!downloads.length ? (
        <div className="empty-state download-empty">
          <Download size={48} />
          <h3>No downloads yet</h3>
          <p>Only songs with an authorized downloadable audio source can be saved here.</p>
          <button className="btn btn-primary" type="button" onClick={() => navigate('/search?filter=downloadable')}>
            <Download size={16} /> Explore Downloadable Songs
          </button>
        </div>
      ) : (
        <div className="downloads-list">
          {downloads.map(song => (
            <article className="download-row" key={song.videoId}>
              <Artwork song={song} size="small" alt={song.title} className="download-artwork" />
              <div className="download-meta">
                <strong>{song.title}</strong>
                <span>{song.artist || 'Unknown artist'}{song.duration ? ` · ${song.duration}` : ''}</span>
              </div>
              <span className="offline-badge">{song.sourceType === 'user-owned' ? 'LOCAL FILE' : 'OFFLINE'}</span>
              <button
                className="btn-icon"
                onClick={() => {
                  if (currentSong?.videoId === song.videoId) togglePlay();
                  else playSong({ ...song, isOffline: true });
                }}
                title={currentSong?.videoId === song.videoId && isPlaying ? 'Pause offline' : 'Play offline'}
              >
                {currentSong?.videoId === song.videoId && isPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
              </button>
              <button className="btn-icon danger-icon" onClick={() => remove(song)} title="Remove download"><Trash2 size={17} /></button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default DownloadsPage;
