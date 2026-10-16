import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, LogOut, Settings, LoaderCircle, Music2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/formatters';
import { youtubeAPI } from '../../api';
import { usePlayer } from '../../context/PlayerContext';
import toast from 'react-hot-toast';
import Artwork from '../music/Artwork';

const highlightMatch = (value, query) => {
  if (!value || !query.trim()) return value;
  const parts = value.split(new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return parts.map((part, index) => (
    part.toLowerCase() === query.trim().toLowerCase()
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : part
  ));
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionState, setSuggestionState] = useState('idle');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSearchDropdown(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!showSearchDropdown || !trimmedQuery) {
      abortRef.current?.abort();
      setSuggestions([]);
      setSuggestionState('idle');
      setActiveSuggestion(-1);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSuggestionState('loading');
      try {
        const { data } = await youtubeAPI.search(trimmedQuery, 6, controller.signal);
        if (requestId !== requestIdRef.current) return;
        const seen = new Set();
        const uniqueResults = (data.results || []).filter((song) => {
          if (!song.videoId || seen.has(song.videoId)) return false;
          seen.add(song.videoId);
          return true;
        });
        setSuggestions(uniqueResults);
        setSuggestionState(uniqueResults.length ? 'ready' : 'empty');
        setActiveSuggestion(-1);
      } catch (error) {
        if (requestId !== requestIdRef.current || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.name === 'AbortError') return;
        setSuggestions([]);
        setSuggestionState('error');
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, showSearchDropdown]);

  useEffect(() => {
    const handler = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      abortRef.current?.abort();
    };
  }, []);

  const selectSuggestion = (song) => {
    playSong(song, suggestions);
    setQuery(song.title || '');
    setShowSearchDropdown(false);
  };

  const handleSuggestionKeyDown = (event) => {
    if (event.key === 'Escape') {
      setShowSearchDropdown(false);
      setActiveSuggestion(-1);
      return;
    }
    if (!suggestions.length) {
      if (event.key === 'Enter') handleSearch(event);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="navbar">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="navbar-search" ref={searchRef}>
        <Search size={16} className="search-icon" />
        <input
          className="input"
          type="text"
          placeholder="Search songs, artists..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSearchDropdown(Boolean(e.target.value.trim()));
          }}
          onFocus={() => { if (query.trim()) setShowSearchDropdown(true); }}
          onKeyDown={handleSuggestionKeyDown}
          id="navbar-search-input"
        />
        <button type="submit" className="search-submit btn-icon" title="Search">
          <Search size={16} />
        </button>
        {showSearchDropdown && query.trim() && (
          <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
            {suggestionState === 'loading' && (
              <div className="search-suggestions-state"><LoaderCircle size={16} className="search-spinner" /> Searching...</div>
            )}
            {suggestionState === 'error' && (
              <div className="search-suggestions-state search-suggestions-error">Search is unavailable right now.</div>
            )}
            {suggestionState === 'empty' && (
              <div className="search-suggestions-state">No results found</div>
            )}
            {suggestionState === 'ready' && suggestions.map((song, index) => (
              <button
                className={`search-suggestion ${index === activeSuggestion ? 'active' : ''}`}
                key={song.videoId}
                type="button"
                role="option"
                aria-selected={index === activeSuggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(song)}
              >
                <Artwork song={song} size="small" alt="" />
                <span className="search-suggestion-copy">
                  <strong>{highlightMatch(song.title, query)}</strong>
                  <span>{highlightMatch(song.artist || 'Unknown artist', query)}</span>
                </span>
              </button>
            ))}
            {suggestionState === 'ready' && (
              <button className="search-see-all" type="button" onMouseDown={(event) => event.preventDefault()} onClick={handleSearch}>
                See all results for &quot;{query.trim()}&quot; <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </form>

      <div className="navbar-actions">
        {/* User avatar + dropdown */}
        {user && (
          <div className="user-menu-wrapper" style={{ position: 'relative' }} ref={dropdownRef}>
            <div
              className="user-avatar"
              onClick={() => setShowUserDropdown(p => !p)}
              title={user.name}
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={showUserDropdown}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowUserDropdown(p => !p); } }}
            >
              {getInitials(user.name)}
            </div>

            {showUserDropdown && (
              <div className="user-dropdown" role="menu" aria-label="User profile menu">
                <div className="user-dropdown-header">
                  <p className="user-dropdown-name">{user.name}</p>
                  <p className="user-dropdown-email" title={user.email}>{user.email}</p>
                  {user.subscription === 'premium' && (
                    <span className="user-dropdown-badge">
                      PREMIUM
                    </span>
                  )}
                </div>
                <Link to="/settings" className="user-dropdown-item" onClick={() => setShowUserDropdown(false)} role="menuitem">
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
                <button className="user-dropdown-item danger" onClick={handleLogout} role="menuitem">
                  <LogOut size={16} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
