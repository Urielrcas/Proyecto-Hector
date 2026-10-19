# PRUEBAS DE LA BÚSQUEDA DFS / BFS (app/busqueda.py y POST /api/busqueda/ruta)
# Demuestran lo que pide la práctica:
#   - el orden de exploración es distinto de la ruta encontrada,
#   - con ciclos (A → B → C → D → A) el algoritmo termina y reporta el ciclo que evitó,
#   - DFS encuentra TODAS las rutas, no solo la primera,
#   - el límite de profundidad corta ramas y cambia el resultado.

# ▸ Desde nuestro proyecto (app/busqueda.py):
#     bfs, dfs_primera_ruta, dfs_todas_las_rutas → los tres algoritmos de búsqueda
#     MAX_RUTAS → tope de rutas que se devuelven
from app.busqueda import MAX_RUTAS, bfs, dfs_primera_ruta, dfs_todas_las_rutas

# Grafo con el ciclo de la práctica y varias rutas hacia F:
#     A → B → F
#     ↑   ↓
#     D ← C → F
CICLICO = {"A": ["B"], "B": ["C", "F"], "C": ["D", "F"], "D": ["A"], "F": []}

# Grafo de p21busquedaciegadfs.py (un árbol: sin ciclos).
ARBOL = {"A": ["B", "C"], "B": ["D", "E"], "C": ["F"], "D": [], "E": [], "F": []}


def nodos(resultado):
    return [p.nodo for p in resultado.orden_exploracion]


def test_ruta_distinta_de_explorados():
    r = dfs_primera_ruta(ARBOL, "A", "F")
    # Exploró toda la rama de B antes de llegar a F...
    assert nodos(r) == ["A", "B", "D", "E", "C", "F"]
    # ...pero la ruta solo pasa por C.
    assert r.rutas == [["A", "C", "F"]]


def test_ciclo_detectado_y_evitado():
    r = dfs_todas_las_rutas(CICLICO, "A", "F")
    # Terminó (no se quedó dando vueltas) y reporta el ciclo que evitó.
    assert r.ciclos_evitados == [["A", "B", "C", "D", "A"]]
    # Ningún nodo se repite dentro de una misma ruta.
    assert all(len(ruta) == len(set(ruta)) for ruta in r.rutas)


def test_todas_las_rutas():
    r = dfs_todas_las_rutas(CICLICO, "A", "F")
    assert r.rutas == [["A", "B", "C", "F"], ["A", "B", "F"]]
    # F se exploró dos veces (una por ruta), pero en "visitados" aparece una sola.
    assert nodos(r).count("F") == 2
    assert r.visitados.count("F") == 1


def test_limite_de_profundidad_cambia_el_resultado():
    # Límite 1: solo llega a B → sin rutas, la rama se corta en B.
    r1 = dfs_todas_las_rutas(CICLICO, "A", "F", limite=1)
    assert r1.rutas == [] and r1.cortes_por_limite == ["B"]
    # Límite 2: aparece la ruta corta.
    r2 = dfs_todas_las_rutas(CICLICO, "A", "F", limite=2)
    assert r2.rutas == [["A", "B", "F"]]
    # Límite 3: aparecen las dos rutas.
    r3 = dfs_todas_las_rutas(CICLICO, "A", "F", limite=3)
    assert len(r3.rutas) == 2
    # Ninguna ruta pasa del límite (profundidad = pasos = nodos - 1).
    assert all(len(ruta) - 1 <= 3 for ruta in r3.rutas)


def test_bfs_da_la_ruta_mas_corta():
    r = bfs(CICLICO, "A", "F")
    assert r.rutas == [["A", "B", "F"]]
    # En cambio, el DFS clásico devuelve la primera que encuentra, que aquí es más larga.
    assert dfs_primera_ruta(CICLICO, "A", "F").rutas == [["A", "B", "C", "F"]]


def test_grafo_no_dirigido_no_cuenta_ida_y_vuelta_como_ciclo():
    # Triángulo A–E–S (como las letras A, E y S, que se parecen entre sí) y de S se llega a Z.
    triangulo = {"A": ["E", "S"], "E": ["A", "S"], "S": ["A", "E", "Z"], "Z": ["S"]}
    r = dfs_todas_las_rutas(triangulo, "A", "Z")
    assert r.rutas == [["A", "E", "S", "Z"], ["A", "S", "Z"]]
    # Solo un ciclo real (A → E → S → A), no las idas y vueltas A → E → A.
    # Se encontró dos veces (A→E→S→A y A→S→E→A) pero se anota una sola.
    assert len(r.ciclos_evitados) == 1 and set(r.ciclos_evitados[0]) == {"A", "E", "S"}
    assert r.repetidos_evitados == 2


def test_sin_ruta():
    r = dfs_todas_las_rutas({"A": ["B"], "B": ["A"], "C": []}, "A", "C")
    assert r.rutas == [] and r.visitados == ["A", "B"]


def test_tope_de_rutas():
    # Grafo completo de 9 nodos: miles de rutas sin límite → se detiene en MAX_RUTAS.
    nombres = list("ABCDEFGHI")
    completo = {n: [m for m in nombres if m != n] for n in nombres}
    r = dfs_todas_las_rutas(completo, "A", "I")
    assert len(r.rutas) == MAX_RUTAS and r.truncado


def test_api_busqueda(cliente):
    r = cliente.post("/api/busqueda/ruta", json={"grafo": CICLICO, "inicio": "A", "objetivo": "F", "limite": 3})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["rutas"] == [["A", "B", "C", "F"], ["A", "B", "F"]]
    assert datos["orden_exploracion"][0] == {"nodo": "A", "profundidad": 0}
    assert datos["cortes_por_limite"] == ["D"]

    # BFS por la API
    r = cliente.post("/api/busqueda/ruta", json={"grafo": CICLICO, "inicio": "A", "objetivo": "F", "algoritmo": "bfs"})
    assert r.json()["rutas"] == [["A", "B", "F"]]


def test_api_busqueda_validaciones(cliente):
    # Objetivo que no está en el grafo
    r = cliente.post("/api/busqueda/ruta", json={"grafo": CICLICO, "inicio": "A", "objetivo": "Z"})
    assert r.status_code == 422
    # Vecino que no está en el grafo
    r = cliente.post("/api/busqueda/ruta", json={"grafo": {"A": ["X"]}, "inicio": "A", "objetivo": "A"})
    assert r.status_code == 422
    # Límite fuera de rango (máximo 6)
    r = cliente.post("/api/busqueda/ruta", json={"grafo": CICLICO, "inicio": "A", "objetivo": "F", "limite": 9})
    assert r.status_code == 422
