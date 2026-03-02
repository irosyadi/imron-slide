// zoomit-ish-zoom.js - Handling zoom and pan

window.RevealZoomitIshZoom = (function() {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  
  // ========== Zoom functionality ==========
  
  /** Apply zoom
   * @param {Object} vars - Global variables
   * @param {number} level - Zoom level
   * @param {number} centerX - Zoom center X coordinate (.slides relative 0-1)
   * @param {number} centerY - Zoom center Y coordinate (.slides relative 0-1)
   */
  function applyZoom(vars, level, centerX, centerY) {
    if (!vars.isPanning) {
      core.updateRectCaches(vars);
    }
    const {revealRect, reveal} = core.getRevealRect(vars);
    const slidesRect = core.getSlidesRect(vars);

    if (!slidesRect || !revealRect) {
      console.warn(`[${vars.windowType}] ⚠️ Cannot get rect:`, {
        slidesRect: !!slidesRect,
        revealRect: !!revealRect
      });
      return;
    }
    
    conf.debug && console.log(`[${vars.windowType}] 🔍 applyZoom called:`, {
      level,
      centerX,
      centerY,
      panOffsetX: vars.panOffsetX,
      panOffsetY: vars.panOffsetY
    });
    
    vars.zoomLevel = level;
    
    if (level === 1.0) {
      reveal.style.transform = '';
      reveal.style.transformOrigin = '';
      conf.debug && console.log(`[${vars.windowType}] ✅ Zoom reset to 1.0`);
      core.updateRectCaches(vars);
      return;
    }
    
    // Convert .slides relative coordinates to client coordinates
    const slidesCenterClient = core.relSlidesToClient(
      centerX !== undefined ? centerX : 0.5,
      centerY !== undefined ? centerY : 0.5,
      slidesRect
    );
    
    conf.debug && console.log(`[${vars.windowType}] 📍 Center conversion:`, {
      slidesRelative: { x: centerX, y: centerY },
      client: slidesCenterClient
    });
    
    // Convert client coordinates to .reveal relative coordinates (0-1)
    const revealRelX = (slidesCenterClient.x - revealRect.left) / revealRect.width;
    const revealRelY = (slidesCenterClient.y - revealRect.top) / revealRect.height;
    
    conf.debug && console.log(`[${vars.windowType}] 🎯 transformOrigin:`, {
      revealRelative: { x: revealRelX, y: revealRelY },
      percent: { x: revealRelX * 100, y: revealRelY * 100 }
    });
    
    // Set transformOrigin
    reveal.style.transformOrigin = `${revealRelX * 100}% ${revealRelY * 100}%`;
    core.updateRectCaches(vars);
    
    // Apply panOffset (panOffset is stored as .slides relative coordinates)
    // Convert .slides relative coordinates to pixels
    const panPixelsX = vars.panOffsetX * slidesRect.width;
    const panPixelsY = vars.panOffsetY * slidesRect.height;
    
    // Calculate translate for scale application
    const translateX = panPixelsX / level;
    const translateY = panPixelsY / level;
    
    reveal.style.transform = `translate(${translateX}px, ${translateY}px) scale(${level})`;
    if (!vars.isPanning) {
      core.updateRectCaches(vars);
    }
    
    conf.debug && console.log(`[${vars.windowType}] ✅ Zoom applied:`, {
      level,
      transformOrigin: `${revealRelX * 100}% ${revealRelY * 100}%`,
      panOffset: { x: vars.panOffsetX, y: vars.panOffsetY },
      panPixels: { x: panPixelsX, y: panPixelsY },
      translate: { x: translateX, y: translateY }
    });
    
    conf.debug && console.log(`[${vars.windowType}] ✅ applyZoom completed`);
  }

  /** Toggle zoom mode */
  function toggleZoom(vars, enableDraw = false) {
    if (!vars.isPanning) {
      core.updateRectCaches(vars);
    }
    const slidesRect = core.getSlidesRect(vars);

    if (vars.isZoomMode) {
      // Exit zoom mode
      vars.isZoomMode = false;
      vars.zoomLevel = 1.0;
      vars.panOffsetX = 0;
      vars.panOffsetY = 0;
      
      document.body.style.userSelect = '';
      
      // Reset zoom
      applyZoom(vars, 1.0, 0.5, 0.5);
      
      core.broadcast(vars, 'zoom', { 
        level: 1.0, 
        centerX: 0.5, 
        centerY: 0.5,
        panOffsetX: 0,
        panOffsetY: 0,
        renewCache: true,
        isZoomMode: vars.isZoomMode
      });
      
      vars.isDrawEnabled = enableDraw ? false : vars.isDrawEnabled;
      vars.canvas.style.pointerEvents = vars.isDrawEnabled ? 'auto' : 'none';

      if (enableDraw) {
        vars.canvas.style.cursor = 'crosshair';
      } else {
        vars.canvas.style.cursor = 'zoom-in';
      }
      
      core.broadcast(vars, 'toggleDraw', {
        enabled: vars.isDrawEnabled,
        isZoomMode: false,
        isEditingText: vars.isEditingText
      });
      
      conf.debug && console.log(`[${vars.windowType}] ✅ Zoom mode exited`);
    } else {
      // Enter zoom mode
      vars.isZoomMode = true;
      document.body.style.userSelect = 'none';
      vars.canvas.style.pointerEvents = 'auto';
      vars.canvas.style.cursor = 'pointer';
      
      // Convert mouse pointer position to .slides relative coordinates (0-1)
      const relCoords = core.clientToRelSlides(vars.pointerX, vars.pointerY, slidesRect);
      
      conf.debug && console.log(`[${vars.windowType}] Pointer position: (${vars.pointerX}, ${vars.pointerY})`);
      conf.debug && console.log(`[${vars.windowType}] Slide coords:`, relCoords);
      
      // Store as .slides relative coordinates
      if (relCoords && relCoords.x >= 0 && relCoords.x <= 1 && relCoords.y >= 0 && relCoords.y <= 1) {
        vars.zoomCenterX = relCoords.x;
        vars.zoomCenterY = relCoords.y;
        conf.debug && console.log(`[${vars.windowType}] Zoom center set to (.slides relative): (${vars.zoomCenterX}, ${vars.zoomCenterY})`);
      } else {
        vars.zoomCenterX = 0.5;
        vars.zoomCenterY = 0.5;
        conf.debug && console.log(`[${vars.windowType}] Zoom center defaulted to (.slides relative): (0.5, 0.5)`);
      }
      
      // Initialize panOffset as .slides relative coordinates
      vars.panOffsetX = 0;
      vars.panOffsetY = 0;
      
      conf.debug && console.log(`[${vars.windowType}] Zoom at center:`, {
        zoomCenter: { x: vars.zoomCenterX, y: vars.zoomCenterY },
        note: 'coordinates are .slides relative (0-1)',
        initialPanOffset: { x: 0, y: 0 }
      });
      
      // Apply zoom using zoomCenter
      applyZoom(vars, conf.defaultZoomSize, vars.zoomCenterX, vars.zoomCenterY);
      
      core.broadcast(vars, 'zoom', { 
        level: conf.defaultZoomSize, 
        centerX: vars.zoomCenterX,
        centerY: vars.zoomCenterY,
        panOffsetX: vars.panOffsetX,
        panOffsetY: vars.panOffsetY,
        renewCache: true
      });
      
      const newDrawState = enableDraw || vars.isDrawEnabled;
      if (enableDraw && !vars.isDrawEnabled) {
        vars.isDrawEnabled = true;
      }
      
      core.broadcast(vars, 'toggleDraw', {
        enabled: newDrawState,
        isZoomMode: true,
        isEditingText: vars.isEditingText
      });
      
      conf.debug && console.log(`[${vars.windowType}] ✅ Zoom mode entered`);
    }
  }

  // Panning start handler on alt + pointermove events
  function enterPanningMode(vars, e) {
    conf.debug && console.log(`[${vars.windowType}] ✋ Starting pan mode`);

    // Switch transformOrigin to center (0.5, 0.5) if needed
    if (vars.zoomCenterX !== 0.5 || vars.zoomCenterY !== 0.5) {
      // Calculate difference between current zoomCenter and new center (0.5, 0.5)
      // This is the difference in .slides relative coordinates
      const offsetX = -(vars.zoomCenterX - 0.5);
      const offsetY = -(vars.zoomCenterY - 0.5);
      
      // Add to panOffset (already in .slides relative coordinates, so can be used directly)
      vars.panOffsetX = offsetX;
      vars.panOffsetY = offsetY;
      
      conf.debug && console.log(`[${vars.windowType}] 🔄 Switching transformOrigin:`, {
        from: { x: vars.zoomCenterX, y: vars.zoomCenterY },
        to: { x: 0.5, y: 0.5 },
        calculatedPanOffset: { x: offsetX, y: offsetY },
        note: 'all coordinates are .slides relative (0-1)'
      });
      
      // Update zoomCenter to center
      vars.zoomCenterX = 0.5;
      vars.zoomCenterY = 0.5;
      
      // Apply new transform
      applyZoom(vars, vars.zoomLevel, 0.5, 0.5);
    }

    vars.isPanning = true;
    vars.panStartX = e.clientX;
    vars.panStartY = e.clientY;
    vars.canvas.style.cursor = 'grabbing';
  }

  // Process zoom message on keyboard shortcuts for synchronization
  function processZoomMessages(vars, data) {
    if (!vars.isPanning) {
      core.updateRectCaches(vars);
    }

    conf.debug && console.log(`[${vars.windowType}] 📥 Received zoom, BEFORE applying:`, {
      'canvas.style.pointerEvents': vars.canvas.style.pointerEvents,
      'vars.isZoomMode': vars.isZoomMode,
      'vars.isPanning': vars.isPanning,
      received: {
        level: data.level,
        centerX: data.centerX,
        centerY: data.centerY,
        panOffsetX: data.panOffsetX,
        panOffsetY: data.panOffsetY
      }
    });

    // All received data is in .slides relative coordinates (0-1)
    vars.zoomLevel = data.level;
    vars.zoomCenterX = data.centerX;
    vars.zoomCenterY = data.centerY;
    vars.panOffsetX = data.panOffsetX || 0;
    vars.panOffsetY = data.panOffsetY || 0;
    if (data.isZoomMode !== undefined) {
        vars.isZoomMode = data.isZoomMode;
    }
    
    conf.debug && console.log(`[${vars.windowType}] 📦 Stored values (all .slides relative):`, {
      zoomCenter: { x: vars.zoomCenterX, y: vars.zoomCenterY },
      panOffset: { x: vars.panOffsetX, y: vars.panOffsetY }
    });
    
    // Update UI state
    if (vars.isZoomMode) {
      document.body.style.userSelect = 'none';
      // Enable canvas pointer events for panning (even if draw is disabled)
      vars.canvas.style.pointerEvents = 'auto';
    } else {
      document.body.style.userSelect = '';
      // Restore canvas pointer events based on draw state
      vars.canvas.style.pointerEvents = vars.isDrawEnabled ? 'auto' : 'none';
    }
    
    conf.debug && console.log(`[${vars.windowType}] 📥 Received zoom, AFTER applying:`, {
      'canvas.style.pointerEvents': vars.canvas.style.pointerEvents,
      'vars.isZoomMode': vars.isZoomMode,
      'vars.isPanning': vars.isPanning
    });
    
    // Apply zoom (pass .slides relative coordinates)
    applyZoom(vars, data.level, data.centerX, data.centerY);
    vars.canvas.style.cursor = vars.isDrawMode ? 'crosshair' : 'pointer';

    conf.debug && console.log(`[${vars.windowType}] ✅ Zoom applied from received data`);
  }

  // Panning handler on pointermove events
  function performPanning(vars, e) {
    const slidesRect = core.getSlidesRect(vars);
    
    if (!slidesRect) {
      conf.debug && console.log(`[${vars.windowType}] ⚠️ Cannot pan - slides not found`);
      return;
    }
    
    vars.canvas.style.cursor = 'grabbing';
    
    conf.debug && console.log(`[${vars.windowType}] 🖐️ Panning:`, {
      isPanning: vars.isPanning,
      clientX: e.clientX,
      clientY: e.clientY,
      panStartX: vars.panStartX,
      panStartY: vars.panStartY
    });
    
    // Calculate delta in client coordinates
    const dx = e.clientX - vars.panStartX;
    const dy = e.clientY - vars.panStartY;
    
    // Convert to .slides relative coordinates (0-1)
    const dxRatio = dx / slidesRect.width;
    const dyRatio = dy / slidesRect.height;
    
    // Update panOffset (stored as .slides relative coordinates)
    vars.panOffsetX += dxRatio;
    vars.panOffsetY += dyRatio;
    
    vars.panStartX = e.clientX;
    vars.panStartY = e.clientY;
    
    conf.debug && console.log(`[${vars.windowType}] Pan delta:`, {
      clientPixels: { dx, dy },
      slidesSize: { width: slidesRect.width, height: slidesRect.height },
      slidesRelative: { dx: dxRatio, dy: dyRatio },
      newPanOffset: { x: vars.panOffsetX, y: vars.panOffsetY },
      note: 'panOffset stored as .slides relative (0-1)'
    });
    
    // Reapply zoom
    applyZoom(vars, vars.zoomLevel, vars.zoomCenterX, vars.zoomCenterY);
    
    conf.debug && console.log(`[${vars.windowType}] 📤 Broadcasting zoom with pan`);
    
    // Broadcast as .slides relative coordinates
    core.broadcast(vars, 'zoom', { 
      level: vars.zoomLevel, 
      centerX: vars.zoomCenterX,
      centerY: vars.zoomCenterY,
      panOffsetX: vars.panOffsetX,
      panOffsetY: vars.panOffsetY
    });
  }

  function exitPanningMode(vars) {
    vars.isPanning = false;

    if (vars.isDrawEnabled) {
      vars.canvas.style.cursor = 'crosshair';
    } else {
      vars.canvas.style.cursor = 'zoom-in';
    }

    core.updateRectCaches(vars);
    
    core.broadcast(vars, 'zoom', { 
      level: vars.zoomLevel, 
      centerX: vars.zoomCenterX, 
      centerY: vars.zoomCenterY,
      panOffsetX: vars.panOffsetX,
      panOffsetY: vars.panOffsetY,
      renewCache: true
    });
  }

  function zoomInOut(vars, delta) {
    vars.zoomLevel = Math.max(1.0, Math.min(conf.maxZoomSize, vars.zoomLevel + delta));

    // Use current zoomCenter and panOffset
    applyZoom(vars, vars.zoomLevel, vars.zoomCenterX, vars.zoomCenterY);
    
    conf.debug && console.log(`[${vars.windowType}] 📤 Broadcasting zoom level change`);
    
    // Broadcast as .slides relative coordinates
    core.broadcast(vars, 'zoom', { 
      level: vars.zoomLevel, 
      centerX: vars.zoomCenterX, 
      centerY: vars.zoomCenterY,
      panOffsetX: vars.panOffsetX,
      panOffsetY: vars.panOffsetY,
      renewCache: true
    });
    
    conf.debug && console.log(`[${vars.windowType}] Zoom: ${vars.zoomLevel.toFixed(2)}`);
  }

  return {
    applyZoom,
    toggleZoom,
    zoomInOut,
    processZoomMessages,
    enterPanningMode,
    performPanning,
    exitPanningMode
  };
})();