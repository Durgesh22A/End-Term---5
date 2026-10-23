import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Disc3, Play } from 'lucide-react';
import { youtubeAPI } from '../api';
import { usePlayer } from '../context/PlayerContext';
import SongRow from '../components/music/SongRow';
import toast from 'react-hot-toast';

const AlbumPage = () => {
  const { name } = useParams();
  const album = decodeURIComponent(name || '');
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    youtubeAPI.search(`${album} full album`, 20)
      .then(({ data }) => { if (active) setSongs(data.results || []); })
      .catch((requestError) => {
        if (!active) return;
        const status = requestError.response?.status;
        setError(status === 429
          ? 'YouTube is rate-limiting album results. Please wait and try again.'
          : requestError.response?.data?.message || 'Could not load this album right now.');
        toast.error(status === 429 ? 'Album results are rate-limited' : 'Could not load this album');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [album]);

  return (
    <div>
      <div className="detail-hero album-detail-hero">
        <div className="detail-avatar"><Disc3 size={56} /></div>
        <div><span className="eyebrow">ALBUM</span><h1>{album}</h1><p>Music results for this collection</p></div>
      </div>
      {loading ? <div className="page-loader"><div className="spinner" /></div> : error ? (
        <div className="empty-state"><Disc3 size={48} /><h3>Album results unavailable</h3><p>{error}</p></div>
      ) : songs.length ? (
        <>
          <button className="btn btn-primary" onClick={() => playSong(songs[0], songs)}><Play size={16} fill="currentColor" /> Play album</button>
          <div className="song-list" style={{ marginTop: 20 }}>{songs.map((song, index) => <SongRow key={song.videoId} song={song} index={index} queue={songs} />)}</div>
        </>
      ) : <div className="empty-state"><Disc3 size={48} /><h3>No album results</h3><p>Search for this album to find available tracks.</p></div>}
    </div>
  );
};

export default AlbumPage;
