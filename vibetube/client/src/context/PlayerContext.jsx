import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { historyAPI } from '../api';
import { useAuth } from './AuthContext';
import { getDownload } from '../utils/downloadStore';
import { parseDurationToSeconds } from '../utils/formatters';

const STORAGE_KEY = 'vibetube-playback';
const PlayerContext = createContext(null);

const readPlayback = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
};

const clampPosition = (position) => (
  Number.isFinite(position) && position >= 0 ? position : 0
);

export const PlayerProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const savedPlaybackRef = useRef(null);
  if (!savedPlaybackRef.current) savedPlaybackRef.current = readPlayback();
  const savedPlayback = savedPlaybackRef.current;

  const playerRef = useRef(null);
  const loadedSongIdRef = useRef('');
  const offlineAudioRef = useRef(new Audio());
  const offlineUrlRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const playNextRef = useRef(null);
  const restoredOfflineRef = useRef(false);
  const restorePendingRef = useRef(Boolean(savedPlayback.currentSong?.videoId));
  const restorePositionRef = useRef(clampPosition(savedPlayback.currentTime));
  const restorePlayIntentRef = useRef(Boolean(savedPlayback.isPlaying));
  const stateRef = useRef({});
  const lastLoggedSongRef = useRef({ videoId: null, at: 0 });

  const [isReady, setIsReady] = useState(false);
  const [currentSong, setCurrentSong] = useState(savedPlayback.currentSong || null);
  const [queue, setQueue] = useState(Array.isArray(savedPlayback.queue) ? savedPlayback.queue : []);
  const [queueIndex, setQueueIndex] = useState(Number.isInteger(savedPlayback.queueIndex) ? savedPlayback.queueIndex : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(() => parseDurationToSeconds(savedPlayback.currentSong?.duration) || 0);
  const [currentTime, setCurrentTime] = useState(clampPosition(savedPlayback.currentTime));
  const [volume, setVolume] = useState(Number.isFinite(savedPlayback.volume) ? savedPlayback.volume : 70);
  const [isMuted, setIsMuted] = useState(Boolean(savedPlayback.isMuted));
  const [showQueue, setShowQueue] = useState(false);
  const [isLooping, setIsLooping] = useState(Boolean(savedPlayback.isLooping));
  const [isShuffled, setIsShuffled] = useState(Boolean(savedPlayback.isShuffled));
  const [isAutoplay, setIsAutoplay] = useState(() => localStorage.getItem('vibetube-autoplay') !== 'false');
  const [showDetails, setShowDetails] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('This device');
  const [playerError, setPlayerError] = useState('');
  const [failedSongId, setFailedSongId] = useState('');

  const stopOfflineAudio = useCallback(() => {
    const audio = offlineAudioRef.current;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (offlineUrlRef.current) URL.revokeObjectURL(offlineUrlRef.current);
    offlineUrlRef.current = null;
  }, []);

  const persistPlayback = useCallback(() => {
    const state = stateRef.current;
    let position = state.currentTime || 0;
    if (state.currentSong?.isOffline) {
      position = offlineAudioRef.current.currentTime || position;
    } else if (playerRef.current?.getCurrentTime) {
      position = playerRef.current.getCurrentTime() || position;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentSong: state.currentSong,
        queue: state.queue,
        queueIndex: state.queueIndex,
        currentTime: position,
        isPlaying: state.isPlaying,
        volume: state.volume,
        isMuted: state.isMuted,
        isLooping: state.isLooping,
        isShuffled: state.isShuffled,
      }));
    } catch {
      // Storage can be unavailable or full; playback itself should continue.
    }
  }, []);

  const startProgressTracking = useCallback(() => {
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        const ytDuration = playerRef.current.getDuration?.();
        if (ytDuration && ytDuration > 0) {
          setDuration(ytDuration);
        }
      }
      persistPlayback();
    }, 1000);
  }, [persistPlayback]);

  const stopProgressTracking = useCallback(() => {
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
    persistPlayback();
  }, [persistPlayback]);

  const onPlayerReady = useCallback((player) => {
    playerRef.current = player;
    player.setVolume(stateRef.current.volume);
    if (stateRef.current.isMuted) player.mute();
    setIsReady(true);

    const song = stateRef.current.currentSong;
    if (!song?.videoId || song.isOffline) return;

    const isRestoring = restorePendingRef.current;
    restorePendingRef.current = false;
    loadedSongIdRef.current = song.videoId;

    const initialDuration = parseDurationToSeconds(song.duration);
    if (initialDuration > 0) setDuration(initialDuration);

    if (isRestoring) {
      const targetPos = restorePositionRef.current;
      setCurrentTime(targetPos);
      if (typeof player.cueVideoById === 'function') {
        player.cueVideoById(song.videoId, targetPos);
      } else {
        player.loadVideoById(song.videoId, targetPos);
        player.pauseVideo();
      }
      if (restorePlayIntentRef.current) {
        try {
          player.playVideo();
        } catch {
          setIsPlaying(false);
        }
      }
    } else {
      player.loadVideoById(song.videoId);
    }
  }, []);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) { // Playing
      setIsPlaying(true);
      restorePlayIntentRef.current = false;
      const ytDuration = playerRef.current?.getDuration?.();
      if (ytDuration && ytDuration > 0) setDuration(ytDuration);
      startProgressTracking();
    } else if (state === 2 || state === 3) { // Paused or Buffering
      setIsPlaying(false);
      const ytDuration = playerRef.current?.getDuration?.();
      if (ytDuration && ytDuration > 0) setDuration(ytDuration);
      stopProgressTracking();
    } else if (state === 5) { // Cued
      setIsPlaying(false);
      const ytDuration = playerRef.current?.getDuration?.();
      if (ytDuration && ytDuration > 0) setDuration(ytDuration);
      stopProgressTracking();
    } else if (state === 0 && stateRef.current.isAutoplay) { // Ended
      setIsPlaying(false);
      stopProgressTracking();
      playNextRef.current?.();
    }
  }, [startProgressTracking, stopProgressTracking]);

  const onPlayerError = useCallback((code) => {
    const messages = {
      2: 'This track could not be loaded.',
      5: 'This track is not available in the embedded player.',
      100: 'This video is unavailable or private.',
      101: 'Embedding restricted by owner. Click next track.',
      150: 'Embedding restricted by owner. Click next track.',
    };
    const activeSong = stateRef.current.currentSong;
    setPlayerError(messages[code] || 'The player could not load this track.');
    setFailedSongId(activeSong?.videoId || '');
    setIsPlaying(false);
    const fallbackDuration = parseDurationToSeconds(activeSong?.duration);
    if (fallbackDuration > 0) {
      setDuration(fallbackDuration);
    }
    stopProgressTracking();

    if (stateRef.current.isAutoplay && playNextRef.current) {
      setTimeout(() => {
        if (stateRef.current.currentSong?.videoId === activeSong?.videoId) {
          playNextRef.current();
        }
      }, 3500);
    }
  }, [stopProgressTracking]);

  const playSong = useCallback((song, newQueue = null) => {
    if (!song) return;
    restorePendingRef.current = false;
    setPlayerError('');
    setFailedSongId('');

    // Prevent duplicate reload and interruption if clicking currently active track
    if (
      playerRef.current &&
      loadedSongIdRef.current === song.videoId &&
      !song.isOffline &&
      !currentSong?.isOffline
    ) {
      const state = playerRef.current.getPlayerState?.();
      if (state === 1) return; // Already playing
      if (state === 2 || state === 5) {
        playerRef.current.playVideo();
        return;
      }
    }

    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(item => item.videoId === song.videoId);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue(prev => prev.find(item => item.videoId === song.videoId) ? prev : [...prev, song]);
    }

    const fallbackDuration = parseDurationToSeconds(song.duration);
    if (fallbackDuration > 0) {
      setDuration(fallbackDuration);
    }

    const startPlayback = async () => {
      let offlineRecord = null;
      if (song.isOffline) offlineRecord = await getDownload(song.videoId);
      if (offlineRecord?.audioBlob) {
        stopOfflineAudio();
        const audio = offlineAudioRef.current;
        offlineUrlRef.current = URL.createObjectURL(offlineRecord.audioBlob);
        audio.src = offlineUrlRef.current;
        audio.volume = stateRef.current.volume / 100;
        audio.muted = stateRef.current.isMuted;
        audio.onloadedmetadata = () => setDuration(audio.duration || fallbackDuration || 0);
        audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => {
          setIsPlaying(false);
          if (stateRef.current.isAutoplay) playNextRef.current?.();
        };
        playerRef.current?.pauseVideo?.();
        setCurrentSong({ ...song, isOffline: true });
        setCurrentTime(0);
        try {
          await audio.play();
        } catch {
          setIsPlaying(false);
        }
        return;
      }

      stopOfflineAudio();
      setCurrentSong(song);
      setCurrentTime(0);
      if (playerRef.current && stateRef.current.isReady) {
        loadedSongIdRef.current = song.videoId;
        playerRef.current.loadVideoById(song.videoId);
      }
    };
    startPlayback().catch(() => {
      setCurrentSong(song);
      setCurrentTime(0);
    });

    const now = Date.now();
    const shouldLog = lastLoggedSongRef.current.videoId !== song.videoId
      || now - lastLoggedSongRef.current.at > 10000;
    if (isAuthenticated && shouldLog) {
      lastLoggedSongRef.current = { videoId: song.videoId, at: now };
      historyAPI.log({
        videoId: song.videoId,
        title: song.title,
        thumbnail: song.thumbnail,
        artist: song.artist,
        duration: song.duration,
      }).catch(() => {});
    }
  }, [currentSong?.isOffline, isAuthenticated, stopOfflineAudio]);

  const togglePlay = useCallback(() => {
    if (currentSong?.isOffline) {
      if (isPlaying) offlineAudioRef.current.pause();
      else offlineAudioRef.current.play().catch(() => {});
      return;
    }
    if (!playerRef.current || failedSongId === currentSong?.videoId) return;
    const playerState = playerRef.current.getPlayerState?.();
    if (playerState === 1) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [currentSong?.isOffline, currentSong?.videoId, failedSongId, isPlaying]);


  const playNext = useCallback(() => {
    if (!queue.length) return;
    const nextIndex = isLooping
      ? queueIndex
      : isShuffled
        ? Math.floor(Math.random() * queue.length)
        : (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    playSong(queue[nextIndex]);
  }, [queue, queueIndex, isLooping, isShuffled, playSong]);
  playNextRef.current = playNext;

  const playPrev = useCallback(() => {
    if (!queue.length) return;
    if (currentTime > 3 && playerRef.current) {
      playerRef.current.seekTo(0);
      setCurrentTime(0);
      return;
    }
    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIndex);
    playSong(queue[prevIndex]);
  }, [queue, queueIndex, currentTime, playSong]);

  const seekTo = useCallback((seconds) => {
    if (currentSong?.isOffline) {
      offlineAudioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      return;
    }
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  }, [currentSong?.isOffline]);

  const setVolumeLevel = useCallback((level) => {
    setVolume(level);
    offlineAudioRef.current.volume = level / 100;
    if (playerRef.current) playerRef.current.setVolume(level);
    setIsMuted(level === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (currentSong?.isOffline) {
      offlineAudioRef.current.muted = !isMuted;
      setIsMuted(prev => !prev);
      return;
    }
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [currentSong?.isOffline, isMuted, volume]);

  const addToQueue = useCallback((song) => {
    setQueue(prev => prev.find(item => item.videoId === song.videoId) ? prev : [...prev, song]);
  }, []);
  const removeFromQueue = useCallback((videoId) => setQueue(prev => prev.filter(song => song.videoId !== videoId)), []);
  const playFromQueue = useCallback((index) => {
    setQueueIndex(index);
    playSong(queue[index]);
  }, [queue, playSong]);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay(prev => {
      const next = !prev;
      localStorage.setItem('vibetube-autoplay', String(next));
      return next;
    });
  }, []);

  const chooseAudioDevice = useCallback(async () => {
    if (!navigator.mediaDevices?.selectAudioOutput) {
      const message = 'Audio output selection is not supported by this browser. Use your system Bluetooth or sound settings.';
      setDeviceStatus(message);
      return message;
    }
    try {
      const device = await navigator.mediaDevices.selectAudioOutput();
      const message = device.label
        ? `${device.label} selected, but YouTube iframe audio remains controlled by the browser.`
        : 'Device selected, but YouTube iframe audio remains controlled by the browser.';
      setDeviceStatus(message);
      return message;
    } catch {
      const message = 'No audio device was selected.';
      setDeviceStatus(message);
      return message;
    }
  }, []);

  stateRef.current = {
    currentSong, queue, queueIndex, currentTime, isPlaying, volume, isMuted,
    isLooping, isShuffled, isAutoplay, isReady,
  };

  useEffect(() => {
    const timer = setInterval(persistPlayback, 5000);
    window.addEventListener('beforeunload', persistPlayback);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', persistPlayback);
      persistPlayback();
      clearInterval(progressIntervalRef.current);
      stopOfflineAudio();
    };
  }, [persistPlayback, stopOfflineAudio]);

  useEffect(() => {
    if (savedPlayback.currentSong?.isOffline && !restoredOfflineRef.current) {
      restoredOfflineRef.current = true;
      getDownload(savedPlayback.currentSong.videoId)
        .then(record => {
          if (!record?.audioBlob) return;
          const audio = offlineAudioRef.current;
          const url = URL.createObjectURL(record.audioBlob);
          offlineUrlRef.current = url;
          audio.src = url;
          audio.volume = volume / 100;
          audio.muted = isMuted;
          audio.onloadedmetadata = () => {
            setDuration(audio.duration || 0);
            audio.currentTime = clampPosition(savedPlayback.currentTime);
            if (savedPlayback.isPlaying) audio.play().catch(() => setIsPlaying(false));
          };
          audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
          audio.onplay = () => setIsPlaying(true);
          audio.onpause = () => setIsPlaying(false);
        })
        .catch(() => {});
    }
  }, [isMuted, isPlaying, savedPlayback, volume]);

  const value = {
    playerRef, onPlayerReady, onPlayerStateChange, onPlayerError,
    currentSong, queue, queueIndex, isPlaying, duration, currentTime,
    volume, isMuted, showQueue, isLooping, isShuffled, isAutoplay,
    showDetails, deviceStatus, playerError,
    failedSongId,
    playSong, togglePlay, playNext, playPrev, seekTo, setVolumeLevel, toggleMute,
    addToQueue, removeFromQueue, playFromQueue,
    setShowQueue, setIsLooping, setIsShuffled,
    toggleAutoplay, setShowDetails, chooseAudioDevice,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
};
