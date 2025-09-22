import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# theta values
theta = np.linspace(0, 2*np.pi, 400)
f = np.sin(theta) * np.exp(1j * theta)
x, y = f.real, f.imag

# set up figure
fig, ax = plt.subplots(figsize=(6,6))
ax.set_xlim(-1.1, 1.1)
ax.set_ylim(-1.1, 1.1)
ax.set_aspect('equal', 'box')
ax.set_xlabel('Real part')
ax.set_ylabel('Imaginary part')
ax.set_title(r'Animation of $f(\theta)=\sin\theta\,e^{j\theta}$')
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

ani = animation.FuncAnimation(fig, update, frames=len(theta),
                              init_func=init, blit=True, interval=40)

plt.show()
