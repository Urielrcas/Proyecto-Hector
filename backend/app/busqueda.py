"""Búsqueda ciega en grafos: DFS (en profundidad) y BFS (en anchura).

Se usa para la «Ruta de aprendizaje»: cada letra del alfabeto es un nodo y dos letras
están conectadas si su forma de mano se parece. Buscar una ruta de la letra que el usuario
ya sabe a la que quiere aprender da un camino de letras intermedias, cada una parecida a
la anterior, para aprender poco a poco.

Como problema de búsqueda P = (S, A, s0, G, C):
    S  (estados)   → las letras
    A  (acciones)  → pasar a una letra conectada (los vecinos en el grafo)
    s0 (inicial)   → la letra que ya sabe
    G  (objetivo)  → la letra que quiere aprender
    C  (costo)     → número de pasos

Tres algoritmos (todos devuelven un ResultadoBusqueda):
    dfs_todas_las_rutas → DFS con backtracking: TODAS las rutas sin ciclos, hasta el límite.
    dfs_primera_ruta    → DFS clásico (como p21busquedaciegadfs.py): se detiene en la primera.
    bfs                 → BFS (como p11problema_busqueda.py): la ruta con MENOS pasos.

Importante: RUTA ENCONTRADA ≠ NODOS EXPLORADOS.
    orden_exploracion → cada nodo en el momento en que el algoritmo lo revisa (puede repetirse
                        si se llega a él por caminos distintos).
    visitados         → los nodos distintos que se revisaron al menos una vez.
    rutas             → solo los caminos que sí llegan al objetivo.

Para probarlo en la consola (con el grafo con ciclos de la clase):
    cd backend
    .venv\\Scripts\\python -m app.busqueda
"""

# ▸ Desde Python, módulo sys (la consola, para la demostración)
import sys
# ▸ Desde Python, módulo collections (estructuras de datos):
#     deque → cola donde sacar del inicio es rápido (la usa BFS)
from collections import deque
# ▸ Desde Python, módulo dataclasses (clases simples de datos):
#     dataclass → crea clases de datos simples
#     field → valor por defecto de un campo (listas vacías nuevas para cada resultado)
from dataclasses import dataclass, field
# ▸ Desde Python, módulo typing (anotaciones de tipos):
#     Literal → tipo: solo ciertos valores exactos
from typing import Literal

# El grafo es un diccionario: cada nodo → lista de sus vecinos. Ej.: {"A": ["B", "D"], "B": ["C"], ...}
Grafo = dict[str, list[str]]
Algoritmo = Literal["dfs-todas", "dfs-primera", "bfs"]

# Topes de seguridad: con límites altos el número de rutas crece muchísimo.
# Si se alcanzan, la búsqueda se detiene y el resultado sale con truncado=True.
MAX_RUTAS = 200
MAX_PASOS = 5000


@dataclass
class Paso:
    """Un renglón del orden de exploración: qué nodo se revisó y a qué profundidad (inicio = 0)."""

    nodo: str
    profundidad: int


@dataclass
class ResultadoBusqueda:
    algoritmo: Algoritmo
    inicio: str
    objetivo: str
    limite: int | None  # profundidad máxima (None = sin límite)
    orden_exploracion: list[Paso] = field(default_factory=list)
    visitados: list[str] = field(default_factory=list)  # sin repetir, en el orden de la primera visita
    rutas: list[list[str]] = field(default_factory=list)
    # Ciclos que el algoritmo detectó y NO siguió, sin repetir. Ej.: ["A", "E", "S", "A"]
    ciclos_evitados: list[list[str]] = field(default_factory=list)
    # Veces que se descartó un vecino por estar ya visitado (cuenta también los ciclos repetidos).
    repetidos_evitados: int = 0
    # Nodos donde una rama se detuvo por llegar al límite de profundidad, sin repetir.
    cortes_por_limite: list[str] = field(default_factory=list)
    ramas_cortadas: int = 0  # cuántas veces se cortó una rama (con repeticiones)
    truncado: bool = False  # True si se alcanzó MAX_RUTAS o MAX_PASOS

    # ── Funciones para ir anotando lo que pasa durante la búsqueda ──

    def anotar_exploracion(self, nodo: str, profundidad: int) -> bool:
        """Registra que se revisó un nodo. Devuelve False si ya se llegó al tope de pasos."""
        if len(self.orden_exploracion) >= MAX_PASOS:
            self.truncado = True
            return False
        self.orden_exploracion.append(Paso(nodo, profundidad))
        if nodo not in self.visitados:
            self.visitados.append(nodo)
        return True

    def anotar_ciclo(self, ciclo: list[str]) -> None:
        """Guarda un ciclo detectado (si es el mismo ciclo recorrido desde otro punto, no se repite)."""
        self.repetidos_evitados += 1
        clave = _clave_de_ciclo(ciclo)
        if all(_clave_de_ciclo(c) != clave for c in self.ciclos_evitados):
            self.ciclos_evitados.append(ciclo)

    def anotar_corte(self, nodo: str) -> None:
        self.ramas_cortadas += 1
        if nodo not in self.cortes_por_limite:
            self.cortes_por_limite.append(nodo)


def _clave_de_ciclo(ciclo: list[str]) -> frozenset[str]:
    # A→E→S→A, E→S→A→E y A→S→E→A son el mismo ciclo: tienen los mismos nodos.
    return frozenset(ciclo)


# ============================================================
# 1. DFS CON BACKTRACKING: TODAS LAS RUTAS (con límite de profundidad)
# ============================================================
#
# Idea: avanzar lo más profundo posible; al llegar al objetivo, GUARDAR la ruta y
# SEGUIR buscando (no detenerse). Al terminar con un nodo, quitarlo del camino y
# regresar al anterior (backtracking) para probar otro vecino.
#
# Control de ciclos: el conjunto "en_camino" guarda los nodos de la rama actual.
# Antes de avanzar a un vecino se revisa si ya está en el camino: si está, avanzar
# formaría un ciclo (A → E → S → A …) y la búsqueda nunca terminaría, así que se evita.
#
# Se usa "en_camino" y no un "visitados" global porque una letra puede formar parte
# de varias rutas distintas; lo que no puede pasar es que se repita DENTRO de una ruta.

def dfs_todas_las_rutas(grafo: Grafo, inicio: str, objetivo: str, limite: int | None = None) -> ResultadoBusqueda:
    resultado = ResultadoBusqueda("dfs-todas", inicio, objetivo, limite)
    camino: list[str] = []  # la rama que se está siguiendo ahora (funciona como la pila de DFS)
    en_camino: set[str] = set()  # los mismos nodos que "camino", en un set para revisarlos rápido

    def explorar(actual: str, profundidad: int) -> None:
        # Detenerse si ya se llegó a alguno de los topes de seguridad.
        if len(resultado.rutas) >= MAX_RUTAS:
            resultado.truncado = True
            return
        if not resultado.anotar_exploracion(actual, profundidad):
            return

        camino.append(actual)
        en_camino.add(actual)

        if actual == objetivo:
            # ¡Ruta encontrada! Se guarda una COPIA (camino seguirá cambiando) y NO se para.
            resultado.rutas.append(camino.copy())
        elif limite is not None and profundidad >= limite:
            # Límite de profundidad: esta rama ya no puede bajar más.
            resultado.anotar_corte(actual)
        else:
            for vecino in grafo.get(actual, []):
                if vecino in en_camino:
                    # Regresar a la letra de la que venimos (A → E → A) es solo deshacer el paso:
                    # se evita, pero no se anota como ciclo para no llenar la lista de ida-y-vuelta.
                    if len(camino) >= 2 and vecino == camino[-2]:
                        continue
                    # Ciclo detectado: el tramo del camino desde ese vecino hasta aquí, y de vuelta al vecino.
                    resultado.anotar_ciclo(camino[camino.index(vecino):] + [vecino])
                    continue
                explorar(vecino, profundidad + 1)

        # BACKTRACKING: se termina con "actual"; se quita del camino para probar otras ramas.
        camino.pop()
        en_camino.remove(actual)

    explorar(inicio, 0)
    return resultado


# ============================================================
# 2. DFS CLÁSICO: PRIMERA RUTA (como p21busquedaciegadfs.py, con límite)
# ============================================================
#
# Usa un "visitados" global: cada nodo se explora UNA sola vez en toda la búsqueda.
# Es más rápido, pero devuelve la primera ruta que encuentra (no necesariamente la más corta).

def dfs_primera_ruta(grafo: Grafo, inicio: str, objetivo: str, limite: int | None = None) -> ResultadoBusqueda:
    resultado = ResultadoBusqueda("dfs-primera", inicio, objetivo, limite)
    visitados: set[str] = set()
    camino: list[str] = []

    def explorar(actual: str, profundidad: int) -> bool:
        if not resultado.anotar_exploracion(actual, profundidad):
            return False
        visitados.add(actual)
        camino.append(actual)

        if actual == objetivo:
            resultado.rutas.append(camino.copy())
            return True  # se encontró: detener toda la búsqueda
        if limite is not None and profundidad >= limite:
            resultado.anotar_corte(actual)
        else:
            for vecino in grafo.get(actual, []):
                if vecino in visitados:
                    if len(camino) >= 2 and vecino == camino[-2]:
                        continue  # deshacer el paso anterior (ver dfs_todas_las_rutas)
                    if vecino in camino:
                        resultado.anotar_ciclo(camino[camino.index(vecino):] + [vecino])
                    else:
                        resultado.repetidos_evitados += 1  # ya se exploró en otra rama
                    continue
                if explorar(vecino, profundidad + 1):
                    return True

        camino.pop()  # backtracking
        return False

    explorar(inicio, 0)
    return resultado


# ============================================================
# 3. BFS: RUTA MÁS CORTA (como p11problema_busqueda.py, con límite)
# ============================================================
#
# Explora por niveles: primero todos los vecinos del inicio, luego los vecinos de esos…
# Por eso la primera ruta que encuentra es la de MENOS pasos. Usa una cola (FIFO).

def bfs(grafo: Grafo, inicio: str, objetivo: str, limite: int | None = None) -> ResultadoBusqueda:
    resultado = ResultadoBusqueda("bfs", inicio, objetivo, limite)
    cola: deque[list[str]] = deque([[inicio]])  # cada elemento es un camino completo
    visitados: set[str] = set()

    while cola:
        camino = cola.popleft()  # el primero que entró es el primero que sale
        actual = camino[-1]
        if actual in visitados:
            continue  # llegó a la cola por dos caminos; el primero ya se exploró
        visitados.add(actual)
        profundidad = len(camino) - 1
        if not resultado.anotar_exploracion(actual, profundidad):
            break

        if actual == objetivo:
            resultado.rutas.append(camino)
            break
        if limite is not None and profundidad >= limite:
            resultado.anotar_corte(actual)
            continue

        for vecino in grafo.get(actual, []):
            if vecino in visitados:
                if len(camino) >= 2 and vecino == camino[-2]:
                    continue
                if vecino in camino:
                    resultado.anotar_ciclo(camino[camino.index(vecino):] + [vecino])
                else:
                    resultado.repetidos_evitados += 1
                continue
            cola.append(camino + [vecino])

    return resultado


ALGORITMOS = {"dfs-todas": dfs_todas_las_rutas, "dfs-primera": dfs_primera_ruta, "bfs": bfs}


def buscar(grafo: Grafo, inicio: str, objetivo: str, algoritmo: Algoritmo = "dfs-todas", limite: int | None = None) -> ResultadoBusqueda:
    """Ejecuta el algoritmo elegido. Es lo que llama la ruta POST /api/busqueda/ruta."""
    return ALGORITMOS[algoritmo](grafo, inicio, objetivo, limite)


# ============================================================
# DEMOSTRACIÓN EN CONSOLA:  python -m app.busqueda
# ============================================================

def _imprimir(r: ResultadoBusqueda) -> None:
    print(f"Orden de exploración: {' → '.join(p.nodo for p in r.orden_exploracion)}")
    print(f"Nodos visitados ({len(r.visitados)}): {', '.join(r.visitados)}")
    if r.rutas:
        for i, ruta in enumerate(r.rutas, 1):
            print(f"Ruta {i}: {' → '.join(ruta)}")
    else:
        print("Ruta: no se encontró ninguna")
    for ciclo in r.ciclos_evitados:
        print(f"Ciclo detectado y evitado: {' → '.join(ciclo)}")
    if r.cortes_por_limite:
        print(f"Ramas cortadas por el límite en: {', '.join(r.cortes_por_limite)}")


if __name__ == "__main__":
    # La consola de Windows no muestra "→" si no se le pide usar UTF-8.
    sys.stdout.reconfigure(encoding="utf-8")

    # Grafo de la práctica, con el ciclo A → B → C → D → A y dos caminos hacia F.
    #     A → B → F
    #     ↑   ↓
    #     D ← C → F
    grafo_clase: Grafo = {"A": ["B"], "B": ["C", "F"], "C": ["D", "F"], "D": ["A"], "F": []}

    for limite in (1, 2, 3, None):
        print("=" * 60)
        print(f"DFS (todas las rutas) de A a F — límite de profundidad: {limite or 'sin límite'}")
        print("=" * 60)
        _imprimir(dfs_todas_las_rutas(grafo_clase, "A", "F", limite))
        print()

    print("=" * 60)
    print("BFS de A a F (ruta más corta)")
    print("=" * 60)
    _imprimir(bfs(grafo_clase, "A", "F"))
