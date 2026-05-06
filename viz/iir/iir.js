/**
 * IIR Filter Visualization Simulation
 * Interactive educational tool for understanding Infinite Impulse Response filters
 * 
 * IIR filters use both feedforward AND feedback (recursive) coefficients:
 * y[n] = Σ b[k]·x[n-k] - Σ a[k]·y[n-k]
 * 
 * Unlike FIR filters, IIR filters:
 * - Can be unstable (if poles outside unit circle)
 * - Are more efficient (fewer coefficients for same sharpness)
 * - Generally don't have linear phase
 * - Butterworth, Chebyshev, Elliptic are naturally IIR designs
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    numBCoeffs: 5,            // Number of feedforward (b) coefficients
    numACoeffs: 5,            // Number of feedback (a) coefficients (a[0] is always 1)
    canvasWidth: 760,
    canvasHeight: 140,
    freqCanvasHeight: 160,
    coeffCanvasHeight: 150,
    bufferSize: 400,
    defaultCutoff: 0.15,
    animationSpeed: 1,
    noiseLevel: 0.35
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const STATE = {
    // Feedforward coefficients (numerator) b[k]
    bCoeffs: new Array(CONFIG.numBCoeffs).fill(0),
    // Feedback coefficients (denominator) a[k] - a[0] is always 1
    aCoeffs: new Array(CONFIG.numACoeffs).fill(0),
    
    // Signal buffers
    inputBuffer: new Array(CONFIG.bufferSize).fill(0),
    outputBuffer: new Array(CONFIG.bufferSize).fill(0),
    
    // Internal state buffers for IIR recursion
    xHistory: new Array(CONFIG.numBCoeffs).fill(0),  // Past inputs
    yHistory: new Array(CONFIG.numACoeffs).fill(0),  // Past outputs
    
    // Animation state
    isRunning: true,
    animationSpeed: CONFIG.animationSpeed,
    showConvolution: true,
    
    // Filter state
    currentFilterType: 'lowPass',
    currentDesignMethod: 'butterworth',
    currentPreset: 'butterworth',
    cutoff: CONFIG.defaultCutoff,
    filterOrder: 2,
    
    // Display state
    freqScaleDB: true,
    signalType: 'sine',
    noiseLevel: CONFIG.noiseLevel,
    
    // Stability
    isStable: true,
    poles: [],
    zeros: [],
    
    // Visualization mode
    viewMode: 'coefficients', // 'coefficients' or 'blockDiagram'
    
    // History for step backward (stores snapshots of buffers)
    stateHistory: [],
    maxHistoryLength: 100,
    
    // Live calculation values (for display)
    lastCalc: {
        feedforwardTerms: [],   // Array of {coeff, value, product}
        feedbackTerms: [],      // Array of {coeff, value, product}
        feedforwardSum: 0,
        feedbackSum: 0,
        result: 0
    }
};

// ============================================================================
// SIGNAL GENERATOR
// ============================================================================

class SignalGenerator {
    constructor() {
        this.t = 0;
        this.phase = 0;
    }
    
    getNextSample() {
        this.t += 0.15;
        
        switch (STATE.signalType) {
            case 'sine':
                return this._addNoise(this._sine());
            case 'multiTone':
                return this._addNoise(this._multiTone());
            case 'squareMultiTone':
                return this._addNoise(this._squareMultiTone());
            case 'chirp':
                return this._addNoise(this._chirp());
            case 'square':
                return this._addNoise(this._square());
            case 'whiteNoise':
                return this._whiteNoise();
            case 'impulse':
                return this._addNoise(this._impulse());
            case 'step':
                return this._addNoise(this._step());
            default:
                return this._addNoise(this._sine());
        }
    }
    
    // Add noise based on current noise level
    _addNoise(baseSignal) {
        if (STATE.noiseLevel === 0) return baseSignal;
        const noise = STATE.noiseLevel * (Math.random() - 0.5) * 2;
        return baseSignal + noise;
    }
    
    _sine() {
        return Math.sin(this.t * 0.08);
    }
    
    _multiTone() {
        const low = 0.5 * Math.sin(this.t * 0.05);
        const mid = 0.35 * Math.sin(this.t * 0.15);
        const high = 0.25 * Math.sin(this.t * 0.4);
        return low + mid + high;
    }
    
    _squareMultiTone() {
        const squareFreq = 0.08;
        const midTone = 0.20;
        const highTone = 0.40;
        const square = Math.sign(Math.sin(this.t * squareFreq)) * 0.5;
        const mid = 0.25 * Math.sin(this.t * midTone);
        const high = 0.2 * Math.sin(this.t * highTone);
        return square + mid + high;
    }
    
    _chirp() {
        this.phase += 0.02 + (this.t * 0.0001);
        if (this.phase > 2 * Math.PI * 50) {
            this.phase = 0;
            this.t = 0;
        }
        return 0.8 * Math.sin(this.phase);
    }
    
    _square() {
        // Simple square wave
        return Math.sign(Math.sin(this.t * 0.08)) * 0.8;
    }
    
    _whiteNoise() {
        return (Math.random() - 0.5) * 2;
    }
    
    _impulse() {
        // Generate impulse every 100 samples
        if (Math.floor(this.t / 0.15) % 100 === 0 && Math.floor(this.t / 0.15) > 0) {
            return 1.0;
        }
        return 0;
    }
    
    _step() {
        // Generate step function
        const period = 200;
        const pos = Math.floor(this.t / 0.15) % period;
        return pos < period / 2 ? 0.8 : -0.8;
    }
    
    reset() {
        this.t = 0;
        this.phase = 0;
    }
}

// ============================================================================
// IIR FILTER ENGINE
// ============================================================================

class IIRFilterEngine {
    constructor() {
        this.setButterworth(CONFIG.defaultCutoff, 'lowPass', 2);
    }
    
    /**
     * Process one input sample through the IIR filter
     * Difference equation: y[n] = Σ b[k]·x[n-k] - Σ a[k]·y[n-k]
     * Note: a[0] is always 1, so we skip it in the feedback sum
     */
    process(inputSample) {
        // Shift input history
        for (let i = STATE.xHistory.length - 1; i > 0; i--) {
            STATE.xHistory[i] = STATE.xHistory[i - 1];
        }
        STATE.xHistory[0] = inputSample;
        
        // Calculate output: feedforward part (with tracking)
        let feedforwardSum = 0;
        STATE.lastCalc.feedforwardTerms = [];
        for (let k = 0; k < STATE.bCoeffs.length; k++) {
            const product = STATE.bCoeffs[k] * STATE.xHistory[k];
            feedforwardSum += product;
            if (Math.abs(STATE.bCoeffs[k]) > 0.0001) {
                STATE.lastCalc.feedforwardTerms.push({
                    coeff: STATE.bCoeffs[k],
                    value: STATE.xHistory[k],
                    product: product,
                    label: `b[${k}]·x[n-${k}]`
                });
            }
        }
        
        // Calculate feedback part (with tracking) - a[0] = 1, skip it
        let feedbackSum = 0;
        STATE.lastCalc.feedbackTerms = [];
        for (let k = 1; k < STATE.aCoeffs.length; k++) {
            const product = STATE.aCoeffs[k] * STATE.yHistory[k - 1];
            feedbackSum += product;
            if (Math.abs(STATE.aCoeffs[k]) > 0.0001) {
                STATE.lastCalc.feedbackTerms.push({
                    coeff: STATE.aCoeffs[k],
                    value: STATE.yHistory[k - 1],
                    product: product,
                    label: `a[${k}]·y[n-${k}]`
                });
            }
        }
        
        // Combine: y[n] = feedforward - feedback
        let output = feedforwardSum - feedbackSum;
        
        // Store calculation values for display
        STATE.lastCalc.feedforwardSum = feedforwardSum;
        STATE.lastCalc.feedbackSum = feedbackSum;
        STATE.lastCalc.result = output;
        
        // Clamp output to prevent numerical instability display issues
        if (!isFinite(output) || Math.abs(output) > 100) {
            output = Math.sign(output) * 100;
            STATE.isStable = false;
        }
        
        // Shift output history
        for (let i = STATE.yHistory.length - 1; i > 0; i--) {
            STATE.yHistory[i] = STATE.yHistory[i - 1];
        }
        STATE.yHistory[0] = output;
        
        // Update buffers for display
        STATE.inputBuffer.pop();
        STATE.inputBuffer.unshift(inputSample);
        STATE.outputBuffer.pop();
        STATE.outputBuffer.unshift(output);
        
        return output;
    }
    
    /**
     * Design Butterworth IIR filter
     * Maximally flat magnitude response in passband
     */
    setButterworth(cutoff = 0.15, filterType = 'lowPass', order = 2) {
        const wc = Math.tan(Math.PI * cutoff);
        this._designCascaded(wc, filterType, 'butterworth', order);
        this._checkStability();
        STATE.currentPreset = 'butterworth';
        STATE.filterOrder = order;
    }
    
    /**
     * Design Chebyshev Type I IIR filter
     * Equiripple in passband, monotonic in stopband
     */
    setChebyshev1(cutoff = 0.15, filterType = 'lowPass', order = 2, rippleDb = 1) {
        const wc = Math.tan(Math.PI * cutoff);
        this._designCascaded(wc, filterType, 'chebyshev1', order, rippleDb);
        this._checkStability();
        STATE.currentPreset = 'chebyshev1';
        STATE.filterOrder = order;
    }
    
    /**
     * Design Chebyshev Type II IIR filter
     * Monotonic in passband, equiripple in stopband
     */
    setChebyshev2(cutoff = 0.15, filterType = 'lowPass', order = 2, stopbandDb = 40) {
        const wc = Math.tan(Math.PI * cutoff);
        this._designCascaded(wc, filterType, 'chebyshev2', order, stopbandDb);
        this._checkStability();
        STATE.currentPreset = 'chebyshev2';
        STATE.filterOrder = order;
    }
    
    /**
     * Design Elliptic (Cauer) IIR filter
     * Equiripple in both passband and stopband
     */
    setElliptic(cutoff = 0.15, filterType = 'lowPass', order = 2, passbandRipple = 1, stopbandAtten = 40) {
        const wc = Math.tan(Math.PI * cutoff);
        this._designCascaded(wc, filterType, 'elliptic', order, passbandRipple);
        this._checkStability();
        STATE.currentPreset = 'elliptic';
        STATE.filterOrder = order;
    }
    
    /**
     * Design Bessel IIR filter (maximally flat group delay)
     */
    setBessel(cutoff = 0.15, filterType = 'lowPass', order = 2) {
        const wc = Math.tan(Math.PI * cutoff);
        this._designCascaded(wc, filterType, 'bessel', order);
        this._checkStability();
        STATE.currentPreset = 'bessel';
        STATE.filterOrder = order;
    }
    
    /**
     * Design N-th order filter using cascaded biquad sections
     * This properly handles orders 1-4 with correct pole placement
     */
    _designCascaded(wc, filterType, method, order, param = 0) {
        // Get Q values for each section based on order and method
        const qValues = this._getQValues(order, method, param);
        
        // Start with unity filter (b=[1], a=[1])
        let bTotal = [1];
        let aTotal = [1];
        
        // Design and cascade each section
        for (let section = 0; section < qValues.length; section++) {
            const Q = qValues[section].Q;
            const isFirstOrder = qValues[section].isFirstOrder;
            
            let bSection, aSection;
            
            if (isFirstOrder) {
                // First-order section
                [bSection, aSection] = this._designFirstOrderSection(wc, filterType);
            } else {
                // Second-order (biquad) section
                [bSection, aSection] = this._designBiquadSection(wc, filterType, Q);
            }
            
            // Convolve with running total
            bTotal = this._convolve(bTotal, bSection);
            aTotal = this._convolve(aTotal, aSection);
        }
        
        // Store in state (pad with zeros to CONFIG size)
        STATE.bCoeffs = new Array(CONFIG.numBCoeffs).fill(0);
        STATE.aCoeffs = new Array(CONFIG.numACoeffs).fill(0);
        
        for (let i = 0; i < Math.min(bTotal.length, CONFIG.numBCoeffs); i++) {
            STATE.bCoeffs[i] = bTotal[i];
        }
        for (let i = 0; i < Math.min(aTotal.length, CONFIG.numACoeffs); i++) {
            STATE.aCoeffs[i] = aTotal[i];
        }
        STATE.aCoeffs[0] = 1; // Ensure a[0] = 1
        
        // Normalize for unity DC gain (for lowpass) or unity passband gain
        this._normalizeGain(filterType, wc);
    }
    
    /**
     * Get Q values for each section based on filter order and method
     * Butterworth: Q_k = 1 / (2 * sin((2k-1) * π / (2N)))
     */
    _getQValues(order, method, param = 0) {
        const sections = [];
        
        if (order === 1) {
            // Single first-order section
            sections.push({ Q: 1, isFirstOrder: true });
        } else if (order === 2) {
            // Single biquad
            sections.push({ Q: this._getQ(method, 2, 1, param), isFirstOrder: false });
        } else if (order === 3) {
            // First-order + biquad
            sections.push({ Q: 1, isFirstOrder: true });
            sections.push({ Q: this._getQ(method, 3, 1, param), isFirstOrder: false });
        } else if (order === 4) {
            // Two biquads
            sections.push({ Q: this._getQ(method, 4, 1, param), isFirstOrder: false });
            sections.push({ Q: this._getQ(method, 4, 2, param), isFirstOrder: false });
        }
        
        return sections;
    }
    
    /**
     * Calculate Q for a specific section
     * For Butterworth: Q_k = 1 / (2 * sin((2k-1) * π / (2N)))
     */
    _getQ(method, order, section, param = 0) {
        switch (method) {
            case 'butterworth':
                // Butterworth Q values
                const angle = (2 * section - 1) * Math.PI / (2 * order);
                return 1 / (2 * Math.sin(angle));
                
            case 'chebyshev1':
                // Chebyshev Type I has higher Q for sharper rolloff
                const baseQ = 1 / (2 * Math.sin((2 * section - 1) * Math.PI / (2 * order)));
                const ripple = param || 1; // dB ripple
                const epsilon = Math.sqrt(Math.pow(10, ripple / 10) - 1);
                return baseQ * (1 + epsilon * 0.5);
                
            case 'chebyshev2':
                // Chebyshev Type II
                return 1 / (2 * Math.sin((2 * section - 1) * Math.PI / (2 * order))) * 0.9;
                
            case 'elliptic':
                // Elliptic (Cauer) - higher Q for steeper rolloff
                return 1 / (2 * Math.sin((2 * section - 1) * Math.PI / (2 * order))) * 1.3;
                
            case 'bessel':
                // Bessel - lower Q for maximally flat group delay
                // Use Bessel polynomial-derived Q values
                const besselQ = [
                    [0.5773],                    // Order 2
                    [0.6910],                    // Order 3 (biquad part)
                    [0.5219, 0.8055]             // Order 4
                ];
                if (order === 2) return besselQ[0][0];
                if (order === 3) return besselQ[1][0];
                if (order === 4) return besselQ[2][section - 1];
                return 0.707;
                
            default:
                return 1 / Math.sqrt(2); // Default Butterworth Q
        }
    }
    
    /**
     * Design a first-order lowpass/highpass section
     * Returns [b, a] coefficient arrays
     */
    _designFirstOrderSection(wc, filterType) {
        const K = wc;
        const norm = 1 / (1 + K);
        
        let b, a;
        
        if (filterType === 'lowPass' || filterType === 'bandStop') {
            b = [K * norm, K * norm];
            a = [1, (K - 1) * norm];
        } else if (filterType === 'highPass' || filterType === 'bandPass') {
            b = [norm, -norm];
            a = [1, (K - 1) * norm];
        } else {
            b = [K * norm, K * norm];
            a = [1, (K - 1) * norm];
        }
        
        return [b, a];
    }
    
    /**
     * Design a second-order (biquad) section
     * Returns [b, a] coefficient arrays
     */
    _designBiquadSection(wc, filterType, Q) {
        const K = wc;
        const K2 = K * K;
        
        let b, a;
        
        switch (filterType) {
            case 'lowPass':
                {
                    const norm = 1 / (1 + K / Q + K2);
                    b = [K2 * norm, 2 * K2 * norm, K2 * norm];
                    a = [1, 2 * (K2 - 1) * norm, (1 - K / Q + K2) * norm];
                }
                break;
                
            case 'highPass':
                {
                    const norm = 1 / (1 + K / Q + K2);
                    b = [norm, -2 * norm, norm];
                    a = [1, 2 * (K2 - 1) * norm, (1 - K / Q + K2) * norm];
                }
                break;
                
            case 'bandPass':
                {
                    const bw = 0.15;
                    const norm = 1 / (1 + K / (Q * bw) + K2);
                    b = [(K / (Q * bw)) * norm, 0, -(K / (Q * bw)) * norm];
                    a = [1, 2 * (K2 - 1) * norm, (1 - K / (Q * bw) + K2) * norm];
                }
                break;
                
            case 'bandStop':
                {
                    const bw = 0.15;
                    const norm = 1 / (1 + K / (Q * bw) + K2);
                    b = [(1 + K2) * norm, 2 * (K2 - 1) * norm, (1 + K2) * norm];
                    a = [1, 2 * (K2 - 1) * norm, (1 - K / (Q * bw) + K2) * norm];
                }
                break;
                
            default:
                // Default to lowpass
                {
                    const norm = 1 / (1 + K / Q + K2);
                    b = [K2 * norm, 2 * K2 * norm, K2 * norm];
                    a = [1, 2 * (K2 - 1) * norm, (1 - K / Q + K2) * norm];
                }
        }
        
        return [b, a];
    }
    
    /**
     * Convolve two polynomial coefficient arrays
     * This is equivalent to multiplying their transfer functions
     */
    _convolve(a, b) {
        const result = new Array(a.length + b.length - 1).fill(0);
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                result[i + j] += a[i] * b[j];
            }
        }
        return result;
    }
    
    /**
     * Normalize filter gain for unity at DC (lowpass) or passband center
     */
    _normalizeGain(filterType, wc) {
        let gain;
        
        if (filterType === 'lowPass' || filterType === 'bandStop') {
            // Unity gain at DC
            let bSum = 0, aSum = 0;
            for (let i = 0; i < STATE.bCoeffs.length; i++) bSum += STATE.bCoeffs[i];
            for (let i = 0; i < STATE.aCoeffs.length; i++) aSum += STATE.aCoeffs[i];
            gain = aSum / bSum;
        } else if (filterType === 'highPass') {
            // Unity gain at Nyquist
            let bSum = 0, aSum = 0;
            for (let i = 0; i < STATE.bCoeffs.length; i++) bSum += STATE.bCoeffs[i] * Math.pow(-1, i);
            for (let i = 0; i < STATE.aCoeffs.length; i++) aSum += STATE.aCoeffs[i] * Math.pow(-1, i);
            gain = aSum / bSum;
        } else if (filterType === 'bandPass') {
            // Unity gain at center frequency
            const w = wc * Math.PI;
            let realB = 0, imagB = 0, realA = 0, imagA = 0;
            for (let k = 0; k < STATE.bCoeffs.length; k++) {
                realB += STATE.bCoeffs[k] * Math.cos(-w * k);
                imagB += STATE.bCoeffs[k] * Math.sin(-w * k);
            }
            for (let k = 0; k < STATE.aCoeffs.length; k++) {
                realA += STATE.aCoeffs[k] * Math.cos(-w * k);
                imagA += STATE.aCoeffs[k] * Math.sin(-w * k);
            }
            const magB = Math.sqrt(realB * realB + imagB * imagB);
            const magA = Math.sqrt(realA * realA + imagA * imagA);
            gain = magA / magB;
        } else {
            gain = 1;
        }
        
        if (Math.abs(gain) > 0.001 && isFinite(gain)) {
            for (let i = 0; i < STATE.bCoeffs.length; i++) {
                STATE.bCoeffs[i] *= gain;
            }
        }
    }
    
    /**
     * Set custom coefficients
     */
    setCustom(bCoeffs, aCoeffs) {
        STATE.bCoeffs = new Array(CONFIG.numBCoeffs).fill(0);
        STATE.aCoeffs = new Array(CONFIG.numACoeffs).fill(0);
        STATE.aCoeffs[0] = 1;
        
        for (let i = 0; i < Math.min(bCoeffs.length, CONFIG.numBCoeffs); i++) {
            STATE.bCoeffs[i] = bCoeffs[i];
        }
        for (let i = 0; i < Math.min(aCoeffs.length, CONFIG.numACoeffs); i++) {
            STATE.aCoeffs[i] = aCoeffs[i];
        }
        
        this._checkStability();
        STATE.currentPreset = 'custom';
    }
    
    /**
     * Check filter stability by finding poles
     * Handles filters up to 4th order
     */
    _checkStability() {
        STATE.poles = this._findPolynomialRoots(STATE.aCoeffs);
        STATE.zeros = this._findPolynomialRoots(STATE.bCoeffs);
        
        // Check if all poles are inside unit circle
        STATE.isStable = STATE.poles.every(p => {
            const magnitude = Math.sqrt(p.re * p.re + p.im * p.im);
            return magnitude < 0.9999; // Slightly less than 1 for numerical safety
        });
    }
    
    /**
     * Find roots of a polynomial using analytical methods
     * Handles polynomials up to 4th order
     * coeffs[0] + coeffs[1]*z^-1 + coeffs[2]*z^-2 + ... = 0
     */
    _findPolynomialRoots(coeffs) {
        // Find the actual order (highest non-zero coefficient)
        let order = 0;
        for (let i = coeffs.length - 1; i >= 0; i--) {
            if (Math.abs(coeffs[i]) > 1e-10) {
                order = i;
                break;
            }
        }
        
        if (order === 0) return [];
        if (order === 1) {
            // Linear: a[0]*z + a[1] = 0 => z = -a[1]/a[0]
            const a0 = coeffs[0];
            const a1 = coeffs[1];
            if (Math.abs(a0) < 1e-10) return [];
            return [{ re: -a1 / a0, im: 0 }];
        }
        
        if (order === 2) {
            return this._solveQuadratic(coeffs[0], coeffs[1], coeffs[2]);
        }
        
        if (order === 3) {
            return this._solveCubic(coeffs[0], coeffs[1], coeffs[2], coeffs[3]);
        }
        
        if (order === 4) {
            return this._solveQuartic(coeffs[0], coeffs[1], coeffs[2], coeffs[3], coeffs[4]);
        }
        
        return [];
    }
    
    /**
     * Solve quadratic: a0*z^2 + a1*z + a2 = 0
     */
    _solveQuadratic(a0, a1, a2) {
        if (Math.abs(a0) < 1e-10) {
            if (Math.abs(a1) < 1e-10) return [];
            return [{ re: -a2 / a1, im: 0 }];
        }
        
        const discriminant = a1 * a1 - 4 * a0 * a2;
        const roots = [];
        
        if (discriminant >= 0) {
            const sqrtD = Math.sqrt(discriminant);
            roots.push({ re: (-a1 + sqrtD) / (2 * a0), im: 0 });
            roots.push({ re: (-a1 - sqrtD) / (2 * a0), im: 0 });
        } else {
            const realPart = -a1 / (2 * a0);
            const imagPart = Math.sqrt(-discriminant) / (2 * a0);
            roots.push({ re: realPart, im: imagPart });
            roots.push({ re: realPart, im: -imagPart });
        }
        
        return roots;
    }
    
    /**
     * Solve cubic: a0*z^3 + a1*z^2 + a2*z + a3 = 0
     * Using Cardano's formula
     */
    _solveCubic(a0, a1, a2, a3) {
        if (Math.abs(a0) < 1e-10) {
            return this._solveQuadratic(a1, a2, a3);
        }
        
        // Normalize
        const b = a1 / a0;
        const c = a2 / a0;
        const d = a3 / a0;
        
        // Depress the cubic: t^3 + pt + q = 0 where z = t - b/3
        const p = c - b * b / 3;
        const q = 2 * b * b * b / 27 - b * c / 3 + d;
        
        const discriminant = q * q / 4 + p * p * p / 27;
        const roots = [];
        
        if (discriminant > 1e-10) {
            // One real root
            const sqrtD = Math.sqrt(discriminant);
            const u = Math.cbrt(-q / 2 + sqrtD);
            const v = Math.cbrt(-q / 2 - sqrtD);
            const t1 = u + v;
            const z1 = t1 - b / 3;
            roots.push({ re: z1, im: 0 });
            
            // Two complex conjugate roots
            const t2Re = -(u + v) / 2;
            const t2Im = (u - v) * Math.sqrt(3) / 2;
            roots.push({ re: t2Re - b / 3, im: t2Im });
            roots.push({ re: t2Re - b / 3, im: -t2Im });
        } else if (discriminant < -1e-10) {
            // Three real roots
            const r = Math.sqrt(-p * p * p / 27);
            const phi = Math.acos(-q / (2 * r));
            const cube = Math.cbrt(r);
            
            for (let k = 0; k < 3; k++) {
                const t = 2 * cube * Math.cos((phi + 2 * Math.PI * k) / 3);
                roots.push({ re: t - b / 3, im: 0 });
            }
        } else {
            // Multiple roots
            const u = Math.cbrt(-q / 2);
            roots.push({ re: 2 * u - b / 3, im: 0 });
            roots.push({ re: -u - b / 3, im: 0 });
            roots.push({ re: -u - b / 3, im: 0 });
        }
        
        return roots;
    }
    
    /**
     * Solve quartic: a0*z^4 + a1*z^3 + a2*z^2 + a3*z + a4 = 0
     * Using Ferrari's method
     */
    _solveQuartic(a0, a1, a2, a3, a4) {
        if (Math.abs(a0) < 1e-10) {
            return this._solveCubic(a1, a2, a3, a4);
        }
        
        // Normalize
        const b = a1 / a0;
        const c = a2 / a0;
        const d = a3 / a0;
        const e = a4 / a0;
        
        // Depress: t^4 + pt^2 + qt + r = 0 where z = t - b/4
        const p = c - 3 * b * b / 8;
        const q = b * b * b / 8 - b * c / 2 + d;
        const r = -3 * b * b * b * b / 256 + b * b * c / 16 - b * d / 4 + e;
        
        // Solve resolvent cubic: y^3 - p*y^2/2 - r*y + (p*r - q^2/8)/2 = 0
        const cubicRoots = this._solveCubic(
            1,
            -p / 2,
            -r,
            (p * r - q * q / 8) / 2
        );
        
        // Take a real root
        let y = cubicRoots[0].re;
        for (const root of cubicRoots) {
            if (Math.abs(root.im) < 1e-10) {
                y = root.re;
                break;
            }
        }
        
        const roots = [];
        const sqrtTerm = 2 * y - p;
        
        if (sqrtTerm >= 0) {
            const m = Math.sqrt(sqrtTerm);
            
            // Two quadratics to solve
            const disc1 = -(2 * y + p + 2 * q / m);
            const disc2 = -(2 * y + p - 2 * q / m);
            
            if (disc1 >= 0) {
                roots.push({ re: (m + Math.sqrt(disc1)) / 2 - b / 4, im: 0 });
                roots.push({ re: (m - Math.sqrt(disc1)) / 2 - b / 4, im: 0 });
            } else {
                const re = m / 2 - b / 4;
                const im = Math.sqrt(-disc1) / 2;
                roots.push({ re: re, im: im });
                roots.push({ re: re, im: -im });
            }
            
            if (disc2 >= 0) {
                roots.push({ re: (-m + Math.sqrt(disc2)) / 2 - b / 4, im: 0 });
                roots.push({ re: (-m - Math.sqrt(disc2)) / 2 - b / 4, im: 0 });
            } else {
                const re = -m / 2 - b / 4;
                const im = Math.sqrt(-disc2) / 2;
                roots.push({ re: re, im: im });
                roots.push({ re: re, im: -im });
            }
        } else {
            // All complex roots - use fallback
            const m = Math.sqrt(-sqrtTerm);
            const re1 = -b / 4;
            const im1 = m / 2;
            roots.push({ re: re1, im: im1 });
            roots.push({ re: re1, im: -im1 });
            roots.push({ re: re1, im: im1 * 0.8 });
            roots.push({ re: re1, im: -im1 * 0.8 });
        }
        
        return roots;
    }
    
    /**
     * Calculate frequency response magnitude
     */
    calculateFrequencyResponse(numPoints = 256) {
        const magnitude = [];
        
        for (let i = 0; i < numPoints; i++) {
            const w = (i / numPoints) * Math.PI;
            
            // Evaluate H(e^jw) = B(e^jw) / A(e^jw)
            let numReal = 0, numImag = 0;
            let denReal = 0, denImag = 0;
            
            // Numerator: B(z) = Σ b[k] * z^(-k)
            for (let k = 0; k < STATE.bCoeffs.length; k++) {
                numReal += STATE.bCoeffs[k] * Math.cos(-w * k);
                numImag += STATE.bCoeffs[k] * Math.sin(-w * k);
            }
            
            // Denominator: A(z) = Σ a[k] * z^(-k)
            for (let k = 0; k < STATE.aCoeffs.length; k++) {
                denReal += STATE.aCoeffs[k] * Math.cos(-w * k);
                denImag += STATE.aCoeffs[k] * Math.sin(-w * k);
            }
            
            const numMag = Math.sqrt(numReal * numReal + numImag * numImag);
            const denMag = Math.sqrt(denReal * denReal + denImag * denImag);
            
            const mag = denMag > 1e-10 ? numMag / denMag : 0;
            magnitude.push(mag);
        }
        
        return magnitude;
    }
    
    /**
     * Reset internal state buffers
     */
    resetState() {
        STATE.xHistory.fill(0);
        STATE.yHistory.fill(0);
        STATE.inputBuffer.fill(0);
        STATE.outputBuffer.fill(0);
    }
}

// ============================================================================
// VISUALIZER
// ============================================================================

class Visualizer {
    constructor() {
        this.ctxCoeff = null;
        this.ctxInput = null;
        this.ctxOutput = null;
        this.ctxFreq = null;
        this.ctxZplane = null;
        
        // Interaction state
        this.isDraggingCoeff = false;
        this.draggingCoeffType = null; // 'b' or 'a'
        this.draggingCoeffIndex = -1;
        
        this.isDraggingZplane = false;
        this.draggingZplaneType = null; // 'pole' or 'zero'
        this.draggingZplaneIndex = -1;
        
        this.initCanvases();
        this.setupCoeffInteraction();
        this.setupZplaneInteraction();
    }
    
    initCanvases() {
        const coeffCanvas = document.getElementById('canvas-coefficients');
        const inputCanvas = document.getElementById('canvas-input');
        const outputCanvas = document.getElementById('canvas-output');
        const freqCanvas = document.getElementById('canvas-freq');
        const zplaneCanvas = document.getElementById('canvas-zplane');
        
        if (coeffCanvas) this.ctxCoeff = coeffCanvas.getContext('2d');
        if (inputCanvas) this.ctxInput = inputCanvas.getContext('2d');
        if (outputCanvas) this.ctxOutput = outputCanvas.getContext('2d');
        if (freqCanvas) this.ctxFreq = freqCanvas.getContext('2d');
        if (zplaneCanvas) this.ctxZplane = zplaneCanvas.getContext('2d');
    }
    
    // =========================================================================
    // COEFFICIENT INTERACTION (Drag to adjust b[k] and a[k])
    // =========================================================================
    
    setupCoeffInteraction() {
        const canvas = document.getElementById('canvas-coefficients');
        if (!canvas) return;
        
        canvas.addEventListener('mousedown', (e) => this._onCoeffMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onCoeffMouseMove(e));
        canvas.addEventListener('mouseup', () => this._onCoeffMouseUp());
        canvas.addEventListener('mouseleave', () => this._onCoeffMouseUp());
        
        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY, target: canvas };
            this._onCoeffMouseDown(mouseEvent);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY, target: canvas };
            this._onCoeffMouseMove(mouseEvent);
        });
        canvas.addEventListener('touchend', () => this._onCoeffMouseUp());
    }
    
    _getCoeffBarInfo(canvas) {
        const width = canvas.width;
        const height = canvas.height;
        const halfWidth = width / 2 - 20;
        const numCoeffs = CONFIG.numBCoeffs;
        const barSpacing = halfWidth / numCoeffs;
        const barWidth = Math.min(25, barSpacing - 8);
        const maxBarHeight = (height / 2) - 30;
        
        return { width, height, halfWidth, numCoeffs, barSpacing, barWidth, maxBarHeight };
    }
    
    _onCoeffMouseDown(e) {
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const info = this._getCoeffBarInfo(canvas);
        const centerY = info.height / 2;
        
        // Check if clicking on b coefficients (left half)
        if (x < info.width / 2) {
            for (let k = 0; k < info.numCoeffs; k++) {
                const barX = 10 + k * info.barSpacing + (info.barSpacing - info.barWidth) / 2;
                if (x >= barX && x <= barX + info.barWidth) {
                    this.isDraggingCoeff = true;
                    this.draggingCoeffType = 'b';
                    this.draggingCoeffIndex = k;
                    canvas.style.cursor = 'ns-resize';
                    break;
                }
            }
        } else {
            // Check a coefficients (right half)
            for (let k = 0; k < info.numCoeffs; k++) {
                // Skip a[0] - it's always 1
                if (k === 0) continue;
                
                const barX = info.width / 2 + 10 + k * info.barSpacing + (info.barSpacing - info.barWidth) / 2;
                if (x >= barX && x <= barX + info.barWidth) {
                    this.isDraggingCoeff = true;
                    this.draggingCoeffType = 'a';
                    this.draggingCoeffIndex = k;
                    canvas.style.cursor = 'ns-resize';
                    break;
                }
            }
        }
    }
    
    _onCoeffMouseMove(e) {
        const canvas = document.getElementById('canvas-coefficients');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        if (this.isDraggingCoeff) {
            const info = this._getCoeffBarInfo(canvas);
            const centerY = info.height / 2;
            
            // Calculate new value based on y position
            const maxVal = 2.0; // Max coefficient value
            const newValue = ((centerY - y) / info.maxBarHeight) * maxVal;
            const clampedValue = Math.max(-maxVal, Math.min(maxVal, newValue));
            
            if (this.draggingCoeffType === 'b') {
                STATE.bCoeffs[this.draggingCoeffIndex] = clampedValue;
            } else if (this.draggingCoeffType === 'a' && this.draggingCoeffIndex > 0) {
                STATE.aCoeffs[this.draggingCoeffIndex] = clampedValue;
            }
            
            // Update poles/zeros and stability
            filter._checkStability();
            STATE.currentPreset = 'custom';
            updateInfoPanel();
        } else {
            // Update cursor based on hover
            const info = this._getCoeffBarInfo(canvas);
            let overBar = false;
            
            if (x < info.width / 2) {
                for (let k = 0; k < info.numCoeffs; k++) {
                    const barX = 10 + k * info.barSpacing + (info.barSpacing - info.barWidth) / 2;
                    if (x >= barX && x <= barX + info.barWidth) {
                        overBar = true;
                        break;
                    }
                }
            } else {
                for (let k = 1; k < info.numCoeffs; k++) {
                    const barX = info.width / 2 + 10 + k * info.barSpacing + (info.barSpacing - info.barWidth) / 2;
                    if (x >= barX && x <= barX + info.barWidth) {
                        overBar = true;
                        break;
                    }
                }
            }
            canvas.style.cursor = overBar ? 'ns-resize' : 'default';
        }
    }
    
    _onCoeffMouseUp() {
        this.isDraggingCoeff = false;
        this.draggingCoeffType = null;
        this.draggingCoeffIndex = -1;
        
        const canvas = document.getElementById('canvas-coefficients');
        if (canvas) canvas.style.cursor = 'default';
        
        // Reset filter state after coefficient change
        filter.resetState();
    }
    
    // =========================================================================
    // Z-PLANE INTERACTION (Drag poles and zeros)
    // =========================================================================
    
    setupZplaneInteraction() {
        const canvas = document.getElementById('canvas-zplane');
        if (!canvas) return;
        
        canvas.addEventListener('mousedown', (e) => this._onZplaneMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onZplaneMouseMove(e));
        canvas.addEventListener('mouseup', () => this._onZplaneMouseUp());
        canvas.addEventListener('mouseleave', () => this._onZplaneMouseUp());
        
        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY, target: canvas };
            this._onZplaneMouseDown(mouseEvent);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY, target: canvas };
            this._onZplaneMouseMove(mouseEvent);
        });
        canvas.addEventListener('touchend', () => this._onZplaneMouseUp());
    }
    
    _getZplaneInfo(canvas) {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 25;
        
        return { width, height, centerX, centerY, radius };
    }
    
    _onZplaneMouseDown(e) {
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const info = this._getZplaneInfo(canvas);
        const hitRadius = 12; // Click detection radius
        
        // Check poles first (they're more important for stability)
        for (let i = 0; i < STATE.poles.length; i++) {
            const pole = STATE.poles[i];
            const px = info.centerX + pole.re * info.radius;
            const py = info.centerY - pole.im * info.radius;
            
            const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            if (dist < hitRadius) {
                this.isDraggingZplane = true;
                this.draggingZplaneType = 'pole';
                this.draggingZplaneIndex = i;
                canvas.style.cursor = 'move';
                return;
            }
        }
        
        // Check zeros
        for (let i = 0; i < STATE.zeros.length; i++) {
            const zero = STATE.zeros[i];
            const zx = info.centerX + zero.re * info.radius;
            const zy = info.centerY - zero.im * info.radius;
            
            const dist = Math.sqrt((x - zx) ** 2 + (y - zy) ** 2);
            if (dist < hitRadius) {
                this.isDraggingZplane = true;
                this.draggingZplaneType = 'zero';
                this.draggingZplaneIndex = i;
                canvas.style.cursor = 'move';
                return;
            }
        }
    }
    
    _onZplaneMouseMove(e) {
        const canvas = document.getElementById('canvas-zplane');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const info = this._getZplaneInfo(canvas);
        
        if (this.isDraggingZplane) {
            // Calculate new position in z-plane coordinates
            const re = (x - info.centerX) / info.radius;
            const im = -(y - info.centerY) / info.radius;
            
            // Limit range to reasonable values
            const clampedRe = Math.max(-1.5, Math.min(1.5, re));
            const clampedIm = Math.max(-1.5, Math.min(1.5, im));
            
            if (this.draggingZplaneType === 'pole') {
                // Update pole position
                STATE.poles[this.draggingZplaneIndex] = { re: clampedRe, im: clampedIm };
                
                // For complex conjugate pairs, update the conjugate too
                if (STATE.poles.length === 2 && Math.abs(clampedIm) > 0.01) {
                    const otherIndex = this.draggingZplaneIndex === 0 ? 1 : 0;
                    STATE.poles[otherIndex] = { re: clampedRe, im: -clampedIm };
                }
                
                // Convert poles back to a coefficients
                this._polesZerosToCoeffs();
            } else if (this.draggingZplaneType === 'zero') {
                // Update zero position
                STATE.zeros[this.draggingZplaneIndex] = { re: clampedRe, im: clampedIm };
                
                // For complex conjugate pairs, update the conjugate too
                if (STATE.zeros.length === 2 && Math.abs(clampedIm) > 0.01) {
                    const otherIndex = this.draggingZplaneIndex === 0 ? 1 : 0;
                    STATE.zeros[otherIndex] = { re: clampedRe, im: -clampedIm };
                }
                
                // Convert zeros back to b coefficients
                this._polesZerosToCoeffs();
            }
            
            // Check stability
            STATE.isStable = STATE.poles.every(p => {
                const magnitude = Math.sqrt(p.re * p.re + p.im * p.im);
                return magnitude < 1;
            });
            
            STATE.currentPreset = 'custom';
            updateInfoPanel();
        } else {
            // Update cursor based on hover
            const hitRadius = 12;
            let overItem = false;
            
            for (const pole of STATE.poles) {
                const px = info.centerX + pole.re * info.radius;
                const py = info.centerY - pole.im * info.radius;
                if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) < hitRadius) {
                    overItem = true;
                    break;
                }
            }
            
            if (!overItem) {
                for (const zero of STATE.zeros) {
                    const zx = info.centerX + zero.re * info.radius;
                    const zy = info.centerY - zero.im * info.radius;
                    if (Math.sqrt((x - zx) ** 2 + (y - zy) ** 2) < hitRadius) {
                        overItem = true;
                        break;
                    }
                }
            }
            
            canvas.style.cursor = overItem ? 'move' : 'crosshair';
        }
    }
    
    _onZplaneMouseUp() {
        this.isDraggingZplane = false;
        this.draggingZplaneType = null;
        this.draggingZplaneIndex = -1;
        
        const canvas = document.getElementById('canvas-zplane');
        if (canvas) canvas.style.cursor = 'crosshair';
        
        // Reset filter state after pole/zero change
        filter.resetState();
    }
    
    /**
     * Convert poles and zeros back to filter coefficients
     * For a 2nd order system:
     * - Poles p1, p2 give: A(z) = 1 - (p1+p2)z^-1 + (p1*p2)z^-2
     * - Zeros z1, z2 give: B(z) = (1 - z1*z^-1)(1 - z2*z^-1)
     */
    _polesZerosToCoeffs() {
        // Convert poles to a coefficients
        if (STATE.poles.length >= 2) {
            const p1 = STATE.poles[0];
            const p2 = STATE.poles[1];
            
            // Complex multiplication for (z - p1)(z - p2) = z^2 - (p1+p2)z + p1*p2
            // In z^-1 form: 1 - (p1+p2)z^-1 + p1*p2*z^-2
            const sumRe = p1.re + p2.re;
            const sumIm = p1.im + p2.im;
            
            // p1 * p2 (complex multiplication)
            const prodRe = p1.re * p2.re - p1.im * p2.im;
            const prodIm = p1.re * p2.im + p1.im * p2.re;
            
            STATE.aCoeffs[0] = 1;
            STATE.aCoeffs[1] = -sumRe; // -(p1+p2) real part (imaginary should cancel for conjugates)
            STATE.aCoeffs[2] = prodRe; // p1*p2 real part
            
            // Clear higher order coefficients
            for (let k = 3; k < STATE.aCoeffs.length; k++) {
                STATE.aCoeffs[k] = 0;
            }
        }
        
        // Convert zeros to b coefficients
        if (STATE.zeros.length >= 2) {
            const z1 = STATE.zeros[0];
            const z2 = STATE.zeros[1];
            
            const sumRe = z1.re + z2.re;
            const prodRe = z1.re * z2.re - z1.im * z2.im;
            
            // B(z) = b0*(1 - (z1+z2)z^-1 + z1*z2*z^-2)
            // We need to scale to maintain reasonable gain
            const b0 = STATE.bCoeffs[0] || 0.25;
            STATE.bCoeffs[0] = b0;
            STATE.bCoeffs[1] = -b0 * sumRe;
            STATE.bCoeffs[2] = b0 * prodRe;
            
            // Clear higher order coefficients
            for (let k = 3; k < STATE.bCoeffs.length; k++) {
                STATE.bCoeffs[k] = 0;
            }
        } else if (STATE.zeros.length === 0) {
            // No zeros - keep b coefficients as is but simplified
            STATE.bCoeffs[0] = STATE.bCoeffs[0] || 0.25;
            STATE.bCoeffs[1] = STATE.bCoeffs[1] || 0;
            STATE.bCoeffs[2] = STATE.bCoeffs[2] || 0;
        }
    }
    
    drawAll() {
        this.drawCoefficients();
        this.drawWaveform(this.ctxInput, STATE.inputBuffer, '#4488ff', 'INPUT x[n]: Signal + Noise →');
        this.drawWaveform(this.ctxOutput, STATE.outputBuffer, '#44ff88', 'OUTPUT y[n]: Filtered Signal →');
        this.drawFrequencyResponse();
        this.drawZPlane();
        
        if (STATE.showConvolution) {
            this.drawRecursionVisualization();
        }
    }
    
    /**
     * Draw both b (feedforward) and a (feedback) coefficients
     */
    drawCoefficients() {
        const ctx = this.ctxCoeff;
        if (!ctx) return;
        
        // Dispatch based on view mode
        if (STATE.viewMode === 'blockDiagram') {
            this._drawBlockDiagram(ctx);
        } else {
            this._drawCoefficientBars(ctx);
        }
        
        // Update the calculation panel
        this._updateCalculationPanel();
    }
    
    _drawCoefficientBars(ctx) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        
        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        
        // Draw zero line
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        
        // Split into two halves: b coefficients (left), a coefficients (right)
        const halfWidth = width / 2 - 20;
        
        // Draw section labels
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Feedforward b[k] (Numerator)', halfWidth / 2, 15);
        
        ctx.fillStyle = '#ff6666';
        ctx.fillText('Feedback a[k] (Denominator)', width / 2 + halfWidth / 2 + 10, 15);
        
        // Draw b coefficients (pass dragging info)
        const draggingB = this.isDraggingCoeff && this.draggingCoeffType === 'b' ? this.draggingCoeffIndex : -1;
        this._drawCoeffBars(ctx, STATE.bCoeffs, 10, halfWidth, height, '#ffaa00', '#ff8800', 'b', draggingB);
        
        // Draw divider line
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, 25);
        ctx.lineTo(width / 2, height - 10);
        ctx.stroke();
        
        // Draw a coefficients (pass dragging info)
        const draggingA = this.isDraggingCoeff && this.draggingCoeffType === 'a' ? this.draggingCoeffIndex : -1;
        this._drawCoeffBars(ctx, STATE.aCoeffs, width / 2 + 10, halfWidth, height, '#ff6666', '#ff4444', 'a', draggingA);
        
        // Draw hint text
        ctx.fillStyle = '#555555';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('↕ Drag bars to adjust (a[0]=1 fixed)', width / 2, height - 3);
    }
    
    /**
     * Draw the IIR filter as a Signal Flow Block Diagram (Direct Form II Transposed)
     * This shows the actual signal flow with delay elements, multipliers, and summers
     */
    _drawBlockDiagram(ctx) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, width, height);
        
        // Layout constants
        const startX = 60;
        const endX = width - 60;
        const midY = height / 2;
        const delayBoxW = 40;
        const delayBoxH = 25;
        const coeffBoxW = 50;
        const coeffBoxH = 20;
        const sumRadius = 12;
        const vertSpacing = 35;
        
        // Calculate positions
        const flowWidth = endX - startX;
        const numStages = Math.max(STATE.bCoeffs.filter(b => Math.abs(b) > 0.0001).length,
                                   STATE.aCoeffs.filter((a, i) => i > 0 && Math.abs(a) > 0.0001).length);
        const stageWidth = flowWidth / (numStages + 1);
        
        // Title
        ctx.fillStyle = '#888888';
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('SIGNAL FLOW DIAGRAM (Direct Form II Transposed)', width / 2, 15);
        
        // Draw input arrow
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#4488ff';
        this._drawArrow(ctx, 10, midY, startX - 10, midY);
        ctx.font = '10px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('x[n]', 5, midY - 10);
        
        // Draw current input value
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 10px Courier New';
        const xVal = STATE.xHistory[0].toFixed(2);
        ctx.fillText(xVal, 15, midY + 15);
        
        // Draw b[0] multiplier (first feedforward)
        const b0X = startX + 20;
        this._drawMultiplier(ctx, b0X, midY, 'b[0]', STATE.bCoeffs[0], '#ffaa00');
        
        // Draw first summing junction
        const sum1X = b0X + coeffBoxW + 30;
        this._drawSummer(ctx, sum1X, midY, sumRadius);
        
        // Connect b[0] to summer
        ctx.strokeStyle = '#ffaa00';
        this._drawArrow(ctx, b0X + coeffBoxW / 2, midY, sum1X - sumRadius, midY);
        
        // Draw output arrow
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#44ff88';
        this._drawArrow(ctx, sum1X + sumRadius, midY, endX + 30, midY);
        ctx.textAlign = 'right';
        ctx.fillText('y[n]', width - 5, midY - 10);
        
        // Draw current output value
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 10px Courier New';
        const yVal = STATE.yHistory[0].toFixed(2);
        ctx.fillText(yVal, width - 10, midY + 15);
        
        // Draw delay chain and feedback/feedforward taps
        let prevDelayX = sum1X;
        
        for (let k = 1; k <= 2; k++) {
            const stageX = sum1X + k * stageWidth;
            
            // Delay element (z^-1)
            const delayX = stageX - delayBoxW / 2;
            this._drawDelayElement(ctx, delayX, midY - delayBoxH / 2, delayBoxW, delayBoxH, k);
            
            // Connect from previous summer/delay to this delay
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(prevDelayX + sumRadius, midY);
            ctx.lineTo(delayX, midY);
            ctx.stroke();
            
            // Draw b[k] multiplier (feedforward) - input branch going down then right
            if (k < STATE.bCoeffs.length && Math.abs(STATE.bCoeffs[k]) > 0.0001) {
                const bMultX = delayX - 60;
                const bMultY = midY + vertSpacing;
                
                // Vertical line from input path
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(bMultX, midY);
                ctx.lineTo(bMultX, bMultY);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Multiplier
                this._drawMultiplier(ctx, bMultX - coeffBoxW / 2, bMultY - coeffBoxH / 2, `b[${k}]`, STATE.bCoeffs[k], '#ffaa00');
                
                // Arrow to summer
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 1;
                this._drawArrow(ctx, bMultX, bMultY + coeffBoxH / 2 + 5, sum1X, midY + sumRadius);
            }
            
            // Draw -a[k] multiplier (feedback) - output branch going up then left
            if (k < STATE.aCoeffs.length && Math.abs(STATE.aCoeffs[k]) > 0.0001) {
                const aMultX = stageX + 30;
                const aMultY = midY - vertSpacing;
                
                // Vertical line from output path
                ctx.strokeStyle = '#ff6666';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(aMultX, midY);
                ctx.lineTo(aMultX, aMultY);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Multiplier (note: negative sign)
                this._drawMultiplier(ctx, aMultX - coeffBoxW / 2, aMultY - coeffBoxH / 2, `-a[${k}]`, -STATE.aCoeffs[k], '#ff6666');
                
                // Arrow back to summer
                ctx.strokeStyle = '#ff6666';
                ctx.lineWidth = 1;
                this._drawArrow(ctx, aMultX, aMultY - coeffBoxH / 2 - 5, sum1X, midY - sumRadius);
            }
            
            prevDelayX = stageX;
        }
        
        // Draw legend
        ctx.font = '9px Courier New';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('■ Feedforward (b[k])', 10, height - 25);
        ctx.fillStyle = '#ff6666';
        ctx.fillText('■ Feedback (-a[k])', 10, height - 12);
        ctx.fillStyle = '#666666';
        ctx.fillText('z⁻¹ = Unit Delay', width - 110, height - 12);
    }
    
    _drawArrow(ctx, x1, y1, x2, y2) {
        const headLen = 8;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }
    
    _drawMultiplier(ctx, x, y, label, value, color) {
        const w = 50;
        const h = 20;
        
        // Box
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        
        // Label
        ctx.fillStyle = color;
        ctx.font = 'bold 9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + 9);
        
        // Value
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '8px Courier New';
        ctx.fillText(value.toFixed(3), x + w / 2, y + 18);
    }
    
    _drawDelayElement(ctx, x, y, w, h, index) {
        // Box with z^-1
        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        
        // z^-1 label
        ctx.fillStyle = '#888888';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('z⁻¹', x + w / 2, y + 10);
        
        // Show stored value
        const delayedValue = index <= STATE.yHistory.length ? STATE.yHistory[index - 1] : 0;
        ctx.fillStyle = '#44ff88';
        ctx.font = '8px Courier New';
        ctx.fillText(delayedValue.toFixed(2), x + w / 2, y + 22);
    }
    
    _drawSummer(ctx, x, y, r) {
        // Circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Plus sign
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
    }
    
    /**
     * Update the live calculation panel with current values
     * Shows symbolic formula first, then numerical values
     */
    _updateCalculationPanel() {
        const ffEl = document.getElementById('calcFeedforward');
        const fbEl = document.getElementById('calcFeedback');
        const resultEl = document.getElementById('calcResult');
        
        if (!ffEl || !fbEl || !resultEl) return;
        
        // Build feedforward - symbolic first, then numerical
        const ffTerms = STATE.lastCalc.feedforwardTerms;
        let ffSymbolic = ffTerms.map((t, i) => `b[${i}]·x[n-${i}]`).join(' + ');
        let ffNumerical = ffTerms.map(t => 
            `${t.coeff.toFixed(2)}×${t.value.toFixed(2)}`
        ).join(' + ');
        let ffProducts = ffTerms.map(t => t.product.toFixed(3)).join(' + ');
        
        ffEl.innerHTML = ffTerms.length > 0 ? 
            `<span class="calc-symbolic">${ffSymbolic}</span><br>` +
            `<span class="calc-numeric">= ${ffNumerical}</span><br>` +
            `<span class="calc-result-line">= ${ffProducts} = <b>${STATE.lastCalc.feedforwardSum.toFixed(4)}</b></span>` :
            '(none)';
        
        // Build feedback - symbolic first, then numerical
        const fbTerms = STATE.lastCalc.feedbackTerms;
        let fbSymbolic = fbTerms.map((t, i) => `a[${i+1}]·y[n-${i+1}]`).join(' + ');
        let fbNumerical = fbTerms.map(t => 
            `${t.coeff.toFixed(2)}×${t.value.toFixed(2)}`
        ).join(' + ');
        let fbProducts = fbTerms.map(t => t.product.toFixed(3)).join(' + ');
        
        fbEl.innerHTML = fbTerms.length > 0 ? 
            `<span class="calc-symbolic">${fbSymbolic}</span><br>` +
            `<span class="calc-numeric">= ${fbNumerical}</span><br>` +
            `<span class="calc-result-line">= ${fbProducts} = <b>${STATE.lastCalc.feedbackSum.toFixed(4)}</b></span>` :
            '(none)';
        
        // Result with symbolic formula
        const ff = STATE.lastCalc.feedforwardSum;
        const fb = STATE.lastCalc.feedbackSum;
        const result = STATE.lastCalc.result;
        resultEl.innerHTML = 
            `<span class="calc-symbolic">y[n] = Σb[k]·x[n-k] − Σa[k]·y[n-k]</span><br>` +
            `<span class="calc-numeric">= ${ff.toFixed(4)} − (${fb.toFixed(4)})</span><br>` +
            `<span class="calc-final">= <b>${result.toFixed(4)}</b></span>`;
    }
    
    _drawCoeffBars(ctx, coeffs, startX, availWidth, height, colorPos, colorNeg, label, draggingIndex = -1) {
        const centerY = height / 2;
        const numCoeffs = coeffs.length;
        const barSpacing = availWidth / numCoeffs;
        const barWidth = Math.min(25, barSpacing - 8);
        const maxBarHeight = (height / 2) - 30;
        
        // Find max value for scaling
        const maxVal = Math.max(0.5, ...coeffs.map(Math.abs));
        
        for (let k = 0; k < numCoeffs; k++) {
            const x = startX + k * barSpacing + (barSpacing - barWidth) / 2;
            const value = coeffs[k];
            const barHeight = (value / maxVal) * maxBarHeight;
            
            // Check if this bar is being dragged
            const isDragging = (draggingIndex === k);
            
            // Check if this is a[0] which should be locked
            const isLocked = (label === 'a' && k === 0);
            
            // Draw glow for dragged bar
            if (isDragging) {
                ctx.shadowColor = value >= 0 ? colorPos : colorNeg;
                ctx.shadowBlur = 15;
            }
            
            // Draw bar
            const drawColor = isDragging ? '#ffffff' : (isLocked ? '#666666' : (value >= 0 ? colorPos : colorNeg));
            ctx.fillStyle = drawColor;
            
            if (value >= 0) {
                ctx.fillRect(x, centerY - barHeight, barWidth, Math.max(2, barHeight));
            } else {
                ctx.fillRect(x, centerY, barWidth, Math.max(2, -barHeight));
            }
            
            // Draw bar outline
            ctx.strokeStyle = isDragging ? '#ffffff' : (value >= 0 ? colorPos : colorNeg);
            ctx.lineWidth = isDragging ? 2 : 1;
            if (value >= 0) {
                ctx.strokeRect(x, centerY - barHeight, barWidth, Math.max(2, barHeight));
            } else {
                ctx.strokeRect(x, centerY, barWidth, Math.max(2, -barHeight));
            }
            
            ctx.shadowBlur = 0;
            
            // Draw label
            ctx.fillStyle = isDragging ? '#ffffff' : (isLocked ? '#555555' : '#888888');
            ctx.font = isDragging ? 'bold 9px Courier New' : '9px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`${label}[${k}]`, x + barWidth / 2, height - 15);
            
            // Draw value
            ctx.fillStyle = isDragging ? '#ffffff' : '#aaaaaa';
            ctx.font = isDragging ? 'bold 9px Courier New' : '8px Courier New';
            const valText = value.toFixed(3);
            const valY = value >= 0 ? centerY - barHeight - 5 : centerY - barHeight + 10;
            ctx.fillText(valText, x + barWidth / 2, Math.max(35, Math.min(height - 25, valY)));
        }
    }
    
    /**
     * Draw waveform with recursion visualization
     */
    drawWaveform(ctx, buffer, color, label) {
        if (!ctx) return;
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        
        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        
        for (let i = 0; i <= 8; i++) {
            const x = (width / 8) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // Draw zero line
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        
        // Draw waveform
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const samplesVisible = Math.min(buffer.length, width);
        const scale = (height - 20) / 3;
        
        for (let i = 0; i < samplesVisible; i++) {
            const x = width - (i * (width / samplesVisible));
            const y = centerY - buffer[i] * scale;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(label, 10, 15);
        
        // Draw y-axis labels
        ctx.fillStyle = '#666666';
        ctx.font = '9px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText('+1.2', width - 5, 15);
        ctx.fillText('0', width - 5, centerY + 4);
        ctx.fillText('-1.2', width - 5, height - 5);
    }
    
    /**
     * Draw recursion visualization on output
     */
    drawRecursionVisualization() {
        const ctx = this.ctxOutput;
        if (!ctx) return;
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Draw recursion indicator box
        const boxWidth = 80;
        const boxX = width - boxWidth - 10;
        
        ctx.fillStyle = 'rgba(255, 100, 100, 0.1)';
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.fillRect(boxX, 10, boxWidth, height - 20);
        ctx.strokeRect(boxX, 10, boxWidth, height - 20);
        ctx.setLineDash([]);
        
        // Label
        ctx.fillStyle = '#ff6666';
        ctx.font = 'bold 9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('FEEDBACK', boxX + boxWidth / 2, height - 25);
        ctx.fillText('y[n-k]', boxX + boxWidth / 2, height - 12);
        
        // Draw arrow indicating recursion
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX + boxWidth / 2, 20);
        ctx.lineTo(boxX + boxWidth / 2 - 10, 35);
        ctx.moveTo(boxX + boxWidth / 2, 20);
        ctx.lineTo(boxX + boxWidth / 2 + 10, 35);
        ctx.stroke();
        
        // Also visualize on input canvas
        const ctxIn = this.ctxInput;
        if (ctxIn) {
            const inCanvas = ctxIn.canvas;
            const inWidth = inCanvas.width;
            const inHeight = inCanvas.height;
            
            // Feedforward box
            ctxIn.fillStyle = 'rgba(255, 170, 0, 0.1)';
            ctxIn.strokeStyle = '#ffaa00';
            ctxIn.lineWidth = 2;
            ctxIn.setLineDash([4, 4]);
            ctxIn.fillRect(inWidth - boxWidth - 10, 10, boxWidth, inHeight - 20);
            ctxIn.strokeRect(inWidth - boxWidth - 10, 10, boxWidth, inHeight - 20);
            ctxIn.setLineDash([]);
            
            ctxIn.fillStyle = '#ffaa00';
            ctxIn.font = 'bold 9px Courier New';
            ctxIn.textAlign = 'center';
            ctxIn.fillText('FEEDFORWARD', inWidth - boxWidth / 2 - 10, inHeight - 25);
            ctxIn.fillText('x[n-k]', inWidth - boxWidth / 2 - 10, inHeight - 12);
        }
    }
    
    /**
     * Draw frequency response
     */
    drawFrequencyResponse() {
        const ctx = this.ctxFreq;
        if (!ctx) return;
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const plotHeight = height - 25;
        const useDB = STATE.freqScaleDB;
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
        
        const magnitude = filter.calculateFrequencyResponse(256);
        
        // Vertical grid lines
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        for (let i = 0; i <= 4; i++) {
            const x = (width / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, plotHeight);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        const numHLines = useDB ? 6 : 4;
        for (let i = 0; i <= numHLines; i++) {
            const y = (plotHeight / numHLines) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        // Draw -3dB line for dB scale
        if (useDB) {
            const db3Y = plotHeight * (3 / 60);
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, db3Y);
            ctx.lineTo(width, db3Y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#ff4444';
            ctx.font = '9px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText('-3dB', 5, db3Y - 2);
        }
        
        // Draw magnitude response
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < magnitude.length; i++) {
            const x = (i / magnitude.length) * width;
            let mag = magnitude[i];
            let y;
            
            if (useDB) {
                const db = mag > 1e-10 ? 20 * Math.log10(mag) : -60;
                const clampedDb = Math.max(-60, Math.min(10, db));
                y = plotHeight * ((-clampedDb + 10) / 70);
            } else {
                y = plotHeight * (1 - Math.min(mag, 2) / 2);
            }
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Draw title and labels
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`|H(ω)| - Magnitude Response (${useDB ? 'dB' : 'Linear'})`, width / 2, 12);
        
        // Frequency labels
        ctx.fillStyle = '#888888';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        const freqLabels = ['0', 'π/4', 'π/2', '3π/4', 'π'];
        for (let i = 0; i <= 4; i++) {
            ctx.fillText(freqLabels[i], (width / 4) * i, height - 5);
        }
        
        // Y-axis labels
        ctx.textAlign = 'left';
        if (useDB) {
            ctx.fillText('+10', 2, 20);
            ctx.fillText('-60', 2, plotHeight - 2);
        } else {
            ctx.fillText('2.0', 2, 20);
            ctx.fillText('0', 2, plotHeight - 2);
        }
    }
    
    /**
     * Draw Z-plane with poles and zeros
     */
    drawZPlane() {
        const ctx = this.ctxZplane;
        if (!ctx) return;
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 25;
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
        
        // Draw stability region (inside unit circle)
        ctx.fillStyle = 'rgba(0, 100, 0, 0.12)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw unit circle
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw axes
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();
        
        // Draw zeros (circles) with drag highlighting
        for (let i = 0; i < STATE.zeros.length; i++) {
            const zero = STATE.zeros[i];
            const x = centerX + zero.re * radius;
            const y = centerY - zero.im * radius;
            
            // Check if being dragged
            const isDragging = this.isDraggingZplane && 
                               this.draggingZplaneType === 'zero' && 
                               this.draggingZplaneIndex === i;
            
            if (isDragging) {
                ctx.strokeStyle = '#ffffff';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 12;
            } else {
                ctx.strokeStyle = '#00ffff';
                ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                ctx.shadowBlur = 0;
            }
            
            ctx.lineWidth = isDragging ? 3 : 2;
            ctx.beginPath();
            ctx.arc(x, y, isDragging ? 8 : 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Draw poles (X marks) with drag highlighting
        for (let i = 0; i < STATE.poles.length; i++) {
            const pole = STATE.poles[i];
            const x = centerX + pole.re * radius;
            const y = centerY - pole.im * radius;
            const magnitude = Math.sqrt(pole.re * pole.re + pole.im * pole.im);
            const isStable = magnitude < 1;
            
            // Check if being dragged
            const isDragging = this.isDraggingZplane && 
                               this.draggingZplaneType === 'pole' && 
                               this.draggingZplaneIndex === i;
            
            if (isDragging) {
                ctx.strokeStyle = '#ffffff';
                ctx.shadowColor = isStable ? '#ffaa00' : '#ff0000';
                ctx.shadowBlur = 15;
            } else {
                ctx.strokeStyle = isStable ? '#ffaa00' : '#ff0000';
                ctx.shadowBlur = isStable ? 0 : 5;
            }
            
            ctx.lineWidth = isDragging ? 3 : 2;
            
            // Draw X
            const size = isDragging ? 8 : 6;
            ctx.beginPath();
            ctx.moveTo(x - size, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Draw legend
        ctx.font = '9px Courier New';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'left';
        ctx.fillText('○ Zero', 5, height - 32);
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('× Pole', 5, height - 20);
        ctx.fillStyle = '#666666';
        ctx.fillText('Drag to move', 5, height - 8);
        
        // Draw stability indicator
        ctx.textAlign = 'right';
        if (STATE.isStable) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText('STABLE', width - 5, 12);
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 10px Courier New';
            ctx.fillText('UNSTABLE!', width - 5, 12);
        }
        
        // Label axes
        ctx.fillStyle = '#666666';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Re', width - 10, centerY - 5);
        ctx.fillText('Im', centerX + 10, 10);
    }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

let filter;
let generator;
let visualizer;
let animationId;

function init() {
    filter = new IIRFilterEngine();
    generator = new SignalGenerator();
    visualizer = new Visualizer();
    
    setupControls();
    applyFilterSettings();
    
    // Expose adjustOrder globally for HTML onclick
    window.adjustOrder = function(delta) {
        const orderSpinbox = document.getElementById('orderSpinbox');
        if (orderSpinbox) {
            let value = parseInt(orderSpinbox.value) + delta;
            // Wrap around: if > 4, go to 1; if < 1, go to 4
            if (value > 4) {
                value = 1;
            } else if (value < 1) {
                value = 4;
            }
            orderSpinbox.value = value;
            STATE.filterOrder = value;
            applyFilterSettings();
        }
    };
    
    // Start animation
    animate();
}

function animate() {
    if (STATE.isRunning) {
        for (let i = 0; i < STATE.animationSpeed; i++) {
            // Save state before each step so step backward works after pausing
            saveStateSnapshot();
            const input = generator.getNextSample();
            filter.process(input);
        }
    }
    
    visualizer.drawAll();
    animationId = requestAnimationFrame(animate);
}

/**
 * Save current state snapshot for step backward functionality
 * Due to IIR feedback nature, we need to save both input and output history
 */
function saveStateSnapshot() {
    // Deep copy calculation details to avoid reference issues
    let calcDetailsCopy = null;
    if (STATE.calculationDetails) {
        calcDetailsCopy = {
            inputSample: STATE.calculationDetails.inputSample,
            bTerms: STATE.calculationDetails.bTerms ? STATE.calculationDetails.bTerms.map(t => ({...t})) : [],
            aTerms: STATE.calculationDetails.aTerms ? STATE.calculationDetails.aTerms.map(t => ({...t})) : [],
            feedforwardSum: STATE.calculationDetails.feedforwardSum,
            feedbackSum: STATE.calculationDetails.feedbackSum,
            output: STATE.calculationDetails.output
        };
    }
    
    const snapshot = {
        inputBuffer: [...STATE.inputBuffer],
        outputBuffer: [...STATE.outputBuffer],
        xHistory: [...STATE.xHistory],
        yHistory: [...STATE.yHistory],
        generatorT: generator.t,
        generatorPhase: generator.phase,
        calculationDetails: calcDetailsCopy
    };
    
    STATE.stateHistory.push(snapshot);
    
    // Limit history length to prevent memory issues
    if (STATE.stateHistory.length > STATE.maxHistoryLength) {
        STATE.stateHistory.shift();
    }
}

/**
 * Restore previous state snapshot for step backward
 */
function restoreStateSnapshot() {
    if (STATE.stateHistory.length === 0) {
        // No history available - flash the button or give feedback
        const stepBwdBtn = document.getElementById('stepBwdBtn');
        if (stepBwdBtn) {
            stepBwdBtn.style.opacity = '0.5';
            setTimeout(() => { stepBwdBtn.style.opacity = '1'; }, 200);
        }
        return false;
    }
    
    const snapshot = STATE.stateHistory.pop();
    
    STATE.inputBuffer = [...snapshot.inputBuffer];
    STATE.outputBuffer = [...snapshot.outputBuffer];
    STATE.xHistory = [...snapshot.xHistory];
    STATE.yHistory = [...snapshot.yHistory];
    generator.t = snapshot.generatorT;
    generator.phase = snapshot.generatorPhase;
    
    // Deep copy calculation details when restoring
    if (snapshot.calculationDetails) {
        STATE.calculationDetails = {
            inputSample: snapshot.calculationDetails.inputSample,
            bTerms: snapshot.calculationDetails.bTerms ? snapshot.calculationDetails.bTerms.map(t => ({...t})) : [],
            aTerms: snapshot.calculationDetails.aTerms ? snapshot.calculationDetails.aTerms.map(t => ({...t})) : [],
            feedforwardSum: snapshot.calculationDetails.feedforwardSum,
            feedbackSum: snapshot.calculationDetails.feedbackSum,
            output: snapshot.calculationDetails.output
        };
    }
    
    return true;
}

function setupControls() {
    // Filter Type dropdown
    const filterTypeSelect = document.getElementById('filterTypeSelect');
    if (filterTypeSelect) {
        filterTypeSelect.addEventListener('change', (e) => {
            STATE.currentFilterType = e.target.value;
            applyFilterSettings();
        });
    }
    
    // Design Method dropdown
    const designMethodSelect = document.getElementById('designMethodSelect');
    if (designMethodSelect) {
        designMethodSelect.addEventListener('change', (e) => {
            STATE.currentDesignMethod = e.target.value;
            applyFilterSettings();
        });
    }
    
    // Signal Type dropdown
    const signalTypeSelect = document.getElementById('signalTypeSelect');
    if (signalTypeSelect) {
        signalTypeSelect.addEventListener('change', (e) => {
            STATE.signalType = e.target.value;
            generator.reset();
            filter.resetState();
            STATE.stateHistory = []; // Clear history on signal change
        });
    }
    
    // Cutoff slider
    const cutoffSlider = document.getElementById('cutoffSlider');
    const cutoffValue = document.getElementById('cutoffValue');
    if (cutoffSlider) {
        cutoffSlider.addEventListener('input', (e) => {
            STATE.cutoff = parseFloat(e.target.value);
            if (cutoffValue) cutoffValue.textContent = STATE.cutoff.toFixed(2) + 'π';
            applyFilterSettings();
        });
    }
    
    // Order spinbox with wrap-around behavior
    const orderSpinbox = document.getElementById('orderSpinbox');
    if (orderSpinbox) {
        orderSpinbox.addEventListener('change', (e) => {
            let value = parseInt(e.target.value);
            // Wrap around: if > 4, go to 1; if < 1, go to 4
            if (isNaN(value) || value < 1) {
                value = 4;
            } else if (value > 4) {
                value = 1;
            }
            e.target.value = value;
            STATE.filterOrder = value;
            applyFilterSettings();
        });
        // Handle input for immediate feedback within valid range
        orderSpinbox.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (value >= 1 && value <= 4) {
                STATE.filterOrder = value;
                applyFilterSettings();
            }
        });
    }
    
    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            STATE.isRunning = !STATE.isRunning;
            playPauseBtn.textContent = STATE.isRunning ? 'Pause' : 'Run';
        });
    }
    
    // Step buttons
    const stepFwdBtn = document.getElementById('stepFwdBtn');
    if (stepFwdBtn) {
        stepFwdBtn.addEventListener('click', () => {
            // Auto-pause when stepping
            STATE.isRunning = false;
            if (playPauseBtn) playPauseBtn.textContent = 'Run';
            
            // Save current state to history before stepping
            saveStateSnapshot();
            
            // Step forward
            const input = generator.getNextSample();
            filter.process(input);
            visualizer.drawAll();
        });
    }
    
    const stepBwdBtn = document.getElementById('stepBwdBtn');
    if (stepBwdBtn) {
        stepBwdBtn.addEventListener('click', () => {
            // Auto-pause when stepping
            STATE.isRunning = false;
            if (playPauseBtn) playPauseBtn.textContent = 'Run';
            
            // Restore previous state from history
            restoreStateSnapshot();
            visualizer.drawAll();
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset to defaults
            STATE.cutoff = CONFIG.defaultCutoff;
            STATE.filterOrder = 2;
            STATE.currentFilterType = 'lowPass';
            STATE.currentDesignMethod = 'butterworth';
            STATE.signalType = 'sine';
            STATE.noiseLevel = CONFIG.noiseLevel;
            
            // Reset UI
            if (cutoffSlider) cutoffSlider.value = STATE.cutoff;
            if (cutoffValue) cutoffValue.textContent = STATE.cutoff.toFixed(2) + 'π';
            if (orderSpinbox) orderSpinbox.value = STATE.filterOrder;
            if (filterTypeSelect) filterTypeSelect.value = STATE.currentFilterType;
            if (designMethodSelect) designMethodSelect.value = STATE.currentDesignMethod;
            if (signalTypeSelect) signalTypeSelect.value = STATE.signalType;
            
            generator.reset();
            filter.resetState();
            STATE.stateHistory = []; // Clear history on reset
            applyFilterSettings();
        });
    }
    
    // Show convolution checkbox
    const showConvolution = document.getElementById('showConvolution');
    if (showConvolution) {
        showConvolution.addEventListener('change', (e) => {
            STATE.showConvolution = e.target.checked;
        });
    }
    
    // Speed slider
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            STATE.animationSpeed = parseInt(e.target.value);
            if (speedValue) speedValue.textContent = STATE.animationSpeed + 'x';
        });
    }
    
    // Noise slider
    const noiseSlider = document.getElementById('noiseSlider');
    const noiseValue = document.getElementById('noiseValue');
    if (noiseSlider) {
        noiseSlider.addEventListener('input', (e) => {
            STATE.noiseLevel = parseFloat(e.target.value);
            if (noiseValue) noiseValue.textContent = Math.round(STATE.noiseLevel * 100) + '%';
        });
    }
    
    // Scale toggle button
    const scaleToggleBtn = document.getElementById('scaleToggleBtn');
    if (scaleToggleBtn) {
        scaleToggleBtn.addEventListener('click', () => {
            STATE.freqScaleDB = !STATE.freqScaleDB;
            scaleToggleBtn.textContent = STATE.freqScaleDB ? 'Linear' : 'dB';
            scaleToggleBtn.classList.toggle('active', STATE.freqScaleDB);
        });
    }
    
    // View toggle buttons (Coefficients vs Block Diagram)
    const viewCoeffsBtn = document.getElementById('viewCoeffsBtn');
    const viewBlockBtn = document.getElementById('viewBlockBtn');
    
    if (viewCoeffsBtn) {
        viewCoeffsBtn.addEventListener('click', () => {
            STATE.viewMode = 'coefficients';
            viewCoeffsBtn.classList.add('active');
            if (viewBlockBtn) viewBlockBtn.classList.remove('active');
        });
    }
    
    if (viewBlockBtn) {
        viewBlockBtn.addEventListener('click', () => {
            STATE.viewMode = 'blockDiagram';
            viewBlockBtn.classList.add('active');
            if (viewCoeffsBtn) viewCoeffsBtn.classList.remove('active');
        });
    }
}

function applyFilterSettings() {
    const cutoff = STATE.cutoff;
    const filterType = STATE.currentFilterType;
    const order = STATE.filterOrder;
    
    switch (STATE.currentDesignMethod) {
        case 'butterworth':
            filter.setButterworth(cutoff, filterType, order);
            break;
        case 'chebyshev1':
            filter.setChebyshev1(cutoff, filterType, order, 1);
            break;
        case 'chebyshev2':
            filter.setChebyshev2(cutoff, filterType, order, 40);
            break;
        case 'elliptic':
            filter.setElliptic(cutoff, filterType, order, 1, 40);
            break;
        case 'bessel':
            filter.setBessel(cutoff, filterType, order);
            break;
        default:
            filter.setButterworth(cutoff, filterType, order);
    }
    
    filter.resetState();
    updateInfoPanel();
}

function updateInfoPanel() {
    const filterTypeNames = {
        'lowPass': 'Low Pass',
        'highPass': 'High Pass',
        'bandPass': 'Band Pass',
        'bandStop': 'Band Stop'
    };
    
    const methodNames = {
        'butterworth': 'Butterworth',
        'chebyshev1': 'Chebyshev I',
        'chebyshev2': 'Chebyshev II',
        'elliptic': 'Elliptic',
        'bessel': 'Bessel'
    };
    
    const filterTypeEl = document.getElementById('info-filterType');
    const orderEl = document.getElementById('info-order');
    const stabilityEl = document.getElementById('info-stability');
    const dcGainEl = document.getElementById('info-dcGain');
    
    if (filterTypeEl) {
        filterTypeEl.textContent = `${filterTypeNames[STATE.currentFilterType]} (${methodNames[STATE.currentDesignMethod]})`;
    }
    
    if (orderEl) {
        orderEl.textContent = STATE.filterOrder;
    }
    
    if (stabilityEl) {
        stabilityEl.textContent = STATE.isStable ? 'STABLE' : 'UNSTABLE';
        stabilityEl.className = 'info-value ' + (STATE.isStable ? '' : 'danger');
    }
    
    if (dcGainEl) {
        // Calculate DC gain: H(1) = B(1)/A(1)
        const bSum = STATE.bCoeffs.reduce((a, b) => a + b, 0);
        const aSum = STATE.aCoeffs.reduce((a, b) => a + b, 0);
        const dcGain = aSum !== 0 ? bSum / aSum : 0;
        dcGainEl.textContent = dcGain.toFixed(4);
    }
}

// Initialize when DOM is ready
$(document).ready(function() {
    init();
});
