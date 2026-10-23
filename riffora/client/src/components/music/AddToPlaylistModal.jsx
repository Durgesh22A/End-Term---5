import { useState } from 'react';
import { X, Check, Plus, Search, Music2 } from 'lucide-react';
import { playlistAPI, youtubeAPI } from '../../api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import Artwork from './Artwork';

/**
 * AddToPlaylistModal — lets user pick a playlist to add a song to.
 * Fetches user's playlists and shows them as a list.
 */
const AddToPlaylistModal = ({ song, onClose }) => {
  const [songToAdd, setSongToAdd] = useState(song);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [songResults, setSongResults] = useState([]);
  const [searchingSongs, setSearchingSongs] = useState(false);

  useEffect(() => {
    playlistAPI.getAll()
      .then(({ data }) => setPlaylists(data.playlists || []))
      .catch(() => toast.error('Could not load playlists'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (playlistId) => {
    setAdding(playlistId);
    try {
      await playlistAPI.addSong(playlistId, {
        videoId: songToAdd.videoId,
        title: songToAdd.title,
        thumbnail: songToAdd.thumbnail,
        artist: songToAdd.artist,
        duration: songToAdd.duration,
      });
      toast.success('Added to playlist!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add song');
      setAdding(null);
    }
  };

  const handleSongSearch = async (event) => {
    event.preventDefault();
    if (!songSearch.trim()) return;
    setSearchingSongs(true);
    try {
      const { data } = await youtubeAPI.search(songSearch.trim(), 6);
      setSongResults(data.results || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Song search failed');
    } finally {
      setSearchingSongs(false);
    }
  };

  const handleCreateAndAdd = async (event) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await playlistAPI.create({ name: newName.trim() });
      await playlistAPI.addSong(data.playlist._id, {
        videoId: songToAdd.videoId,
        title: songToAdd.title,
        thumbnail: songToAdd.thumbnail,
        artist: songToAdd.artist,
        duration: songToAdd.duration,
      });
      toast.success(`Created "${data.playlist.name}" and added song`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create playlist');
    } finally {
      setCreating(false);
    }
  };

  const visiblePlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Playlist</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem', marginBottom:16, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
          "{songToAdd?.title}"
        </p>
        <form onSubmit={handleSongSearch} className="playlist-picker-search modal-song-search">
          <Search size={15} />
          <input className="input" value={songSearch} onChange={(event) => setSongSearch(event.target.value)} placeholder="Search for another song to add" />
          <button className="btn btn-ghost" type="submit" disabled={searchingSongs}>{searchingSongs ? 'Searching...' : 'Find song'}</button>
        </form>
        {songResults.length > 0 && (
          <div className="modal-song-results">
            {songResults.map(result => (
              <button type="button" className={`modal-song-result ${songToAdd?.videoId === result.videoId ? 'selected' : ''}`} key={result.videoId} onClick={() => setSongToAdd(result)}>
                <Artwork song={result} size="small" alt="" />
                <span><strong>{result.title}</strong><small>{result.artist || 'Unknown artist'}</small></span>
                <Check size={15} />
              </button>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <div style={{ position:'relative', flex:1 }}>
            <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a playlist" style={{ paddingLeft:32 }} />
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setShowCreate((value) => !value)}>
            <Plus size={15} /> New
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateAndAdd} style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Playlist name" maxLength={100} autoFocus />
            <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
          </form>
        )}

        {loading && <div style={{ textAlign:'center', padding:24, color:'var(--text-muted)' }}>Loading...</div>}

        {!loading && playlists.length === 0 && !showCreate && (
          <p style={{ color:'var(--text-muted)', textAlign:'center', padding:24 }}>No playlists yet. Use New to create one.</p>
        )}

        <div style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
          {!loading && playlists.length > 0 && visiblePlaylists.length === 0 && (
            <p style={{ color:'var(--text-muted)', textAlign:'center', padding:18 }}>No matching playlists.</p>
          )}
          {visiblePlaylists.map(pl => (
            <button
              key={pl._id}
              onClick={() => handleAdd(pl._id)}
              disabled={adding === pl._id}
              style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px', borderRadius:'var(--radius-md)',
                background:'transparent', color:'var(--text-primary)',
                fontSize:'0.9rem', textAlign:'left', width:'100%',
                transition:'background var(--transition-fast)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width:40, height:40, borderRadius:'var(--radius-sm)', background:'var(--bg-tertiary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                🎵
              </div>
              <span style={{ flex:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{pl.name}</span>
              {adding === pl._id && <span style={{ color:'var(--accent-primary)', fontSize:'0.75rem' }}>Adding...</span>}
              {adding !== pl._id && <Check size={15} style={{ opacity:0.5 }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
