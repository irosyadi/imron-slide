// zoomit-ish.js - Main event handlers and init function

window.RevealZoomitIsh = (function() {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;
  const cnvs = window.RevealZoomitIshCanvas;
  const hist = window.RevealZoomitIshHistory;
  const mesg = window.RevealZoomitIshMessage;
  const kbd  = window.RevealZoomitIshKeyboard;
  
  /** Initialize */
  function init(Reveal) {
    const vars = core.getVars();
    vars.deck = Reveal;

    // Load this plugin normally in the main window.
    // In the speaker view, load it only in the current-slide iframe
    // and skip the upcoming-slide iframe to avoid unnecessary issues.
    if (vars.windowType === 'NOTES' && !core.isCurrSlideIframe(vars)) {
      return;
    }

    // Get base slide width from Reveal config (default is 960)
    const config = Reveal.getConfig();
    vars.baseSlideWidth = config.width || 960;
    
    // cache reveal, slides elements, slidesRect and revealRect
    core.updateRectCaches(vars);
    
    conf.debug && console.log(`[${vars.windowType}] zoomit-ish init - baseSlideWidth: ${vars.baseSlideWidth}px`);

    // Initialize message handler
    window.addEventListener('message', (e) => {mesg.handleMessage(vars, e)});
    core.setKeepAlive(vars);

    // register pointermove handler to record mouse pointer location
    // for zooming, panning, and inserting text boxes
    document.addEventListener('pointermove', (e) => {
      vars.pointerX = e.clientX;
      vars.pointerY = e.clientY;
    });

    // Initialize canvas
    const canvas = cnvs.createCanvas(vars, conf.MAIN_CANVAS_ZINDEX, 'zoomit-ish-canvas');
    vars.canvas = canvas;
    vars.ctx = canvas.getContext('2d');
    // vars.canvas.style.backgroundColor = "#ff000040"; // for debug

    cnvs.resizeCanvas(vars);
    window.addEventListener('resize', () => { cnvs.debouncedResize(vars) });

    const temp = cnvs.createCanvas(vars, conf.TEMP_CANVAS_ZINDEX);
    vars.tempCanvas = temp;
    // vars.tempCanvas.style.backgroundColor = "#0000ff40"; // for debug
    vars.tempCtx = temp.getContext('2d');

    // Initial size will be set by resizeCanvas(), but set a default first
    cnvs.changeCanvasInitialSize(temp);

    if (vars.history.length === 0) {
      hist.saveState(vars);
    }
    
    // Setup pointer device events and keyboard events
    kbd.setupPointer(vars);
    kbd.setupKeyboard(vars);

    // Ignore slidechanged events
    vars.lastIndices = Reveal.getIndices();
    Reveal.on('slidechanged', (event) => {
      // NOTES window: ignore all slidechanged events (they're unreliable in iframe)
      // Only respond to clear commands from MAIN
      if (vars.windowType === 'NOTES') {
        conf.debug && console.log(`[${vars.windowType}] Slide event ignored (NOTES window always ignores slidechanged)`);
        return;
      }
      
      // MAIN window: ignore during resize
      if (vars.isResizing) {
        conf.debug && console.log(`[${vars.windowType}] Slide event ignored (window resizing)`);
        return;
      }
      
      const indices = Reveal.getIndices();
      
      // Check if this is a real slide change by comparing indices
      if (!vars.lastIndices || 
          vars.lastIndices.h !== indices.h || 
          vars.lastIndices.v !== indices.v || 
          vars.lastIndices.f !== indices.f) {
        vars.lastIndices = indices;
        cnvs.performClear(vars);
        conf.debug && console.log(`[${vars.windowType}] Slide changed to ${indices.h}/${indices.v}, cleared canvas`);
      } else {
        conf.debug && console.log(`[${vars.windowType}] Slide event fired but indices didn't change, ignoring`);
      }
    });

    // Ensure the iframe for the current slide in the speaker view has focus.
    // Otherwise, it may lose focus and event listeners may not work properly.
    core.setFocusOnNotesIframe(vars);

    conf.debug && console.log(`[${vars.windowType}] Ready`);
  }
  
  return {
    id: 'RevealZoomitIsh',
    init: init
  };
})();