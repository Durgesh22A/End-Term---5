import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Disc3, Download, Headphones, Languages, Music2, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { historyAPI, musicAPI, youtubeAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import MediaRail from '../components/music/MediaRail';
import Artwork from '../components/music/Artwork';

const discoveryPills = [
  { label: 'Hindi hits', query: 'Hindi music', icon: Languages },
  { label: 'Bollywood', query: 'Bollywood songs', icon: Music2 },
  { label: 'English pop', query: 'English pop', icon: Headphones },
  { label: 'Lo-fi focus', query: 'lofi focus music', icon: Disc3 },
  { label: 'Regional India', query: 'Indian regional music', icon: Languages },
];

const HomePage = () => {
  const { user } = useAuth();
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [downloadable, setDownloadable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [recommendationReason, setRecommendationReason] = useState('');

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      const [trendRes, recRes, historyRes, downRes] = await Promise.allSettled([
        youtubeAPI.trending(20),
        youtubeAPI.recommendations(),
        historyAPI.get(12),
        musicAPI.getDownloadable({ limit: 12 }),
      ]);
      if (!active) return;

      const trendSongs = trendRes.status === 'fulfilled' ? trendRes.value.data.results || [] : [];
      const recSongs = recRes.status === 'fulfilled' ? recRes.value.data.recommendations || [] : [];
      setTrending(trendSongs);
      setIsDemo(Boolean(trendRes.status === 'fulfilled' && trendRes.value.data.isDemo));
      setRecommendationReason(recRes.status === 'fulfilled' ? recRes.value.data.reason || '' : '');
      setRecentlyPlayed(historyRes.status === 'fulfilled' ? historyRes.value.data.history || [] : []);
      setDownloadable(downRes.status === 'fulfilled' ? downRes.value.data.tracks || [] : []);

      if (!trendSongs.length && !recSongs.length) {
        setError('Your discovery feed is unavailable right now. Try searching for a favorite artist.');
      }
      const seen = new Set(trendSongs.map(song => song.videoId));
      setRecommendations(recSongs.filter(song => {
        if (!song.videoId || seen.has(song.videoId)) return false;
        seen.add(song.videoId);
        return true;
      }));
      setLoading(false);
    };
    loadData().catch(() => {
      if (active) {
        setError('Your discovery feed is unavailable right now.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const featuredSong = useMemo(
    () => recommendations[0] || trending[0] || recentlyPlayed[0],
    [recommendations, trending, recentlyPlayed],
  );

  if (loading) {
    return (
      <div className="home-loading">
        <div className="skeleton skeleton-hero" />
        <div className="skeleton-heading"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>
        <div className="skeleton-grid">{[1, 2, 3, 4].map(item => <div className="skeleton skeleton-card" key={item} />)}</div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {isDemo && (
        <div className="demo-banner compact-banner">
          <Sparkles size={15} />
          <span>Demo catalog is active. Add <code>YOUTUBE_API_KEY</code> to the server for live discovery.</span>
        </div>
      )}

      <section
        className="home-hero"
      >
        <div className="home-hero-copy">
          <span className="eyebrow">YOUR DAILY SOUNDTRACK</span>
          <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'listener'}.</h1>
          <p>{featuredSong ? `A fresh mix led by ${featuredSong.title}.` : 'Find the music that fits the moment.'}</p>
          <div className="hero-actions">
            <Link to={featuredSong ? `/search?q=${encodeURIComponent(featuredSong.artist || featuredSong.title)}` : '/search'} className="btn btn-primary">
              Explore your mix <ArrowRight size={16} />
            </Link>
            <Link to="/library" className="btn btn-ghost">Open library</Link>
          </div>
        </div>
        {featuredSong && (
          <div className="hero-feature-art">
            <Artwork song={featuredSong} size="large" alt="" />
            <div><span>FEATURED TRACK</span><strong>{featuredSong.title}</strong><small>{featuredSong.artist}</small></div>
          </div>
        )}
      </section>

      <section className="discovery-strip">
        <div><span className="eyebrow">FIND YOUR VIBE</span><h2>What are you in the mood for?</h2></div>
        <div className="discovery-pills">
          {discoveryPills.map(({ label, query, icon: Icon }) => (
            <Link className="discovery-pill" to={`/search?q=${encodeURIComponent(query)}`} key={label}><Icon size={16} />{label}</Link>
          ))}
        </div>
      </section>

      <MediaRail title="Made for you" subtitle={recommendationReason || 'A rotating mix based on your listening.'} songs={recommendations.slice(0, 10)} queue={recommendations} icon={Sparkles} href="/search" />
      <MediaRail title="Trending right now" subtitle="The tracks everyone is feeling today." songs={trending.slice(0, 12)} queue={trending} icon={TrendingUp} href="/search?q=trending" />
      {downloadable.length > 0 && (
        <MediaRail
          title="Free & Downloadable"
          subtitle="Royalty-free songs authorized for offline download."
          songs={downloadable}
          queue={downloadable}
          icon={Download}
          href="/downloads"
        />
      )}
      {recentlyPlayed.length > 0 && <MediaRail title="Pick up where you left off" subtitle="Your recent listening, ready when you are." songs={recentlyPlayed.slice(0, 10)} queue={recentlyPlayed} icon={Clock3} href="/history" />}


      {!recommendations.length && !recentlyPlayed.length && (
        <section className="new-listener-card">
          <Headphones size={28} />
          <div><h2>Your daily mix is waiting</h2><p>Play a few songs or like an artist and RIFFORA will shape recommendations around you.</p></div>
          <Link to="/search" className="btn btn-primary">Start discovering</Link>
        </section>
      )}

      <section className="browse-section">
        <div className="rail-heading"><div><span className="eyebrow">BROWSE ALL</span><h2>Explore by sound</h2></div></div>
        <div className="browse-grid">
          {['Pop', 'Hip-Hop', 'Rock', 'R&B', 'Electronic', 'Bollywood', 'Hindi', 'Tamil', 'Punjabi', 'Lo-fi'].map(genre => (
            <Link className="browse-tile" to={`/search?q=${encodeURIComponent(`${genre} music`)}`} key={genre}><span>{genre}</span><ArrowRight size={17} /></Link>
          ))}
        </div>
      </section>

      {error && <div className="inline-error"><p>{error}</p><Link to="/search" className="btn btn-ghost">Search instead</Link></div>}
    </div>
  );
};

export default HomePage;
