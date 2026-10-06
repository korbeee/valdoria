'use strict';

// Natural daylight with restrained warm highlights. Directions describe light travel.
// These values can be edited here or changed live through window.RENDER_STYLE.
const RENDER_STYLE = window.RENDER_STYLE = {
  sun: {
    color: [255, 245, 220], intensity: 0.78,
    direction: { x: -1.12, y: 1 }, followTime: false,
    edgeIntensity: 0.32,
  },
  ambient: { intensity: 0.44, color: [211, 220, 215], shadowTint: [34, 43, 36] },
  rays: { intensity: 0.20, softness: 1.05, scale: 1.05, animation: 0.018 },
  bloom: { threshold: 0.78, knee: 0.08, intensity: 0.18, radius: 3, downsample: 4 },
  grade: { exposure: 1, contrast: 1, saturation: 1 },
  haze: { strength: 0.22, color: [213, 213, 186], cloudOpacity: 0.58 },
  cave: { darkness: 0.94, sunlightPenetration: 0.75 },
};
