# PRUEBAS DE UCS, GREEDY, A* Y DE LA COMPARACIÓN DE LOS 5 ALGORITMOS (app/busqueda_costo.py)
# Con el grafo de la práctica p30algoritmosbusquedacompara.py deben salir exactamente las mismas
# rutas, costos y nodos expandidos que en el programa del profesor. Con un grafo de letras se
# comprueba que UCS y A* dan la ruta más barata y que A* revisa menos letras gracias a la heurística.

# ▸ Desde nuestro proyecto (app/busqueda_costo.py):
#     astar, comparar, greedy, heuristica_consistente, ucs → algoritmos con costo y heurística
from app.busqueda_costo import astar, comparar, greedy, heuristica_consistente, ucs

# Grafo y heurística de la práctica (dirigido, con costos).
GRAFO = {
    "A": {"B": 2, "C": 5}, "B": {"D": 4, "E": 7}, "C": {"F": 2, "G": 6}, "D": {"H": 3}, "E": {"H": 2},
    "F": {"I": 3}, "G": {"I": 2}, "H": {"J": 5}, "I": {"J": 2}, "J": {},
}
H = {"A": 9, "B": 8, "C": 5, "D": 6, "E": 5, "F": 4, "G": 3, "H": 5, "I": 2, "J": 0}

# Grafo de letras pequeño (no dirigido): el costo es cuántos detalles de la mano cambian
# y h(n) cuántos detalles le faltan a la letra para ser U (la meta).
LETRAS = {
    "A": {"E": 1, "L": 2, "S": 1}, "E": {"A": 1, "L": 2, "S": 1}, "S": {"A": 1, "E": 1, "L": 2, "U": 1},
    "L": {"A": 2, "E": 2, "S": 2, "U": 2}, "U": {"L": 2, "S": 1},
}
H_U = {"A": 2, "E": 2, "S": 1, "L": 2, "U": 0}


def nodos(r):
    return [e.nodo for e in r.expandidos]


def test_igual_que_la_practica():
    esperado = {
        "BFS": (["A", "B", "D", "H", "J"], 14, 10),
        "DFS": (["A", "B", "D", "H", "J"], 14, 5),
        "UCS": (["A", "C", "F", "I", "J"], 12, 10),
        "Greedy": (["A", "C", "G", "I", "J"], 15, 5),
        "A*": (["A", "C", "F", "I", "J"], 12, 7),
    }
    for r in comparar(GRAFO, H, "A", "J"):
        camino, costo, expandidos = esperado[r.nombre]
        assert (r.camino, r.costo, len(r.expandidos)) == (camino, costo, expandidos), r.nombre


def test_orden_de_expansion_y_valores():
    assert nodos(ucs(GRAFO, "A", "J")) == ["A", "B", "C", "D", "F", "E", "H", "I", "G", "J"]
    assert nodos(greedy(GRAFO, H, "A", "J")) == ["A", "C", "G", "I", "J"]
    a = astar(GRAFO, H, "A", "J")
    assert nodos(a) == ["A", "B", "C", "F", "D", "I", "J"]
    # En A* cada expansión trae g, h y f = g + h.
    assert all(e.f == e.g + e.h for e in a.expandidos)


def test_heuristica_consistente():
    assert heuristica_consistente(GRAFO, H, "J") == []
    assert heuristica_consistente(LETRAS, H_U, "U") == []
    # Una heurística que sobreestima se detecta.
    assert heuristica_consistente(LETRAS, H_U | {"A": 9}, "U")


def test_letras_ucs_y_astar_dan_la_ruta_mas_barata():
    r = {x.nombre: x for x in comparar(LETRAS, H_U, "A", "U")}
    # BFS cuenta pasos: A → L → U (2 pasos) pero cuesta 4 cambios de la mano.
    assert r["BFS"].camino == ["A", "L", "U"] and r["BFS"].costo == 4
    # UCS y A* buscan menos cambios: A → S → U cuesta 2.
    assert r["UCS"].camino == r["A*"].camino == ["A", "S", "U"] and r["A*"].costo == 2
    # A* no revisa más letras que UCS: la heurística lo orienta hacia U.
    assert len(r["A*"].expandidos) <= len(r["UCS"].expandidos)


def test_sin_ruta():
    separado = LETRAS | {"D": {}}
    for r in comparar(separado, H_U | {"D": 0}, "A", "D"):
        assert r.camino is None and r.costo is None and r.pasos == 0


def test_api_comparar(cliente):
    r = cliente.post("/api/busqueda/comparar", json={"grafo": GRAFO, "heuristica": H, "inicio": "A", "objetivo": "J"})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["heuristica_consistente"] is True
    assert [x["nombre"] for x in datos["resultados"]] == ["BFS", "DFS", "UCS", "Greedy", "A*"]
    assert datos["resultados"][4]["expandidos"][0] == {"nodo": "A", "g": 0, "h": 9, "f": 9, "profundidad": None}


def test_api_comparar_validaciones(cliente):
    base = {"grafo": GRAFO, "heuristica": H, "inicio": "A", "objetivo": "J"}
    # Falta la heurística de un nodo
    assert cliente.post("/api/busqueda/comparar", json=base | {"heuristica": {"A": 1}}).status_code == 422
    # Costo 0 (UCS y A* necesitan costos positivos)
    assert cliente.post("/api/busqueda/comparar", json=base | {"grafo": GRAFO | {"A": {"B": 0, "C": 5}}}).status_code == 422
    # Heurística negativa
    assert cliente.post("/api/busqueda/comparar", json=base | {"heuristica": H | {"A": -1}}).status_code == 422
