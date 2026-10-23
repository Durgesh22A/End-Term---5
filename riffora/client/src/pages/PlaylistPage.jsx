import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pencil, Trash2, ListMusic, Plus, Check, X, Search, Music, ChevronUp, ChevronDown } from 'lucide-react';
import { playlistAPI, youtubeAPI } from '../api';
import SongRow from '../components/music/SongRow';
import { usePlayer } from '../context/PlayerContext';
import toast from 'react-hot-toast';
import Artwork from '../components/music/Artwork';

const PlaylistPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSong, playSong } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState([]);
  const [searchingSongs, setSearchingSongs] = useState(false);
  const [addingSong, setAddingSong] = useState(null);
  const [reordering, setReordering] = useState(false);

  const fetchPlaylist = async () => {
    setLoading(true);
    try {
      const { data } = await playlistAPI.getOne(id);
      setPlaylist(data.playlist);
      setEditName(data.playlist.name);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Playlist not found');
        navigate('/library');
      } else {
        toast.error('Failed to load playlist');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlaylist(); }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await playlistAPI.delete(id);
      toast.success('Playlist deleted');
      navigate('/library');
    } catch {
      toast.error('Failed to delete playlist');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleRename = async () => {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return; }
    try {
      await playlistAPI.update(id, { name: editName.trim() });
      setPlaylist(p => ({ ...p, name: editName.trim() }));
      setEditing(false);
      toast.success('Renamed!');
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleRemoveSong = async (videoId) => {
    try {
      await playlistAPI.removeSong(id, videoId);
      setPlaylist(p => ({ ...p, songs: p.songs.filter(s => s.videoId !== videoId) }));
      toast.success('Song removed');
    } catch {
      toast.error('Failed to remove song');
    }
  };

  const moveSong = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= playlist.songs.length || reordering) return;
    const nextSongs = [...playlist.songs];
    [nextSongs[index], nextSongs[nextIndex]] = [nextSongs[nextIndex], nextSongs[index]];
    setPlaylist(previous => ({ ...previous, songs: nextSongs }));
    setReordering(true);
    try {
      await playlistAPI.reorderSongs(id, nextSongs.map(song => song.videoId));
    } catch (error) {
      setPlaylist(previous => ({ ...previous, songs: playlist.songs }));
      toast.error(error.response?.data?.message || 'Could not reorder playlist');
    } finally {
      setReordering(false);
    }
  };

  const totalDuration = playlist?.songs?.reduce((total, song) => {
    const parts = String(song.duration || '').split(':').map(Number);
    if (parts.some(Number.isNaN)) return total;
    return total + (parts.length === 2 ? parts[0] * 60 + parts[1] : 0);
  }, 0) || 0;
  const durationLabel = `${Math.floor(totalDuration / 60)} min ${totalDuration % 60} sec`;

  const playAll = () => {
    if (playlist?.songs?.length) playSong(playlist.songs[0], playlist.songs);
  };

  const searchSongs = async (event) => {
    event.preventDefault();
    if (!songQuery.trim()) return;
    setSearchingSongs(true);
    try {
      const { data } = await youtubeAPI.search(songQuery.trim(), 20);
      setSongResults(data.results || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Song search failed');
    } finally {
      setSearchingSongs(false);
    }
  };

  const addSong = async (song) => {
    setAddingSong(song.videoId);
    try {
      const { data } = await playlistAPI.addSong(id, song);
      setPlaylist((previous) => ({ ...previous, songs: data.playlist?.songs || [...previous.songs, song] }));
      toast.success('Song added to playlist');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add song');
    } finally {
      setAddingSong(null);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!playlist) return null;

  return (
    <div>
      {/* Header */}
      <div className="playlist-header">
        <div className="playlist-cover-placeholder">
          {playlist.thumbnail ? <Artwork song={{ thumbnail: playlist.thumbnail }} size="large" alt={playlist.name} className="playlist-cover" /> : <ListMusic size={60} color="rgba(255,255,255,0.5)" />}
        </div>

        <div className="playlist-info">
          <p style={{ fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)' }}>Playlist</p>

          {/* Editable title */}
          {editing ? (
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <input
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ fontSize:'1.5rem', fontWeight:700, fontFamily:'var(--font-heading)' }}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
              />
              <button className="btn-icon" onClick={handleRename} style={{ color:'var(--success)' }}><Check size={20} /></button>
              <button className="btn-icon" onClick={() => setEditing(false)}><X size={20} /></button>
            </div>
          ) : (
            <h1>{playlist.name}</h1>
          )}

          {playlist.description && <p style={{ marginBottom:4 }}>{playlist.description}</p>}
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{playlist.songs.length} songs{playlist.songs.length ? ` · ${durationLabel}` : ''}</p>

          <div className="playlist-actions">
            {playlist.songs.length > 0 && (
              <button className="btn btn-primary" onClick={playAll}>
                <Play size={16} fill="white" /> Play All
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setShowSongPicker((value) => !value)}>
              <Plus size={16} /> Add Songs
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              <Pencil size={15} /> Rename
            </button>
            <button className="btn btn-ghost" onClick={() => setShowDeleteModal(true)} style={{ color:'var(--error)' }}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>

      {showSongPicker && (
        <section className="playlist-song-picker">
          <div className="section-header">
            <div>
              <h2>Add songs</h2>
              <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>Search the music catalog and add tracks to this playlist.</p>
            </div>
            <button className="btn-icon" onClick={() => setShowSongPicker(false)} title="Close song picker"><X size={18} /></button>
          </div>
          <form onSubmit={searchSongs} className="playlist-picker-search">
            <Search size={17} />
            <input className="input" value={songQuery} onChange={(event) => setSongQuery(event.target.value)} placeholder="Search songs, artists, or albums" />
            <button className="btn btn-primary" type="submit" disabled={searchingSongs}>{searchingSongs ? 'Searching...' : 'Search'}</button>
          </form>
          {searchingSongs && <div className="lyrics-state"><div className="spinner" /> Searching...</div>}
          {!searchingSongs && songResults.length === 0 && <div className="empty-state compact-empty"><Music size={32} /><p>Search for a song to add it.</p></div>}
          {!searchingSongs && songResults.length > 0 && (
            <div className="playlist-picker-results">
              {songResults.map((song) => {
                const alreadyAdded = playlist.songs.some((item) => item.videoId === song.videoId);
                return (
                  <div className="playlist-picker-result" key={song.videoId}>
                    <Artwork song={song} size="small" alt="" />
                    <div>
                      <strong>{song.title}</strong>
                      <span>{song.artist || 'Unknown artist'}</span>
                    </div>
                    <button className="btn btn-ghost" disabled={alreadyAdded || addingSong === song.videoId} onClick={() => addSong(song)}>
                      {alreadyAdded ? 'Added' : addingSong === song.videoId ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Songs */}
      {playlist.songs.length === 0 ? (
        <div className="empty-state">
          <ListMusic size={48} />
          <h3>This playlist is empty</h3>
          <p>Search for songs and add them here using the ➕ button.</p>
        </div>
      ) : (
        <div>
          {playlist.songs.map((song, i) => (
            <div className="playlist-song-row" key={`${song.videoId}-${i}`}>
              <SongRow
                song={song}
                index={i}
                queue={playlist.songs}
                isActive={currentSong?.videoId === song.videoId}
                onRemove={handleRemoveSong}
                showRemove={true}
              />
              <div className="playlist-reorder-actions">
                <button className="btn-icon" onClick={() => moveSong(i, -1)} disabled={i === 0 || reordering} title="Move song up"><ChevronUp size={15} /></button>
                <button className="btn-icon" onClick={() => moveSong(i, 1)} disabled={i === playlist.songs.length - 1 || reordering} title="Move song down"><ChevronDown size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-playlist-title">
          <section className="confirm-modal">
            <div className="confirm-icon"><Trash2 size={22} /></div>
            <h2 id="delete-playlist-title">Delete “{playlist.name}”?</h2>
            <p>This playlist and its song list will be permanently removed.</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete playlist'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default PlaylistPage;
