# PREDICCIÓN DEL SIGUIENTE INTENTO (prácticas 26 y 27)
# Una red convolucional 1D de regresión, entrenada en Python con PyTorch (ml/p27_entrenar_prediccion.py),
# que estima el puntaje (0 a 100) del próximo intento de una letra a partir de los DOS intentos
# anteriores de esa letra: (puntaje, segundos, ¿la logró?) de cada uno.
#
# Aquí no se usa PyTorch (sería muy pesado para el servidor): los pesos vienen en
# app/datos/prediccion_intentos.json y el cálculo se hace con numpy, igual que la red:
#   Conv1D (16 filtros, ventana 2) + ReLU → Densa 16 + ReLU → Densa 1
# Al cargar se comprueba con el ejemplo que trae el archivo que el resultado sea el mismo que en PyTorch.

# ▸ Desde Python:
import base64
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# ▸ Desde numpy (cálculo con matrices)
import numpy as np

ARCHIVO = Path(__file__).parent / "datos" / "prediccion_intentos.json"


def _tensor(capa: dict[str, Any]) -> np.ndarray:
    return np.frombuffer(base64.b64decode(capa["datos"]), dtype="<f4").reshape(capa["forma"])


@lru_cache(maxsize=1)
def _modelo() -> dict[str, Any] | None:
    """Carga los pesos una sola vez. Si no existe el archivo, no hay predicción (devuelve None)."""
    if not ARCHIVO.exists():
        return None
    datos = json.loads(ARCHIVO.read_text(encoding="utf-8"))
    pesos = {nombre: _tensor(capa) for nombre, capa in datos["capas"].items()}
    return {"pesos": pesos, "max_segundos": datos["maxSegundos"], "prueba": datos["prueba"], "mae": datos.get("mae")}


def _red(x: np.ndarray) -> float:
    """x: (3 canales, 2 intentos) → puntaje de 0 a 100."""
    p = _modelo()["pesos"]
    # Conv1D con ventana 2 sobre 2 intentos = una sola posición: cada filtro mira los 2 intentos juntos.
    conv = np.einsum("fck,ck->f", p["red.0.weight"], x) + p["red.0.bias"]
    oculta = np.maximum(p["red.3.weight"] @ np.maximum(conv, 0) + p["red.3.bias"], 0)
    salida = p["red.5.weight"] @ oculta + p["red.5.bias"]
    return float(salida[0]) * 100


def entrada_de(intentos: list[dict[str, Any]]) -> np.ndarray:
    """Los dos últimos intentos (del más viejo al más nuevo) → tensor (3, 2)."""
    maximo = _modelo()["max_segundos"]
    return np.array(
        [
            [i["puntaje"] / 100 for i in intentos],
            [min(i["segundos"], maximo) / maximo for i in intentos],
            [1.0 if i["acierto"] else 0.0 for i in intentos],
        ],
        dtype=np.float32,
    )


def predecir_siguiente(intentos: list[dict[str, Any]]) -> int | None:
    """Puntaje esperado del siguiente intento, con los dos últimos intentos de la letra (o None)."""
    if _modelo() is None or len(intentos) < 2:
        return None
    return int(round(min(100.0, max(0.0, _red(entrada_de(intentos[-2:]))))))


def comprobar() -> float:
    """Diferencia entre este cálculo y el de PyTorch con el ejemplo del archivo (debe ser casi 0)."""
    m = _modelo()
    return abs(_red(np.array(m["prueba"]["entrada"], dtype=np.float32)) - m["prueba"]["salida"])


def mensaje_prediccion(letra: str, puntaje: int) -> str:
    """El número en palabras sencillas para el usuario."""
    if puntaje >= 85:
        return f"Calculo que tu próximo intento de la {letra} saldrá muy bien (≈ {puntaje} %). ¡Ya casi la tienes!"
    if puntaje >= 60:
        return f"Vas por buen camino: tu próximo intento de la {letra} debería salir cerca de un {puntaje} %."
    return f"La {letra} todavía te cuesta (≈ {puntaje} % en el próximo intento). Revisa los pasos con calma antes de intentarlo."
