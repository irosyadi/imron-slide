// zoomit-ish-core.js - Variable definitions and utility functions

window.RevealZoomitIshCore = (function() {
  const conf = window.RevealZoomitIshConfig;
  
  // ========== Global variables ==========
  const vars = {
    canvas: null,
    ctx: null,
    tempCanvas: null,
    tempCtx: null,
    isDrawing: false,
    // for shapes
    startRelX: 0,
    startRelY: 0,
    lastRelX: 0,
    lastRelY: 0,
    currentPath: [],
    drawMode: 'draw',
    lineWidthLevel: conf.lineWidthLevel,
    lineWidthLevels: conf.lineWidthLevels,
    highlighterLineWidthLevel: conf.highlighterLineWidthLevel,
    highlighterLineWidthLevels: conf.highlighterLineWidthLevels,
    baseLineWidth: conf.lineWidthLevels[conf.lineWidthLevel],
    colors: conf.colors,
    color: conf.colors['red']['normal'],
    opacity: 1.0,
    isHighlighter: false,
    isDrawEnabled: false,
    
    deck: null,
    windowType: window.location.search.includes('receiver') ? 'NOTES' : 'MAIN',
    notesWindow: null,
    currSlideWindow: null,
    
    // Current mouse pointer from pointermove
    pointerX: 0,
    pointerY: 0,
    
    history: [],
    historyStep: -1,
    
    backgroundMode: 'transparent',
    shapeMode: null,
    
    textElements: [],
    textElementsInitialPositions: new Map(),
    currentTextInput: null,
    isEditingText: false,
    remoteTextInput: null,
    editingTextId: null,
    selectedTextElement: null,
    
    timerElement: null,
    timerSeconds: conf.timerDefaultSeconds, // Default 10 minutes
    timerInterval: null,
    timerRunning: false,
    timerPaused: false,
    
    // Zoom related
    zoomLevel: 1.0,
    isZoomMode: false,
    initialTranslateX: 0,
    initialTranslateY: 0,
    initialSlidesOffsetX: undefined,
    initialSlidesOffsetY: undefined,
    initialScale: null,
    initialTransform: null,
    zoomCenterX: 0.5,
    zoomCenterY: 0.5,
    panOffsetX: 0,
    panOffsetY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    canvasToSlidesCenterOffsetX: 0,
    canvasToSlidesCenterOffsetY: 0,
    
    lastSlide: null,
    lastIndices: null,
    isResizing: false,
    
    resizeTimeout: null,

    // cache slides related objects
    revealElem: null,
    revealRect: null,
    slidesElem: null,
    slidesRect: null,
    
    // Track .slides geometry for coordinate conversion
    slidesGeometry: {
      offsetX: 0,      // .slides left offset within .reveal
      offsetY: 0,      // .slides top offset within .reveal
      width: 960,      // .slides width
      height: 700,     // .slides height
      scaleX: 1,       // .slides width / canvas width
      scaleY: 1        // .slides height / canvas height
    }
  };

  // ========== Utility functions ==========
  function toggleDebugMode(receiver=false) {
    conf.debug = !conf.debug;

    if (conf.debug) {
      conf.debug && console.log("Debug mode is enabled.");
    } else {
      console.log("Debug mode is disabled.");
    }

    if (!receiver) {
      broadcast(vars, 'debug', {});
    }
  }

  // Quick hack: The speaker view contains two iframes: one for the current slide
  // and one for the upcoming slide. They have the same contents, but display
  // different slides.
  // I couldn't find a reliable way to distinguish them from inside the iframe,
  // so as a workaround, I use `postMessageEvents=true` to detect the current slide,
  // since the upcoming one doesn't have this parameter.
  function isCurrSlideIframe(varsParam) {
    if (varsParam.windowType === 'NOTES' && window.location.search.includes('postMessageEvents=true')) {
      return true;
    }
    return false;
  }

  // keepalive from NOTES window to notify the window of the current slide's iframe
  //
  function setKeepAlive(varsParam) {
    // Notify the iframe window of current
    if (isCurrSlideIframe(varsParam)) {
      const intervalId = setInterval(() => {
        broadcast(varsParam, 'keepalive', {});
      }, 1000);
    }
  }
  
  function updateNotesIframeWindow(varsParam, event) {
    if (varsParam.currSlideWindow !== event.source) {
      varsParam.currSlideWindow = event.source;
    }
  }

  /** Broadcast message to other window */
  function broadcast(varsParam, action, data) {
    const message = { 
      namespace: 'reveal-zoomit-ish', 
      action, 
      from: varsParam.windowType,
      ...data 
    };
    
    conf.debug && console.log(`[${varsParam.windowType}] 📤 Broadcasting ${action}:`, {
      to: varsParam.windowType === 'MAIN' ? 'NOTES' : 'MAIN',
      data: data
    });

    if (varsParam.windowType === 'MAIN' && varsParam.notesWindow && !varsParam.notesWindow.closed) {
      if (varsParam.currSlideWindow) varsParam.currSlideWindow.postMessage(JSON.stringify(message), '*');
    }
    
    if (varsParam.windowType === 'NOTES' && window.parent && window.parent.opener) {
      window.parent.opener.postMessage(JSON.stringify(message), '*');
    }
  }

  function setFocus() {
    document.body.click();
    window.focus();
    document.body.focus();
  }

  // Ensure the current iframe in the speaker view has focus.
  // Otherwise, it may lose focus and event listeners may not work properly.
  function setFocusOnNotesIframe(varsParam) {
    if (isCurrSlideIframe(varsParam)) {
      setTimeout(() => {
        setFocus();
      }, 1000);
    }
  }


  function getElem(varsParam=null, target='slides', force=false) {
    let targetSelector = '.reveal .slides';
    let targetVarName = 'slidesElem';
    if (target === 'reveal') {
      targetSelector =  '.reveal';
      targetVarName = 'revealElem';
    }

    let targetElem = null;
    if (!varsParam || !varsParam[targetVarName] || force) {
      targetElem = document.querySelector(targetSelector);
      if (varsParam) {
        conf.debug && console.log(`[${varsParam.windowType}] updated ${targetVarName}.`, {vars: varsParam[targetVarName], force: force});
        varsParam[targetVarName] = targetElem;
      }
    } else {
      targetElem = varsParam[targetVarName];
    }
    return targetElem;
  }

  function getRevealElem(varsParam=null, force=false) {
    const reveal = getElem(varsParam, 'reveal', force);
    return reveal;
  }

  function getSlidesElem(varsParam=null, force=false) {
    const reveal = getElem(varsParam, 'slides', force);
    return reveal;
  }

  // `getRevealElem`, `getSlidesElem`, `getRevealRect`, and `getSlidesRect`
  // cache elements and rects for performance reasons. 
  // When zoom or pan transforms are applied, the cache must be forcibly 
  // refreshed to avoid drawing on a misaligned canvas. 
  // Setting the force flag to true triggers this update.
  function updateRectCaches(varsParam) {
    getRevealRect(varsParam, true);
    getSlidesRect(varsParam, true);
  }

  function getRect(varsParam=null, target='slides', force=false) {
    let targetRectVarName = 'slidesRect';
    if (target === 'reveal') {
      targetRectVarName = 'revealRect';
    }

    let targetElem = null;
    let rect = null;
    targetElem = getElem(varsParam, target, force);
    if (!varsParam || !varsParam[targetRectVarName] || force) {
      rect = targetElem ? targetElem.getBoundingClientRect() : null;
      if (varsParam) {
        varsParam[targetRectVarName] = rect;
        conf.debug && console.log(`[${varsParam.windowType}] updated ${targetRectVarName}.`, {vars: varsParam[targetRectVarName], force: force});
      }
    } else {
      rect = varsParam[targetRectVarName];
    }
    return {elem: targetElem, rect: rect};
  }

  function getRevealRect(varsParam=null, force=false) {
    const rect = getRect(varsParam, 'reveal', force);
    return {revealRect: rect.rect, reveal: rect.elem};
  }

  function getSlidesRect(varsParam=null, force=false) {
    const rect = getRect(varsParam, 'slides', force);
    return rect.rect;
  }

  function getScale(varsParam, slidesRect=null) {
    if (slidesRect === null) {
      slidesRect = getSlidesRect(varsParam);
    }
    const slideWidth = slidesRect ? slidesRect.width : varsParam.baseSlideWidth;
    const scale = slideWidth / varsParam.baseSlideWidth;
    return scale;
  }

  function getDisplayFontSize(varsParam, baseFontSize, slidesRect=null, scale=null) {
    if (slidesRect === null && scale === null) {
      slidesRect = getSlidesRect(varsParam);
    }
    if (scale === null) {
      scale = getScale(varsParam, slidesRect);
    }
    const zoomCompensation = varsParam.isZoomMode ? varsParam.zoomLevel : 1.0;
    const displayFontSize = baseFontSize * scale / zoomCompensation;
    return displayFontSize;
  }

  /* Get font-family from .reveal element */
  function getFontFamily(vars, mono=false) {
    let propval = '--r-main-font';
    let fallbackFont = 'sans-serif';
    if (mono)  {
      propval = '--r-code-font';
      fallbackFont = 'Arial';
    }
    const reveal = getRevealElem(vars);
    const revealStyle = reveal ? window.getComputedStyle(reveal) : null;
    const fontFamily = revealStyle ? revealStyle.getPropertyValue(propval).trim() : fallbackFont;
    return fontFamily;
  }

  /** Convert client coordinates to slides-relative coordinates (0-1) */
  function clientToRelSlides(clientX, clientY, slidesRect) {
    const relX = (clientX - slidesRect.left) / slidesRect.width;
    const relY = (clientY - slidesRect.top) / slidesRect.height;
    const result = { x: relX, y: relY };
    return result;
  }

  function clientToCanvas(clientX, clientY, revealRect, reveal) {
    // getBoundingClientRect() returns the size AFTER transform is applied
    // But canvas internal dimensions are based on clientWidth/clientHeight (BEFORE transform)
    // So we need to account for the scale difference
    const scaleX = revealRect.width / reveal.clientWidth;
    const scaleY = revealRect.height / reveal.clientHeight;
    
    // Get position relative to transformed reveal
    const transformedX = clientX - revealRect.left;
    const transformedY = clientY - revealRect.top;
    
    // Convert back to pre-transform coordinates (canvas coordinate system)
    const canvasX = transformedX / scaleX;
    const canvasY = transformedY / scaleY;
    
    const result = { x: canvasX, y: canvasY };
    return result;
  }

  function relSlidesToClient(relX, relY, slidesRect) {
    // Absolute position on `.slides` (client coordinates)
    const clientX = slidesRect.left + slidesRect.width * relX;
    const clientY = slidesRect.top + slidesRect.height * relY;
    const result = { x: clientX, y: clientY };
    return result;
  }

  function relSlidesToCanvas(relX, relY, slidesRect, revealRect, reveal) {
    // Absolute position on `.slides` (client coordinates)
    const client = relSlidesToClient(relX, relY, slidesRect);
    // Convert client coordinates to canvas coordinates
    const result = clientToCanvas(client.x, client.y, revealRect, reveal);
    return result;
  }

  return {
    getVars: () => vars,
    setKeepAlive,
    isCurrSlideIframe,
    updateNotesIframeWindow,
    broadcast,
    setFocus,
    setFocusOnNotesIframe,
    updateRectCaches,
    getRevealElem,
    getSlidesElem,
    getRevealRect,
    getSlidesRect,
    getScale,
    getDisplayFontSize,
    getFontFamily,
    clientToCanvas,
    clientToRelSlides,
    relSlidesToClient,
    relSlidesToCanvas,
    toggleDebugMode
  };
})();