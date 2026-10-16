import { useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';

/**
 * PersistentPlayer — the hidden YouTube IFrame that lives at the root of the app.
 *
 * WHY hidden? Because YouTube's IFrame API requires a real DOM element.
 * We load the player invisibly and control it programmatically.
 * The visible player UI (controls, progress bar) is rendered by Player.jsx.
 *
 * YouTube IFrame API loading:
 *  1. We inject the YT API script tag once (global singleton)
 *  2. window.onYouTubeIframeAPIReady fires when it's loaded
 *  3. We create the YT.Player pointing at our div
 *  4. onReady/onStateChange callbacks connect it to our context
 */
const PersistentPlayer = () => {
  const { onPlayerReady, onPlayerStateChange, onPlayerError } = usePlayer();
  const wrapperRef = useRef(null);
  const playerRef = useRef(null);
  const callbacksRef = useRef({ onPlayerReady, onPlayerStateChange, onPlayerError });
  callbacksRef.current = { onPlayerReady, onPlayerStateChange, onPlayerError };

  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !wrapperRef.current || !window.YT?.Player) return;
      if (playerRef.current) return;

      // Ensure a clean target div inside wrapperRef
      let target = wrapperRef.current.querySelector('#yt-player-target');
      if (!target) {
        target = document.createElement('div');
        target.id = 'yt-player-target';
        wrapperRef.current.appendChild(target);
      }

      try {
        playerRef.current = new window.YT.Player(target, {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 0,
            controls: 0,       // Hide YouTube controls — we use our own
            rel: 0,            // Don't show related videos
            modestbranding: 1, // Reduce YouTube branding
            iv_load_policy: 3, // Hide annotations
            playsinline: 1,    // Required for iOS
            enablejsapi: 1,    // Enable JavaScript API
            origin: window.location.origin,
            widget_referrer: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (isMounted) callbacksRef.current.onPlayerReady(e.target);
            },
            onStateChange: (e) => {
              if (isMounted) callbacksRef.current.onPlayerStateChange(e.data);
            },
            onError: (e) => {
              if (isMounted) callbacksRef.current.onPlayerError(e.data);
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!window._ytIframeCallbacks) {
        window._ytIframeCallbacks = [];
      }
      window._ytIframeCallbacks.push(initPlayer);

      const oldReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof oldReady === 'function') oldReady();
        if (Array.isArray(window._ytIframeCallbacks)) {
          const cbs = [...window._ytIframeCallbacks];
          window._ytIframeCallbacks = [];
          cbs.forEach(cb => {
            try { cb(); } catch (e) { /* ignore */ }
          });
        }
      };

      if (!document.getElementById('yt-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'yt-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
      if (Array.isArray(window._ytIframeCallbacks)) {
        window._ytIframeCallbacks = window._ytIframeCallbacks.filter(cb => cb !== initPlayer);
      }
      try {
        playerRef.current?.destroy?.();
      } catch (e) {
        // ignore destroy error
      }
      playerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '200px',
        height: '200px',
        opacity: 0.001,
        pointerEvents: 'none',
        zIndex: -9999,
        overflow: 'hidden',
      }}
    >
      <div id="yt-player-target" />
    </div>
  );
};

export default PersistentPlayer;
