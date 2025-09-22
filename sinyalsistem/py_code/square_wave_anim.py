import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import sys

# --- Configuration ---
# omega value from command line or default
if len(sys.argv) > 1:
    omega0 = float(sys.argv[1])
else:
    omega0 = 1.0

# Time array
t_max = 2 * np.pi
n_frames = 400
t = np.linspace(0, t_max, n_frames)

# --- Calculations ---
# Fourier series for a near-square wave (assuming a_0 = 0):
# x(t) = a_1*e^(j*w0*t) + a_-1*e^(-j*w0*t) + a_3*e^(j*3*w0*t) + a_-3*e^(-j*3*w0*t)
# with a_1=a_-1=1/pi, a_3=a_-3=-1/(3*pi)
a1_val = 1 / np.pi
a3_val = -1 / (3 * np.pi)

term1 = a1_val * np.exp(1j * omega0 * t)
term_1 = a1_val * np.exp(-1j * omega0 * t)
term3 = a3_val * np.exp(1j * 3 * omega0 * t)
term_3 = a3_val * np.exp(-1j * 3 * omega0 * t)

# Partial sums for head-to-tail plotting
sum1 = term1
sum2 = sum1 + term_1
sum3 = sum2 + term3
sum4 = sum3 + term_3 # This is the final wave approximation

# --- Plotting Setup ---
fig, (ax_complex, ax_time) = plt.subplots(1, 2, figsize=(14, 7))
title_text = (
    r'Square Wave from Fourier Series: $x(t) = \sum_{k \in \{ \pm 1, \pm 3 \}} a_k e^{j k \omega_0 t}$'
    '\n'
    fr'with $a_{{ \pm 1}} \approx {a1_val:.2f}$, $a_{{ \pm 3}} \approx {a3_val:.2f}$, and $\omega_0={omega0:.1f}$'
)
fig.suptitle(title_text, fontsize=14)

# --- Subplot 1: Complex Plane ---
ax_complex.set_title('Complex Plane View (Head-to-Tail Sum)')
ax_complex.set_xlabel('Real Part')
ax_complex.set_ylabel('Imaginary Part')
ax_complex.set_aspect('equal', 'box')

# Calculate limits dynamically
max_r = np.max([np.max(np.abs(s)) for s in [sum1, sum2, sum3, sum4]])
ax_lim = max_r * 1.15
if ax_lim < 0.1: ax_lim = 0.5 # Prevent tiny limits
ax_complex.set_xlim(-ax_lim, ax_lim)
ax_complex.set_ylim(-ax_lim, ax_lim)
ax_complex.grid(True)

# Animated elements for the complex plane (head-to-tail vectors)
vec1, = ax_complex.plot([], [], 'b-', linewidth=2, label=r'$a_1 e^{j\omega_0 t}$')
vec_1, = ax_complex.plot([], [], 'g-', linewidth=2, label=r'$a_{-1} e^{-j\omega_0 t}$')
vec3, = ax_complex.plot([], [], 'c-', linewidth=2, label=r'$a_3 e^{j3\omega_0 t}$')
vec_3, = ax_complex.plot([], [], 'm-', linewidth=2, label=r'$a_{-3} e^{-j3\omega_0 t}$')

# Resultant vector (the sum)
vec_sum, = ax_complex.plot([], [], 'r-', linewidth=3, label=r'Sum $x(t)$')
ax_complex.legend()

# --- Subplot 2: Time Domain ---
ax_time.set_title('Time Domain View')
ax_time.set_xlabel('Time (t)')
ax_time.set_ylabel(r'Amplitude $x(t)$')
ax_time.set_xlim(0, t_max)

# Calculate y-limits dynamically
y_max = np.max(np.abs(sum4.real)) * 1.15
if y_max < 0.1: y_max = 1.0 # Prevent tiny limits
ax_time.set_ylim(-y_max, y_max)
ax_time.grid(True)

# Plot the full wave
ax_time.plot(t, sum4.real, 'k-', alpha=0.5)

# Animated elements for the time domain plot
time_point, = ax_time.plot([], [], 'ro')
time_line, = ax_time.plot([], [], 'r-', alpha=0.7)

# --- Animation Functions ---
def init():
    """Initialize the animation."""
    vec1.set_data([], [])
    vec_1.set_data([], [])
    vec3.set_data([], [])
    vec_3.set_data([], [])
    vec_sum.set_data([], [])
    time_point.set_data([], [])
    time_line.set_data([], [])
    return vec1, vec_1, vec3, vec_3, vec_sum, time_point, time_line

def update(frame):
    """Update the animation for a given frame."""
    # Current values for partial sums
    s1 = sum1[frame]
    s2 = sum2[frame]
    s3 = sum3[frame]
    s4 = sum4[frame] # This is a complex number with imag part ~0

    # Update complex plane plot (ax_complex) - head-to-tail
    vec1.set_data([0, s1.real], [0, s1.imag])
    vec_1.set_data([s1.real, s2.real], [s1.imag, s2.imag])
    vec3.set_data([s2.real, s3.real], [s2.imag, s3.imag])
    vec_3.set_data([s3.real, s4.real], [s3.imag, s4.imag])
    vec_sum.set_data([0, s4.real], [0, s4.imag])

    # Update time domain plot (ax_time)
    current_t = t[frame]
    current_val = s4.real
    time_point.set_data([current_t], [current_val])
    time_line.set_data([current_t, current_t], [0, current_val])

    return vec1, vec_1, vec3, vec_3, vec_sum, time_point, time_line

# --- Create and run animation ---
ani = animation.FuncAnimation(fig, update, frames=n_frames,
                              init_func=init, blit=True, interval=25)

plt.tight_layout(rect=[0, 0.03, 1, 0.90]) # Adjust layout to make room for suptitle
plt.show()