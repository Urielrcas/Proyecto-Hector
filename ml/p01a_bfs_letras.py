# ============================================================
# PRACTICA 1 - PARTE A (adaptada a nuestro proyecto)
# ENCONTRAR UNA RUTA ENTRE LETRAS MEDIANTE BFS
# ============================================================
#
# En la práctica de clase el mapa eran edificios de la universidad.
# En nuestro proyecto el "mapa" son las letras de la Lengua de Señas Mexicana:
# dos letras están conectadas si su forma de mano se parece (cambian a lo mucho
# dos cosas, por ejemplo la U y la V solo cambian en que los dedos se separan).
#
# Para qué lo usamos en la app:
#   - El camino de niveles de Aprendizaje ordena las letras con BFS,
#     así las letras parecidas quedan juntas.
#   - "Ruta a una letra": si ya sabes la A y quieres aprender la R,
#     BFS encuentra el camino con menos pasos entre letras parecidas.
#
# El grafo lo exporta la app a datos/grafo_letras.json
# (frontend/scripts/ml-preparar-datos.mjs), así usamos exactamente el mismo.

import json
from collections import deque
from pathlib import Path

AQUI = Path(__file__).parent

# ------------------------------------------------------------
# 1. CARGAR EL GRAFO DE LETRAS PARECIDAS
# ------------------------------------------------------------
grafo = json.loads((AQUI / "datos" / "grafo_letras.json").read_text(encoding="utf-8"))

print("=== GRAFO DE LETRAS ===")
for letra, vecinas in grafo.items():
    print(f"{letra}: {', '.join(vecinas) if vecinas else '(sin letras parecidas)'}")


# ------------------------------------------------------------
# 2. BUSQUEDA EN ANCHURA (igual que en clase)
# ------------------------------------------------------------
def buscar_ruta(grafo, inicio, objetivo):
    # La cola guarda las rutas pendientes; BFS saca primero la más antigua (FIFO).
    cola = deque([[inicio]])
    visitadas = {inicio}

    while cola:
        ruta = cola.popleft()
        letra_actual = ruta[-1]

        if letra_actual == objetivo:
            return ruta

        for vecina in grafo[letra_actual]:
            if vecina not in visitadas:
                visitadas.add(vecina)
                cola.append(ruta + [vecina])

    return None


# ------------------------------------------------------------
# 3. PROBARLO CON CASOS DE LA APP
# ------------------------------------------------------------
print("\n=== RUTAS DE APRENDIZAJE ===")
for inicio, objetivo in [("A", "R"), ("A", "H"), ("B", "W"), ("A", "C")]:
    ruta = buscar_ruta(grafo, inicio, objetivo)
    if ruta:
        print(f"De {inicio} a {objetivo}: {' -> '.join(ruta)}  ({len(ruta) - 1} pasos)")
    else:
        # Pasa con C, O y D: solo se parecen entre ellas y no hay camino desde la A.
        print(f"De {inicio} a {objetivo}: no hay ruta (esas letras no se parecen a nada que ya sepas)")


# ------------------------------------------------------------
# 4. EL ORDEN DEL CAMINO DE NIVELES
# ------------------------------------------------------------
# Recorremos todo el grafo con BFS desde la A. Cuando un grupo se termina,
# seguimos con la siguiente letra que falte en orden alfabético.
def orden_bfs(grafo):
    orden, visitadas = [], set()
    for inicio in sorted(grafo):
        if inicio in visitadas:
            continue
        cola = deque([inicio])
        visitadas.add(inicio)
        while cola:
            letra = cola.popleft()
            orden.append(letra)
            for vecina in sorted(grafo[letra]):
                if vecina not in visitadas:
                    visitadas.add(vecina)
                    cola.append(vecina)
    return orden


orden = orden_bfs(grafo)
print("\n=== CAMINO DE NIVELES (4 letras por nivel) ===")
for i in range(0, len(orden), 4):
    print(f"Nivel {i // 4 + 1}: {' '.join(orden[i:i + 4])}")
