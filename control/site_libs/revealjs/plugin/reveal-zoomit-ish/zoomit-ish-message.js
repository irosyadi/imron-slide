// zoomit-ish-message.js - Handling messages between NOTES and MAIN

window.RevealZoomitIshMessage = (function () {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  const cnvs = window.RevealZoomitIshCanvas;
  const draw = window.RevealZoomitIshDraw;
  const zoom = window.RevealZoomitIshZoom;
  const timer = window.RevealZoomitIshTimer;
  const text = window.RevealZoomitIshText;
  const hist = window.RevealZoomitIshHistory;

  /** Message receive handler */
  function handleMessage(vars, event) {
    let data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return; }
    }
    
    if (data && data.namespace === 'reveal-notes') {
      if (event.source && event.source !== window) {
        vars.notesWindow = event.source;
        // conf.debug && console.log(`[${vars.windowType}] ✅ Notes captured`);
      }
    }
    
    if (data && data.namespace === 'reveal-zoomit-ish') {
      conf.debug && console.log(`[${vars.windowType}] 📥 Received ${data.action} from ${data.from}`);
      
      switch(data.action) {
        case 'keepalive': {
          core.updateNotesIframeWindow(vars, event);
          break;
        }
        case 'freehandDraw': {
          draw.processFreehandMessages(vars, data);
          break;
        }
        case 'shape': {
          draw.processShapeMessages(vars, data);
          break;
        }

        case 'erase': {
          draw.processEraseMessages(vars, data);
          break;
        }

        case 'shapePreview': {
          draw.processShapeMessages(vars, data, true);
          break;
        }

        case 'freehandPreview': {
          draw.processFreehandPreviewMessages(vars, data);
          break;
        }

        case 'strokeEnd':
          draw.processStrokeEndMessages(vars, data);
          break;

        case 'historySaved':
          if (data.historyStep !== undefined) {
            conf.debug && console.log(`[${vars.windowType}] Other window saved history: step ${data.historyStep}`);
          }
          break;

        case 'undo':
          hist.processUndoMessages(vars, data);
          break;

        case 'redo':
          hist.processRedoMessages(vars, data);
          break;

        case 'clear':
          cnvs.performClear(vars, true);
          conf.debug && console.log(`[${vars.windowType}] Canvas cleared from broadcast`);
          break;

        case 'background':
          cnvs.setBackground(vars, data.mode);
          conf.debug && console.log(`[${vars.windowType}] Background set to: ${data.mode}`);
          break;

        case 'setColor':
          draw.updateColor(vars, data.colorName, data.isHighlighter);
          conf.debug && console.log(`[${vars.windowType}] Color set:`, {
            colorName: data.colorName,
            isHighlighter: data.isHighlighter
          });
          break;

        case 'lineWidthChanged':
          draw.processLineWidthChangedMessages(vars, data);
          conf.debug && console.log(`[${vars.windowType}] ${data.isHighlighter ? 'Highlighter' : 'Line'} width changed to level ${data.level}: ${data.baseLineWidth}px`);
          break;

        case 'setMode':
          vars.drawMode = data.mode;
          conf.debug && console.log(`[${vars.windowType}] Draw mode set to: ${data.mode}`);
          break;

        case 'toggleDraw':
          cnvs.processToggleDrawMessages(vars, data);
          break;

        case 'textInputStart': {
          text.processTextInputStartMessages(vars, data);
          break;
        }
        
        case 'textInputUpdate': {
          text.processTextInputUpdateMessages(vars, data);
          break;
        }

        case 'textInputFontSizeChange': {
          text.processTextInputFontSizeChangeMessages(vars, data);
          break;
        }
        
        case 'textInputEnd': {
          text.processTextInputEndMessages(vars, data);
          break;
        }
        
        case 'removeText': {
          text.processRemoveTextMessages(vars, data);
          break;
        }
        
        case 'createText': {
          text.processCreateTextMessages(vars, data);
          break;
        }

        case 'textColorChange': {
          text.processTextColorChangeMessages(vars, data);
          break;
        }

        case 'zoom': {
          zoom.processZoomMessages(vars, data);
          break;
        }

        case 'timerStart': {
          if (!vars.timerElement) {
            // Start timer in display-only mode (no countdown)
            timer.startTimer(vars, false);
          }
          break;
        }

        case 'timerStop': {
          if (vars.timerElement) {
            timer.stopTimer(vars);
          }
          break;
        }

        case 'timerUpdate': {
          if (vars.timerElement) {
            timer.updateTimer(vars, data.seconds);
          }
          break;
        }

        case 'debug': {
          core.toggleDebugMode(true);
          break;
        }
      }
    }
  }

  return {
    handleMessage
  };

})();