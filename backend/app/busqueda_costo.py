"""Búsqueda con costos y heurística (UCS, Greedy y A*) y comparación de los 5 algoritmos.

Basado en la práctica p30algoritmosbusquedacompara.py. Se usa en la «Ruta de aprendizaje»:
    - Costo de un paso, c(n, m): cuántos detalles de la mano cambian al pasar de la letra n a la m
      (1 o 2: un dedo, el pulgar, girar la mano...). Una ruta barata = cambios suaves.
    - Heurística, h(n): cuántos detalles le faltan a la letra n para ser la letra meta.

¿Por qué h(n) es admisible (nunca sobreestima)? Cada detalle distinto entre n y la meta tiene
que cambiar al menos una vez en el camino, y cada cambio cuesta 1. Por eso el costo real que
falta siempre es ≥ h(n). Además es CONSISTENTE: h(n) ≤ c(n, m) + h(m) para cada conexión,
así que A* encuentra la ruta de menor costo sin volver a abrir letras ya expandidas.
La función heuristica_consistente() lo comprueba con el grafo real.

Los 5 algoritmos devuelven el mismo formato (ResultadoComparado) para poder compararlos:
    BFS    → menos pasos (no mira el costo)            → busqueda.bfs
    DFS    → lo más profundo primero (primera ruta)    → busqueda.dfs_primera_ruta
    UCS    → menor costo acumulado g(n)
    Greedy → lo que «parece» más cerca h(n)
    A*     → f(n) = g(n) + h(n)

Para probarlo en la consola con el grafo de la práctica:
    cd backend
    .venv\\Scripts\\python -m app.busqueda_costo
"""

# ▸ Desde Python, módulo sys (la consola, para la demostración)
import sys
# ▸ Desde Python, módulo heapq (cola de prioridad: saca primero el valor más pequeño)
import heapq
# ▸ Desde Python, módulo math:
#     inf → infinito (costo de una letra a la que todavía no se sabe llegar)
from math import inf
# ▸ Desde Python, módulo dataclasses (clases simples de datos):
#     dataclass → crea clases de datos simples
#     field → valor por defecto de un campo (listas vacías nuevas para cada resultado)
from dataclasses import dataclass, field

# ▸ Desde nuestro proyecto (carpeta app/busqueda):
#     bfs, dfs_primera_ruta → búsqueda ciega (app/busqueda.py), para compararlas con las de costo
from .busqueda import bfs, dfs_primera_ruta

# Grafo con costos: cada nodo → {vecino: costo}. Ej.: {"A": {"E": 1, "L": 2}, ...}
GrafoConCostos = dict[str, dict[str, float]]
Heuristica = dict[str, float]

NOMBRES = {"bfs": "BFS", "dfs": "DFS", "ucs": "UCS", "greedy": "Greedy", "astar": "A*"}


@dataclass
class Expansion:
    """Un nodo expandido, con sus valores en ese momento (los que no aplican quedan en None)."""

    nodo: str
    g: float | None = None  # costo real desde el inicio
    h: float | None = None  # estimación de lo que falta
    f: float | None = None  # g + h (solo A*)
    profundidad: int | None = None  # pasos desde el inicio (BFS y DFS)


@dataclass
class ResultadoComparado:
    """Formato común de los 5 algoritmos (como crear_resultado() de la práctica)."""

    algoritmo: str  # "bfs" | "dfs" | "ucs" | "greedy" | "astar"
    nombre: str  # "BFS", "A*"...
    camino: list[str] | None = None  # None = no se encontró ruta
    costo: float | None = None  # suma de los costos del camino
    pasos: int = 0  # número de conexiones del camino
    expandidos: list[Expansion] = field(default_factory=list)
    registro: list[str] = field(default_factory=list)  # explicación paso a paso, en español


# ============================================================
# Funciones auxiliares
# ============================================================

def costo_de(grafo: GrafoConCostos, camino: list[str] | None) -> float | None:
    if not camino:
        return None
    return sum(grafo[a][b] for a, b in zip(camino, camino[1:]))


def reconstruir(padres: dict[str, str | None], objetivo: str) -> list[str] | None:
    """Sigue los «padres» desde el objetivo hasta el inicio y voltea la lista."""
    if objetivo not in padres:
        return None
    camino = [objetivo]
    while padres[camino[-1]] is not None:
        camino.append(padres[camino[-1]])
    return camino[::-1]


def _terminar(r: ResultadoComparado, grafo: GrafoConCostos, camino: list[str] | None) -> ResultadoComparado:
    r.camino = camino
    r.costo = costo_de(grafo, camino)
    r.pasos = len(camino) - 1 if camino else 0
    return r


def _vecinos(grafo: GrafoConCostos, nodo: str) -> list[tuple[str, float]]:
    # En orden alfabético, como vecinos_ordenados() de la práctica: así el resultado no depende del orden de llegada.
    return sorted(grafo.get(nodo, {}).items())


# ============================================================
# 1. UCS: BÚSQUEDA DE COSTO UNIFORME
# ============================================================
# Expande siempre la letra con MENOR costo acumulado g(n). Con costos positivos
# encuentra la ruta de costo mínimo, pero no sabe hacia dónde está la meta:
# revisa todo lo «barato» alrededor del inicio.

def ucs(grafo: GrafoConCostos, inicio: str, objetivo: str) -> ResultadoComparado:
    r = ResultadoComparado("ucs", "UCS")
    frontera: list[tuple[float, str]] = [(0, inicio)]  # (g, nodo); heapq saca el menor g
    mejor_g: dict[str, float] = {inicio: 0}
    padres: dict[str, str | None] = {inicio: None}
    cerrados: set[str] = set()  # letras ya expandidas (control de ciclos)

    while frontera:
        g, actual = heapq.heappop(frontera)
        if actual in cerrados or g != mejor_g[actual]:
            continue  # entrada vieja: ya se encontró un camino más barato a esta letra
        cerrados.add(actual)
        r.expandidos.append(Expansion(actual, g=g))
        r.registro.append(f"Se expande {actual} con g = {g:g}.")
        if actual == objetivo:
            break
        for vecino, costo in _vecinos(grafo, actual):
            nuevo_g = g + costo
            if nuevo_g < mejor_g.get(vecino, inf):
                mejor_g[vecino] = nuevo_g
                padres[vecino] = actual
                heapq.heappush(frontera, (nuevo_g, vecino))
                r.registro.append(f"   {vecino}: mejor costo conocido g = {nuevo_g:g}.")

    return _terminar(r, grafo, reconstruir(padres, objetivo) if objetivo in cerrados else None)


# ============================================================
# 2. GREEDY BEST-FIRST SEARCH (búsqueda voraz)
# ============================================================
# Expande la letra con MENOR h(n): la que «se parece más» a la meta. No toma en
# cuenta lo que ya costó llegar, por eso es rápida pero puede dar una ruta más cara.

def greedy(grafo: GrafoConCostos, h: Heuristica, inicio: str, objetivo: str) -> ResultadoComparado:
    r = ResultadoComparado("greedy", "Greedy")
    frontera: list[tuple[float, str]] = [(h[inicio], inicio)]  # (h, nodo)
    descubiertos: set[str] = {inicio}  # cada letra entra a la frontera una sola vez
    padres: dict[str, str | None] = {inicio: None}
    encontrado = False

    while frontera:
        h_actual, actual = heapq.heappop(frontera)
        r.expandidos.append(Expansion(actual, h=h_actual))
        r.registro.append(f"Se expande {actual} con h = {h_actual:g}.")
        if actual == objetivo:
            encontrado = True
            break
        for vecino, _costo in _vecinos(grafo, actual):
            if vecino not in descubiertos:
                descubiertos.add(vecino)
                padres[vecino] = actual
                heapq.heappush(frontera, (h[vecino], vecino))
                r.registro.append(f"   Se agrega {vecino} con h = {h[vecino]:g}.")

    return _terminar(r, grafo, reconstruir(padres, objetivo) if encontrado else None)


# ============================================================
# 3. A*: f(n) = g(n) + h(n)
# ============================================================
# Combina lo que ya costó (g) con lo que se estima que falta (h). Con una heurística
# admisible encuentra la ruta de menor costo, igual que UCS, pero revisando menos letras
# porque la heurística lo orienta hacia la meta.

def astar(grafo: GrafoConCostos, h: Heuristica, inicio: str, objetivo: str) -> ResultadoComparado:
    r = ResultadoComparado("astar", "A*")
    frontera: list[tuple[float, float, str]] = [(h[inicio], 0, inicio)]  # (f, g, nodo)
    mejor_g: dict[str, float] = {inicio: 0}
    padres: dict[str, str | None] = {inicio: None}
    cerrados: set[str] = set()

    while frontera:
        f, g, actual = heapq.heappop(frontera)
        if actual in cerrados or g != mejor_g[actual]:
            continue
        cerrados.add(actual)
        r.expandidos.append(Expansion(actual, g=g, h=h[actual], f=f))
        r.registro.append(f"Se expande {actual}: g = {g:g}, h = {h[actual]:g}, f = {f:g}.")
        if actual == objetivo:
            break
        for vecino, costo in _vecinos(grafo, actual):
            nuevo_g = g + costo
            if nuevo_g < mejor_g.get(vecino, inf):
                mejor_g[vecino] = nuevo_g
                padres[vecino] = actual
                nuevo_f = nuevo_g + h[vecino]
                heapq.heappush(frontera, (nuevo_f, nuevo_g, vecino))
                r.registro.append(f"   {vecino}: g = {nuevo_g:g}, h = {h[vecino]:g}, f = {nuevo_f:g}.")

    return _terminar(r, grafo, reconstruir(padres, objetivo) if objetivo in cerrados else None)


# ============================================================
# 4. BFS y DFS en el mismo formato (reutilizan app/busqueda.py)
# ============================================================

def _ciega(clave: str, grafo: GrafoConCostos, inicio: str, objetivo: str) -> ResultadoComparado:
    sin_costos = {n: sorted(vecinos) for n, vecinos in grafo.items()}  # mismo orden alfabético
    base = bfs(sin_costos, inicio, objetivo) if clave == "bfs" else dfs_primera_ruta(sin_costos, inicio, objetivo)
    r = ResultadoComparado(clave, NOMBRES[clave])
    for p in base.orden_exploracion:
        r.expandidos.append(Expansion(p.nodo, profundidad=p.profundidad))
        r.registro.append(f"Se expande {p.nodo} (profundidad {p.profundidad}).")
    return _terminar(r, grafo, base.rutas[0] if base.rutas else None)


# ============================================================
# 5. COMPARACIÓN
# ============================================================

def comparar(grafo: GrafoConCostos, h: Heuristica, inicio: str, objetivo: str) -> list[ResultadoComparado]:
    """Ejecuta los 5 algoritmos con el mismo grafo, inicio y meta (como comparar_todos() de la práctica)."""
    return [
        _ciega("bfs", grafo, inicio, objetivo),
        _ciega("dfs", grafo, inicio, objetivo),
        ucs(grafo, inicio, objetivo),
        greedy(grafo, h, inicio, objetivo),
        astar(grafo, h, inicio, objetivo),
    ]


def heuristica_consistente(grafo: GrafoConCostos, h: Heuristica, objetivo: str) -> list[str]:
    """Revisa h(meta) = 0 y h(n) ≤ c(n, m) + h(m) en cada conexión. Devuelve las violaciones (vacía = consistente)."""
    fallas = [] if h.get(objetivo, 0) == 0 else [f"h({objetivo}) debe ser 0"]
    for n, vecinos in grafo.items():
        for m, c in vecinos.items():
            if h[n] > c + h[m]:
                fallas.append(f"h({n}) = {h[n]:g} > c({n},{m}) + h({m}) = {c + h[m]:g}")
    return fallas


# ============================================================
# DEMOSTRACIÓN EN CONSOLA:  python -m app.busqueda_costo
# ============================================================

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    # Grafo y heurística de la práctica p30algoritmosbusquedacompara.py.
    GRAFO: GrafoConCostos = {
        "A": {"B": 2, "C": 5}, "B": {"D": 4, "E": 7}, "C": {"F": 2, "G": 6}, "D": {"H": 3}, "E": {"H": 2},
        "F": {"I": 3}, "G": {"I": 2}, "H": {"J": 5}, "I": {"J": 2}, "J": {},
    }
    H: Heuristica = {"A": 9, "B": 8, "C": 5, "D": 6, "E": 5, "F": 4, "G": 3, "H": 5, "I": 2, "J": 0}
    print(f"COMPARACIÓN: A → J   (heurística consistente: {'sí' if not heuristica_consistente(GRAFO, H, 'J') else 'no'})")
    print(f"{'Algoritmo':<10}{'Ruta':<24}{'Pasos':>6}{'Costo':>7}{'Expandidos':>12}")
    for r in comparar(GRAFO, H, "A", "J"):
        ruta = " → ".join(r.camino) if r.camino else "sin ruta"
        print(f"{r.nombre:<10}{ruta:<24}{r.pasos:>6}{(r.costo if r.costo is not None else '—'):>7}{len(r.expandidos):>12}")
    print("\nBFS prioriza la cantidad de pasos; DFS, la profundidad; UCS, el costo g(n);")
    print("Greedy, la heurística h(n); A*, f(n) = g(n) + h(n).")
