/* FIR Filter Visualization Simulation
   Interactive demonstration of convolution and frequency response
   Dependencies: jQuery 3.x, HTML5 Canvas API
*/

// ===== Configuration =====
const CONFIG = {
    numTaps: 16,              // Number of filter coefficients
    bufferSize: 400,          // Signal history buffer size
    canvasWidth: 760,
    canvasHeight: 140,
    coeffCanvasHeight: 150,
    freqCanvasHeight: 160,
    signalFreq: 0.08,         // Main signal frequency (normalized)
    noiseFreq: 0.5,           // High-frequency noise to filter
    noiseAmp: 0.35,           // Noise amplitude
    animationSpeed: 1,        // Samples per frame
    maxCoeffValue: 0.5        // Maximum coefficient magnitude
};

// ===== State Management =====
const STATE = {
    coefficients: new Array(CONFIG.numTaps).fill(0),
    inputBuffer: new Array(CONFIG.bufferSize).fill(0),
    outputBuffer: new Array(CONFIG.bufferSize).fill(0),
    isPlaying: true,
    showConvolution: true,
    currentPreset: 'movingAvg',
    t: 0,                     // Time counter for signal generation
    convolutionIndex: 0,      // Current position in convolution animation
    animationFrameId: null,
    freqScaleDB: true,        // false = Linear scale, true = dB scale (default: dB)
    signalType: 'sineNoise'   // Signal type: 'sineNoise', 'multiTone', 'chirp', 'squareWave', 'whiteNoise'
};

// ===== Classes =====

/**
 * Signal Generator - Creates test signals with optional noise
 */
class SignalGenerator {
    constructor() {
        this.t = 0;
        this.phase = 0;
    }

    /**
     * Generate next sample based on selected signal type
     * @returns {number} Sample value
     */
    getNextSample() {
        this.t += 1;
        
        switch (STATE.signalType) {
            case 'sineNoise':
                return this._sineWithNoise();
            case 'multiTone':
                return this._multiTone();
            case 'chirp':
                return this._chirp();
            case 'squareWave':
                return this._squareWave();
            case 'whiteNoise':
                return this._whiteNoise();
            case 'squareMultiTone':
                return this._squareMultiTone();
            default:
                return this._sineWithNoise();
        }
    }
    
    /**
     * Sine wave + high-frequency noise (good for LP/HP demonstration)
     */
    _sineWithNoise() {
        const signal = Math.sin(this.t * CONFIG.signalFreq);
        const noise = Math.sin(this.t * CONFIG.noiseFreq) * CONFIG.noiseAmp;
        const noise2 = Math.sin(this.t * CONFIG.noiseFreq * 1.7) * CONFIG.noiseAmp * 0.5;
        return signal + noise + noise2;
    }
    
    /**
     * Multi-tone: Low + Mid + High frequency components (great for BP demonstration)
     * Low freq passes through LP, Mid freq passes through BP, High freq passes through HP
     */
    _multiTone() {
        const lowFreq = 0.03;   // Low frequency component
        const midFreq = 0.15;   // Mid frequency component (matches default cutoff)
        const highFreq = 0.4;   // High frequency component
        
        const low = 0.5 * Math.sin(this.t * lowFreq);
        const mid = 0.7 * Math.sin(this.t * midFreq);
        const high = 0.4 * Math.sin(this.t * highFreq);
        
        return low + mid + high;
    }
    
    /**
     * Chirp: Frequency sweeps from low to high (shows filter response across frequency)
     */
    _chirp() {
        const period = 800;  // Samples per sweep cycle
        const cyclePos = (this.t % period) / period;  // 0 to 1
        const freqStart = 0.02;
        const freqEnd = 0.45;
        const freq = freqStart + (freqEnd - freqStart) * cyclePos;
        this.phase += freq;
        return Math.sin(this.phase);
    }
    
    /**
     * Square wave: Rich in odd harmonics (good for seeing harmonic filtering)
     */
    _squareWave() {
        const baseFreq = 0.05;
        // Build square wave from harmonics (Fourier series)
        let sum = 0;
        for (let k = 1; k <= 15; k += 2) {  // Odd harmonics only
            sum += Math.sin(this.t * baseFreq * k) / k;
        }
        return sum * (4 / Math.PI) * 0.7;  // Normalize
    }
    
    /**
     * White noise: Random signal (shows overall filter frequency response)
     */
    _whiteNoise() {
        return (Math.random() - 0.5) * 2;
    }
    
    /**
     * Square + Multi-tone: Square wave combined with multiple sine tones
     * Great for seeing filter effects on both harmonics and distinct frequencies
     */
    _squareMultiTone() {
        const squareFreq = 0.08;    // More visible square wave frequency
        const midTone = 0.20;       // Mid frequency sine
        const highTone = 0.40;      // High frequency sine
        
        // Square wave (using sign of sine) - larger amplitude for visibility
        const square = Math.sign(Math.sin(this.t * squareFreq)) * 0.5;
        
        // Multi-tone components - reduced to make square wave more obvious
        const mid = 0.25 * Math.sin(this.t * midTone);
        const high = 0.2 * Math.sin(this.t * highTone);
        
        return square + mid + high;
    }

    reset() {
        this.t = 0;
        this.phase = 0;
    }
}

/**
 * FIR Filter Engine - Implements convolution and frequency response calculation
 * FIXED: Uses Frequency Transformations for perfectly symmetric BandPass/BandStop
 */
class FilterEngine {
    constructor() {
        this.setMovingAverage();
    }

    /**
     * Set coefficients to Moving Average filter
     * h[k] = 1/N for all k
     */
    setMovingAverage() {
        const val = 1 / CONFIG.numTaps;
        STATE.coefficients = new Array(CONFIG.numTaps).fill(val);
        STATE.currentPreset = 'movingAvg';
    }

    /**
     * Set coefficients to Low-Pass filter using Windowed-Sinc method
     * @param {number} cutoff - Normalized cutoff frequency (0-0.5)
     */
    setLowPass(cutoff = 0.15) {
        const N = CONFIG.numTaps;
        const M = N - 1;
        let sum = 0;

        for (let k = 0; k < N; k++) {
            const n = k - M / 2;
            if (n === 0) {
                STATE.coefficients[k] = 2 * cutoff;
            } else {
                // Sinc function: sin(2*pi*f*n) / (pi*n)
                STATE.coefficients[k] = Math.sin(2 * Math.PI * cutoff * n) / (Math.PI * n);
            }
            // Apply Hamming window
            const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * k / M);
            STATE.coefficients[k] *= window;
            sum += STATE.coefficients[k];
        }

        // Normalize to unity gain at DC
        for (let k = 0; k < N; k++) {
            STATE.coefficients[k] /= sum;
        }
        STATE.currentPreset = 'lowPass';
    }

    /**
     * Set coefficients to High-Pass filter
     * Uses spectral inversion of low-pass filter
     */
    setHighPass(cutoff = 0.3) {
        // HighPass = AllPass - LowPass
        this.setLowPass(cutoff);
        
        // Invert all coefficients
        for (let k = 0; k < CONFIG.numTaps; k++) {
            STATE.coefficients[k] = -STATE.coefficients[k];
        }
        
        // Add 1 to the center sample (AllPass is a delta function)
        const center = Math.floor(CONFIG.numTaps / 2);
        STATE.coefficients[center] += 1;
        
        STATE.currentPreset = 'highPass';
    }

    /**
     * Set coefficients to Band-Pass filter (Windowed Sinc method)
     * FIXED: Sinc subtraction method for perfect symmetry
     * BandPass = LowPass(high_edge) - LowPass(low_edge)
     */
    setBandPass(centerFreq = 0.25) {
        // Define fixed bandwidth (total width = 0.1 normalized freq)
        const bw = 0.05; 
        const low = Math.max(0.01, centerFreq - bw);
        const high = Math.min(0.49, centerFreq + bw);

        const N = CONFIG.numTaps;
        const M = N - 1;
        
        for (let k = 0; k < N; k++) {
            const n = k - M / 2;
            let valHigh, valLow;

            // Calculate LP at high edge
            if (n === 0) valHigh = 2 * high;
            else valHigh = Math.sin(2 * Math.PI * high * n) / (Math.PI * n);

            // Calculate LP at low edge
            if (n === 0) valLow = 2 * low;
            else valLow = Math.sin(2 * Math.PI * low * n) / (Math.PI * n);
            
            // Subtract to get the band in the middle
            STATE.coefficients[k] = valHigh - valLow;
            
            // Apply Window
            const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * k / M);
            STATE.coefficients[k] *= window;
        }
        STATE.currentPreset = 'bandPass';
    }

    /**
     * Set coefficients to Band-Stop filter (Windowed Sinc)
     * BandStop = AllPass - BandPass
     */
    setBandStop(centerFreq = 0.25) {
        // First create the BandPass
        this.setBandPass(centerFreq);
        
        // Invert to get BandStop
        const mid = Math.floor(CONFIG.numTaps / 2);
        for (let k = 0; k < CONFIG.numTaps; k++) {
            STATE.coefficients[k] = -STATE.coefficients[k];
        }
        // Add AllPass (delta)
        STATE.coefficients[mid] += 1;
        
        STATE.currentPreset = 'bandStop';
    }

    // =========================================================================
    //  FREQUENCY DOMAIN DESIGN (The Fix for Symmetric Plots)
    // =========================================================================

    /**
     * Helper: Calculates the frequency transformation ratio "x"
     * This abstracts the filter type geometry (LP, HP, BP, BS)
     */
    _getFreqRatio(w, cutoff, filterType) {
        // Bandwidth for BP/BS modes (half-width)
        const bw = 0.12; 

        switch (filterType) {
            case 'lowPass':
                // Standard Low Pass: 0 to cutoff
                return w / Math.max(cutoff, 0.001);
            case 'highPass':
                // High Pass: cutoff to Nyquist (inverted ratio)
                if (w < 1e-6) return 9999; 
                return cutoff / w;
            case 'bandPass':
                // Band Pass: Symmetric distance from Center (cutoff)
                // Force DC and Nyquist to be rejected (ratio = infinity)
                if (w < 1e-6) return 9999;  // DC rejection
                if (Math.abs(w - 0.5) < 1e-6) return 9999;  // Nyquist rejection
                // x = |w - center| / bandwidth
                return Math.abs(w - cutoff) / bw;
            case 'bandStop':
                // Band Stop: Inverted Band Pass
                // x = bandwidth / |w - center|
                const dist = Math.abs(w - cutoff);
                if (dist < 1e-6) return 9999;
                return bw / dist;
            default:
                return w / cutoff;
        }
    }

    /**
     * Butterworth-style FIR filter
     * UPDATED: Uses _getFreqRatio for proper geometry
     */
    setButterworth(cutoff = 0.15, filterType = 'lowPass', order = 4) {
        const N = CONFIG.numTaps;
        const freqSamples = new Array(N).fill(0);

        console.log('--- Butterworth Frequency Samples Debug ---');
        console.log('N:', N, 'cutoff:', cutoff, 'filterType:', filterType);
        
        for (let k = 0; k < N; k++) {
            const freq = k / N;
            // Normalized frequency centered at 0 (0 to 0.5)
            const w = Math.abs(freq <= 0.5 ? freq : freq - 1); 
            
            // 1. Get Geometric Ratio based on Filter Type
            const ratio = this._getFreqRatio(w, cutoff, filterType);

            // 2. Calculate Magnitude: 1 / sqrt(1 + ratio^(2n))
            const magnitude = 1 / Math.sqrt(1 + Math.pow(ratio, 2 * order));
            
            freqSamples[k] = magnitude;
            
            // Debug first half (positive frequencies)
            if (k <= N/2) {
                console.log(`  k=${k}, freq=${freq.toFixed(3)}, w=${w.toFixed(3)}, ratio=${ratio.toFixed(3)}, mag=${magnitude.toFixed(4)}`);
            }
        }
        
        console.log('freqSamples (first half):', freqSamples.slice(0, Math.floor(N/2)+1).map(s => s.toFixed(4)));
        
        this._frequencySampling(freqSamples);
        this.applyWindow('kaiser', 5.0 + order);
        this._normalize(filterType);
        STATE.currentPreset = 'butterworth';
    }

    /**
     * Chebyshev Type I FIR filter
     * UPDATED: Uses _getFreqRatio for proper geometry
     */
    setChebyshev1(cutoff = 0.15, filterType = 'lowPass', rippleDb = 0.5) {
        const N = CONFIG.numTaps;
        const epsilon = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
        const order = Math.max(2, Math.floor(N / 4));
        const freqSamples = new Array(N).fill(0);

        for (let k = 0; k < N; k++) {
            const freq = k / N;
            const w = Math.abs(freq <= 0.5 ? freq : freq - 1);
            
            const ratio = this._getFreqRatio(w, cutoff, filterType);
            
            let Tn;
            if (ratio <= 1) {
                Tn = Math.cos(order * Math.acos(ratio));
            } else {
                Tn = Math.cosh(order * Math.acosh(ratio));
            }
            
            const magnitude = 1 / Math.sqrt(1 + epsilon * epsilon * Tn * Tn);
            freqSamples[k] = magnitude;
        }
        
        this._frequencySampling(freqSamples);
        this.applyWindow('kaiser', 6.0);
        this._normalize(filterType);
        STATE.currentPreset = 'chebyshev1';
    }

    /**
     * Chebyshev Type II FIR filter
     * UPDATED: Uses _getFreqRatio for proper geometry
     */
    setChebyshev2(cutoff = 0.15, filterType = 'lowPass', stopbandDb = 40) {
        const N = CONFIG.numTaps;
        const epsilon = 1 / Math.sqrt(Math.pow(10, stopbandDb / 10) - 1);
        const order = Math.max(2, Math.floor(N / 4));
        const freqSamples = new Array(N).fill(0);

        for (let k = 0; k < N; k++) {
            const freq = k / N;
            const w = Math.abs(freq <= 0.5 ? freq : freq - 1);
            
            // Type II is inverted geometry compared to Type I
            let ratio = this._getFreqRatio(w, cutoff, filterType);
            if (ratio < 1e-6) ratio = 1e-6;

            // Invert ratio for Type II equations
            const invRatio = 1 / ratio;
            let Tn;
            if (invRatio <= 1) {
                Tn = Math.cos(order * Math.acos(invRatio));
            } else {
                Tn = Math.cosh(order * Math.acosh(invRatio));
            }
            
            const magnitude = 1 / Math.sqrt(1 + 1 / (epsilon * epsilon * Tn * Tn));
            freqSamples[k] = magnitude;
        }
        
        this._frequencySampling(freqSamples);
        this.applyWindow('kaiser', 7.0);
        this._normalize(filterType);
        STATE.currentPreset = 'chebyshev2';
    }

    /**
     * Elliptic (Cauer) FIR filter
     * UPDATED: Uses _getFreqRatio for proper geometry
     */
    setElliptic(cutoff = 0.15, filterType = 'lowPass', passbandRipple = 0.5, stopbandAtten = 40) {
        const N = CONFIG.numTaps;
        const order = Math.max(2, Math.floor(N / 4));
        const freqSamples = new Array(N).fill(0);
        const epsilonP = Math.sqrt(Math.pow(10, passbandRipple / 10) - 1);
        const transWidth = 0.1;

        for (let k = 0; k < N; k++) {
            const freq = k / N;
            const w = Math.abs(freq <= 0.5 ? freq : freq - 1);
            
            const ratio = this._getFreqRatio(w, cutoff, filterType);
            
            let magnitude;
            if (ratio < 1 - transWidth) {
                const ripple = 1 + epsilonP * 0.1 * Math.sin(order * Math.PI * ratio);
                magnitude = 1 / ripple;
            } else if (ratio > 1 + transWidth) {
                const atten = Math.pow(10, -stopbandAtten / 20);
                const ripple = 1 + 0.5 * Math.sin(order * Math.PI * ratio);
                magnitude = atten * ripple;
            } else {
                const t = (ratio - (1 - transWidth)) / (2 * transWidth);
                const smooth = 0.5 - 0.5 * Math.cos(Math.PI * t);
                magnitude = 1 - smooth * (1 - Math.pow(10, -stopbandAtten / 20));
            }
            
            freqSamples[k] = Math.max(0, Math.min(1, magnitude));
        }
        
        this._frequencySampling(freqSamples);
        this.applyWindow('kaiser', 8.0);
        this._normalize(filterType);
        STATE.currentPreset = 'elliptic';
    }

    /**
     * Helper: Frequency sampling method to compute FIR coefficients from frequency response
     */
    _frequencySampling(freqSamples) {
        const N = CONFIG.numTaps;
        const M = N - 1;
        const halfN = Math.floor(N / 2);
        
        for (let n = 0; n < N; n++) {
            let sum = 0;
            // DC component
            sum += freqSamples[0];
            
            // Compute using cosine terms for symmetric response (Linear Phase)
            for (let k = 1; k < halfN; k++) {
                const omega = 2 * Math.PI * k / N;
                const centerShift = n - M / 2;
                sum += 2 * freqSamples[k] * Math.cos(omega * centerShift);
            }
            
            // Nyquist component
            if (N % 2 === 0) {
                const centerShift = n - M / 2;
                sum += freqSamples[halfN] * Math.cos(Math.PI * centerShift);
            }
            
            STATE.coefficients[n] = sum / N;
        }
    }

    /**
     * Apply window function to coefficients
     */
    applyWindow(windowType = 'hamming', beta = 5.0) {
        const N = CONFIG.numTaps;
        const M = N - 1;
        
        for (let k = 0; k < N; k++) {
            let w = 1;
            switch(windowType) {
                case 'hamming':
                    w = 0.54 - 0.46 * Math.cos(2 * Math.PI * k / M);
                    break;
                case 'hanning':
                    w = 0.5 * (1 - Math.cos(2 * Math.PI * k / M));
                    break;
                case 'blackman':
                    w = 0.42 - 0.5 * Math.cos(2 * Math.PI * k / M) + 0.08 * Math.cos(4 * Math.PI * k / M);
                    break;
                case 'kaiser':
                    const bessel = (x) => {
                        let sum = 1, term = 1;
                        for (let i = 1; i <= 20; i++) {
                            term *= (x / (2 * i)) * (x / (2 * i));
                            sum += term;
                        }
                        return sum;
                    };
                    const arg = beta * Math.sqrt(1 - Math.pow((2 * k / M - 1), 2));
                    w = bessel(arg) / bessel(beta);
                    break;
                default: w = 1;
            }
            STATE.coefficients[k] *= w;
        }
    }

    /**
     * Helper: Normalize coefficients
     * UPDATED: Normalizes Gain at Center Frequency for BandPass
     */
    _normalize(filterType = 'lowPass') {
        let sum = 0;
        
        if (filterType === 'lowPass' || filterType === 'bandStop') {
            // Normalize for unity DC gain
            for (let k = 0; k < CONFIG.numTaps; k++) {
                sum += STATE.coefficients[k];
            }
        } else if (filterType === 'highPass') {
            // Normalize for unity gain at Nyquist
            for (let k = 0; k < CONFIG.numTaps; k++) {
                sum += STATE.coefficients[k] * (k % 2 === 0 ? 1 : -1);
            }
        } else if (filterType === 'bandPass') {
             // For BandPass, gain at Center Frequency
             // We access the UI slider directly if needed, or rely on pass-in args.
             // Since _normalize doesn't take args, we infer from slider
             const slider = document.getElementById('cutoffSlider');
             const centerFreq = slider ? parseFloat(slider.value) : 0.25;
             const w = centerFreq * Math.PI; 
             
             let real = 0; let imag = 0;
             for (let k = 0; k < CONFIG.numTaps; k++) {
                 real += STATE.coefficients[k] * Math.cos(-w * k);
                 imag += STATE.coefficients[k] * Math.sin(-w * k);
             }
             sum = Math.sqrt(real*real + imag*imag);
        }
        
        if (Math.abs(sum) > 0.001) {
            for (let k = 0; k < CONFIG.numTaps; k++) {
                STATE.coefficients[k] /= sum;
            }
        }
    }

    setCustom(coeffs) {
        for (let k = 0; k < CONFIG.numTaps; k++) {
            STATE.coefficients[k] = coeffs[k] || 0;
        }
        STATE.currentPreset = 'custom';
    }

    process(inputSample) {
        STATE.inputBuffer.pop();
        STATE.inputBuffer.unshift(inputSample);
        let outputSample = 0;
        for (let k = 0; k < CONFIG.numTaps; k++) {
            outputSample += STATE.coefficients[k] * STATE.inputBuffer[k];
        }
        STATE.outputBuffer.pop();
        STATE.outputBuffer.unshift(outputSample);
        return outputSample;
    }

    calculateFrequencyResponse(numPoints = 256) {
        const magnitude = [];
        for (let i = 0; i < numPoints; i++) {
            const w = (i / numPoints) * Math.PI;
            let real = 0; let imag = 0;
            for (let k = 0; k < CONFIG.numTaps; k++) {
                real += STATE.coefficients[k] * Math.cos(-w * k);
                imag += STATE.coefficients[k] * Math.sin(-w * k);
            }
            const mag = Math.sqrt(real * real + imag * imag);
            magnitude.push(mag);
        }
        return magnitude;
    }
}

/**
 * Visualizer - Handles all canvas rendering
 */
class Visualizer {
    constructor() {
        this.ctxCoeff = null;
        this.ctxInput = null;
        this.ctxOutput = null;
        this.ctxFreq = null;
        this.ctxZplane = null;
        
        this.isDragging = false;
        this.dragIndex = -1;
        
        // Z-plane interaction state
        this.zplaneZeros = [];       // Array of {re, im} complex zeros
        this.zplanePoles = [];       // Array of {re, im} complex poles (for FIR: all at origin)
        this.zplaneDragging = false;
        this.zplaneDragIndex = -1;
        this.zplaneDragType = null;  // 'zero' or 'pole'
    }

    /**
     * Initialize canvas contexts
     */
    init() {
        const canvasCoeff = document.getElementById('canvas-coefficients');
        const canvasInput = document.getElementById('canvas-input');
        const canvasOutput = document.getElementById('canvas-output');
        const canvasFreq = document.getElementById('canvas-freq');
        const canvasZplane = document.getElementById('canvas-zplane');

        if (canvasCoeff) this.ctxCoeff = canvasCoeff.getContext('2d');
        if (canvasInput) this.ctxInput = canvasInput.getContext('2d');
        if (canvasOutput) this.ctxOutput = canvasOutput.getContext('2d');
        if (canvasFreq) this.ctxFreq = canvasFreq.getContext('2d');
        if (canvasZplane) this.ctxZplane = canvasZplane.getContext('2d');

        this.setupCoeffInteraction();
        this.setupZplaneInteraction();
    }

    /**
     * Setup mouse interaction for coefficient editing
     */
    setupCoeffInteraction() {
        const canvas = document.getElementById('canvas-coefficients');
        if (!canvas) return;

        const getCoeffIndex = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const barWidth = CONFIG.canvasWidth / CONFIG.numTaps;
            return Math.floor(x / barWidth);
        };

        const getCoeffValue = (e) => {
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const centerY = CONFIG.coeffCanvasHeight / 2;
            // Map y position to coefficient value
            return ((centerY - y) / centerY) * CONFIG.maxCoeffValue;
        };

        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragIndex = getCoeffIndex(e);
            const value = getCoeffValue(e);
            if (this.dragIndex >= 0 && this.dragIndex < CONFIG.numTaps) {
                STATE.coefficients[this.dragIndex] = Math.max(-CONFIG.maxCoeffValue, 
                    Math.min(CONFIG.maxCoeffValue, value));
                STATE.currentPreset = 'custom';
                updatePresetButtons();
                this.drawCoefficients();
                this.drawFrequencyResponse();
                this.calculateZerosFromCoeffs();
                this.drawZPlane();
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const index = getCoeffIndex(e);
            const value = getCoeffValue(e);
            if (index >= 0 && index < CONFIG.numTaps) {
                STATE.coefficients[index] = Math.max(-CONFIG.maxCoeffValue, 
                    Math.min(CONFIG.maxCoeffValue, value));
                this.drawCoefficients();
                this.drawFrequencyResponse();
                this.calculateZerosFromCoeffs();
                this.drawZPlane();
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.dragIndex = -1;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.dragIndex = -1;
        });
    }

    /**
     * Draw coefficient bar chart
     */
    drawCoefficients() {
        const ctx = this.ctxCoeff;
        if (!ctx) return;

        const width = CONFIG.canvasWidth;
        const height = CONFIG.coeffCanvasHeight;
        const barWidth = width / CONFIG.numTaps - 4;
        const centerY = height / 2;

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.setLineDash([]);

        // Draw center line (zero line)
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Draw coefficient bars
        for (let k = 0; k < CONFIG.numTaps; k++) {
            const x = (k * width / CONFIG.numTaps) + 2;
            const value = STATE.coefficients[k];
            const barHeight = (value / CONFIG.maxCoeffValue) * (centerY - 10);

            // Gradient color based on value
            if (value >= 0) {
                const gradient = ctx.createLinearGradient(x, centerY, x, centerY - barHeight);
                gradient.addColorStop(0, '#ff4444');
                gradient.addColorStop(1, '#ff8888');
                ctx.fillStyle = gradient;
            } else {
                const gradient = ctx.createLinearGradient(x, centerY, x, centerY - barHeight);
                gradient.addColorStop(0, '#ff4444');
                gradient.addColorStop(1, '#ff8888');
                ctx.fillStyle = gradient;
            }

            // Draw bar
            ctx.fillRect(x, centerY, barWidth, -barHeight);

            // Bar outline
            ctx.strokeStyle = '#ff6666';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, centerY, barWidth, -barHeight);

            // Coefficient index label
            ctx.fillStyle = '#888888';
            ctx.font = '9px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`h[${k}]`, x + barWidth / 2, height - 5);
        }

        // Draw value labels
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`+${CONFIG.maxCoeffValue}`, 5, 15);
        ctx.fillText('0', 5, centerY - 3);
        ctx.fillText(`-${CONFIG.maxCoeffValue}`, 5, height - 18);
    }

    /**
     * Draw convolution kernel overlay on input signal
     * Shows the kernel coefficients h[k] as a STEM PLOT and signal samples x[n-k] as dots
     * This visualizes the "Multiply and Accumulate" operation
     */
    drawConvolutionKernel() {
        const ctx = this.ctxInput;
        if (!ctx || !STATE.showConvolution) return;

        const width = CONFIG.canvasWidth;
        const height = CONFIG.canvasHeight;
        
        // Calculate kernel window position - newest samples are at the RIGHT side
        const kernelWidth = (CONFIG.numTaps / CONFIG.bufferSize) * width;
        const kernelX = width - kernelWidth;

        // Semi-transparent kernel window background
        ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
        ctx.fillRect(kernelX, 0, kernelWidth, height);

        // Kernel border
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(kernelX, 0, kernelWidth, height);
        ctx.setLineDash([]);

        const centerY = height / 2;
        
        // Find max values for scaling
        let maxCoeff = 0;
        let maxSignal = 0;
        for (let k = 0; k < CONFIG.numTaps; k++) {
            maxCoeff = Math.max(maxCoeff, Math.abs(STATE.coefficients[k]));
            maxSignal = Math.max(maxSignal, Math.abs(STATE.inputBuffer[k]));
        }
        maxCoeff = Math.max(maxCoeff, 0.01);
        maxSignal = Math.max(maxSignal, 0.1) * 1.1;
        
        // Stem plot area: use bottom 40% of canvas, with baseline in the middle of that area
        // This allows both positive (up) and negative (down) stems
        const stemAreaTop = height * 0.60;      // Top of stem area (60% from top)
        const stemAreaBottom = height - 8;       // Bottom of stem area
        const stemAreaHeight = (stemAreaBottom - stemAreaTop) / 2;  // Half height for each direction
        const stemBaseY = stemAreaTop + stemAreaHeight;  // Center baseline
        
        // Draw baseline for stem plot (center line)
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(kernelX, stemBaseY);
        ctx.lineTo(width, stemBaseY);
        ctx.stroke();
        
        // Draw zero indicator
        ctx.fillStyle = '#ffaa00';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText('0', kernelX - 2, stemBaseY + 3);
        
        // Draw kernel coefficients as STEM PLOT and signal samples as DOTS
        for (let k = 0; k < CONFIG.numTaps; k++) {
            // x position: map kernel index to window position
            const x = width - (k / CONFIG.bufferSize) * width;
            
            // === KERNEL STEM (yellow) - shows h[k] values ===
            // Positive coefficients go UP (negative Y), negative coefficients go DOWN (positive Y)
            const coeffValue = STATE.coefficients[k];
            const stemHeight = (coeffValue / maxCoeff) * stemAreaHeight;
            const stemTopY = stemBaseY - stemHeight;  // Negative coeff → stemTopY > stemBaseY (goes down)
            
            // Draw stem line
            ctx.strokeStyle = coeffValue >= 0 ? '#ffff00' : '#ff8844';  // Yellow for +, orange for -
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, stemBaseY);
            ctx.lineTo(x, stemTopY);
            ctx.stroke();
            
            // Draw stem cap (circle at end)
            ctx.fillStyle = coeffValue >= 0 ? '#ffff00' : '#ff8844';
            ctx.beginPath();
            ctx.arc(x, stemTopY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw stem cap outline
            ctx.strokeStyle = coeffValue >= 0 ? '#ff8800' : '#ff4400';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // === SIGNAL DOT (cyan) - shows x[n-k] values ===
            const signalValue = STATE.inputBuffer[k];
            const signalY = centerY - (signalValue / maxSignal) * (centerY - 20);
            
            // Draw glow effect for signal dot
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(x, signalY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw signal dot
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(x, signalY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw signal dot outline
            ctx.strokeStyle = '#0088ff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Labels
        ctx.font = 'bold 9px Courier New';
        ctx.textAlign = 'left';
        
        // Kernel label (yellow)
        ctx.fillStyle = '#ffff00';
        ctx.fillText('h[k]', kernelX + 3, stemBaseY - stemAreaHeight - 2);
        
        // Signal label (cyan)
        ctx.fillStyle = '#00ffff';
        ctx.fillText('x[n-k]', kernelX + 3, 22);
    }

    /**
     * Draw output convolution result dots and sync window
     * Shows the weighted sum result on the output signal
     */
    drawOutputConvolutionDots() {
        const ctx = this.ctxOutput;
        if (!ctx || !STATE.showConvolution) return;

        const width = CONFIG.canvasWidth;
        const height = CONFIG.canvasHeight;
        const centerY = height / 2;

        // Draw synced convolution window (dotted rectangle only) to show sync with input
        const kernelWidth = (CONFIG.numTaps / CONFIG.bufferSize) * width;
        const kernelX = width - kernelWidth;
        
        // Semi-transparent window background (lighter than input)
        ctx.fillStyle = 'rgba(68, 255, 136, 0.08)';
        ctx.fillRect(kernelX, 0, kernelWidth, height);
        
        // Dotted rectangle border (green to match output)
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(kernelX, 0, kernelWidth, height);
        ctx.setLineDash([]);

        // Find max value for scaling
        let maxVal = 0;
        for (let i = 0; i < STATE.outputBuffer.length; i++) {
            maxVal = Math.max(maxVal, Math.abs(STATE.outputBuffer[i]));
        }
        maxVal = Math.max(maxVal, 0.1) * 1.1;

        // Draw the current output sample (result of convolution) with emphasis
        const x = width; // Most recent output at right edge
        const y = centerY - (STATE.outputBuffer[0] / maxVal) * (centerY - 5);
        
        // Draw glow effect
        ctx.fillStyle = 'rgba(68, 255, 136, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw the output dot
        ctx.fillStyle = '#44ff88';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw dot outline
        ctx.strokeStyle = '#00ff44';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Label for the output
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('y[n]', x - 15, y - 12);
        
        // Show the convolution sum formula result
        ctx.fillStyle = '#88ffaa';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`y[n] = Σ h[k]·x[n-k] = ${STATE.outputBuffer[0].toFixed(3)}`, 5, height - 8);
    }

    /**
     * Draw waveform on canvas with optional sample dots
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number[]} data - Waveform data
     * @param {string} color - Line color
     * @param {string} label - Waveform label
     * @param {boolean} showDots - Whether to show sample dots along the waveform
     * @param {string} dotColor - Color for the sample dots
     */
    drawWaveform(ctx, data, color, label, showDots = false, dotColor = null) {
        if (!ctx) return;

        const width = CONFIG.canvasWidth;
        const height = CONFIG.canvasHeight;
        const centerY = height / 2;

        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        
        // Vertical grid lines
        for (let i = 0; i < 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let i = 0; i < 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Draw center line
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Find data range for auto-scaling
        let maxVal = 0;
        for (let i = 0; i < data.length; i++) {
            maxVal = Math.max(maxVal, Math.abs(data[i]));
        }
        maxVal = Math.max(maxVal, 0.1) * 1.1; // Add 10% padding

        // Draw waveform
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const x = width - (i / data.length) * width;
            const y = centerY - (data[i] / maxVal) * (centerY - 5);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw sample dots along the waveform if enabled
        // These are smaller signal dots, distinct from the kernel convolution dots
        if (showDots && STATE.showConvolution) {
            const actualDotColor = dotColor || color;
            // Draw dots at regular intervals (every 10 samples for clarity)
            // Start from sample 20 to avoid cluttering the kernel window area
            const dotInterval = 10;
            const startIndex = CONFIG.numTaps + 4; // Start after kernel window
            for (let i = startIndex; i < Math.min(data.length, 120); i += dotInterval) {
                const x = width - (i / data.length) * width;
                const y = centerY - (data[i] / maxVal) * (centerY - 5);
                
                // Draw small signal dot
                ctx.fillStyle = actualDotColor;
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw label
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(label, 10, 15);

        // Draw amplitude scale
        ctx.fillStyle = '#666666';
        ctx.font = '9px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(`+${maxVal.toFixed(1)}`, width - 5, 12);
        ctx.fillText(`-${maxVal.toFixed(1)}`, width - 5, height - 5);
    }

    /**
     * Draw frequency response magnitude plot (supports Linear and dB scale)
     */
    drawFrequencyResponse() {
        const ctx = this.ctxFreq;
        if (!ctx) return;

        // Get actual canvas dimensions (frequency canvas may be narrower than main canvases)
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const plotHeight = height - 25;  // Leave space for x-axis labels
        const useDB = STATE.freqScaleDB;

        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Calculate frequency response (0 to π)
        const magPositive = filter.calculateFrequencyResponse(256);
        
        // Check if current filter type is bandpass - use full [-π, π] range only for bandpass
        const filterTypeSelect = document.getElementById('filterTypeSelect');
        const isBandPass = filterTypeSelect && filterTypeSelect.value === 'bandPass';
        
        let magnitude;
        if (isBandPass) {
            // Create full [-π, π] response by mirroring for bandpass
            // For real filters, |H(-ω)| = |H(ω)|
            const magFull = [];
            // Negative frequencies: -π to 0 (mirror of π to 0)
            for (let i = magPositive.length - 1; i >= 0; i--) {
                magFull.push(magPositive[i]);
            }
            // Positive frequencies: 0 to π (skip duplicate at 0)
            for (let i = 1; i < magPositive.length; i++) {
                magFull.push(magPositive[i]);
            }
            magnitude = magFull;
        } else {
            // Use standard [0, π] range for other filter types
            magnitude = magPositive;
        }
        
        // dB scale parameters
        const dbMin = -60;  // Minimum dB to display
        const dbMax = 6;    // Maximum dB (allow slight overshoot)
        const dbRange = dbMax - dbMin;

        // Find max for linear scaling
        let maxMag = 0;
        for (let i = 0; i < magnitude.length; i++) {
            maxMag = Math.max(maxMag, magnitude[i]);
        }
        maxMag = Math.max(maxMag, 0.1);

        // Helper function to convert magnitude to Y coordinate
        const magToY = (mag) => {
            if (useDB) {
                // dB scale: 20*log10(mag), clamped to dbMin
                const db = mag > 1e-10 ? 20 * Math.log10(mag) : dbMin;
                const clampedDb = Math.max(dbMin, Math.min(dbMax, db));
                return plotHeight * (1 - (clampedDb - dbMin) / dbRange);
            } else {
                // Linear scale
                return plotHeight * (1 - mag / maxMag);
            }
        };

        // Draw grid
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        // Vertical grid lines (frequency) - 10 divisions
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, plotHeight);
            ctx.stroke();
        }
        
        // Highlight center line (ω = 0) for bandpass only
        if (isBandPass) {
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, plotHeight);
            ctx.stroke();
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1;
        }

        // Horizontal grid lines
        if (useDB) {
            // dB scale: lines at 0, -10, -20, -30, -40, -50, -60 dB
            const dbLines = [0, -10, -20, -30, -40, -50, -60];
            for (const db of dbLines) {
                const y = plotHeight * (1 - (db - dbMin) / dbRange);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        } else {
            // Linear scale: 4 divisions
            for (let i = 0; i <= 4; i++) {
                const y = (plotHeight / 4) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);

        // Draw -3dB line (cutoff reference)
        const db3Y = useDB 
            ? plotHeight * (1 - (-3 - dbMin) / dbRange)
            : plotHeight * (1 - 0.707 / maxMag);
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, db3Y);
        ctx.lineTo(width, db3Y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw magnitude response as filled area
        const gradient = ctx.createLinearGradient(0, 0, 0, plotHeight);
        gradient.addColorStop(0, 'rgba(255, 255, 68, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 200, 68, 0.2)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, plotHeight);

        for (let i = 0; i < magnitude.length; i++) {
            const x = (i / magnitude.length) * width;
            const y = magToY(magnitude[i]);
            ctx.lineTo(x, Math.min(y, plotHeight));
        }

        ctx.lineTo(width, plotHeight);
        ctx.closePath();
        ctx.fill();

        // Draw magnitude response line
        ctx.strokeStyle = '#ffff44';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < magnitude.length; i++) {
            const x = (i / magnitude.length) * width;
            const y = magToY(magnitude[i]);
            
            if (i === 0) {
                ctx.moveTo(x, Math.min(y, plotHeight));
            } else {
                ctx.lineTo(x, Math.min(y, plotHeight));
            }
        }
        ctx.stroke();

        // Draw frequency axis labels for [-π, π] range
        ctx.fillStyle = '#888888';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';

        // Use different labels based on filter type
        const freqLabels = isBandPass 
            ? ['-π', '-π/2', '0', 'π/2', 'π']      // Full spectrum for bandpass
            : ['0', 'π/4', 'π/2', '3π/4', 'π'];   // Standard [0, π] for others
        for (let i = 0; i <= 4; i++) {
            const x = (width / 4) * i;
            ctx.fillText(freqLabels[i], x, height - 5);
        }

        // Draw magnitude axis labels
        ctx.textAlign = 'left';
        if (useDB) {
            // dB scale labels
            ctx.fillText('0dB', 5, plotHeight * (1 - (0 - dbMin) / dbRange) + 4);
            ctx.fillText('-20', 5, plotHeight * (1 - (-20 - dbMin) / dbRange) + 4);
            ctx.fillText('-40', 5, plotHeight * (1 - (-40 - dbMin) / dbRange) + 4);
            ctx.fillText('-60', 5, plotHeight * (1 - (-60 - dbMin) / dbRange) + 4);
        } else {
            // Linear scale labels
            ctx.fillText('1.0', 5, 12);
            ctx.fillText('0.5', 5, plotHeight / 2);
            ctx.fillText('0', 5, plotHeight - 3);
        }

        // Title
        ctx.fillStyle = '#ffff44';
        ctx.font = 'bold 11px Courier New';
        const titleText = useDB ? '|H(ω)| - Magnitude Response (dB)' : '|H(ω)| - Magnitude Response';
        ctx.fillText(titleText, width / 2 - 100, 15);

        // -3dB label
        ctx.fillStyle = '#ff6666';
        ctx.font = '9px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText('-3dB', width - 5, db3Y - 3);
    }

    /**
     * Setup Z-plane mouse interaction for dragging zeros/poles
     */
    setupZplaneInteraction() {
        const canvas = document.getElementById('canvas-zplane');
        if (!canvas) return;

        const getZplaneCoords = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const size = Math.min(canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const scale = size / 2.8;
            
            return {
                re: (x - centerX) / scale,
                im: -(y - centerY) / scale
            };
        };

        const findNearestZero = (coords) => {
            let minDist = 0.15; // Click threshold
            let nearestIdx = -1;
            
            for (let i = 0; i < this.zplaneZeros.length; i++) {
                const z = this.zplaneZeros[i];
                const dist = Math.sqrt(Math.pow(z.re - coords.re, 2) + Math.pow(z.im - coords.im, 2));
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }
            return nearestIdx;
        };

        canvas.addEventListener('mousedown', (e) => {
            const coords = getZplaneCoords(e);
            const idx = findNearestZero(coords);
            
            if (idx >= 0) {
                this.zplaneDragging = true;
                this.zplaneDragIndex = idx;
                this.zplaneDragType = 'zero';
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.zplaneDragging) return;
            
            const coords = getZplaneCoords(e);
            
            if (this.zplaneDragIndex >= 0 && this.zplaneDragType === 'zero') {
                // Update the zero position
                this.zplaneZeros[this.zplaneDragIndex] = coords;
                
                // Handle complex conjugate pair if the zero has non-zero imaginary part
                // FIR filters with real coefficients have conjugate pairs
                this.updateCoefficientsFromZeros();
                this.drawCoefficients();
                this.drawFrequencyResponse();
                this.drawZPlane();
                updateInfoPanel();
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.zplaneDragging = false;
            this.zplaneDragIndex = -1;
            this.zplaneDragType = null;
        });

        canvas.addEventListener('mouseleave', () => {
            this.zplaneDragging = false;
            this.zplaneDragIndex = -1;
            this.zplaneDragType = null;
        });
    }

    /**
     * Calculate zeros from filter coefficients
     * Uses companion matrix eigenvalue method or Durand-Kerner iteration
     */
    calculateZerosFromCoeffs() {
        const n = CONFIG.numTaps;
        if (n < 2) {
            this.zplaneZeros = [];
            return;
        }

        // Normalize coefficients (leading coefficient = 1)
        const coeffs = STATE.coefficients.slice();
        const h0 = coeffs[0];
        if (Math.abs(h0) < 1e-10) {
            // If leading coefficient is near zero, use simple initialization
            this.zplaneZeros = [];
            for (let i = 0; i < n - 1; i++) {
                const angle = (2 * Math.PI * i) / (n - 1);
                this.zplaneZeros.push({
                    re: 0.5 * Math.cos(angle),
                    im: 0.5 * Math.sin(angle)
                });
            }
            return;
        }

        // Use Durand-Kerner method to find polynomial roots
        // H(z) = h[0] + h[1]z^(-1) + h[2]z^(-2) + ... = h[0]z^(n-1) + h[1]z^(n-2) + ... + h[n-1]
        // Zeros are roots of the polynomial h[0]z^(n-1) + h[1]z^(n-2) + ... + h[n-1] = 0
        
        const zeros = [];
        
        // Initialize zeros on a circle
        for (let i = 0; i < n - 1; i++) {
            const angle = (2 * Math.PI * i) / (n - 1) + 0.1;
            const r = 0.8;
            zeros.push({
                re: r * Math.cos(angle),
                im: r * Math.sin(angle)
            });
        }

        // Durand-Kerner iterations
        const maxIter = 100;
        const tolerance = 1e-8;
        
        for (let iter = 0; iter < maxIter; iter++) {
            let maxChange = 0;
            
            for (let i = 0; i < zeros.length; i++) {
                // Evaluate polynomial at z[i]
                let pRe = coeffs[0], pIm = 0;
                let zPowRe = 1, zPowIm = 0;
                
                for (let k = 1; k < n; k++) {
                    // z^(-k) = z^(n-1-k) for the flipped polynomial
                    // We use z^k for the standard polynomial form
                    const newRe = zPowRe * zeros[i].re - zPowIm * zeros[i].im;
                    const newIm = zPowRe * zeros[i].im + zPowIm * zeros[i].re;
                    zPowRe = newRe;
                    zPowIm = newIm;
                    
                    pRe += coeffs[k] * zPowRe;
                    pIm += coeffs[k] * zPowIm;
                }
                
                // Product of (z[i] - z[j]) for j != i
                let prodRe = 1, prodIm = 0;
                for (let j = 0; j < zeros.length; j++) {
                    if (j === i) continue;
                    const diffRe = zeros[i].re - zeros[j].re;
                    const diffIm = zeros[i].im - zeros[j].im;
                    const newProdRe = prodRe * diffRe - prodIm * diffIm;
                    const newProdIm = prodRe * diffIm + prodIm * diffRe;
                    prodRe = newProdRe;
                    prodIm = newProdIm;
                }
                
                // Compute correction: p(z[i]) / prod
                const denom = prodRe * prodRe + prodIm * prodIm;
                if (denom > 1e-20) {
                    const corrRe = (pRe * prodRe + pIm * prodIm) / denom;
                    const corrIm = (pIm * prodRe - pRe * prodIm) / denom;
                    
                    zeros[i].re -= corrRe;
                    zeros[i].im -= corrIm;
                    
                    maxChange = Math.max(maxChange, Math.sqrt(corrRe * corrRe + corrIm * corrIm));
                }
            }
            
            if (maxChange < tolerance) break;
        }
        
        this.zplaneZeros = zeros;
        
        // For FIR filters, all poles are at the origin (z = 0)
        this.zplanePoles = [{ re: 0, im: 0 }];
    }

    /**
     * Update coefficients from current zeros positions
     * Reconstruct polynomial from roots
     */
    updateCoefficientsFromZeros() {
        if (this.zplaneZeros.length === 0) return;
        
        const n = this.zplaneZeros.length + 1;
        
        // Start with polynomial p(z) = 1
        let coeffsRe = [1];
        let coeffsIm = [0];
        
        // Multiply by (z - zero[i]) for each zero
        for (const z of this.zplaneZeros) {
            const newCoeffsRe = new Array(coeffsRe.length + 1).fill(0);
            const newCoeffsIm = new Array(coeffsRe.length + 1).fill(0);
            
            // Multiply by z (shift coefficients)
            for (let i = 0; i < coeffsRe.length; i++) {
                newCoeffsRe[i + 1] += coeffsRe[i];
                newCoeffsIm[i + 1] += coeffsIm[i];
            }
            
            // Subtract zero * current polynomial
            for (let i = 0; i < coeffsRe.length; i++) {
                newCoeffsRe[i] -= z.re * coeffsRe[i] - z.im * coeffsIm[i];
                newCoeffsIm[i] -= z.re * coeffsIm[i] + z.im * coeffsRe[i];
            }
            
            coeffsRe = newCoeffsRe;
            coeffsIm = newCoeffsIm;
        }
        
        // Take real parts and normalize
        // The polynomial is z^(n-1) + ... so we need to reverse for FIR form
        const newCoeffs = coeffsRe.slice().reverse();
        
        // Normalize to preserve DC gain (sum of coefficients)
        const oldSum = STATE.coefficients.reduce((a, b) => a + b, 0);
        const newSum = newCoeffs.reduce((a, b) => a + b, 0);
        
        if (Math.abs(newSum) > 1e-10 && Math.abs(oldSum) > 1e-10) {
            const scale = oldSum / newSum;
            for (let i = 0; i < newCoeffs.length; i++) {
                newCoeffs[i] *= scale;
            }
        }
        
        // Update state
        CONFIG.numTaps = newCoeffs.length;
        STATE.coefficients = newCoeffs;
    }

    /**
     * Draw Z-plane with unit circle, zeros, and poles
     */
    drawZPlane() {
        const ctx = this.ctxZplane;
        if (!ctx) return;

        const canvas = document.getElementById('canvas-zplane');
        if (!canvas) return;
        
        const width = canvas.width;
        const height = canvas.height;
        const size = Math.min(width, height);
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = size / 2.8; // Scale so unit circle fits with margin

        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        // Vertical and horizontal lines through origin
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw unit circle
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, scale, 0, Math.PI * 2);
        ctx.stroke();

        // Unit circle label
        ctx.fillStyle = '#666666';
        ctx.font = '9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('|z|=1', centerX + scale + 5, centerY - 5);

        // Calculate zeros if not already done
        if (this.zplaneZeros.length === 0 || this.zplaneZeros.length !== CONFIG.numTaps - 1) {
            this.calculateZerosFromCoeffs();
        }

        // Draw zeros (circles)
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < this.zplaneZeros.length; i++) {
            const z = this.zplaneZeros[i];
            const x = centerX + z.re * scale;
            const y = centerY - z.im * scale;
            
            // Highlight if being dragged
            if (this.zplaneDragging && this.zplaneDragIndex === i) {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
            }
            
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw small cross inside zero
            ctx.beginPath();
            ctx.moveTo(x - 3, y);
            ctx.lineTo(x + 3, y);
            ctx.moveTo(x, y - 3);
            ctx.lineTo(x, y + 3);
            ctx.stroke();
        }

        // Draw poles (X marks) - for FIR, only at origin
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        for (const p of this.zplanePoles) {
            const x = centerX + p.re * scale;
            const y = centerY - p.im * scale;
            
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 6);
            ctx.lineTo(x + 6, y + 6);
            ctx.moveTo(x + 6, y - 6);
            ctx.lineTo(x - 6, y + 6);
            ctx.stroke();
        }

        // Draw axis labels
        ctx.fillStyle = '#888888';
        ctx.font = '9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Re', width - 12, centerY - 5);
        ctx.fillText('Im', centerX + 8, 12);

        // Legend
        ctx.font = '8px Courier New';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'left';
        ctx.fillText('○ Zero', 5, height - 18);
        ctx.fillStyle = '#ff6666';
        ctx.fillText('× Pole', 5, height - 6);
    }

    /**
     * Main animation loop
     */
    loop() {
        if (!STATE.isPlaying) {
            STATE.animationFrameId = requestAnimationFrame(() => this.loop());
            return;
        }

        // Generate new samples
        for (let i = 0; i < CONFIG.animationSpeed; i++) {
            const input = generator.getNextSample();
            filter.process(input);
        }

        // Draw input waveform with sample dots
        this.drawWaveform(
            this.ctxInput,
            STATE.inputBuffer,
            '#4488ff',
            'INPUT x[n]: Signal + Noise →',
            true,  // Show dots
            '#6699ff'  // Light blue dots
        );

        // Draw convolution visualization overlay
        if (STATE.showConvolution) {
            this.drawConvolutionKernel();
        }

        // Draw output waveform with sample dots
        this.drawWaveform(
            this.ctxOutput,
            STATE.outputBuffer,
            '#44ff88',
            'OUTPUT y[n]: Filtered Signal →',
            true,  // Show dots
            '#66ffaa'  // Light green dots
        );

        // Draw output convolution result dot (the current y[n])
        if (STATE.showConvolution) {
            this.drawOutputConvolutionDots();
        }

        STATE.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    /**
     * Step forward one sample (for manual stepping)
     */
    stepForward() {
        // Generate and process one sample
        const input = generator.getNextSample();
        filter.process(input);
        
        // Redraw all canvases
        this.redrawAll();
    }

    /**
     * Step backward one sample (for manual stepping)
     * Note: This reverses the signal generator phase and reprocesses
     */
    stepBackward() {
        // Reverse the signal generator phase
        generator.phase -= CONFIG.signalFreq * Math.PI * 2 * 2; // Go back 2 steps, then forward 1
        if (generator.phase < 0) generator.phase += Math.PI * 2;
        
        // Shift buffers backward (restore previous state)
        // Input buffer: shift right (newest moves out, restore older)
        for (let i = 0; i < STATE.inputBuffer.length - 1; i++) {
            STATE.inputBuffer[i] = STATE.inputBuffer[i + 1];
        }
        // Output buffer: shift right
        for (let i = 0; i < STATE.outputBuffer.length - 1; i++) {
            STATE.outputBuffer[i] = STATE.outputBuffer[i + 1];
        }
        
        // Regenerate the oldest sample
        const input = generator.getNextSample();
        STATE.inputBuffer[STATE.inputBuffer.length - 1] = input;
        
        // Recompute output for current window
        let sum = 0;
        for (let k = 0; k < CONFIG.numTaps; k++) {
            sum += STATE.coefficients[k] * STATE.inputBuffer[k];
        }
        STATE.outputBuffer[0] = sum;
        
        // Redraw all canvases
        this.redrawAll();
    }

    /**
     * Redraw all visualization canvases
     */
    redrawAll() {
        // Draw input waveform with sample dots
        this.drawWaveform(
            this.ctxInput,
            STATE.inputBuffer,
            '#4488ff',
            'INPUT x[n]: Signal + Noise →',
            true,
            '#6699ff'
        );

        // Draw convolution visualization overlay
        if (STATE.showConvolution) {
            this.drawConvolutionKernel();
        }

        // Draw output waveform with sample dots
        this.drawWaveform(
            this.ctxOutput,
            STATE.outputBuffer,
            '#44ff88',
            'OUTPUT y[n]: Filtered Signal →',
            true,
            '#66ffaa'
        );

        // Draw output convolution result dot
        if (STATE.showConvolution) {
            this.drawOutputConvolutionDots();
        }
    }

    /**
     * Start the animation
     */
    start() {
        this.drawCoefficients();
        this.drawFrequencyResponse();
        this.calculateZerosFromCoeffs();
        this.drawZPlane();
        this.loop();
    }

    /**
     * Stop the animation
     */
    stop() {
        if (STATE.animationFrameId) {
            cancelAnimationFrame(STATE.animationFrameId);
        }
    }
}

// ===== Global Instances =====
const generator = new SignalGenerator();
const filter = new FilterEngine();
const visualizer = new Visualizer();

// ===== UI Helper Functions =====

/**
 * Update preset button states (kept for backward compatibility)
 */
function updatePresetButtons() {
    // No longer using buttons, now using dropdowns
    // This function is kept for compatibility
}

/**
 * Update info panel
 */
function updateInfoPanel() {
    const sumCoeffs = STATE.coefficients.reduce((a, b) => a + b, 0);
    
    const filterTypeEl = document.getElementById('info-filterType');
    const numTapsEl = document.getElementById('info-numTaps');
    const sumCoeffsEl = document.getElementById('info-sumCoeffs');
    const dcGainEl = document.getElementById('info-dcGain');

    // Display filter type and design method
    const filterTypeSelect = document.getElementById('filterTypeSelect');
    const designMethodSelect = document.getElementById('designMethodSelect');
    
    let displayText = '';
    if (filterTypeSelect && designMethodSelect) {
        const typeLabel = filterTypeSelect.options[filterTypeSelect.selectedIndex]?.text || '';
        const methodLabel = designMethodSelect.options[designMethodSelect.selectedIndex]?.text || '';
        displayText = `${typeLabel} (${methodLabel})`;
    } else {
        displayText = STATE.currentPreset;
    }
    
    if (filterTypeEl) filterTypeEl.textContent = displayText;
    if (numTapsEl) numTapsEl.textContent = CONFIG.numTaps;
    if (sumCoeffsEl) sumCoeffsEl.textContent = sumCoeffs.toFixed(4);
    if (dcGainEl) dcGainEl.textContent = sumCoeffs.toFixed(4);
}

/**
 * Setup UI controls
 */
function setupControls() {
    // Play/Pause Button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', function() {
            STATE.isPlaying = !STATE.isPlaying;
            this.textContent = STATE.isPlaying ? 'Pause' : 'Run';
            this.style.backgroundColor = STATE.isPlaying ? '#002233' : '#330022';
        });
    }

    // Step Forward Button
    const stepFwdBtn = document.getElementById('stepFwdBtn');
    if (stepFwdBtn) {
        stepFwdBtn.addEventListener('click', function() {
            // Pause animation when stepping
            STATE.isPlaying = false;
            playPauseBtn.textContent = 'Run';
            playPauseBtn.style.backgroundColor = '#330022';
            // Step forward one sample
            visualizer.stepForward();
        });
    }

    // Step Backward Button
    const stepBwdBtn = document.getElementById('stepBwdBtn');
    if (stepBwdBtn) {
        stepBwdBtn.addEventListener('click', function() {
            // Pause animation when stepping
            STATE.isPlaying = false;
            playPauseBtn.textContent = 'Run';
            playPauseBtn.style.backgroundColor = '#330022';
            // Step backward one sample
            visualizer.stepBackward();
        });
    }

    // Filter Type and Design Method Dropdowns
    const filterTypeSelect = document.getElementById('filterTypeSelect');
    const designMethodSelect = document.getElementById('designMethodSelect');
    
    /**
     * Apply filter based on current dropdown selections
     */
    function applyFilterSettings() {
        const filterType = filterTypeSelect?.value || 'lowPass';
        const designMethod = designMethodSelect?.value || 'windowedSinc';
        const cutoff = parseFloat(document.getElementById('cutoffSlider')?.value || 0.15);
        
        // Store current settings
        STATE.filterType = filterType;
        STATE.designMethod = designMethod;
        
        switch(designMethod) {
            case 'movingAvg':
                filter.setMovingAverage();
                break;
            case 'windowedSinc':
                switch(filterType) {
                    case 'lowPass':
                        filter.setLowPass(cutoff);
                        break;
                    case 'highPass':
                        filter.setHighPass(cutoff);
                        break;
                    case 'bandPass':
                        filter.setBandPass(cutoff, Math.min(cutoff + 0.2, 0.45));
                        break;
                    case 'bandStop':
                        filter.setBandStop(cutoff, Math.min(cutoff + 0.2, 0.45));
                        break;
                }
                break;
            case 'butterworth':
                filter.setButterworth(cutoff, filterType, 4);
                break;
            case 'chebyshev1':
                filter.setChebyshev1(cutoff, filterType, 0.5);
                break;
            case 'chebyshev2':
                filter.setChebyshev2(cutoff, filterType, 40);
                break;
            case 'elliptic':
                filter.setElliptic(cutoff, filterType, 0.5, 40);
                break;
            default:
                filter.setLowPass(cutoff);
        }
        
        visualizer.drawCoefficients();
        visualizer.drawFrequencyResponse();
        visualizer.calculateZerosFromCoeffs();
        visualizer.drawZPlane();
        updateInfoPanel();
        
        // Debug: Print h[] coefficients to console
        console.log('=== Filter Debug ===');
        console.log('Filter Type:', filterType);
        console.log('Design Method:', designMethod);
        console.log('Cutoff:', cutoff);
        console.log('h[] coefficients:', STATE.coefficients.map(c => c.toFixed(6)));

        // ASCII bar chart of coefficients
        const maxCoeff = Math.max(...STATE.coefficients.map(Math.abs));
        console.log('\nCoefficient Bar Chart:');
        STATE.coefficients.forEach((c, i) => {
            const barLen = Math.round(Math.abs(c) / maxCoeff * 30);
            const bar = c >= 0 ? '█'.repeat(barLen) : '░'.repeat(barLen);
            const sign = c >= 0 ? '+' : '-';
            console.log(`h[${i.toString().padStart(2)}] ${sign}${Math.abs(c).toFixed(6)} | ${bar}`);
        });

        // Check symmetry (linear-phase FIR should have symmetric coefficients)
        console.log('\nSymmetry Check:');
        const N = STATE.coefficients.length;
        let isSymmetric = true;
        for (let i = 0; i < Math.floor(N/2); i++) {
            const diff = Math.abs(STATE.coefficients[i] - STATE.coefficients[N-1-i]);
            if (diff > 1e-10) {
                console.log(`  h[${i}] vs h[${N-1-i}]: ${STATE.coefficients[i].toFixed(6)} vs ${STATE.coefficients[N-1-i].toFixed(6)} (diff: ${diff.toExponential(2)})`);
                isSymmetric = false;
            }
        }
        console.log(isSymmetric ? '  ✓ Coefficients are symmetric' : '  ✗ Coefficients are NOT symmetric');
    }
    
    // Make applyFilterSettings globally accessible
    window.applyFilterSettings = applyFilterSettings;
    
    if (filterTypeSelect) {
        filterTypeSelect.addEventListener('change', applyFilterSettings);
    }
    
    if (designMethodSelect) {
        designMethodSelect.addEventListener('change', applyFilterSettings);
    }

    // Cutoff Frequency Slider
    const cutoffSlider = document.getElementById('cutoffSlider');
    const cutoffValue = document.getElementById('cutoffValue');
    if (cutoffSlider) {
        cutoffSlider.addEventListener('input', function() {
            const cutoff = parseFloat(this.value);
            if (cutoffValue) {
                cutoffValue.textContent = cutoff.toFixed(2) + 'π';
            }
            
            // Apply current filter settings with new cutoff
            applyFilterSettings();
        });
    }

    // Number of Taps Control
    const numTapsSlider = document.getElementById('numTapsSlider');
    const numTapsValue = document.getElementById('numTapsValue');
    if (numTapsSlider) {
        numTapsSlider.value = CONFIG.numTaps;
        if (numTapsValue) numTapsValue.textContent = CONFIG.numTaps;
        
        numTapsSlider.addEventListener('input', function() {
            const newTaps = parseInt(this.value);
            CONFIG.numTaps = newTaps;
            if (numTapsValue) numTapsValue.textContent = newTaps;
            
            // Resize coefficients array
            STATE.coefficients = new Array(newTaps).fill(0);
            
            // Reapply filter with new tap count
            applyFilterSettings();
        });
    }

    // Show Convolution Toggle
    const showConvCheckbox = document.getElementById('showConvolution');
    if (showConvCheckbox) {
        showConvCheckbox.checked = STATE.showConvolution;
        showConvCheckbox.addEventListener('change', function() {
            STATE.showConvolution = this.checked;
        });
    }

    // Animation Speed Slider
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    if (speedSlider) {
        speedSlider.value = CONFIG.animationSpeed;
        if (speedValue) speedValue.textContent = CONFIG.animationSpeed + 'x';
        
        speedSlider.addEventListener('input', function() {
            CONFIG.animationSpeed = parseInt(this.value);
            if (speedValue) speedValue.textContent = CONFIG.animationSpeed + 'x';
        });
    }

    // Noise Amplitude Slider
    const noiseSlider = document.getElementById('noiseSlider');
    const noiseValue = document.getElementById('noiseValue');
    if (noiseSlider) {
        noiseSlider.value = CONFIG.noiseAmp;
        if (noiseValue) noiseValue.textContent = (CONFIG.noiseAmp * 100).toFixed(0) + '%';
        
        noiseSlider.addEventListener('input', function() {
            CONFIG.noiseAmp = parseFloat(this.value);
            if (noiseValue) noiseValue.textContent = (CONFIG.noiseAmp * 100).toFixed(0) + '%';
        });
    }
    
    // Signal Type Dropdown
    const signalTypeSelect = document.getElementById('signalTypeSelect');
    if (signalTypeSelect) {
        signalTypeSelect.value = STATE.signalType;
        
        signalTypeSelect.addEventListener('change', function() {
            STATE.signalType = this.value;
            // Reset generator and buffers when changing signal type
            generator.reset();
            STATE.inputBuffer.fill(0);
            STATE.outputBuffer.fill(0);
        });
    }

    // Reset Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            generator.reset();
            STATE.inputBuffer.fill(0);
            STATE.outputBuffer.fill(0);
            
            // Reset dropdowns to defaults
            if (filterTypeSelect) filterTypeSelect.value = 'lowPass';
            if (designMethodSelect) designMethodSelect.value = 'windowedSinc';
            if (signalTypeSelect) {
                signalTypeSelect.value = 'sineNoise';
                STATE.signalType = 'sineNoise';
            }
            if (cutoffSlider) {
                cutoffSlider.value = 0.15;
                if (cutoffValue) cutoffValue.textContent = '0.15π';
            }
            
            applyFilterSettings();
        });
    }

    // Scale Toggle Button (Linear/dB)
    // Button shows what it will switch TO (the action), not current state
    const scaleToggleBtn = document.getElementById('scaleToggleBtn');
    if (scaleToggleBtn) {
        scaleToggleBtn.addEventListener('click', function() {
            STATE.freqScaleDB = !STATE.freqScaleDB;
            // Show what clicking will switch to (opposite of current state)
            this.textContent = STATE.freqScaleDB ? 'Linear' : 'dB';
            this.classList.toggle('active', STATE.freqScaleDB);
            visualizer.drawFrequencyResponse();
        });
    }

    // Initial filter application
    applyFilterSettings();
    updateInfoPanel();
}

// ===== Initialization =====
$(document).ready(function() {
    // Initialize visualizer
    visualizer.init();
    
    // Setup controls
    setupControls();
    
    // Start animation
    visualizer.start();
    
    console.log('FIR Filter Simulation initialized');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    visualizer.stop();
});
