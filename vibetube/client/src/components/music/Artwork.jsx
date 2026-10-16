import { useEffect, useMemo, useState } from 'react';
import { Music2 } from 'lucide-react';
import { getArtworkCandidates } from '../../utils/artwork';

const Artwork = ({ song, size = 'card', alt = '', className = '', ...props }) => {
  const candidates = useMemo(() => getArtworkCandidates(song, size), [song?.videoId, song?.thumbnail, size]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = candidates[candidateIndex];

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [song?.videoId, song?.thumbnail, size]);

  if (!src) {
    return <span className={`artwork-fallback ${className}`} aria-label={alt}><Music2 size={size === 'large' ? 48 : 20} /></span>;
  }

  return (
    <span className={`artwork-frame ${loaded ? 'loaded' : ''} ${className}`}>
      {!loaded && <span className="artwork-loading" aria-hidden="true" />}
      <img
        {...props}
        src={src}
        alt={alt}
        onLoad={(event) => {
          const image = event.currentTarget;
          const looksLikeUnavailableYouTubePlaceholder = image.naturalWidth <= 200 && image.naturalHeight <= 120;
          if (looksLikeUnavailableYouTubePlaceholder && candidateIndex < candidates.length - 1) {
            setLoaded(false);
            setCandidateIndex(index => index + 1);
            return;
          }
          setLoaded(true);
        }}
        onError={() => {
          setLoaded(false);
          setCandidateIndex(index => index + 1);
        }}
      />
    </span>
  );
};

export default Artwork;
