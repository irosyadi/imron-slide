# Re-import necessary libraries after reset
import numpy as np
import matplotlib.pyplot as plt

# theta grid
theta = np.linspace(0, 2*np.pi, 2000)

def f(theta, alpha, beta):
    return np.sin(alpha*theta) * np.exp(1j * beta * theta)

# compute for two cases
f12 = f(theta, 1, 2)
f13 = f(theta, 1, 3)

fig, axes = plt.subplots(1, 2, figsize=(12,6))

# Case (alpha=1, beta=2)
axes[0].plot(f12.real, f12.imag)
axes[0].set_title(r'$\alpha=1, \beta=2$')
axes[0].set_xlabel('Real part')
axes[0].set_ylabel('Imaginary part')
axes[0].set_aspect('equal', 'box')
axes[0].grid(True)

# Case (alpha=1, beta=3)
axes[1].plot(f13.real, f13.imag)
axes[1].set_title(r'$\alpha=1, \beta=3$')
axes[1].set_xlabel('Real part')
axes[1].set_ylabel('Imaginary part')
axes[1].set_aspect('equal', 'box')
axes[1].grid(True)

plt.show()
