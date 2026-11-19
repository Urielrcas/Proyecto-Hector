# La red CNN 1D de la práctica 24, en su propio archivo para que la práctica 25 la use
# sin volver a entrenarla. La app hace el mismo cálculo en frontend/src/lib/ia/cnn1d/cnn1d.ts.
#
#   entrada (3 canales × 21 puntos)
#   → Conv1D 32 (ventana 3) + ReLU → Conv1D 32 + ReLU → MaxPool (21 → 10)
#   → Conv1D 64 + ReLU → MaxPool (10 → 5)
#   → aplanar (320) → Densa 64 + ReLU + Dropout 30 % → Densa (una salida por letra)

import torch.nn as nn


class CNN1DManos(nn.Module):
    def __init__(self, clases):
        super().__init__()
        self.convoluciones = nn.Sequential(
            nn.Conv1d(3, 32, kernel_size=3, padding=1), nn.ReLU(),
            nn.Conv1d(32, 32, kernel_size=3, padding=1), nn.ReLU(),
            nn.MaxPool1d(2),  # 21 → 10 puntos
            nn.Conv1d(32, 64, kernel_size=3, padding=1), nn.ReLU(),
            nn.MaxPool1d(2),  # 10 → 5
        )
        self.clasificador = nn.Sequential(nn.Flatten(), nn.Linear(64 * 5, 64), nn.ReLU(), nn.Dropout(0.3), nn.Linear(64, clases))

    def forward(self, x):
        return self.clasificador(self.convoluciones(x))
