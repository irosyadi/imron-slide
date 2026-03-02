// zoomit-ish-config.js - Configuration

window.RevealZoomitIshConfig = {
  // line, highlighter, font color settings
  colors: {
    red: { normal: '#ff0000', highlight: 'rgba(255, 0, 0, 0.4)' },
    green: { normal: '#00dd00', highlight: 'rgba(0, 232, 0, 0.4)' },
    blue: { normal: '#0000ff', highlight: 'rgba(0, 0, 255, 0.4)' },
    yellow: { normal: '#f0f000', highlight: 'rgba(255, 255, 0, 0.5)' },
    orange: { normal: '#ff8c00', highlight: 'rgba(255, 140, 0, 0.5)' },
    pink: { normal: '#ff1493', highlight: 'rgba(255, 20, 147, 0.5)' }
  },

  // line, highlighter width settings
  lineWidthLevel: 1, // 0-lineWidthLevels.length, this value is the default
  lineWidthLevels: [2, 4, 6, 8, 10], // levels: very thin to very thick
  highlighterLineWidthLevel: 2, // separate level for highlighter
  highlighterLineWidthLevels: [20, 35, 50, 65, 80], // levels for highlighter
  highlighterOpacity: 0.4,

  // text
  defaultFontSize: 36, // pixel
  fontSizeDelta: 2, // pixel
  minimumFontSize: 12, // pixel

  // Zoom
  defaultZoomSize: 1.5, // 1.5 == 150%
  zoomSizeDelta: 0.25, // 0.25 == 25%
  maxZoomSize: 5.0, // 5.0 == 500%

  // timer
  timerDefaultSeconds: 600, // Default 10 minutes
  timerDeltaBase: 60, // 1 minute
  timerBaseFontSize: 180, // pixel

  // Arrow parameters
  arrowShaftFactor: 0.9,
  arrowHeadRadiusFactor: 0.1,
  arrowHeadLenFactor: 1.5,
  arrowHeadLenFactor2: 1.5,
  arrowHeadAngleBase: 6,
  arrowHeadAngleFactor: 1,

  // Eraser
  eraserLineWidthFactor: 4.0,

  // Debug flag
  debug: false,

  // ============================ Constants ==============================
  // Debounce delay for resize events (ms)
  RESIZE_DEBOUNCE_MS: 150,
  
  // Maximum history states to keep (0 = unlimited)
  MAX_HISTORY_STATES: 0,

  // z-index
  MAIN_CANVAS_ZINDEX: 1000,
  TEMP_CANVAS_ZINDEX: 1001,
  LOWER_TEXT_ZINDEX: 999,
  NORMAL_TEXT_ZINDEX: 1500,
  TIMER_ZINDEX: 10000

};