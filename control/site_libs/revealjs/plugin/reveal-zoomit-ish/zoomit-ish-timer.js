// zoomit-ish-timer.js - Handling timer

window.RevealZoomitIshTimer = (function() {
  const conf = window.RevealZoomitIshConfig;
  const core = window.RevealZoomitIshCore;

  function startTimer(vars, enableCountdown = true) {
    if (vars.timerElement) return; // Already running
    
    // Create timer overlay
    const timerOverlay = document.createElement('div');
    timerOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: ${conf.TIMER_ZINDEX};
      cursor: pointer;
    `;

    const displayFontSize = core.getDisplayFontSize(vars, conf.timerBaseFontSize);
    const fontFamily = core.getFontFamily(vars, true);
    
    const timerDisplay = document.createElement('div');
    timerDisplay.style.cssText = `
      font-size: ${displayFontSize}px;
      font-family: '${fontFamily}', 'Arial', monospace;
      font-weight: bold;
      color: #0066cc;
      user-select: none;
    `;
    
    timerOverlay.appendChild(timerDisplay);
    const reveal = core.getRevealElem(vars);
    reveal.appendChild(timerOverlay);
    
    vars.timerElement = timerOverlay;
    vars.timerRunning = true;
    vars.timerPaused = false;
    
    // Update display
    const updateDisplay = () => {
      const mins = Math.floor(Math.abs(vars.timerSeconds) / 60);
      const secs = Math.abs(vars.timerSeconds) % 60;
      const sign = vars.timerSeconds < 0 ? '-' : '';
      timerDisplay.textContent = `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      timerDisplay.style.color = vars.timerSeconds < 0 ? '#cc0000' : '#0066cc';
    };
    
    updateDisplay();
    
    // Click to pause/resume
    timerOverlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (vars.timerPaused) {
        // Resume
        vars.timerPaused = false;
        if (enableCountdown) {
          vars.timerInterval = setInterval(() => {
            vars.timerSeconds--;
            updateDisplay();
            core.broadcast(vars, 'timerUpdate', { seconds: vars.timerSeconds });
          }, 1000);
        }
        conf.debug && console.log(`[${vars.windowType}] Timer resumed`);
      } else {
        // Pause
        vars.timerPaused = true;
        if (vars.timerInterval) {
          clearInterval(vars.timerInterval);
          vars.timerInterval = null;
        }
        conf.debug && console.log(`[${vars.windowType}] Timer paused`);
      }
    });
    
    // Start countdown only if enabled
    if (enableCountdown) {
      vars.timerInterval = setInterval(() => {
        vars.timerSeconds--;
        updateDisplay();
        core.broadcast(vars, 'timerUpdate', { seconds: vars.timerSeconds });
      }, 1000);
      
      conf.debug && console.log(`[${vars.windowType}] Timer started with countdown enabled (${vars.timerSeconds} seconds)`);
      core.broadcast(vars, 'timerStart', { seconds: vars.timerSeconds });
    } else {
      conf.debug && console.log(`[${vars.windowType}] Timer started in display-only mode (${vars.timerSeconds} seconds)`);
    }
  }

  /** Stop timer */
  function stopTimer(vars) {
    if (!vars.timerElement) return;
    
    if (vars.timerInterval) {
      clearInterval(vars.timerInterval);
      vars.timerInterval = null;
    }
    
    vars.timerElement.remove();
    vars.timerElement = null;
    vars.timerRunning = false;
    vars.timerPaused = false;
    vars.timerSeconds = conf.timerDefaultSeconds; // Reset to default
    
    conf.debug && console.log(`[${vars.windowType}] Timer stopped`);
    core.broadcast(vars, 'timerStop', {});
  }

  /** Adjust timer */
  function adjustTimer(vars, delta) {
    if (!vars.timerElement) return;
    
    vars.timerSeconds += delta * conf.timerDeltaBase; // delta in minutes
    
    const mins = Math.floor(Math.abs(vars.timerSeconds) / 60);
    const secs = Math.abs(vars.timerSeconds) % 60;
    const sign = vars.timerSeconds < 0 ? '-' : '';
    const timerDisplay = vars.timerElement.querySelector('div');
    timerDisplay.textContent = `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerDisplay.style.color = vars.timerSeconds < 0 ? '#cc0000' : '#0066cc';
    
    conf.debug && console.log(`[${vars.windowType}] Timer adjusted: ${vars.timerSeconds} seconds`);
    core.broadcast(vars, 'timerUpdate', { seconds: vars.timerSeconds });
  }

  function updateTimer(vars, seconds) {
    vars.timerSeconds = seconds;
    const mins = Math.floor(Math.abs(vars.timerSeconds) / 60);
    const secs = Math.abs(vars.timerSeconds) % 60;
    const sign = vars.timerSeconds < 0 ? '-' : '';
    const timerDisplay = vars.timerElement.querySelector('div');
    if (timerDisplay) {
      timerDisplay.textContent = `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      timerDisplay.style.color = vars.timerSeconds < 0 ? '#cc0000' : '#0066cc';
    }
  }

  return {
    startTimer,
    stopTimer,
    adjustTimer,
    updateTimer
  };
})();