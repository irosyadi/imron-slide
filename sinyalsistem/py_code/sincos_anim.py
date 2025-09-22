import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import sys

# omega values from command line or default
if len(sys.argv) > 2:
    omega1 = float(sys.argv[1])
    omega2 = float(sys.argv[2])
else:
    omega1 = 10
    omega2 = 30

# time values
t = np.linspace(0, 2*np.pi, 400)

# sin-based function
f_sin = np.sin(omega1 * t) * np.exp(1j * omega2 * t)
x_sin, y_sin = f_sin.real, f_sin.imag

# cos-based function
f_cos = np.cos(omega1 * t) * np.exp(1j * omega2 * t)
x_cos, y_cos = f_cos.real, f_cos.imag

# set up figure with two subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))

# Plot 1: sin
ax1.set_xlim(-1.1, 1.1)
ax1.set_ylim(-1.1, 1.1)
ax1.set_aspect('equal', 'box')
ax1.set_xlabel('Real part')
ax1.set_ylabel('Imaginary part')
ax1.set_title(fr'$f(t)=\sin(\omega_1 t)\,e^{{j\omega_2 t}}$')
ax1.grid(True)
ax1.plot(x_sin, y_sin, alpha=0.3, color='gray')
point1, = ax1.plot([], [], 'ro')
line1, = ax1.plot([], [], 'b-')

# Plot 2: cos
ax2.set_xlim(-1.1, 1.1)
ax2.set_ylim(-1.1, 1.1)
ax2.set_aspect('equal', 'box')
ax2.set_xlabel('Real part')
ax2.set_ylabel('Imaginary part')
ax2.set_title(fr'$f(t)=\cos(\omega_1 t)\,e^{{j\omega_2 t}}$')
ax2.grid(True)
ax2.plot(x_cos, y_cos, alpha=0.3, color='gray')
point2, = ax2.plot([], [], 'ro')
line2, = ax2.plot([], [], 'b-')

fig.suptitle(fr'$\omega_1={omega1:.1f}, \omega_2={omega2:.1f}$')

def init():
    point1.set_data([], [])
    line1.set_data([], [])
    point2.set_data([], [])
    line2.set_data([], [])
    return point1, line1, point2, line2

def update(frame):
    # Update sin plot
    point1.set_data([x_sin[frame]], [y_sin[frame]])
    line1.set_data([0, x_sin[frame]], [0, y_sin[frame]])
    # Update cos plot
    point2.set_data([x_cos[frame]], [y_cos[frame]])
    line2.set_data([0, x_cos[frame]], [0, y_cos[frame]])
    return point1, line1, point2, line2

ani = animation.FuncAnimation(fig, update, frames=len(t),
                              init_func=init, blit=True, interval=40)

plt.show()
