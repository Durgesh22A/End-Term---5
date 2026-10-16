const Playlist = require('../models/Playlist');
const mongoose = require('mongoose');
const { preferArtwork } = require('../utils/artwork');

const isValidPlaylistId = (id) => mongoose.Types.ObjectId.isValid(id);

// @route  GET /api/playlists
// @access Private
const getPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ owner: req.user._id })
      .select('-songs') // Don't load all songs for the list view
      .sort({ updatedAt: -1 });
    res.json({ success: true, playlists });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/playlists/:id
// @access Private
const getPlaylist = async (req, res, next) => {
  try {
    if (!isValidPlaylistId(req.params.id)) return res.status(404).json({ message: 'Playlist not found' });
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    // Authorization: only the owner can view (unless public)
    if (playlist.owner.toString() !== req.user._id.toString() && !playlist.isPublic) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/playlists
// @access Private
const createPlaylist = async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (!name) return res.status(400).json({ message: 'Playlist name is required' });
    if (name.length > 100) return res.status(400).json({ message: 'Playlist name cannot exceed 100 characters' });
    if (description.length > 500) return res.status(400).json({ message: 'Playlist description cannot exceed 500 characters' });

    const playlist = await Playlist.create({
      owner: req.user._id,
      name,
      description,
    });

    res.status(201).json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

// @route  PUT /api/playlists/:id
// @access Private
const updatePlaylist = async (req, res, next) => {
  try {
    if (!isValidPlaylistId(req.params.id)) return res.status(404).json({ message: 'Playlist not found' });
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, isPublic } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Playlist name cannot be empty' });
      playlist.name = name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string') return res.status(400).json({ message: 'Playlist description must be text' });
      playlist.description = description.trim();
    }
    if (isPublic !== undefined) {
      if (typeof isPublic !== 'boolean') return res.status(400).json({ message: 'isPublic must be a boolean' });
      playlist.isPublic = isPublic;
    }

    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/playlists/:id
// @access Private
const deletePlaylist = async (req, res, next) => {
  try {
    if (!isValidPlaylistId(req.params.id)) return res.status(404).json({ message: 'Playlist not found' });
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await playlist.deleteOne();
    res.json({ success: true, message: 'Playlist deleted' });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/playlists/:id/songs
// @access Private
const addSong = async (req, res, next) => {
  try {
    if (!isValidPlaylistId(req.params.id)) return res.status(404).json({ message: 'Playlist not found' });
    const { videoId, title, thumbnail, artist, duration } = req.body;
    if (typeof videoId !== 'string' || !videoId.trim() || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'videoId and title are required' });
    }

    let songDuration = '';
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      songDuration = `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`;
    } else if (typeof duration === 'string') {
      songDuration = duration.trim();
    }

    const song = {
      videoId: videoId.trim(),
      title: title.trim(),
      thumbnail: preferArtwork('', typeof thumbnail === 'string' ? thumbnail : '', videoId),
      artist: typeof artist === 'string' ? artist.trim() : 'Unknown artist',
      duration: songDuration,
    };

    const playlist = await Playlist.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id,
        'songs.videoId': { $ne: song.videoId },
      },
      {
        $push: { songs: song },
      },
      { new: true },
    );
    if (!playlist) {
      const existing = await Playlist.findById(req.params.id).select('owner songs.videoId');
      if (!existing) return res.status(404).json({ message: 'Playlist not found' });
      if (existing.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
      return res.status(409).json({ message: 'Song already in playlist' });
    }
    if (!playlist.thumbnail && thumbnail) {
      playlist.thumbnail = preferArtwork('', thumbnail, videoId);
      await playlist.save();
    }
    res.status(201).json({ success: true, message: 'Song added to playlist', playlist });
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/playlists/:id/songs/:videoId
// @access Private
const removeSong = async (req, res, next) => {
  try {
    if (!isValidPlaylistId(req.params.id)) return res.status(404).json({ message: 'Playlist not found' });
    if (typeof req.params.videoId !== 'string' || !req.params.videoId.trim()) {
      return res.status(400).json({ message: 'videoId is required' });
    }
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $pull: { songs: { videoId: req.params.videoId } } },
      { new: true },
    );
    if (!playlist) {
      const existing = await Playlist.findById(req.params.id).select('owner');
      if (!existing) return res.status(404).json({ message: 'Playlist not found' });
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ success: true, message: 'Song removed from playlist', playlist });
  } catch (error) {
    next(error);
  }
};

// @route  PUT /api/playlists/:id/songs/reorder
// @access Private
const reorderSongs = async (req, res, next) => {
  try {
    if (!isValidPlaylistId(req.params.id)) return res.status(404).json({ message: 'Playlist not found' });
    const songIds = req.body?.songIds;
    if (!Array.isArray(songIds) || songIds.some(id => typeof id !== 'string' || !id.trim())) {
      return res.status(400).json({ message: 'songIds must be an array of non-empty strings' });
    }

    const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
    if (!playlist) {
      const existing = await Playlist.findById(req.params.id).select('owner');
      if (!existing) return res.status(404).json({ message: 'Playlist not found' });
      return res.status(403).json({ message: 'Not authorized' });
    }

    const currentIds = playlist.songs.map(song => song.videoId);
    if (songIds.length !== currentIds.length || new Set(songIds).size !== currentIds.length
      || currentIds.some(videoId => !songIds.includes(videoId))) {
      return res.status(400).json({ message: 'songIds must contain every playlist song exactly once' });
    }

    const songsById = new Map(playlist.songs.map(song => [song.videoId, song]));
    playlist.songs = songIds.map(videoId => songsById.get(videoId));
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSong,
  removeSong,
  reorderSongs,
};
