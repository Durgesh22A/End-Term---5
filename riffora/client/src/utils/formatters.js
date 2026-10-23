/**
 * Format seconds (number) to "3:54" string
 * Used by the player progress bar
 */
export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Parse any duration format (seconds number, "MM:SS", "HH:MM:SS", or ISO "PT3M45S") to seconds.
 */
export const parseDurationToSeconds = (duration) => {
  if (!duration) return 0;
  if (typeof duration === 'number') {
    return Number.isFinite(duration) && duration >= 0 ? duration : 0;
  }
  if (typeof duration !== 'string') return 0;

  // Handle ISO 8601 like "PT3M45S", "PT1H2M10S"
  if (duration.startsWith('PT') || duration.startsWith('P')) {
    const match = duration.match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || 0, 10);
      const minutes = parseInt(match[2] || 0, 10);
      const seconds = parseInt(match[3] || 0, 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  // Handle "MM:SS" or "HH:MM:SS"
  const parts = duration.trim().split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  } else if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) return h * 3600 + m * 60 + s;
  }

  const num = parseFloat(duration);
  return !isNaN(num) && num >= 0 ? num : 0;
};


/**
 * Truncate text to maxLength with ellipsis
 */
export const truncate = (text, maxLength = 40) => {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};

/**
 * Get initials from a name (for avatar placeholder)
 * "John Doe" → "JD"
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
};

/**
 * Format large numbers: 1500000 → "1.5M"
 */
export const formatCount = (n) => {
  if (!n) return '';
  const num = parseInt(n);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
};
