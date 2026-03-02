// zoomit-ish-core.js - Variable definitions and utility functions

window.RevealZoomitIshCanvas = (function() {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  const draw = window.RevealZoomitIshDraw;
  const text = window.RevealZoomitIshText;
  const hist = window.RevealZoomitIshHistory;

  function createCanvas(vars, zIndex, canvas_id=null) {
    const reveal = core.getRevealElem(vars, true) || document.body;
    const canvas = document.createElement('canvas');
    if (canvas_id) {
      canvas.id = canvas_id;
    }
    
    canvas.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: ${zIndex};
    `;

    reveal.appendChild(canvas);
    return canvas
  }

  function changeCanvasInitialSize(canvas) {
    const slidesRect = core.getSlidesRect();
    if (slidesRect) {
      canvas.width = Math.round(slidesRect.width);
      canvas.height = Math.round(slidesRect.height);
    } else {
      // Fallback if .slides not ready yet
      canvas.width = 960;
      canvas.height = 700;
    }
  }

  /** Update slides geometry info */
  function updateSlidesGeometry(vars) {
    core.updateRectCaches(vars);
    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);

    if (!slidesRect || !revealRect || !vars.canvas) return;
    
    // If zoomed, getBoundingClientRect returns zoomed values
    // We need to normalize by zoom level to get base values
    const zoomLevel = vars.isZoomMode ? vars.zoomLevel : 1.0;
    
    // Calculate .slides position relative to .reveal (parent)
    // Normalize by zoom level to get base coordinates
    vars.slidesGeometry.offsetX = (slidesRect.left - revealRect.left) / zoomLevel;
    vars.slidesGeometry.offsetY = (slidesRect.top - revealRect.top) / zoomLevel;
    vars.slidesGeometry.width = slidesRect.width / zoomLevel;
    vars.slidesGeometry.height = slidesRect.height / zoomLevel;
    
    // Calculate scale factors (for coordinate conversion)
    vars.slidesGeometry.scaleX = vars.slidesGeometry.width / vars.canvas.width;
    vars.slidesGeometry.scaleY = vars.slidesGeometry.height / vars.canvas.height;
    
    conf.debug && console.log(`[${vars.windowType}] Slides geometry updated:`, {
      offset: { x: vars.slidesGeometry.offsetX.toFixed(1), y: vars.slidesGeometry.offsetY.toFixed(1) },
      size: { w: vars.slidesGeometry.width.toFixed(1), h: vars.slidesGeometry.height.toFixed(1) },
      zoomLevel: zoomLevel.toFixed(2),
      note: zoomLevel !== 1.0 ? 'normalized by zoom' : 'no zoom',
      size: { w: vars.slidesGeometry.width, h: vars.slidesGeometry.height },
      scale: { x: vars.slidesGeometry.scaleX, y: vars.slidesGeometry.scaleY },
      canvasSize: { w: vars.canvas.width, h: vars.canvas.height }
    });
  }

  // Resize canvas - Canvas stays at .reveal size, but track .slides geometry
  function resizeCanvas(vars) {
    if (!vars.canvas) return;

    const oldWidth = vars.canvas.width;
    const oldHeight = vars.canvas.height;
    
    // Canvas size MUST match .reveal (NOT .slides!)
    const reveal = core.getRevealElem(vars, true);
    const newWidth = reveal ? reveal.clientWidth : window.innerWidth;
    const newHeight = reveal ? reveal.clientHeight : window.innerHeight;
    
    // Update .slides geometry info for coordinate conversion
    updateSlidesGeometry(vars);
    
    // Only resize if dimensions actually changed
    if (vars.canvas.width === newWidth && vars.canvas.height === newHeight) {
      conf.debug && console.log(`[${vars.windowType}] Canvas size unchanged: ${newWidth}x${newHeight}`);
      
      // Even if size unchanged, reapply zoom if in zoom mode
      if (vars.isZoomMode) {
        const zoom = window.RevealZoomitIshZoom;
        if (zoom) {
          zoom.applyZoom(vars, vars.zoomLevel, vars.zoomCenterX, vars.zoomCenterY);
          conf.debug && console.log(`[${vars.windowType}] Zoom reapplied (size unchanged): level=${vars.zoomLevel.toFixed(2)}`);
        }
      }
      return;
    }
    
    // Set canvas internal dimensions to .reveal size
    vars.canvas.width = newWidth;
    vars.canvas.height = newHeight;
    if (vars.tempCanvas) {
      vars.tempCanvas.width = newWidth;
      vars.tempCanvas.height = newHeight;
    }
    
    conf.debug && console.log(`[${vars.windowType}] Canvas resized: ${oldWidth}x${oldHeight} -> ${newWidth}x${newHeight}`);
    conf.debug && console.log(`[${vars.windowType}] History: step=${vars.historyStep}, length=${vars.history?.length || 0}`);
    
    // Restore from history if available
    if (vars.history && vars.historyStep >= 0 && vars.history[vars.historyStep]) {
      const state = vars.history[vars.historyStep];
      conf.debug && console.log(`[${vars.windowType}] Restoring from history step ${vars.historyStep}`);
      
      const img = new Image();
      img.onload = function() {
        // Apply background first
        if (vars.backgroundMode !== 'transparent') {
          vars.canvas.style.background = vars.backgroundMode === 'white' ? 'white' : 'black';
        }
        
        // Calculate scale factors based on OLD canvas dimensions
        const originalWidth = state.canvasWidth || oldWidth;
        const originalHeight = state.canvasHeight || oldHeight;
        
        // NEW: Also need to account for .slides geometry changes
        // The drawing was done relative to OLD .slides position/size
        // We need to restore it relative to NEW .slides position/size
        
        // Clear canvas
        vars.ctx.clearRect(0, 0, newWidth, newHeight);
        
        if (state.slidesGeometry && vars.slidesGeometry) {
          transformCanvasWithGeometry(vars, vars.slidesGeometry, state.slidesGeometry, img);
        } else {
          // Fallback: simple scaling without geometry adjustment
          const scaleX = newWidth / originalWidth;
          const scaleY = newHeight / originalHeight;
          
          vars.ctx.save();
          vars.ctx.scale(scaleX, scaleY);
          vars.ctx.drawImage(img, 0, 0);
          vars.ctx.restore();
          core.updateRectCaches(vars);
          
          conf.debug && console.log(`[${vars.windowType}] Canvas content restored (fallback):`, {
            original: `${originalWidth}x${originalHeight}`,
            new: `${newWidth}x${newHeight}`,
            scale: `${scaleX.toFixed(3)} x ${scaleY.toFixed(3)}`
          });
        }
        
        // Reapply zoom if in zoom mode
        if (vars.isZoomMode) {
          const zoom = window.RevealZoomitIshZoom;
          if (zoom) {
            zoom.applyZoom(vars, vars.zoomLevel, vars.zoomCenterX, vars.zoomCenterY);
            conf.debug && console.log(`[${vars.windowType}] Zoom reapplied: level=${vars.zoomLevel.toFixed(2)}`);
          }
        }
      };
      img.onerror = function() {
        console.error(`[${vars.windowType}] Failed to load history image`);
      };
      img.src = state.dataURL;
      
      // Update text element positions
      text.updateTextPositions(vars);

      // Update currentTextInput position if it exists
      text.updateCurrentTextInputPosition(vars);
    } else {
      conf.debug && console.log(`[${vars.windowType}] No valid history to restore`);
      
      // Apply background even without history
      if (vars.backgroundMode !== 'transparent') {
        vars.canvas.style.background = vars.backgroundMode === 'white' ? 'white' : 'black';
      }
      
      // Reapply zoom even if no history
      if (vars.isZoomMode) {
        const zoom = window.RevealZoomitIshZoom;
        if (zoom) {
          zoom.applyZoom(vars, vars.zoomLevel, vars.zoomCenterX, vars.zoomCenterY);
          conf.debug && console.log(`[${vars.windowType}] Zoom reapplied (no history): level=${vars.zoomLevel.toFixed(2)}`);
        }
      }
    }
  }
  
  // Debounced resize
  function debouncedResize(vars) {
    if (vars.resizeTimeout) {
      clearTimeout(vars.resizeTimeout);
    }
    
    // Set resizing flag to ignore slidechanged events
    vars.isResizing = true;
    
    vars.resizeTimeout = setTimeout(() => {
      resizeCanvas(vars);
      
      // Ensure the current iframe in the speaker view has focus.
      // Otherwise, it may lose focus and event listeners may not work properly.
      core.setFocusOnNotesIframe(vars);
    
      // Clear resizing flag after a delay to allow slidechanged events to settle
      setTimeout(() => {
        vars.isResizing = false;
      }, 500);
    }, conf.RESIZE_DEBOUNCE_MS);
  }

  /** Set background mode */
  function setBackground(vars, mode) {
    if (vars.backgroundMode === mode) mode = 'transparent';
    vars.backgroundMode = mode;
    if (!vars.canvas) return;
    
    vars.canvas.style.background = mode === 'white' ? 'white' : mode === 'black' ? 'black' : 'transparent';
  }

  function performClear(vars, skip_broadcast=false) {
    draw.performClear(vars);
    text.clearAllTextElements(vars);
    vars.history = [];
    vars.historyStep = -1;

    const hist = window.RevealZoomitIshHistory;
    if (hist) hist.saveState(vars);
    
    if (!skip_broadcast) core.broadcast(vars, 'clear', {});
    conf.debug && console.log(`[${vars.windowType}] Canvas and text elements cleared`);
  }

  // Calculate transformation to map old drawing to new position
  // Old drawing was at: (oldGeometry.offsetX, offsetY) with size (oldGeometry.width, height)
  // New position should be: (newGeometry.offsetX, offsetY) with size (newGeometry.width, height)
  function transformCanvasWithGeometry(vars, newGeometry, oldGeometry, img) {
    const scaleX = newGeometry.width / oldGeometry.width;
    const scaleY = newGeometry.height / oldGeometry.height;
    const translateX = newGeometry.offsetX - oldGeometry.offsetX * scaleX;
    const translateY = newGeometry.offsetY - oldGeometry.offsetY * scaleY;
    
    vars.ctx.save();
    vars.ctx.translate(translateX, translateY);
    vars.ctx.scale(scaleX, scaleY);
    vars.ctx.drawImage(img, 0, 0);
    vars.ctx.restore();
    
    core.updateRectCaches(vars);
    
    conf.debug && console.log(`[${vars.windowType}] Canvas restored WITH geometry transform:`, {
      oldGeometry,
      newGeometry,
      scale: { x: scaleX.toFixed(3), y: scaleY.toFixed(3) },
      translate: { x: translateX.toFixed(1), y: translateY.toFixed(1) }
    });
  }

  /** Restore state from dataURL */
  function restoreState(vars, dataURL, savedGeometry) {
    conf.debug && console.log(`[${vars.windowType}] restoreState called:`, {
      dataURLLength: dataURL?.length,
      savedGeometry: savedGeometry,
      currentGeometry: vars.slidesGeometry
    });
    
    const img = new Image();
    img.onload = function() {
      conf.debug && console.log(`[${vars.windowType}] restoreState img.onload triggered`);
      
      vars.ctx.clearRect(0, 0, vars.canvas.width, vars.canvas.height);
      
      // Check if geometry has actually changed
      const needsTransform = savedGeometry && vars.slidesGeometry && (
        Math.abs(savedGeometry.offsetX - vars.slidesGeometry.offsetX) > 0.5 ||
        Math.abs(savedGeometry.offsetY - vars.slidesGeometry.offsetY) > 0.5 ||
        Math.abs(savedGeometry.width - vars.slidesGeometry.width) > 0.5 ||
        Math.abs(savedGeometry.height - vars.slidesGeometry.height) > 0.5
      );
      
      if (needsTransform) {
        // Geometry has changed - apply transformation
        transformCanvasWithGeometry(vars, vars.slidesGeometry, savedGeometry, img);
      } else {
        // Geometry unchanged - simple restore
        vars.ctx.drawImage(img, 0, 0);
        conf.debug && console.log(`[${vars.windowType}] Canvas restored WITHOUT transform (geometry unchanged)`);
      }
    };
    img.src = dataURL;
  }

  function toggleDrawMode(vars, e) {
    vars.isDrawEnabled = !vars.isDrawEnabled;

    vars.canvas.style.pointerEvents = vars.isDrawEnabled ? 'auto' : 'none';
    if (vars.isZoomMode) {
      // In zoom mode, canvas needs pointer events for panning
      vars.canvas.style.pointerEvents = 'auto';
    }

    // synch draw status
    core.broadcast(vars, 'toggleDraw', { 
      enabled: vars.isDrawEnabled,
      isZoomMode: vars.isZoomMode,
      isEditingText: vars.isEditingText
    });
    
    if (!vars.isDrawEnabled) {
      if (vars.isZoomMode) {
        vars.canvas.style.cursor = 'zoom-in';
        vars.canvas.style.pointerEvents = 'auto';
      } else {
        vars.canvas.style.cursor = 'pointer';
      }

      setBackground(vars, 'transparent');
      core.broadcast(vars, 'background', { mode: 'transparent' });
      if (e.shiftKey) {
        performClear(vars);
      }
    } else {
      vars.canvas.style.cursor = 'crosshair';
    }
    conf.debug && console.log(`[${vars.windowType}] Draw mode: ${vars.isDrawEnabled}`);
  }

  function processToggleDrawMessages(vars, data) {
    vars.isDrawEnabled = data.enabled;
    vars.isZoomMode = data.isZoomMode;
    vars.isEditingText = data.isEditingText;
    
    // Not in zoom mode - follow draw state
    vars.canvas.style.pointerEvents = vars.isDrawEnabled ? 'auto' : 'none';
    // Update canvas pointer events
    if (vars.isZoomMode) {
      // In zoom mode, canvas needs pointer events for panning
      vars.canvas.style.pointerEvents = 'auto';
    }
    
    conf.debug && console.log(`[${vars.windowType}] Draw toggled:`, {
      enabled: data.enabled,
      isZoomMode: data.isZoomMode,
      isEditingText: data.isEditingText,
      'canvas.style.pointerEvents': vars.canvas.style.pointerEvents
    });
  }

  return {
    createCanvas,
    changeCanvasInitialSize,
    resizeCanvas,
    debouncedResize,
    setBackground,
    performClear,
    restoreState,
    toggleDrawMode,
    processToggleDrawMessages
  };
})();