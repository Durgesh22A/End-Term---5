import { ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import SongCard from './SongCard';

const MediaRail = ({ title, subtitle, songs = [], queue = songs, icon: Icon = Sparkles, href }) => {
  if (!songs.length) return null;

  return (
    <section className="media-rail-section">
      <div className="rail-heading">
        <div>
          <div className="rail-title">
            <Icon size={18} />
            <h2>{title}</h2>
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {href && <Link className="rail-see-all" to={href}>See all <ChevronRight size={15} /></Link>}
      </div>
      <div className="media-rail" tabIndex="0" aria-label={title}>
        {songs.map((song, index) => (
          <div className="media-rail-item" key={`${song.videoId || song.title}-${index}`}>
            <SongCard song={song} queue={queue} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default MediaRail;
