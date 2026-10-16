import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Music, AlertTriangle, Download } from 'lucide-react';
import { youtubeAPI, musicAPI } from '../api';
import SongCard from '../components/music/SongCard';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [localQuery, setLocalQuery] = useState(searchParams.get('q') || '');
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const cacheRef = useRef(new Map());
  const submitTimerRef = useRef(null);

  const q = searchParams.get('q');

  useEffect(() => {
    if (!q && filter === 'all') {
      setResults([]);
      setHasSearched(false);
      setIsDemo(false);
      setFallbackReason(null);
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
          });
          setResults(items);
          setIsDemo(false);
          setFallbackReason(null);
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
          });
          setResults(uniqueResults);
          setIsDemo(Boolean(data.isDemo));
          setFallbackReason(data.fallbackReason || null);
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
        } else if (status === 500) {
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
    clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(() => setSearchParams({ q: nextQuery }), 250);
  };

  useEffect(() => () => clearTimeout(submitTimerRef.current), []);

  const suggestions = ['Pop hits', 'Hip Hop', 'Rock classics', 'Ed Sheeran', 'Taylor Swift', 'Bollywood', 'Lo-fi', 'Electronic'];

  const demoMessage = fallbackReason === 'quota'
    ? 'YouTube quota is used up for today — showing labelled demo songs instead.'
    : 'Running with curated sample songs. Add YOUTUBE_API_KEY to server/.env for live YouTube results.';

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

      <form onSubmit={handleSubmit} style={{ position:'relative', marginBottom:32, maxWidth:560 }}>
        <Search size={18} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />

        <input
          className="input"
          type="text"
          placeholder="Search for songs, artists..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          style={{ paddingLeft:44, paddingRight:44, fontSize:'1rem', paddingTop:12, paddingBottom:12 }}
          autoFocus
          id="search-page-input"
        />
        <button type="submit" className="search-submit btn-icon" title="Search">
          <Search size={17} />
        </button>
      </form>

      {isDemo && (
        <div className="demo-banner">
          <AlertTriangle size={16} />
          <span>
            <strong>{fallbackReason === 'quota' ? 'Quota fallback' : 'Demo Mode'}</strong> — {demoMessage}
          </span>
        </div>
      )}

      {!q && (
        <div>
          <h2 style={{ fontSize:'1rem', marginBottom:16, color:'var(--text-secondary)' }}>Try searching for</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {suggestions.map(s => (
              <button
                key={s}
                className="btn btn-ghost"
                onClick={() => { setLocalQuery(s); setSearchParams({ q: s }); }}
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
            <h2>Results for "{q}"</h2>
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
