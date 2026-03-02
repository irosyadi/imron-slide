// zoomitish-text.js - Handling text-input

window.RevealZoomitIshText = (function() {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  //const hist = window.RevealZoomitIshHistory;

  const textStyleFormatter = (x, y, color, fontSize, fontFamily, zIndex) => `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    color: ${color};
    font-size: ${fontSize}px;
    font-family: ${fontFamily};
    outline: 2px dashed rgba(255, 0, 0, 0.5);
    padding: 0;
    margin: 0;
    z-index: ${zIndex};
    background: transparent;
    pointer-events: auto;
    line-height: 1;
    transform-origin: top left;
  `;

  function enterTextMode(vars) {
    // Convert client coordinates to canvas coordinates (accounting for zoom)
    const slidesRect = core.getSlidesRect(vars);
    const relCoords = core.clientToRelSlides(vars.pointerX, vars.pointerY, slidesRect);

    vars.canvas.style.cursor = 'text';
    createTextInput(vars, relCoords.x, relCoords.y);
  }
  
  function textSizeChange(vars, input, incdec, relX, relY, scale) {
    const baseSize = parseFloat(input.dataset.baseFontSize);
    const newBaseSize = incdec ? baseSize + conf.fontSizeDelta : Math.max(conf.minimumFontSize, baseSize - conf.fontSizeDelta);
    input.dataset.baseFontSize = newBaseSize;
    const displayFontSize = core.getDisplayFontSize(vars, newBaseSize);
    input.style.fontSize = displayFontSize + 'px';
    
    // Broadcast font size change
    core.broadcast(vars, 'textInputFontSizeChange', {
      relX: relX,
      relY: relY,
      fontSize: newBaseSize,
      text: input.innerText,
      color: input.style.color
    });
  }
  
  /** Start text input */
  function createTextInput(vars, relX, relY, existingText = '', existingFontSize = conf.defaultFontSize, existingColor = null) {
    if (vars.currentTextInput) return;
    
    conf.debug && console.log(`[${vars.windowType}] 📝 createTextInput called:`, {
      relX, relY, existingText, existingFontSize, existingColor,
      isZoomMode: vars.isZoomMode,
      zoomLevel: vars.zoomLevel,
      relative: { relX, relY }
    });
    
    vars.isEditingText = true;
    
    const {revealRect, reveal} = core.getRevealRect(vars);
    const slidesRect = core.getSlidesRect(vars);
    const scale = core.getScale(vars, slidesRect);
    
    core.broadcast(vars, 'textInputStart', {
      relX: relX,
      relY: relY,
      existingText: existingText,
      fontSize: existingFontSize,
      color: existingColor || vars.color
    });
    
    core.broadcast(vars, 'toggleDraw', {
      enabled: vars.isDrawEnabled,
      isZoomMode: vars.isZoomMode,
      isEditingText: true
    });
    
    const input = document.createElement('div');
    input.contentEditable = true;
    
    const defaultBaseFontSize = existingFontSize;
    
    // Convert relative coordinates to canvas coordinates for positioning
    const canvasCoords = core.relSlidesToCanvas(relX, relY, slidesRect, revealRect, reveal);
    
    // Font size based on base size and slide scale
    // When zoomed, divide by zoom level so the visual size stays consistent
    const displayFontSize = core.getDisplayFontSize(vars, defaultBaseFontSize, slidesRect, scale);
    const fontFamily = core.getFontFamily(vars);
    
    conf.debug && console.log(`[${vars.windowType}] 📝 createTextInput - Font:`, {
      baseFontSize: defaultBaseFontSize,
      scale,
      zoomLevel: vars.zoomLevel,
      displayFontSize,
      canvasCoords
    });
    
    // Position as child of .slides so it transforms with reveal
    // Use canvas coordinates directly (relative to .slides)
    
    input.style.cssText = textStyleFormatter(canvasCoords.x, canvasCoords.y, existingColor || vars.color, displayFontSize, fontFamily, 2000);
    input.dataset.baseFontSize = defaultBaseFontSize;
    input.dataset.initialText = existingText;
    input.dataset.initialFontSize = defaultBaseFontSize;
    input.dataset.initialColor = existingColor || vars.color;
    
    // Store relative position for updates during zoom/pan
    input.dataset.relX = relX;
    input.dataset.relY = relY;
    
    if (existingText) {
      input.innerText = existingText;
    }
    
    // Append to .reveal instead of body
    reveal.appendChild(input);
    input.focus();
    vars.currentTextInput = input;
    
    conf.debug && console.log(`[${vars.windowType}] 📝 Text input created at rel(${relX}, ${relY}) canvas(${canvasCoords.x}, ${canvasCoords.y}) (zoom: ${vars.zoomLevel})`);
    
    input.addEventListener('input', () => {
      core.broadcast(vars, 'textInputUpdate', {
        relX: relX,
        relY: relY,
        text: input.innerText,
        fontSize: defaultBaseFontSize,
        color: existingColor || vars.color
      });
    });
    
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      
      if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        textSizeChange(vars, input, e.key === 'ArrowUp', relX, relY, scale);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        finalizeTextInput(vars, true);
      }
      
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          e.preventDefault();
          finalizeTextInput(vars);
        }
      }
    });
    
    input.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        textSizeChange(vars, input, e.deltaY < 0, relX, relY, scale);
      }
    }, { passive: false });
  }
  
  /** Finalize text input */
  function finalizeTextInput(vars, discard=false) {
    const input = vars.currentTextInput;
    if (!input) return;
    
    const text = input.innerText.trim();
    const baseFontSize = parseFloat(input.dataset.baseFontSize || input.style.fontSize);
    const initialText = input.dataset.initialText || '';
    const initialFontSize = parseFloat(input.dataset.initialFontSize || baseFontSize);
    const textColor = input.style.color;
    const initialColor = input.dataset.initialColor || textColor;
    
    // Check if text, font size, or color changed
    const hasChanges = text !== initialText || 
                      Math.abs(baseFontSize - initialFontSize) > 0.1 ||
                      textColor !== initialColor;

    // get .slides relative coordinates
    const relX = parseFloat(input.dataset.relX);
    const relY = parseFloat(input.dataset.relY);
    
    conf.debug && console.log(`[${vars.windowType}] ✅ finalizeTextInput called:`, {
      text, baseFontSize, initialText, initialFontSize, hasChanges,
      textChanged: text !== initialText,
      fontSizeChanged: Math.abs(baseFontSize - initialFontSize) > 0.1,
      colorChanged: textColor !== initialColor
    });

    if (discard && initialText) {
      // Just re-create text element and quit for cancellation when 'Esc' is pressed.
      conf.debug && console.log(`[${vars.windowType}] ✅ finalizeTextInput - Text input was cancelled. Restore the original text:`, {
        relX, relY, initialText, hasChanges
      });
      createTextElement(vars, relX, relY, initialText, initialColor, initialFontSize);
      
      core.broadcast(vars, 'createText', {
        relX: relX,
        relY: relY,
        text: initialText,
        color: initialColor,
        fontSize: initialFontSize
      });
    } else if (!text) {
      // Text is empty
      if (hasChanges && initialText) {
        // Text was deleted (had text before, now empty) - remove the existing element
        conf.debug && console.log(`[${vars.windowType}] ✅ finalizeTextInput - Removing existing element (emptied):`, {
          relX, relY, initialText, hasChanges
        });
        
        // Broadcast removal to sync window with save state flag
        core.broadcast(vars, 'removeText', {
          relX: relX,
          relY: relY,
          shouldSaveState: true
        });
        
        // Save state after deletion
        const hist = window.RevealZoomitIshHistory;
        if (hist) hist.saveState(vars);
        
      } else {
        // No initial text (new empty input) - just close without saving
        conf.debug && console.log(`[${vars.windowType}] ✅ finalizeTextInput - Text empty, no element to remove`);
        core.broadcast(vars, 'textInputEnd', {
          relX: relX,
          relY: relY
        });
      }
    } else if (hasChanges) {
      // Text exists and has changes - create new element
      conf.debug && console.log(`[${vars.windowType}] ✅ finalizeTextInput - Creating element with changes:`, {
        relX, relY, text, baseFontSize, textColor, hasChanges
      });
      
      createTextElement(vars, relX, relY, text, textColor, baseFontSize);
      
      core.broadcast(vars, 'createText', {
        relX: relX,
        relY: relY,
        text: text,
        color: textColor,
        fontSize: baseFontSize,
        textChanged: true
      });

      const hist = window.RevealZoomitIshHistory;
      if (hist) hist.saveState(vars);

    } else {
      // Text exists but no changes - restore original element
      conf.debug && console.log(`[${vars.windowType}] ✅ finalizeTextInput - No changes, restoring original element:`, {
        text, baseFontSize, textColor, hasChanges
      });
      
      // Restore the original element since it was removed during dblclick
      createTextElement(vars, relX, relY, text, textColor, baseFontSize);
      
      core.broadcast(vars, 'createText', {
        relX: relX,
        relY: relY,
        text: text,
        color: textColor,
        fontSize: baseFontSize,
        textChanged: false
      });
    }
    
    core.broadcast(vars, 'textInputEnd', {
      relX: relX,
      relY: relY
    });
    
    input.remove();
    vars.currentTextInput = null;
    vars.isEditingText = false;
    
    core.broadcast(vars, 'toggleDraw', {
      enabled: vars.isDrawEnabled,
      isZoomMode: vars.isZoomMode,
      isEditingText: false
    });
  }
  
  /** Create text element */
  function createTextElement(vars, relX, relY, text, textColor, baseFontSize) {
    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);
    const canvasCoords = core.relSlidesToCanvas(relX, relY, slidesRect, revealRect, reveal);
    const scale = core.getScale(vars, slidesRect);
    
    // When zoomed, divide by zoom level so the visual size stays consistent
    const displayFontSize = core.getDisplayFontSize(vars, baseFontSize, slidesRect, scale);
    const fontFamily = core.getFontFamily(vars);
    
    conf.debug && console.log(`[${vars.windowType}] 📄 createTextElement:`, {
      canvasX: canvasCoords.x, canvasY: canvasCoords.y, text, baseFontSize, 
      scale, zoomLevel: vars.zoomLevel, displayFontSize
    });
    
    const el = document.createElement('div');
    el.className = 'zoomit-ish-text-element';
    
    el.style.cssText = textStyleFormatter(canvasCoords.x, canvasCoords.y, textColor || vars.color, displayFontSize, fontFamily, conf.NORMAL_TEXT_ZINDEX);
    // Remove temp frame
    el.style.outline = 0;
    el.innerText = text;
    el.dataset.baseFontSize = baseFontSize;
    
    el.dataset.relX = relX;
    el.dataset.relY = relY;
    
    vars.textElementsInitialPositions.set(el, {
      relX: relX,
      relY: relY,
      baseFontSize: baseFontSize,
      color: textColor
    });
    
    conf.debug && console.log(`[${vars.windowType}] 📄 Stored relative position:`, {
      relX: relX,
      relY: relY
    });
    
    // Append to .reveal instead of body
    reveal.appendChild(el);
    
    // Click to select text element
    let clickHandler = (e) => {
      if (!vars.isDrawEnabled || vars.isDrawing) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Clear previous selection
      vars.textElements.forEach(elem => {
        elem.style.outline = '';
        elem.dataset.selected = 'false';
      });
      
      // Select this element
      el.style.outline = '2px solid rgba(0, 150, 255, 0.8)';
      el.dataset.selected = 'true';
      vars.selectedTextElement = el;
      
      conf.debug && console.log(`[${vars.windowType}] 📌 Text element selected`);
    };
    
    let dblClickHandler = (e) => {
      if (!vars.isDrawEnabled || vars.isDrawing) return;

      if (vars.isEditingText) {
        if (vars.selectedTextElement) {
          vars.selectedTextElement.style.outline = '';
          vars.selectedTextElement.dataset.selected = 'false';
          vars.selectedTextElement = null;
        }
        return
      }

      e.preventDefault();
      e.stopPropagation();
      
      const elRelX = parseFloat(el.dataset.relX);
      const elRelY = parseFloat(el.dataset.relY);
      const elBaseFontSize = parseFloat(el.dataset.baseFontSize);
      const elColor = el.style.color;
      const elText = el.innerText;
      
      el.remove();
      const idx = vars.textElements.indexOf(el);
      if (idx > -1) vars.textElements.splice(idx, 1);
      
      // Remove from initial positions map
      vars.textElementsInitialPositions.delete(el);
      
      core.broadcast(vars, 'removeText', {
        relX: elRelX,
        relY: elRelY
      });
      
      createTextInput(vars, elRelX, elRelY, elText, elBaseFontSize, elColor);
    };

    el.addEventListener('click', clickHandler);
    el.addEventListener('dblclick', dblClickHandler);
    
    vars.textElements.push(el);
  }

  /** Remove all text elements */
  function clearAllTextElements(vars) {
    // Broadcast remove for each text element before clearing
    vars.textElements.forEach(el => {
      const elRelX = parseFloat(el.dataset.relX);
      const elRelY = parseFloat(el.dataset.relY);
      
      core.broadcast(vars, 'removeText', {
        relX: elRelX,
        relY: elRelY
      });
    });

    // Remove texts
    vars.textElements.forEach(el => el.remove());
    vars.textElements = [];
  }

  
  function deleteSelectedText(vars) {
    if (!vars.selectedTextElement) {
      conf.debug && console.log(`[${vars.windowType}] No text element selected`);
      return;
    }
    
    const el = vars.selectedTextElement;

    const elRelX = parseFloat(el.dataset.relX);
    const elRelY = parseFloat(el.dataset.relY);
    
    el.remove();
    const idx = vars.textElements.indexOf(el);
    if (idx > -1) vars.textElements.splice(idx, 1);
    
    // Remove from initial positions map
    vars.textElementsInitialPositions.delete(el);
    
    if (vars.selectedTextElement) {
      vars.selectedTextElement.style.outline = '';
      vars.selectedTextElement.dataset.selected = 'false';
      vars.selectedTextElement = null;
    }

    conf.debug && console.log(`[${vars.windowType}] Deleted the selected textbox.`);

    const hist = window.RevealZoomitIshHistory;
    if (hist) hist.saveState(vars);

    core.broadcast(vars, 'removeText', {
      relX: elRelX,
      relY: elRelY,
      shouldSaveState: true
    });
  }
  
  /** Change color of selected text element */
  function changeSelectedTextColor(vars, colorName) {
    if (!vars.selectedTextElement) {
      conf.debug && console.log(`[${vars.windowType}] No text element selected`);
      return;
    }
    
    const el = vars.selectedTextElement;
    
    const newColor = vars.colors[colorName]['normal'];
    if (!newColor) return;
    
    // Update color
    el.style.color = newColor;
    
    // Update stored position data
    const relX = parseFloat(el.dataset.relX);
    const relY = parseFloat(el.dataset.relY);
    const posData = vars.textElementsInitialPositions.get(el);
    if (posData) {
      posData.color = newColor;
    }
    
    conf.debug && console.log(`[${vars.windowType}] 🎨 Changed text color to ${colorName} (${newColor})`);
    
    // Broadcast color change
    if (relX !== undefined && relY !== undefined) {
      core.broadcast(vars, 'textColorChange', {
        relX: relX,
        relY: relY,
        color: newColor
      });
    }
    
    // Save to history
    const hist = window.RevealZoomitIshHistory;
    if (hist) hist.saveState(vars);
  }

  // Show a temporary indicator while the other window is editing
  function processTextInputStartMessages(vars, data) {
    const {revealRect, reveal} = core.getRevealRect(vars);
    const slidesRect = core.getSlidesRect(vars);
    const scale = core.getScale(vars, slidesRect);
    const canvasCoords = core.relSlidesToCanvas(data.relX, data.relY, slidesRect, revealRect, reveal);
    
    if (canvasCoords) {
      // Remove any existing remote text input indicator
      if (vars.remoteTextInput) {
        vars.remoteTextInput.remove();
        vars.remoteTextInput = null;
      }
      
      const indicator = document.createElement('div');
      indicator.className = 'zoomit-ish-remote-text-input';
      
      const baseFontSize = data.fontSize || conf.defaultFontSize;
      const displayFontSize = core.getDisplayFontSize(vars, baseFontSize, slidesRect, scale);
      const fontFamily = core.getFontFamily(vars);
      
      // DEBUG LOG
      conf.debug && console.log(`[${vars.windowType}] 📝 textInputStart - Creating indicator:`, {
        relative: { x: data.relX, y: data.relY },
        canvas: canvasCoords,
        scale: scale,
        zoomLevel: vars.zoomLevel,
        baseFontSize: baseFontSize,
        displayFontSize: displayFontSize,
        isZoomMode: vars.isZoomMode
      });

      indicator.style.cssText = textStyleFormatter(canvasCoords.x, canvasCoords.y, data.color || vars.color, displayFontSize, fontFamily, 2001);
      
      // Use existing text if provided, otherwise show placeholder
      indicator.innerText = data.existingText || '✏️ Editing...';
      
      // Append to .reveal instead of body
      const reveal = core.getRevealElem(vars);
      reveal.appendChild(indicator);
      vars.remoteTextInput = indicator;
      
      conf.debug && console.log(`[${vars.windowType}] 📝 textInputStart - Indicator created at canvas(${canvasCoords.x}, ${canvasCoords.y}) (zoom: ${vars.zoomLevel})`);
    }
  }

  // Update temporary text preview
  function processTextInputUpdateMessages(vars, data) {
    if (vars.remoteTextInput && data.text) {
      vars.remoteTextInput.innerText = data.text;
      const baseFontSize = data.fontSize || conf.defaultFontSize;
      const displayFontSize = core.getDisplayFontSize(vars, baseFontSize);
      
      // DEBUG LOG
      conf.debug && console.log(`[${vars.windowType}] 📝 textInputUpdate - Updating:`, {
        text: data.text,
        baseFontSize: baseFontSize,
        displayFontSize: displayFontSize,
        color: data.color
      });
      
      vars.remoteTextInput.style.fontSize = displayFontSize + 'px';
      vars.remoteTextInput.style.color = data.color || vars.color;
      
      // DEBUG LOG - actual position after update
      const rect = vars.remoteTextInput.getBoundingClientRect();
      conf.debug && console.log(`[${vars.windowType}] 📝 textInputUpdate - After update:`, {
        rect_left: rect.left,
        rect_top: rect.top,
        rect_width: rect.width,
        rect_height: rect.height
      });
    }
  }

  function processTextInputFontSizeChangeMessages(vars, data) {
    // Update temporary text input font size
    if (vars.remoteTextInput) {
      const baseFontSize = data.fontSize || conf.defaultFontSize;
      const displayFontSize = core.getDisplayFontSize(vars, baseFontSize);
      
      // DEBUG LOG
      conf.debug && console.log(`[${vars.windowType}] 📝 textInputFontSizeChange - Updating:`, {
        baseFontSize: baseFontSize,
        displayFontSize: displayFontSize
      });
      
      vars.remoteTextInput.dataset.baseFontSize = baseFontSize;
      vars.remoteTextInput.style.fontSize = displayFontSize + 'px';
      vars.remoteTextInput.innerText = data.text || vars.remoteTextInput.innerText;
      vars.remoteTextInput.style.color = data.color || vars.remoteTextInput.style.color;
      
      // DEBUG LOG - actual position after update
      const rect = vars.remoteTextInput.getBoundingClientRect();
      conf.debug && console.log(`[${vars.windowType}] 📝 textInputFontSizeChange - After update:`, {
        rect_left: rect.left,
        rect_top: rect.top,
        rect_width: rect.width,
        rect_height: rect.height
      });
    }
  }

  // Remove temporary indicator
  function processTextInputEndMessages(vars, data) {
    if (vars.remoteTextInput) {
      vars.remoteTextInput.remove();
      vars.remoteTextInput = null;
    }
  }

  // Remove specific text element by relative position
  function processRemoveTextMessages(vars, data) {
    const {revealRect, reveal} = core.getRevealRect(vars);
    const slidesRect = core.getSlidesRect(vars);
    const canvasCoords = core.relSlidesToCanvas(data.relX, data.relY, slidesRect, revealRect, reveal);
    
    if (canvasCoords) {
      // Find element at approximately this position (within 10px tolerance)
      const toRemove = vars.textElements.find(el => {
        const elX = parseFloat(el.style.left);
        const elY = parseFloat(el.style.top);
        return Math.abs(elX - canvasCoords.x) < 10 && Math.abs(elY - canvasCoords.y) < 10;
      });
      if (toRemove) {
        toRemove.remove();
        const idx = vars.textElements.indexOf(toRemove);
        if (idx > -1) vars.textElements.splice(idx, 1);
        conf.debug && console.log(`[${vars.windowType}] Removed text element at (${canvasCoords.x}, ${canvasCoords.y})`);
      } else {
        conf.debug && console.log(`[${vars.windowType}] No text element found at (${canvasCoords.x}, ${canvasCoords.y}) - may have been removed during edit start`);
      }
      
      // Save state if requested, even if element wasn't found (it may have been removed during edit start)
      if (data.shouldSaveState) {
        const hist = window.RevealZoomitIshHistory;
        if (hist) hist.saveState(vars);
        conf.debug && console.log(`[${vars.windowType}] 📄 removeText - Saved state after removal operation`);
      }
    }
  }
  
  function processCreateTextMessages(vars, data) {
    conf.debug && console.log(`[${vars.windowType}] 📄 createText - Received data:`, {
      relX: data.relX,
      relY: data.relY,
      text: data.text,
      fontSize: data.fontSize,
      color: data.color,
      textChanged: data.textChanged
    });
  
    createTextElement(vars, data.relX, data.relY, data.text, data.color, data.fontSize);
    
    // IMPORTANT: Save state after creating text element
    if (data.textChanged) {
      const hist = window.RevealZoomitIshHistory;
      if (hist) hist.saveState(vars);
      conf.debug && console.log(`[${vars.windowType}] 📄 createText - Saved state after text creation`);
    }
  }

  // Find text element at the given position and update its color
  function processTextColorChangeMessages(vars, data) {
    const {revealRect, reveal} = core.getRevealRect(vars);
    const slidesRect = core.getSlidesRect(vars);
    const canvasCoords = core.relSlidesToCanvas(data.relX, data.relY, slidesRect, revealRect, reveal);
    
    if (canvasCoords) {
      const targetEl = vars.textElements.find(el => {
        const elRelX = parseFloat(el.dataset.relX);
        const elRelY = parseFloat(el.dataset.relY);
        return Math.abs(elRelX - data.relX) < 0.001 && Math.abs(elRelY - data.relY) < 0.001;
      });
      
      if (targetEl) {
        targetEl.style.color = data.color;
        
        // Update stored position data
        const posData = vars.textElementsInitialPositions.get(targetEl);
        if (posData) {
          posData.color = data.color;
        }
        
        conf.debug && console.log(`[${vars.windowType}] 🎨 Text color changed to ${data.color}`);
        
        // Save state
        const hist = window.RevealZoomitIshHistory;
        if (hist) hist.saveState(vars);
      }
    }
  }

  function updateTextPositions(vars) {
    // Update text element positions (don't recreate them!)
    // Text elements already exist in the DOM - just update their positions based on new geometry
    core.updateRectCaches(vars);
    const slidesRect = core.getSlidesRect(vars);
    const {revealRect, reveal} = core.getRevealRect(vars);
    const scale = core.getScale(vars, slidesRect);
    
    vars.textElements.forEach(el => {
      // Get stored relative position
      const relX = parseFloat(el.dataset.relX);
      const relY = parseFloat(el.dataset.relY);
      const baseFontSize = parseFloat(el.dataset.baseFontSize);
      
      if (!isNaN(relX) && !isNaN(relY)) {
        // Recalculate canvas position based on new geometry
        const canvasCoords = core.relSlidesToCanvas(relX, relY, slidesRect, revealRect, reveal);
        if (canvasCoords) {
          el.style.left = canvasCoords.x + 'px';
          el.style.top = canvasCoords.y + 'px';
          
          // Update font size based on new scale
          const displayFontSize = core.getDisplayFontSize(vars, baseFontSize, slidesRect, scale);
          el.style.fontSize = displayFontSize + 'px';
          
          conf.debug && console.log(`[${vars.windowType}] Updated text element position:`, {
            rel: { x: relX.toFixed(3), y: relY.toFixed(3) },
            canvas: { x: canvasCoords.x.toFixed(1), y: canvasCoords.y.toFixed(1) },
            fontSize: displayFontSize.toFixed(1)
          });
        }
      }
    });
    
    conf.debug && console.log(`[${vars.windowType}] Updated ${vars.textElements.length} text element positions`);
  }

  function updateCurrentTextInputPosition(vars) {
    // Update currentTextInput position if it exists
    if (vars.currentTextInput) {
      const input = vars.currentTextInput;
      const relX = parseFloat(input.dataset.relX);
      const relY = parseFloat(input.dataset.relY);
      const baseFontSize = parseFloat(input.dataset.baseFontSize);
      
      if (!isNaN(relX) && !isNaN(relY)) {
        const canvasCoords = core.relSlidesToCanvas(relX, relY, slidesRect, revealRect, reveal);
        if (canvasCoords) {
          input.style.left = canvasCoords.x + 'px';
          input.style.top = canvasCoords.y + 'px';
          
          const displayFontSize = core.getDisplayFontSize(vars, baseFontSize);
          input.style.fontSize = displayFontSize + 'px';
          
          conf.debug && console.log(`[${vars.windowType}] Updated text input position during resize`);
        }
      }
    }
  }

  /** Restore text elements to match the given state */
  function restoreTextElements(vars, targetTexts) {
    conf.debug && console.log(`[${vars.windowType}] restoreTextElements called:`, {
      currentCount: vars.textElements.length,
      targetCount: targetTexts.length
    });

    // Create a map of target texts by position for easier matching
    const targetMap = new Map();
    targetTexts.forEach(t => {
      const key = `${t.relX.toFixed(6)}_${t.relY.toFixed(6)}`;
      targetMap.set(key, t);
    });
    
    // 0. Preparation
    core.updateRectCaches(vars);

    // 1. Update or remove existing elements
    const elementsToRemove = [];
    vars.textElements.forEach(el => {
      const relX = parseFloat(el.dataset.relX);
      const relY = parseFloat(el.dataset.relY);
      const key = `${relX.toFixed(6)}_${relY.toFixed(6)}`;
      
      const target = targetMap.get(key);
      if (target) {
        // Element exists in target - update if needed
        if (el.innerText !== target.text || 
            el.style.color !== target.color ||
            parseFloat(el.dataset.baseFontSize) !== target.fontSize) {
          
          el.innerText = target.text;
          el.style.color = target.color;
          el.dataset.baseFontSize = target.fontSize;
          
          // Update display font size
          const displayFontSize = core.getDisplayFontSize(vars, target.fontSize);
          el.style.fontSize = displayFontSize + 'px';
          
          conf.debug && console.log(`[${vars.windowType}] Updated existing text element at ${key}`);
        }
        targetMap.delete(key); // Mark as processed
      } else {
        // Element doesn't exist in target - mark for removal
        elementsToRemove.push(el);
      }
    });
    
    // Remove elements that don't exist in target
    elementsToRemove.forEach(el => {
      el.remove();
      const idx = vars.textElements.indexOf(el);
      if (idx > -1) vars.textElements.splice(idx, 1);
      vars.textElementsInitialPositions.delete(el);
      conf.debug && console.log(`[${vars.windowType}] Removed text element`);
    });
    
    // 2. Create new elements that don't exist yet
    targetMap.forEach(t => {
      createTextElement(vars, t.relX, t.relY, t.text, t.color, t.fontSize);
      conf.debug && console.log(`[${vars.windowType}] Created new text element at (${t.relX.toFixed(3)}, ${t.relY.toFixed(3)})`);
    });
    
    conf.debug && console.log(`[${vars.windowType}] Restored text elements: ${vars.textElements.length} total (removed: ${elementsToRemove.length}, added: ${targetMap.size})`);
  }


  return {
    enterTextMode,
    createTextInput,
    finalizeTextInput,
    createTextElement,
    clearAllTextElements,
    changeSelectedTextColor,
    deleteSelectedText,
    processTextInputStartMessages,
    processTextInputUpdateMessages,
    processTextInputFontSizeChangeMessages,
    processTextInputEndMessages,
    processRemoveTextMessages,
    processCreateTextMessages,
    processTextColorChangeMessages,
    updateTextPositions,
    updateCurrentTextInputPosition,
    restoreTextElements
};
})();