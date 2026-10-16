import { useState } from 'react';
import { X } from 'lucide-react';
import { playlistAPI } from '../../api';
import toast from 'react-hot-toast';

const CreatePlaylistModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      const { data } = await playlistAPI.create({ name: name.trim(), description });
      toast.success('Playlist created!');
      onCreated(data.playlist);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Playlist</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label htmlFor="playlist-name-input" style={{ display:'block', fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:6 }}>
              Playlist Name *
            </label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome playlist"
              maxLength={100}
              autoFocus
              id="playlist-name-input"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label htmlFor="playlist-description-input" style={{ display:'block', fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:6 }}>
              Description (optional)
            </label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A collection of my favorite tracks..."
              maxLength={500}
              rows={3}
              style={{ resize:'vertical' }}
              id="playlist-description-input"
            />
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;
