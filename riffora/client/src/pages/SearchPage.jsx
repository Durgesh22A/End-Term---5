import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Music, AlertTriangle, Download, LoaderCircle, ArrowRight } from 'lucide-react';
import { youtubeAPI, musicAPI } from '../api';
import SongCard from '../components/music/SongCard';
import { usePlayer } from '../context/PlayerContext';
import Artwork from '../components/music/Artwork';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') === 'downloadable' ? 'downloadable' : 'all';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionState, setSuggestionState] = useState('idle');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const { playSong } = usePlayer();
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const suggestionRequestRef = useRef(0);
  const suggestionAbortRef = useRef(null);
  const searchFormRef = useRef(null);

  const setFilter = (nextFilter) => {
    const next = new URLSearchParams(searchParams);
    if (nextFilter === 'downloadable') next.set('filter', 'downloadable');
    else next.delete('filter');
    setSearchParams(next);
  };
  const cacheRef = useRef(new Map());
  const submitTimerRef = useRef(null);

  const q = searchParams.get('q');

  useEffect(() => {
    setLocalQuery(q || '');
  }, [q]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (searchFormRef.current && !searchFormRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      suggestionAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = localQuery.trim();
    if (!showSuggestions || trimmedQuery.length < 2 || filter === 'downloadable') {
      suggestionAbortRef.current?.abort();
      setSuggestions([]);
      setSuggestionState('idle');
      setActiveSuggestion(-1);
      return undefined;
    }

    const requestId = ++suggestionRequestRef.current;
    const timer = window.setTimeout(async () => {
      suggestionAbortRef.current?.abort();
      const controller = new AbortController();
      suggestionAbortRef.current = controller;
      setSuggestionState('loading');
      try {
        const { data } = await youtubeAPI.search(trimmedQuery, 6, controller.signal);
        if (requestId !== suggestionRequestRef.current) return;
        const seen = new Set();
        const uniqueSongs = (data.results || []).filter((song) => {
          if (!song.videoId || seen.has(song.videoId)) return false;
          seen.add(song.videoId);
          return true;
        });
        setSuggestions(uniqueSongs);
        setSuggestionState(uniqueSongs.length ? 'ready' : 'empty');
        setActiveSuggestion(-1);
      } catch (error) {
        if (requestId !== suggestionRequestRef.current || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.name === 'AbortError') return;
        setSuggestions([]);
        setSuggestionState('error');
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filter, localQuery, showSuggestions]);

  useEffect(() => {
    if (!q && filter === 'all') {
      setResults([]);
      setHasSearched(false);
      setIsDemo(false);
      setFallbackReason(null);
      setFromCache(false);
      return;
    }

    const doSearch = async () => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const normalizedQuery = (q || '').trim().toLowerCase();
      const cacheKey = `${filter}:${normalizedQuery}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setResults(cached.results);
        setIsDemo(cached.isDemo);
        setFallbackReason(cached.fallbackReason);
        setFromCache(Boolean(cached.fromCache));
        setHasSearched(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        if (filter === 'downloadable') {
          const { data } = q
            ? await musicAPI.searchDownloadable(q, 20)
            : await musicAPI.getDownloadable({ limit: 20 });
          if (requestId !== requestIdRef.current) return;
          const items = data.results || data.tracks || [];
          cacheRef.current.set(cacheKey, {
            results: items,
            isDemo: false,
            fallbackReason: null,
            fromCache: false,
          });
          setResults(items);
          setIsDemo(false);
          setFallbackReason(null);
          setFromCache(false);
          setHasSearched(true);
        } else {
          const { data } = await youtubeAPI.search(q, 20, controller.signal);
          if (requestId !== requestIdRef.current) return;
          const uniqueResults = [];
          const seen = new Set();
          for (const song of data.results || []) {
            if (!seen.has(song.videoId)) {
              seen.add(song.videoId);
              uniqueResults.push(song);
            }
          }
          cacheRef.current.set(cacheKey, {
            results: uniqueResults,
            isDemo: Boolean(data.isDemo),
            fallbackReason: data.fallbackReason || null,
            fromCache: Boolean(data.fromCache),
          });
          setResults(uniqueResults);
          setIsDemo(Boolean(data.isDemo));
          setFallbackReason(data.fallbackReason || null);
          setFromCache(Boolean(data.fromCache));
          setHasSearched(true);
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.name === 'AbortError') return;
        if (status === 429) {
          const retryAfter = err.response?.data?.retryAfter || err.response?.headers?.['retry-after'];
          const waitMessage = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
          setError(`${msg || 'Rate-limiting requests. Please wait before searching again.'}${waitMessage}`);
        } else if (status === 503) {
          setError(msg || 'Cannot reach music service. Check your internet connection.');
        } else if (status === 400) {
          setError(msg || 'Enter a search term.');
        } else if (status === 500 || status === 502) {
          setError(msg || 'Search failed. The API service may be unavailable.');
        } else {
          setError(msg || 'Search failed. Try again.');
        }
        setResults([]);
        setHasSearched(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    };

    doSearch();
    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
    };
  }, [q, filter]);


  const handleSubmit = (e) => {
    e.preventDefault();
    const nextQuery = localQuery.trim();
    if (!nextQuery) return;
    setShowSuggestions(false);
    clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.set('q', nextQuery);
      setSearchParams(next);
    }, 250);
  };

  const selectSuggestion = (song) => {
    playSong(song, suggestions);
    setLocalQuery(song.title || '');
    setShowSuggestions(false);
  };

  const handleSuggestionKeyDown = (event) => {
    if (event.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
      return;
    }
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    }
  };

  useEffect(() => () => clearTimeout(submitTimerRef.current), []);

  const suggestedSearches = ['Pop hits', 'Hip Hop', 'Rock classics', 'Ed Sheeran', 'Taylor Swift', 'Bollywood', 'Lo-fi', 'Electronic'];

  const demoMessage = 'Running with curated sample songs. Add YOUTUBE_API_KEY to server/.env for live YouTube results.';

  return (
    <div>
      <h1 style={{ fontSize:'1.8rem', marginBottom:20, fontFamily:'var(--font-heading)' }}>Search</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('all')}
          style={{ borderRadius: 'var(--radius-full)', padding: '6px 16px', fontSize: '0.85rem' }}
        >
          All tracks
        </button>
        <button
          type="button"
          className={`btn ${filter === 'downloadable' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('downloadable')}
          style={{ borderRadius: 'var(--radius-full)', padding: '6px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={14} /> Downloadable
        </button>
      </div>

      <form ref={searchFormRef} onSubmit={handleSubmit} className="search-page-form" style={{ position:'relative', marginBottom:32, maxWidth:560 }}>
        <Search size={18} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />

        <input
          className="input"
          type="text"
          placeholder="Search for songs, artists..."
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setShowSuggestions(filter === 'all' && Boolean(e.target.value.trim()));
          }}
          onFocus={() => {
            if (filter === 'all' && localQuery.trim()) setShowSuggestions(true);
          }}
          onKeyDown={handleSuggestionKeyDown}
          style={{ paddingLeft:44, paddingRight:44, fontSize:'1rem', paddingTop:12, paddingBottom:12 }}
          autoFocus
          id="search-page-input"
        />
        <button type="submit" className="search-submit btn-icon" title="Search">
          <Search size={17} />
        </button>
        {showSuggestions && localQuery.trim() && filter === 'all' && (
          <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
            {suggestionState === 'loading' && <div className="search-suggestions-state"><LoaderCircle size={16} className="search-spinner" /> Searching...</div>}
            {suggestionState === 'error' && <div className="search-suggestions-state search-suggestions-error">Search is unavailable right now.</div>}
            {suggestionState === 'empty' && <div className="search-suggestions-state">No results found</div>}
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
                <span className="search-suggestion-copy"><strong>{song.title}</strong><span>{song.artist || 'Unknown artist'}</span></span>
              </button>
            ))}
            {suggestionState === 'ready' && (
              <button className="search-see-all" type="submit" onMouseDown={(event) => event.preventDefault()}>
                See all results for &quot;{localQuery.trim()}&quot; <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </form>

      {isDemo && (
        <div className="demo-banner">
          <AlertTriangle size={16} />
          <span>
            <strong>
              {fallbackReason === 'quota'
                ? 'Quota fallback'
                : fallbackReason === 'rate_limit'
                  ? 'Rate-limit fallback'
                  : 'Demo Mode'}
            </strong> — {demoMessage}
          </span>
        </div>
      )}
      {fromCache && (
        <div className="demo-banner">
          <AlertTriangle size={16} />
          <span><strong>Cached results</strong> — YouTube is temporarily unavailable; these results may be stale.</span>
        </div>
      )}

      {!q && (
        <div>
          <h2 style={{ fontSize:'1rem', marginBottom:16, color:'var(--text-secondary)' }}>Try searching for</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {suggestedSearches.map(s => (
              <button
                key={s}
                className="btn btn-ghost"
                onClick={() => {
                  setLocalQuery(s);
                  const next = new URLSearchParams(searchParams);
                  next.set('q', s);
                  setSearchParams(next);
                }}
                style={{ borderRadius:'var(--radius-full)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="page-loader" style={{ height:'30vh' }}>
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="demo-banner" style={{ color:'var(--error)', borderColor:'rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!loading && hasSearched && !error && (
        <>
          <div className="section-header">
            <h2>{q ? `Results for "${q}"` : 'Downloadable tracks'}</h2>
            <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{results.length} found</span>
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              <Music size={48} />
              <h3>No results found</h3>
              <p>Try a different search term or check your spelling.</p>
            </div>
          ) : (
            <div className="card-grid">
              {results.map(song => (
                <SongCard key={song.videoId} song={song} queue={results} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
