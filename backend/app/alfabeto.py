# LETRAS DE CADA ALFABETO (LSM y ASL)
# El backend solo necesita saber QUÉ letras existen en cada lengua, para:
#   - rechazar letras inventadas al guardar el progreso (rutas/progreso.py),
#   - calcular el porcentaje de avance y graficar todas las letras, aunque nadie las haya logrado
#     (rutas/estadisticas.py).
# La forma de la mano y los pasos de cada letra viven en el frontend (src/lib/aprendizaje/alfabeto.ts).
# Si se agrega una letra allá, hay que agregarla también aquí.

LETRAS: dict[str, list[str]] = {
    # LSM: 27 letras (incluye la Ñ, en su lugar del alfabeto español)
    "LSM": list("ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"),
    # ASL: 26 letras
    "ASL": list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
}
