"""Búsqueda de la ruta de aprendizaje (DFS, BFS, UCS, Greedy y A*).

  POST /api/busqueda/ruta      → busca rutas entre dos letras con DFS o BFS (app/busqueda.py).
  POST /api/busqueda/comparar  → ejecuta BFS, DFS, UCS, Greedy y A* con el mismo grafo con costos
                                 y la misma heurística, para compararlos (app/busqueda_costo.py).

Es pública (no pide sesión) para que también la usen los invitados: solo hace cálculos,
no lee ni guarda nada en la base de datos.
La llama el frontend desde src/services/busqueda.ts (pantalla «Ruta de aprendizaje»).
"""

# ▸ Desde Python, módulo dataclasses:
#     asdict → convierte el resultado (dataclass) en diccionario para responder en JSON
from dataclasses import asdict

# ▸ Desde FastAPI (framework para crear la API):
#     APIRouter → grupo de rutas de la API
from fastapi import APIRouter

# ▸ Desde nuestro proyecto (carpeta app/busqueda):
#     buscar → ejecuta DFS (todas / primera ruta) o BFS (app/busqueda.py)
from ..busqueda import buscar
# ▸ Desde nuestro proyecto (carpeta app/busqueda_costo):
#     comparar → ejecuta los 5 algoritmos (app/busqueda_costo.py)
#     heuristica_consistente → revisa que la heurística nunca sobreestime (app/busqueda_costo.py)
from ..busqueda_costo import comparar, heuristica_consistente
# ▸ Desde nuestro proyecto (carpeta app/modelos):
#     BusquedaEntrada → grafo, inicio, objetivo, algoritmo y límite (app/modelos.py)
#     BusquedaSalida → orden de exploración, visitados, rutas, ciclos y cortes (app/modelos.py)
#     ComparacionEntrada → grafo con costos, heurística, inicio y objetivo (app/modelos.py)
#     ComparacionSalida → resultado de los 5 algoritmos y si la heurística es consistente (app/modelos.py)
from ..modelos import BusquedaEntrada, BusquedaSalida, ComparacionEntrada, ComparacionSalida

router = APIRouter(prefix="/api/busqueda", tags=["búsqueda"])


# POST /api/busqueda/ruta
# Ejemplo de cuerpo: {"grafo": {"A": ["B"], "B": ["C", "F"], ...}, "inicio": "A", "objetivo": "F", "limite": 3}
@router.post("/ruta", response_model=BusquedaSalida)
def ruta(datos: BusquedaEntrada):
    # "def" (no "async def"): la búsqueda es puro cálculo y así FastAPI la corre aparte,
    # sin detener las demás peticiones mientras termina.
    resultado = buscar(datos.grafo, datos.inicio, datos.objetivo, datos.algoritmo, datos.limite)
    return asdict(resultado)


# POST /api/busqueda/comparar
# Ejemplo de cuerpo: {"grafo": {"A": {"B": 2, "C": 5}, ...}, "heuristica": {"A": 9, ...}, "inicio": "A", "objetivo": "J"}
@router.post("/comparar", response_model=ComparacionSalida)
def comparar_algoritmos(datos: ComparacionEntrada):
    fallas = heuristica_consistente(datos.grafo, datos.heuristica, datos.objetivo)
    return {
        "resultados": [asdict(r) for r in comparar(datos.grafo, datos.heuristica, datos.inicio, datos.objetivo)],
        "heuristica_consistente": not fallas,
        "fallas_heuristica": fallas,
    }
