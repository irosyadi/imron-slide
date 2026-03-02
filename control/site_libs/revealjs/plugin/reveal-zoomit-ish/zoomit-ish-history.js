// zoomitish-history.js - History management

window.RevealZoomitIshHistory = (function() {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  const text = window.RevealZoomitIshText;
  const cnvs = window.RevealZoomitIshCanvas;
  
  /** Save current state to history */
  function saveState(vars) {
    const { canvas, textElements } = vars;
    
    conf.debug && console.log(`[${vars.windowType}] ⭐ saveState called:`, {
      currentStep: vars.historyStep,
      historyLength: vars.history.length,
      textElementsCount: textElements.length
    });
    
    const dataURL = canvas.toDataURL();
    
    const texts = textElements.map(el => {
      const elRelX = parseFloat(el.dataset.relX);
      const elRelY = parseFloat(el.dataset.relY);
      const baseFontSize = parseFloat(el.dataset.baseFontSize || el.style.fontSize);
      
      return {
        relX: elRelX || 0,
        relY: elRelY || 0,
        text: el.innerText,
        color: el.style.color,
        fontSize: baseFontSize
      };
    });
    
    vars.historyStep++;
    if (vars.historyStep < vars.history.length) {
      vars.history.length = vars.historyStep;
    }
    
    // Save slidesGeometry for proper restore
    vars.history.push({ 
      dataURL, 
      texts,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      slidesGeometry: {
        offsetX: vars.slidesGeometry.offsetX,
        offsetY: vars.slidesGeometry.offsetY,
        width: vars.slidesGeometry.width,
        height: vars.slidesGeometry.height
      }
    });
    
    if (conf.MAX_HISTORY_STATES > 0 && vars.history.length > conf.MAX_HISTORY_STATES) {
      vars.history.shift();
      vars.historyStep--;
    }
    
    conf.debug && console.log(`[${vars.windowType}] ⭐ Saved:`, {
      newStep: vars.historyStep,
      newHistoryLength: vars.history.length,
      textsInState: texts.length,
      textContents: texts.map(t => t.text)
    });
    
    core.broadcast(vars, 'historySaved', { 
      historyStep: vars.historyStep,
      historyLength: vars.history.length
    });
  }

  /** Undo */
  function performUndo(vars) {
    conf.debug && console.log(`[${vars.windowType}] 🔙 performUndo called:`, {
      currentStep: vars.historyStep,
      historyLength: vars.history.length,
      canUndo: vars.historyStep > 0
    });
    
    if (vars.historyStep > 0) {
      // Close any active text input without saving
      if (vars.currentTextInput) {
        vars.currentTextInput.remove();
        vars.currentTextInput = null;
        vars.isEditingText = false;
      }
      
      vars.historyStep--;
      const state = vars.history[vars.historyStep];
      if (state) {
        conf.debug && console.log(`[${vars.windowType}] 🔙 Restoring state:`, {
          step: vars.historyStep,
          textsInState: state.texts?.length || 0,
          textContents: state.texts?.map(t => t.text) || []
        });
        
        cnvs.restoreState(vars, state.dataURL, state.slidesGeometry);
        text.restoreTextElements(vars, state.texts || []);
        
        conf.debug && console.log(`[${vars.windowType}] 🔙 Broadcasting undo notification to other window`);
        core.broadcast(vars, 'undo', { 
          historyStep: vars.historyStep
        });
        conf.debug && console.log(`[${vars.windowType}] 🔙 Undo completed: ${vars.historyStep}/${vars.history.length - 1}`);
      }
    } else {
      conf.debug && console.log(`[${vars.windowType}] 🔙 Cannot undo: already at step 0`);
    }
  }

  /** Redo */
  function performRedo(vars) {
    conf.debug && console.log(`[${vars.windowType}] 🔜 performRedo called:`, {
      currentStep: vars.historyStep,
      historyLength: vars.history.length,
      canRedo: vars.historyStep < vars.history.length - 1
    });
    
    if (vars.historyStep < vars.history.length - 1) {
      // Close any active text input without saving
      if (vars.currentTextInput) {
        vars.currentTextInput.remove();
        vars.currentTextInput = null;
        vars.isEditingText = false;
      }
      
      vars.historyStep++;
      const state = vars.history[vars.historyStep];
      if (state) {
        conf.debug && console.log(`[${vars.windowType}] 🔜 Restoring state:`, {
          step: vars.historyStep,
          textsInState: state.texts?.length || 0,
          textContents: state.texts?.map(t => t.text) || []
        });
        
        cnvs.restoreState(vars, state.dataURL, state.slidesGeometry);
        text.restoreTextElements(vars, state.texts || []);
        
        conf.debug && console.log(`[${vars.windowType}] 🔜 Broadcasting redo notification to other window`);
        core.broadcast(vars, 'redo', { 
          historyStep: vars.historyStep
        });
        conf.debug && console.log(`[${vars.windowType}] 🔜 Redo completed: ${vars.historyStep}/${vars.history.length - 1}`);
      }
    } else {
      conf.debug && console.log(`[${vars.windowType}] 🔜 Cannot redo: already at latest state`);
    }
  }

  function processUndoMessages(vars, data) {
    // Sender notifies us to undo - we use OUR OWN history
    // Close any active text input without saving
    if (vars.currentTextInput) {
      vars.currentTextInput.remove();
      vars.currentTextInput = null;
      vars.isEditingText = false;
    }
    
    if (data.historyStep !== undefined) {
      vars.historyStep = data.historyStep;
      
      // Restore from OUR OWN history (not from received data)
      if (vars.historyStep >= 0 && vars.historyStep < vars.history.length) {
        const state = vars.history[vars.historyStep];
        if (state) {
          cnvs.restoreState(vars, state.dataURL, state.slidesGeometry);
          text.restoreTextElements(vars, state.texts || []);
          
          conf.debug && console.log(`[${vars.windowType}] Undo applied from OWN history: step=${vars.historyStep}/${vars.history.length - 1}`);
        }
      }
    }
  }

  function processRedoMessages(vars, data) {
    // Sender notifies us to redo - we use OUR OWN history
    // Close any active text input without saving
    if (vars.currentTextInput) {
      vars.currentTextInput.remove();
      vars.currentTextInput = null;
      vars.isEditingText = false;
    }
    
    if (data.historyStep !== undefined) {
      vars.historyStep = data.historyStep;
      
      // Restore from OUR OWN history (not from received data)
      if (vars.historyStep < vars.history.length) {
        const state = vars.history[vars.historyStep];
        if (state) {
          cnvs.restoreState(vars, state.dataURL, state.slidesGeometry);
          text.restoreTextElements(vars, state.texts || []);
          
          conf.debug && console.log(`[${vars.windowType}] Redo applied from OWN history: step=${vars.historyStep}/${vars.history.length - 1}`);
        }
      }
    }
  }

  return {
    saveState,
    performUndo,
    performRedo,
    processUndoMessages,
    processRedoMessages
  };
})();