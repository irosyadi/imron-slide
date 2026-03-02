// zoomit-ish-draw.js - Drawing functions

window.RevealZoomitIshDraw = (function() {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  const cnvs = window.RevealZoomitIshCanvas;

  function startDrawing(vars, e, ctrlKey) {
    // reset the shape mode
    if (!ctrlKey && !e.shiftKey && !e.altKey) {
      vars.shapeMode = null;
    }

    // Clear text selection when starting to draw
    if (vars.selectedTextElement) {
      vars.selectedTextElement.style.outline = '';
      vars.selectedTextElement.dataset.selected = 'false';
      vars.selectedTextElement = null;
    }

    // Start draw mode
    vars.canvas.style.cursor = 'crosshair';
    vars.isDrawing = true;

    // initialize start and last coordinates
    const slidesRect = core.getSlidesRect(vars);
    const relCoords = core.clientToRelSlides(e.clientX, e.clientY, slidesRect);
    
    vars.startRelX = relCoords.x;
    vars.startRelY = relCoords.y;
    vars.lastRelX = relCoords.x;
    vars.lastRelY = relCoords.y;
    vars.currentPath = [];
    vars.currentPath.push({ x: relCoords.x, y: relCoords.y });

    // In drawing mode, lower the priority of text elements
    // so drawing can continue even when overlapping them.
    lowerTextZIndex(vars);
  }

  function performDrawing(vars, clientX, clientY) {
    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);
    const relCoords = core.clientToRelSlides(clientX, clientY, slidesRect);

    vars.currentPath.push({ x: relCoords.x, y: relCoords.y });

    // Get line width for every window
    const scale = core.getScale(vars, slidesRect);
    const lw = getLineWidth(vars, scale);

    // Drawing
    vars.canvas.style.cursor = 'crosshair';
    if (vars.shapeMode) {
      performShape(vars, relCoords, lw, slidesRect, revealRect, reveal, true);
    } else if (vars.drawMode === 'erase') {
      performErase(vars, relCoords, lw, slidesRect, revealRect, reveal);
    } else {
      performFreehandPreview(vars, lw);
    }

    // Update the last mouse location for the next pointermove
    const lastRelCoords = core.clientToRelSlides(clientX, clientY, slidesRect);
    vars.lastRelX = lastRelCoords.x;
    vars.lastRelY = lastRelCoords.y;
  }

  function finalizeDrawing(vars, clientX, clientY) {
    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);
    const relCoords = core.clientToRelSlides(clientX, clientY, slidesRect);
    
    const scale = core.getScale(vars, slidesRect);
    const lw = getLineWidth(vars, scale);

    // Draw the completed shapes/highlighters
    let r = true;
    if (vars.shapeMode) {
      r = performShape(vars, relCoords, lw, slidesRect, revealRect, reveal);
    } else if (vars.drawMode !== 'erase') {
      r = performFreehand(vars, lw);
    }

    // Reset the states
    vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
    vars.isDrawing = false;
    vars.currentPath = [];
    vars.shapeMode = null;

    // Restore text zIndex for re-editing textbox
    restoreTextZIndex(vars);

    // save the current state for undo/redo
    if (r) {
      hist = window.RevealZoomitIshHistory;
      if (hist) hist.saveState(vars);
    }

    // sync the finalizing state with other windows
    core.broadcast(vars, 'strokeEnd', {isDrawn: r});
  }

  function processStrokeEndMessages(vars, data) {
    vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
    vars.isDrawing = false;
    vars.currentPath = [];
    vars.shapeMode = null;

    if (data.isDrawn) {
      hist = window.RevealZoomitIshHistory;
      if (hist) hist.saveState(vars);
      conf.debug && console.log(`[${vars.windowType}] Stroke ended, saved state`);
    }
  }

  function strokeFreehandPreview(vars, path, lineWidth) {
    vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
    setLineStyle(vars.tempCtx, vars.color, lineWidth, vars.opacity);

    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);

    vars.tempCtx.beginPath();

    const p0 = core.relSlidesToCanvas(path[0].x, path[0].y, slidesRect, revealRect, reveal);
    vars.tempCtx.moveTo(p0.x, p0.y);

    for (let i = 1; i < path.length; i++) {
      const p = core.relSlidesToCanvas(path[i].x, path[i].y, slidesRect, revealRect, reveal);
      vars.tempCtx.lineTo(p.x, p.y);
    }

    vars.tempCtx.stroke();
    vars.tempCtx.globalAlpha = 1.0;
  }

  /** Draw highlighter stroke (entire path at once) */
  function drawFreehand(vars) {
    if (!vars.ctx || vars.tempCanvas.length < 2) return;

    vars.ctx.drawImage(vars.tempCanvas, 0, 0);
    vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
    vars.ctx.globalAlpha = 1.0;
  }

  function performFreehandPreview(vars, lw) {
    let r = false;
    if (vars.currentPath.length > 1) {
      strokeFreehandPreview(vars, vars.currentPath, lw);
      
      core.broadcast(vars, 'freehandPreview', {
        path: vars.currentPath, color: vars.color, opacity: vars.opacity
      });
      r = true;
    }
    return r;
  }

  function performFreehand(vars, lw) {
    let r = false;
    if (vars.currentPath.length > 1) {
      drawFreehand(vars);
      
      core.broadcast(vars, 'freehandDraw', {
        path: vars.currentPath, color: vars.color, opacity: vars.opacity
      });
      r = true;
    }
    return r;
  }

  function processFreehandMessages(vars, data) {
    let r = false;
    if (data.path.length > 1) {
      const lw = getLineWidth(vars);
      
      conf.debug && console.log(`[${vars.windowType}] 📏 freehandDraw line width:`, {
        baseSlideWidth: vars.baseSlideWidth,
        lineWidth: lw.toFixed(2)
      });
      
      drawFreehand(vars);
      r = true;
    }
    return r;
  }

  function processFreehandPreviewMessages(vars, data) {
    let r = false;
    // update currentPath
    vars.currentPath = data.path;
  
    if (data.path.length > 1) {
      const lw = getLineWidth(vars);
      strokeFreehandPreview(vars, data.path, lw);
      r = true;
    }
    return r;
  }

  /** Draw shape */
  function drawArrow(ctx, x1, y1, x2, y2, lw) {
    const arrowLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const baseHeadLen = 6; // Base head length in pixels at standard slide size
    const scaledBaseHeadLen = baseHeadLen * lw; // base line width
    const headLen = Math.min(arrowLength * conf.arrowHeadLenFactor, Math.max(ctx.lineWidth * conf.arrowHeadLenFactor2, scaledBaseHeadLen));
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    // Draw arrow shaft
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Calculate shaft endpoint (shortened to meet arrow head base)
    const shaftEndX = x2 - (headLen * conf.arrowShaftFactor) * Math.cos(angle);
    const shaftEndY = y2 - (headLen * conf.arrowShaftFactor) * Math.sin(angle);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();
    
    // Draw filled arrow head (triangle with all corners rounded)
    const leftX = x2 - headLen * Math.cos(angle - Math.PI / (conf.arrowHeadAngleBase + conf.arrowHeadAngleFactor));
    const leftY = y2 - headLen * Math.sin(angle - Math.PI / conf.arrowHeadAngleBase);
    const rightX = x2 - headLen * Math.cos(angle + Math.PI / (conf.arrowHeadAngleBase + conf.arrowHeadAngleFactor));
    const rightY = y2 - headLen * Math.sin(angle + Math.PI / conf.arrowHeadAngleBase);
    const baseX = (leftX + rightX) / 2;
    const baseY = (leftY + rightY) / 2;
    
    // Set corner radius (adjust this value to control roundness)
    const cornerRadius = Math.min(headLen * conf.arrowHeadRadiusFactor, ctx.lineWidth * 1.2);
    
    ctx.beginPath();
    // Start from a point between tip and left corner
    const startX = (x2 + leftX) / 2;
    const startY = (y2 + leftY) / 2;
    ctx.moveTo(startX, startY);
    
    // Round the left corner (tip -> left -> base)
    ctx.arcTo(leftX, leftY, baseX, baseY, cornerRadius);
    
    // Round the base corner (left -> base -> right)
    ctx.arcTo(baseX, baseY, rightX, rightY, cornerRadius);
    
    // Round the right corner (base -> right -> tip)
    ctx.arcTo(rightX, rightY, x2, y2, cornerRadius);
    
    // Round the tip corner (right -> tip -> left)
    ctx.arcTo(x2, y2, leftX, leftY, cornerRadius);
    
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  function drawRect(ctx, x1, y1, x2, y2) {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }

  function drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawEllipse(ctx, x1, y1, x2, y2) {
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  function drawShape(ctx, x1, y1, x2, y2, shapeType, col, width, op) {
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    setLineStyle(ctx, col, width, op);
    
    switch(shapeType) {
      case 'line':
        drawLine(ctx, x1, y1, x2, y2);
        break;
      case 'rect':
        drawRect(ctx, x1, y1, x2, y2)
        break;
      case 'ellipse':
        drawEllipse(ctx, x1, y1, x2, y2);
        break;
      case 'arrow':
        drawArrow(ctx, x1, y1, x2, y2, width);
        break;
    }
    ctx.globalAlpha = 1.0;
  }

  function performShape(vars, relCoords, lw, slidesRect, revealRect, reveal, preview=false) {
    // skip just clicking
    if (relCoords.x.toFixed(3) === vars.startRelX.toFixed(3) && relCoords.y.toFixed(3) === vars.startRelY.toFixed(3)) return false;

    vars.canvas.style.cursor = 'crosshair';
    // ... shape preview code (use canvasCoords)
    vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
    const canvasCoords = core.relSlidesToCanvas(relCoords.x, relCoords.y, slidesRect, revealRect, reveal);
    const startCanvasCoords = core.relSlidesToCanvas(vars.startRelX, vars.startRelY, slidesRect, revealRect, reveal);

    drawShape(preview ? vars.tempCtx : vars.ctx, startCanvasCoords.x, startCanvasCoords.y, canvasCoords.x, canvasCoords.y, vars.shapeMode, vars.color, lw, vars.opacity);
    
    core.broadcast(vars, preview ? 'shapePreview' : 'shape', {
      relX1: vars.startRelX, relY1: vars.startRelY, 
      relX2: relCoords.x, relY2: relCoords.y,
      shapeType: vars.shapeMode
    });
    return true;
  }

  function processShapeMessages(vars, data, preview=false) {
    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);
    const s1 = core.relSlidesToCanvas(data.relX1, data.relY1, slidesRect, revealRect, reveal);
    const s2 = core.relSlidesToCanvas(data.relX2, data.relY2, slidesRect, revealRect, reveal);
    if (s1 && s2) {
      // Calculate arrow head size based on arrow length, line width, and slide scale
      const scale = core.getScale(vars);
      const lw = getLineWidth(vars, scale);

      if (!preview) {
        conf.debug && console.log(`[${vars.windowType}] 📏 shape line width:`, {
          baseSlideWidth: vars.baseSlideWidth,
          lineWidth: lw.toFixed(2)
        });
      }
      
      vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
      drawShape(preview ? vars.tempCtx : vars.ctx, s1.x, s1.y, s2.x, s2.y, data.shapeType, vars.color, lw, vars.opacity);
      if (!preview) {
        vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
      }
    }
  }

  /** Erase */
  function drawErase(ctx, x1, y1, x2, y2, width) {
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'destination-out';
    setLineStyle(ctx, 'white', width * conf.eraserLineWidthFactor, 1.0)
    
    drawLine(ctx, x1, y1, x2, y2)
    
    ctx.globalCompositeOperation = 'source-over';
  }

  function setEraseMode(vars) {
    // Reset line width and highlighter mode flag first
    updateColor(vars, 'red', false);
    core.broadcast(vars, 'setColor', {colorName: 'red', isHighlighter: false });
    
    // then change the draw mode
    vars.drawMode = 'erase';
    core.broadcast(vars, 'setMode', { mode: 'erase' });
  }

  function performErase(vars, relCoords, lw, slidesRect, revealRect, reveal) {
    const e1 = core.relSlidesToCanvas(relCoords.x, relCoords.y, slidesRect, revealRect, reveal);
    const e2 = core.relSlidesToCanvas(vars.lastRelX, vars.lastRelY, slidesRect, revealRect, reveal);
    if (e1 && e2) {
      conf.debug && console.log(`[${vars.windowType}] 📏 erase:`, 
        {startX:e1.x, startY:e1.y, endX:e2.x, endY:e2.y}
      );
      drawErase(vars.ctx, e1.x, e1.y, e2.x, e2.y, lw);
      core.broadcast(vars, 'erase', {
        relX1: relCoords.x, relY1: relCoords.y, 
        relX2: vars.lastRelX, relY2: vars.lastRelY,
      });
    }
  }

  function processEraseMessages(vars, data) {
    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);
    const e1 = core.relSlidesToCanvas(data.relX1, data.relY1, slidesRect, revealRect, reveal);
    const e2 = core.relSlidesToCanvas(data.relX2, data.relY2, slidesRect, revealRect, reveal);
    if (e1 && e2) {
      const lw = getLineWidth(vars);
      
      conf.debug && console.log(`[${vars.windowType}] 📏 erase line width:`, {
        baseSlideWidth: vars.baseSlideWidth,
        lineWidth: lw.toFixed(2)
      });
      
      drawErase(vars.ctx, e1.x, e1.y, e2.x, e2.y, lw);
    }
  }

  /** Clear canvas */
  function performClear(vars) {
    if (!vars.ctx || !vars.canvas) return;
    
    vars.ctx.clearRect(0, 0, vars.canvas.width, vars.canvas.height);
    if (vars.backgroundMode !== 'transparent') {
      const cnvs = window.RevealZoomitIshCanvas;
      if (cnvs) {
        cnvs.setBackground(vars, vars.backgroundMode);
      }
    }
    
    conf.debug && console.log(`[${vars.windowType}] Canvas cleared`);
  }

  /** Set color */
  function updateColor(vars, colorName, highlight = false) {
    if (vars.colors[colorName]) {
      vars.color = highlight ? vars.colors[colorName].highlight : vars.colors[colorName].normal;
      vars.opacity = highlight ? conf.highlighterOpacity : 1.0;
      vars.isHighlighter = highlight;
      vars.drawMode = 'draw';
      vars.shapeMode = null;
      
      // Switch between highlighter and normal pen widths
      if (highlight) {
        vars.baseLineWidth = vars.highlighterLineWidthLevels[vars.highlighterLineWidthLevel];
      } else {
        vars.baseLineWidth = vars.lineWidthLevels[vars.lineWidthLevel];
      }
      conf.debug && console.log("setColor:", {color: vars.color, opacity: vars.opacity, isHighlighter: vars.isHighlighter, baseLineWidth: vars.baseLineWidth});
    }
  }

  function setColor(vars, colorName, highlight = false) {
    if (vars.colors[colorName]) {
      updateColor(vars, colorName, highlight);
      
      core.broadcast(vars, 'setColor', { 
        colorName: colorName, 
        isHighlighter: vars.isHighlighter
      });
    }
  }

  function getLineWidth(vars, scale=null) {
    if (scale === null) {
      scale = core.getScale(vars);
    }
    
    // Scale line width based on MY slide size and zoom level
    const zoomCompensation = vars.isZoomMode ? vars.zoomLevel : 1.0;
    
    // Use sender's zoom level for the base calculation, then adjust for my zoom
    const lineWidth = vars.baseLineWidth * scale / zoomCompensation;
    return lineWidth;
  }

  function setLineStyle(ctx, col, width, op, cap='round', join='round') {
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.globalAlpha = op;
    ctx.lineCap = cap;
    ctx.lineJoin = join;
  }

  function changeTextZIndex(vars, idx=conf.NORMAL_TEXT_ZINDEX) {
    vars.textElements.forEach(el => {
      el.style.zIndex = `'${idx}'`;
    });
  }
  function restoreTextZIndex(vars) {
     changeTextZIndex(vars);
  }

  function lowerTextZIndex(vars) {
     changeTextZIndex(vars, conf.LOWER_TEXT_ZINDEX);
  }

  /** Adjust line width level */
  function updateLineWidth(vars, delta) {
    let newLevel;

    if (vars.isHighlighter) {
      newLevel = Math.max(0, Math.min(vars.highlighterLineWidthLevels.length-1, vars.highlighterLineWidthLevel + delta));
      vars.highlighterLineWidthLevel = newLevel;
      vars.baseLineWidth = vars.highlighterLineWidthLevels[newLevel];
    } else {
      newLevel = Math.max(0, Math.min(vars.lineWidthLevels.length-1, vars.lineWidthLevel + delta));
      vars.lineWidthLevel = newLevel;
      vars.baseLineWidth = vars.lineWidthLevels[newLevel];
    }
    return newLevel;
  }

  function adjustLineWidth(vars, delta) {
    const newLevel = updateLineWidth(vars, delta);
    conf.debug && console.log(`[${vars.windowType}] ${vars.isHighlighter ? 'Highlighter' : 'Line'} width adjusted to level ${newLevel}: ${vars.baseLineWidth}px`);
    
    core.broadcast(vars, 'lineWidthChanged', {
      level: newLevel,
      baseLineWidth: vars.baseLineWidth,
      isHighlighter: vars.isHighlighter
    });
  }
  function processLineWidthChangedMessages(vars, data) {
    if (data.isHighlighter) {
      vars.highlighterLineWidthLevel = data.level;
    } else {
      vars.lineWidthLevel = data.level;
    }
    vars.baseLineWidth = data.baseLineWidth;
  }

  return {
    startDrawing,
    performDrawing,
    finalizeDrawing,
    processStrokeEndMessages,
    drawFreehand,
    performFreehandPreview,
    processFreehandPreviewMessages,
    performFreehand,
    processFreehandMessages,
    drawArrow,
    drawEllipse,
    drawRect,
    drawLine,
    drawShape,
    performShape,
    processShapeMessages,
    drawErase,
    performErase,
    setEraseMode,
    performClear,
    processEraseMessages,
    setColor,
    updateColor,
    getLineWidth,
    setLineStyle,
    changeTextZIndex,
    restoreTextZIndex,
    lowerTextZIndex,
    updateLineWidth,
    adjustLineWidth,
    processLineWidthChangedMessages
  };
})();