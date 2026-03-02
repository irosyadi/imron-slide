// zoomit-ish-keyaboard.js - Handling keyboard shortcuts, events and mouse events

window.RevealZoomitIshKeyboard = (function () {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  const cnvs = window.RevealZoomitIshCanvas;
  const draw = window.RevealZoomitIshDraw;
  const zoom = window.RevealZoomitIshZoom;
  const timer = window.RevealZoomitIshTimer;
  const text = window.RevealZoomitIshText;
  const hist = window.RevealZoomitIshHistory;

  const isMac = navigator.userAgent.toUpperCase().includes('MAC');
  const isLinux = navigator.userAgent.toUpperCase().includes('LINUX');

  function setupKeyboard(vars) {
    const mainKeyHandler = (e) => {
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      const noMods = !ctrlKey && !e.altKey && !e.metaKey;

      //conf.debug && console.log({key: e.key, shift:e.shiftKey, ctrl:e.ctrlKey, alt:e.altKey, meta:e.metaKey, code: e.code})
      
      if (vars.isEditingText) return;

      // https://developer.mozilla.org/ja/docs/Web/API/KeyboardEvent/code

      // Type Text Mode
      if (e.key === 't' && noMods && !e.shiftKey) {
        if (!vars.isDrawEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        text.enterTextMode(vars);
        return;
      }

      // Draw mode
      if (((e.key === 'd' || e.key === 'D') && noMods) || (e.altKey && e.code === 'Digit2' && !ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        cnvs.toggleDrawMode(vars, e);
        return;
      }
      
      // Zoom mode
      if (e.altKey && e.code === 'Digit1' && !ctrlKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        zoom.toggleZoom(vars, false);
        return;
      }

      // Zoom and Draw mode
      if (e.altKey && e.code === 'Digit4' && !ctrlKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        zoom.toggleZoom(vars, true);
        return;
      }
      
      // Timer mode
      if (e.altKey && e.code === 'Digit3' && !ctrlKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!vars.timerElement) {
          timer.startTimer(vars);
        } else {
          timer.stopTimer(vars);
        }
        return;
      }

      // Quit a mode
      if (e.key === 'Escape' && noMods && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        if (vars.timerElement) {
          timer.stopTimer(vars);
          return;
        } else if (vars.isZoomMode) {
          if (vars.isDrawEnabled) {
            zoom.toggleZoom(vars, true);
          } else {
            zoom.toggleZoom(vars, false);
          }
          return;
        } else if (vars.isDrawEnabled) {
          cnvs.toggleDrawMode(vars, e);
          return;
        }
      }
      
      // Debug mode
      if (e.altKey && e.shiftKey && (e.key === 'd' || e.key === 'D') && !ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        core.toggleDebugMode();
        return;
      }

      // ======================== In timer mode ========================
      if (vars.timerElement && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && noMods && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === 'ArrowUp' ? 1 : -1;
        timer.adjustTimer(vars, delta);
        return;
      }

      // ======================== In zoom mode ========================
      // Zoom in/out
      if (vars.isZoomMode && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && noMods && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === 'ArrowUp' ? conf.zoomSizeDelta : -conf.zoomSizeDelta;
        zoom.zoomInOut(vars, delta);
        return;
      }

      
      if (!vars.isDrawEnabled) return;

      // ======================== In draw mode ========================
      
      // Line width adjustment with Ctrl + Arrow keys
      if (ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === 'ArrowUp' ? 1 : -1;
        draw.adjustLineWidth(vars, delta);
        return;
      }

      // Undo
      if (ctrlKey && e.key === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        hist.performUndo(vars);
        return;
      }

      // Redo
      if (ctrlKey && e.key === 'y' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        hist.performRedo(vars);
        return;
      }

      // Delete selected textbox
      if ((e.key === 'Delete') && noMods && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        // If text element is selected, change its color instead
        if (vars.selectedTextElement) {
          text.deleteSelectedText(vars);
        }
        return;
      }

      // Red pen/highlighter/font
      if ((e.key === 'r' || e.key === 'R') && noMods) {
        e.preventDefault();
        e.stopPropagation();
        // If text element is selected, change its color instead
        if (vars.selectedTextElement) {
          text.changeSelectedTextColor(vars, 'red');
        } else {
          draw.setColor(vars, 'red', e.shiftKey);
        }
        return;
      }

      // Green pen/highlighter/font
      if ((e.key === 'g' || e.key === 'G') && noMods) {
        e.preventDefault();
        e.stopPropagation();
        if (vars.selectedTextElement) {
          text.changeSelectedTextColor(vars, 'green');
        } else {
          draw.setColor(vars, 'green', e.shiftKey);
        }
        return;
      }

      // Blue pen/highlighter/font
      if ((e.key === 'b' || e.key === 'B') && noMods) {
        e.preventDefault();
        e.stopPropagation();
        if (vars.selectedTextElement) {
          text.changeSelectedTextColor(vars, 'blue');
        } else {
          draw.setColor(vars, 'blue', e.shiftKey);
        }
        return;
      }

      // Yellow pen/highlighter/font
      if ((e.key === 'y' || e.key === 'Y') && noMods) {
        e.preventDefault();
        e.stopPropagation();
        if (vars.selectedTextElement) {
          text.changeSelectedTextColor(vars, 'yellow');
        } else {
          draw.setColor(vars, 'yellow', e.shiftKey);
        }
        return;
      }

      // Orange pen/highlighter/font
      if ((e.key === 'o' || e.key === 'O') && noMods) {
        e.preventDefault();
        e.stopPropagation();
        if (vars.selectedTextElement) {
          text.changeSelectedTextColor(vars, 'orange');
        } else {
          draw.setColor(vars, 'orange', e.shiftKey);
        }
        return;
      }

      // Pink pen/highlighter/font
      if ((e.key === 'p' || e.key === 'P') && noMods) {
        e.preventDefault();
        e.stopPropagation();
        if (vars.selectedTextElement) {
          text.changeSelectedTextColor(vars, 'pink');
        } else {
          draw.setColor(vars, 'pink', e.shiftKey);
        }
        return;
      }

      // Blackboard
      if ((e.key === 'k' || e.key === 'K') && noMods && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const mode = vars.backgroundMode === 'black' ? 'transparent' : 'black';
        cnvs.setBackground(vars, mode);
        core.broadcast(vars, 'background', { mode });
        return;
      }

      // Whiteboard
      if ((e.key === 'w' || e.key === 'W') && noMods && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const mode = vars.backgroundMode === 'white' ? 'transparent' : 'white';
        cnvs.setBackground(vars, mode);
        core.broadcast(vars, 'background', { mode });
        return;
      }

      // Eraser
      if (e.key === 'E' && e.shiftKey && noMods) {
        e.preventDefault();
        e.stopPropagation();
        draw.setEraseMode(vars);
        return;
      }
      
      // Clear canvas
      if (e.key === 'C' && e.shiftKey && noMods) {
        e.preventDefault();
        e.stopPropagation();
        cnvs.performClear(vars);
        return;
      }

      // Disable pdf export mode
      if (e.key === 'e' && !e.shiftKey && noMods) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Disable prev and next slide shortcuts
      if (['l', 'n', 'j', 'h'].includes(e.key) && !e.shiftKey && noMods) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
    };
    
    // Attach to both window and document with capture phase
    window.addEventListener('keydown', mainKeyHandler, true);
    // document.addEventListener('keydown', mainKeyHandler, true);
    
    // For NOTES window (iframe), also attach to parent window if available
    if (vars.windowType === 'NOTES' && window.parent && window.parent !== window) {
      try {
        window.parent.addEventListener('keydown', mainKeyHandler, true);
        conf.debug && console.log(`[${vars.windowType}] Attached keyboard listener to parent window`);
      } catch (e) {
        conf.debug && console.log(`[${vars.windowType}] Could not attach to parent window (cross-origin):`, e.message);
      }
    }
    
    // Change shape mode
    document.addEventListener('keydown', (e) => {
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (!vars.isDrawEnabled || vars.isDrawing || vars.drawMode === 'erase') return;
      if (!e.altKey && e.shiftKey && ctrlKey) vars.shapeMode = 'arrow';
      else if (!e.altKey && ctrlKey && !e.shiftKey) vars.shapeMode = 'rect';
      else if (!ctrlKey && !e.altKey && e.shiftKey && !['R', 'G', 'B', 'Y', 'O', 'P', 'E'].includes(e.key.toUpperCase())) vars.shapeMode = 'line';
      else if (e.shiftKey && ((!ctrlKey && e.altKey && !isLinux) || (ctrlKey && e.altKey && isLinux))) vars.shapeMode = 'ellipse';
      else vars.shapeMode = null;
    });
    
    // Reset shape mode
    document.addEventListener('keyup', (e) => {
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlKey || e.shiftKey || e.altKey) {
        // Only clear shape mode if NOT currently drawing
        if (!vars.isDrawing) {
          vars.shapeMode = null;
        }
      }
    });

  }

  // Pointer events (e.g., mouse)
  function setupPointer(vars) {
    vars.canvas.addEventListener('pointerdown', (e) => {
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      conf.debug && console.log(`[${vars.windowType}] 🖱️ pointerdown:`, {
        isZoomMode: vars.isZoomMode,
        ctrlKey: ctrlKey,
        altKey: e.altKey,
        isDrawEnabled: vars.isDrawEnabled,
        isEditingText: vars.isEditingText
      });
      
      // Continue drawing if the mouse pointer moves out to the window
      vars.canvas.setPointerCapture(e.pointerId);

      // Pan in zoom mode (regardless of draw mode)
      if (vars.isZoomMode && (((e.altKey && !isLinux && !ctrlKey) || (ctrlKey && e.altKey && isLinux)) || (!vars.isDrawEnabled && !ctrlKey)) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        zoom.enterPanningMode(vars, e);
        return;
      }
      
      if (!vars.isDrawEnabled || vars.isEditingText) return;

      core.setFocus();

      // Enter draw mode
      e.preventDefault();
      e.stopPropagation();
      draw.startDrawing(vars, e, ctrlKey);      
    });

    vars.canvas.addEventListener('pointermove', (e) => {
      // Pan in zoom mode (regardless of draw mode) - check first
      if (vars.isZoomMode && vars.isPanning) {
        zoom.performPanning(vars, e);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Change pointer cursor shape
      if (vars.isZoomMode && !vars.isDrawEnabled) {
        vars.canvas.style.cursor = 'zoom-in';
      } else if (vars.isEditingText) {
        vars.canvas.style.cursor = 'text';
      } else {
        vars.canvas.style.cursor = 'crosshair';
      }
      
      if (!vars.isDrawEnabled) return;
      if (!vars.isDrawing) return;

      // Start/Continue drawing
      draw.performDrawing(vars, e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
    });

    vars.canvas.addEventListener('pointerup', (e) => {
      // Finish panning
      if (vars.isZoomMode && vars.isPanning) {
        e.preventDefault();
        e.stopPropagation();
        zoom.exitPanningMode(vars);
        return;
      }

      if (!vars.isDrawEnabled) return;
      if (!vars.isDrawing) return;

      // Finish drawing
      draw.finalizeDrawing(vars, e.clientX, e.clientY);
      
      vars.canvas.releasePointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });

    vars.canvas.addEventListener('pointerleave', () => {
      if (vars.isPanning) {
        vars.isPanning = false;
        vars.canvas.style.cursor = 'crosshair';
      }

      // Reset the temp canvas when the pointer is outside it
      if (vars.isDrawing) {
        if (vars.shapeMode || vars.isHighlighter) {
          vars.tempCtx.clearRect(0, 0, vars.tempCanvas.width, vars.tempCanvas.height);
        }
        vars.isDrawing = false;
        vars.currentPath = [];
      }
    });

    document.addEventListener('click', (e) => {
      // Ensure the current iframe in the speaker view has focus.
      // Otherwise, it may lose focus and event listeners may not work properly.
      core.setFocus();

      // Prevent original zoom feature
      // ToDo: Care for linux (Ctrl+Click)
      if (vars.isZoomMode && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
      }

      // finish inputting text
      if (vars.currentTextInput && e.target !== vars.currentTextInput && !vars.currentTextInput.contains(e.target)) {
        text.finalizeTextInput(vars);
        vars.canvas.style.cursor = 'crosshair';
      }
    });

    document.addEventListener('wheel', (e) => {
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Line width adjustment with Ctrl + Wheel
      if (ctrlKey && vars.isDrawEnabled && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 1 : -1;
        draw.adjustLineWidth(vars, delta);
        return;
      }
      
      // prevent web browser's zoom
      if (ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // zoom
      if (vars.isZoomMode && !e.shiftKey && !ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? conf.zoomSizeDelta : -conf.zoomSizeDelta;
        if (delta > 0 ) {
          vars.canvas.style.cursor = 'zoom-in';
        } else {
          vars.canvas.style.cursor = 'zoom-out';
        }
        zoom.zoomInOut(vars, delta);
      }
    }, { passive: false });
  }

  return {
    setupKeyboard,
    setupPointer
  };

})();