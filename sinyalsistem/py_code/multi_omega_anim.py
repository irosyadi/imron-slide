import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import sys

# omega values from command line or default
if len(sys.argv) > 2:
    omega1 = float(sys.argv[1])
    omega2 = float(sys.argv[2])
else:
    omega1 = 1.0
    omega2 = 1.0

# time values
t = np.linspace(0, 2*np.pi, 400)
# f(t) = sin(omega1*t) * e^(j*omega2*t)
f = np.sin(omega1 * t) * np.exp(1j * omega2 * t)
x, y = f.real, f.imag

# set up figure
fig, ax = plt.subplots(figsize=(6,6))
ax.set_xlim(-1.1, 1.1)
ax.set_ylim(-1.1, 1.1)
ax.set_aspect('equal', 'box')
ax.set_xlabel('Real part')
ax.set_ylabel('Imaginary part')
ax.set_title(fr'$f(t)=\sin(\omega_1 t)\,e^{{j\omega_2 t}}$ with $\omega_1={omega1:.1f}, \omega_2={omega2:.1f}$')
ax.grid(True)

# plot the curve path faintly
ax.plot(x, y, alpha=0.3, color='gray')

# point to animate
point, = ax.plot([], [], 'ro')
# line to animate
line, = ax.plot([], [], 'b-')

def init():
    point.set_data([], [])
    line.set_data([], [])
    return point, line,

def update(frame):
    point.set_data([x[frame]], [y[frame]])
    line.set_data([0, x[frame]], [0, y[frame]])
    return point, line,

ani = animation.FuncAnimation(fig, update, frames=len(t),
                              init_func=init, blit=True, interval=40)

plt.show()
