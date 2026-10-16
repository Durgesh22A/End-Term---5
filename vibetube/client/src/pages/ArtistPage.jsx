import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mic2, Play } from 'lucide-react';
import { youtubeAPI } from '../api';
import { usePlayer } from '../context/PlayerContext';
import SongRow from '../components/music/SongRow';
import toast from 'react-hot-toast';

const ArtistPage = () => {
  const { name } = useParams();
  const artist = decodeURIComponent(name || '');
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    youtubeAPI.artistSearch(artist, 20)
      .then(({ data }) => { if (active) setSongs(data.results || []); })
      .catch((requestError) => {
        if (!active) return;
        const status = requestError.response?.status;
        setError(status === 429
          ? 'YouTube is rate-limiting artist results. Please wait and try again.'
          : requestError.response?.data?.message || 'Could not load this artist right now.');
        toast.error(status === 429 ? 'Artist results are rate-limited' : 'Could not load this artist');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [artist]);

  return (
    <div>
      <div className="detail-hero">
        <div className="detail-avatar"><Mic2 size={56} /></div>
        <div><span className="eyebrow">ARTIST</span><h1>{artist}</h1><p>{songs.length} songs available</p></div>
      </div>
      {loading ? <div className="page-loader"><div className="spinner" /></div> : error ? (
        <div className="empty-state"><Mic2 size={48} /><h3>Artist results unavailable</h3><p>{error}</p></div>
      ) : songs.length ? (
        <>
          <button className="btn btn-primary" onClick={() => playSong(songs[0], songs)}><Play size={16} fill="currentColor" /> Play artist</button>
          <div className="song-list" style={{ marginTop: 20 }}>{songs.map((song, index) => <SongRow key={song.videoId} song={song} index={index} queue={songs} />)}</div>
        </>
      ) : <div className="empty-state"><Mic2 size={48} /><h3>No songs found</h3><p>Try searching for another artist.</p></div>}
    </div>
  );
};

export default ArtistPage;
