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
# Euler's formula for sine: sin(w0*t) = (e^(j*w0*t) - e^(-j*w0*t)) / (2j)
# Let's break it into two terms
term1 = np.exp(1j * omega0 * t) / (2j)
term2 = -np.exp(-1j * omega0 * t) / (2j)
sin_t = term1 + term2 # This should be purely real and equal to np.sin(omega0 * t)

# --- Plotting Setup ---
fig, (ax_complex, ax_time) = plt.subplots(1, 2, figsize=(14, 7))
fig.suptitle(fr'Visualizing $\sin(\omega_0 t) = \frac{{e^{{j\omega_0 t}} - e^{{-j\omega_0 t}}}}{{2j}}$ with $\omega_0={omega0:.1f}$', fontsize=16)

# --- Subplot 1: Complex Plane ---
ax_complex.set_title('Complex Plane View')
ax_complex.set_xlabel('Real Part')
ax_complex.set_ylabel('Imaginary Part')
ax_complex.set_aspect('equal', 'box')
ax_complex.set_xlim(-1.2, 1.2)
ax_complex.set_ylim(-1.2, 1.2)
ax_complex.grid(True)

# Faintly plot the paths of the two rotating vectors (circles of radius 0.5)
radius = np.abs(term1[0]) # should be 0.5
circle = plt.Circle((0, 0), radius, color='gray', alpha=0.4, fill=False, linestyle='--')
ax_complex.add_artist(circle)

# Animated elements for the complex plane
vec1, = ax_complex.plot([], [], 'b-', linewidth=2, label=r'$\frac{e^{j\omega_0 t}}{2j}$')
vec2, = ax_complex.plot([], [], 'g-', linewidth=2, label=r'$-\frac{e^{-j\omega_0 t}}{2j}$')
# Parallelogram lines for vector addition
para1, = ax_complex.plot([], [], 'b--', alpha=0.7)
para2, = ax_complex.plot([], [], 'g--', alpha=0.7)
# Resultant vector (the sum)
vec_sum, = ax_complex.plot([], [], 'r-', linewidth=3, label=r'$\sin(\omega_0 t)$')
ax_complex.legend()

# --- Subplot 2: Time Domain ---
ax_time.set_title('Time Domain View')
ax_time.set_xlabel('Time (t)')
ax_time.set_ylabel(r'Amplitude $\sin(\omega_0 t)$')
ax_time.set_xlim(0, t_max)
ax_time.set_ylim(-1.2, 1.2)
ax_time.grid(True)

# Plot the full sine wave
ax_time.plot(t, sin_t.real, 'k-', alpha=0.5)

# Animated elements for the time domain plot
time_point, = ax_time.plot([], [], 'ro')
time_line, = ax_time.plot([], [], 'r-', alpha=0.7)

# --- Animation Functions ---
def init():
    """Initialize the animation."""
    vec1.set_data([], [])
    vec2.set_data([], [])
    para1.set_data([], [])
    para2.set_data([], [])
    vec_sum.set_data([], [])
    time_point.set_data([], [])
    time_line.set_data([], [])
    return vec1, vec2, para1, para2, vec_sum, time_point, time_line

def update(frame):
    """Update the animation for a given frame."""
    # Current values
    t1 = term1[frame]
    t2 = term2[frame]
    s = sin_t[frame] # This is a complex number with imag part ~0

    # Update complex plane plot (ax_complex)
    vec1.set_data([0, t1.real], [0, t1.imag])
    vec2.set_data([0, t2.real], [0, t2.imag])
    para1.set_data([t2.real, s.real], [t2.imag, s.imag]) # from tip of vec2 to sum
    para2.set_data([t1.real, s.real], [t1.imag, s.imag]) # from tip of vec1 to sum
    vec_sum.set_data([0, s.real], [0, s.imag])

    # Update time domain plot (ax_time)
    current_t = t[frame]
    current_sin_val = s.real
    time_point.set_data([current_t], [current_sin_val])
    time_line.set_data([current_t, current_t], [0, current_sin_val])

    return vec1, vec2, para1, para2, vec_sum, time_point, time_line

# --- Create and run animation ---
ani = animation.FuncAnimation(fig, update, frames=n_frames,
                              init_func=init, blit=True, interval=25)

plt.tight_layout(rect=[0, 0.03, 1, 0.95]) # Adjust layout to make room for suptitle
plt.show()