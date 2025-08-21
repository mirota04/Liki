// Register ldrs mirage loader as a web component (available as <l-mirage>)
// Uses CDN to avoid bundling; safe to include on any page.
import { mirage } from 'https://cdn.jsdelivr.net/npm/ldrs/dist/ldrs.min.js';
try {
  mirage.register();
} catch (_) {
  // ignore if already registered
}


