# MODELOS DE DATOS (validación con Pydantic)
# Definen la forma exacta de los datos que entran y salen de la API.
# Si llega un dato con formato incorrecto (correo inválido, contraseña corta, etc.),
# FastAPI responde automáticamente con error 422 sin llegar a ejecutar la ruta.
# UsuarioPublico es lo que se devuelve al navegador: NUNCA incluye la contraseña.

# ▸ Desde Python, módulo re (expresiones regulares: buscar patrones en texto)
import re
# ▸ Desde Python, módulo datetime (fechas y horas):
#     datetime → fecha y hora
from datetime import datetime
# ▸ Desde Python, módulo typing (anotaciones de tipos):
#     Annotated → tipo con reglas extra de validación
#     Any → tipo: cualquier valor
#     Literal → tipo: solo ciertos valores exactos
from typing import Annotated, Any, Literal

# ▸ Desde Pydantic (validación de datos):
#     AfterValidator → validación extra después de la básica
#     BaseModel → clase base de los modelos de datos
#     EmailStr → tipo: correo con formato válido
#     Field → reglas de un campo (mínimo, máximo...)
#     model_validator → validación que revisa varios campos juntos
from pydantic import AfterValidator, BaseModel, EmailStr, Field, model_validator

# Literal = solo se aceptan esos valores exactos (cualquier otro da error 422).
Rol = Literal["admin", "usuario"]
Estado = Literal["activo", "inactivo"]
Lengua = Literal["LSM", "ASL"]


# Regla extra de la contraseña: al menos una letra y un número.
def _validar_contrasena(valor: str) -> str:
    if not re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", valor) or not re.search(r"\d", valor):
        raise ValueError("Debe incluir al menos una letra y un número.")
    return valor


# Tipos con reglas, reutilizados en varios modelos:
# bcrypt solo usa los primeros 72 bytes, por eso el máximo.
Contrasena = Annotated[str, Field(min_length=8, max_length=72), AfterValidator(_validar_contrasena)]  # 8-72 caracteres + letra y número
Correo = Annotated[EmailStr, AfterValidator(lambda c: c.lower())]  # correo válido, guardado en minúsculas
Nombre = Annotated[str, Field(min_length=2, max_length=80), AfterValidator(str.strip)]  # 2-80 caracteres, sin espacios a los lados


# ── Datos que ENTRAN (lo que manda el frontend) ──


# Registro público: POST /api/auth/registro
class RegistroEntrada(BaseModel):
    nombre: Nombre
    correo: Correo
    contrasena: Contrasena
    lengua: Lengua = "LSM"


# Login: POST /api/auth/login (la contraseña no se valida aquí: se compara con la guardada)
class LoginEntrada(BaseModel):
    correo: Correo
    contrasena: str


# Recuperar contraseña: POST /api/auth/recuperar
class RecuperarEntrada(BaseModel):
    correo: Correo


# Crear usuario desde el CRUD: igual que el registro + rol y estado. "(RegistroEntrada)" = hereda sus campos.
class UsuarioCrear(RegistroEntrada):
    rol: Rol = "usuario"
    estado: Estado = "activo"


# Editar usuario desde el CRUD: PUT /api/usuarios/{id}
class UsuarioActualizar(BaseModel):
    """Todos los campos son opcionales: solo se cambian los que se envían."""

    nombre: Nombre | None = None
    correo: Correo | None = None
    contrasena: Contrasena | None = None
    lengua: Lengua | None = None
    rol: Rol | None = None
    estado: Estado | None = None


# ── Datos que SALEN (lo que el servidor devuelve) ──


# Un usuario SIN contraseña (es lo único que ve el frontend de un usuario).
class UsuarioPublico(BaseModel):
    id: str
    nombre: str
    correo: str
    lengua: Lengua
    rol: Rol
    estado: Estado
    creado_en: datetime

    # Convierte un documento de MongoDB en UsuarioPublico: copia solo los campos públicos
    # (así el hash de la contraseña nunca sale del servidor) y convierte _id a texto.
    @classmethod
    def desde_documento(cls, doc: dict[str, Any]) -> "UsuarioPublico":
        return cls(id=str(doc["_id"]), **{k: doc[k] for k in ("nombre", "correo", "lengua", "rol", "estado", "creado_en")})


# Respuesta del login y del registro.
class SesionSalida(BaseModel):
    token: str  # el token JWT de la sesión
    usuario: UsuarioPublico


# Respuesta de la lista paginada de usuarios.
class PaginaUsuarios(BaseModel):
    items: list[UsuarioPublico]
    total: int
    pagina: int
    por_pagina: int


# ── Progreso de aprendizaje (rutas/progreso.py) ──


# Lo que manda el frontend al lograr letras: POST /api/progreso
class ProgresoEntrada(BaseModel):
    lengua: Lengua
    letras: list[Annotated[str, Field(min_length=1, max_length=2)]] = Field(min_length=1, max_length=30)


# Letras logradas por el usuario en una lengua (GET y POST /api/progreso)
class ProgresoSalida(BaseModel):
    lengua: Lengua
    letras: list[str]


# ── Búsqueda DFS/BFS de la ruta de aprendizaje (rutas/busqueda.py) ──

# Letra o nombre de un nodo (corto: es una letra del alfabeto, o "A".."F" en las pruebas).
Nodo = Annotated[str, Field(min_length=1, max_length=3)]


# POST /api/busqueda/ruta
class BusquedaEntrada(BaseModel):
    # Grafo: cada letra → sus letras vecinas. Lo arma el frontend con las formas de mano
    # (src/lib/aprendizaje/grafoLetras.ts). Máximo 60 nodos para que la búsqueda sea rápida.
    grafo: dict[Nodo, list[Nodo]] = Field(min_length=1, max_length=60)
    inicio: Nodo
    objetivo: Nodo
    algoritmo: Literal["dfs-todas", "dfs-primera", "bfs"] = "dfs-todas"
    # Límite de profundidad (pasos). None = sin límite. Máximo 6: con más, las rutas son miles.
    limite: int | None = Field(4, ge=1, le=6)

    # Revisa que el inicio, el objetivo y todos los vecinos sean nodos del grafo.
    @model_validator(mode="after")
    def _nodos_existentes(self):
        nodos = set(self.grafo)
        if self.inicio not in nodos or self.objetivo not in nodos:
            raise ValueError("El inicio y el objetivo deben ser nodos del grafo.")
        if any(v not in nodos for vecinos in self.grafo.values() for v in vecinos):
            raise ValueError("Todos los vecinos deben ser nodos del grafo.")
        return self


# Un renglón del orden de exploración.
class PasoSalida(BaseModel):
    nodo: str
    profundidad: int


# Resultado de la búsqueda (es el ResultadoBusqueda de app/busqueda.py convertido a JSON).
class BusquedaSalida(BaseModel):
    algoritmo: str
    inicio: str
    objetivo: str
    limite: int | None
    orden_exploracion: list[PasoSalida]
    visitados: list[str]
    rutas: list[list[str]]
    ciclos_evitados: list[list[str]]
    repetidos_evitados: int
    cortes_por_limite: list[str]
    ramas_cortadas: int
    truncado: bool


# ── Estadísticas para el administrador (rutas/estadisticas.py) ──


# Números de las tarjetas de arriba de la pantalla «Estadísticas».
class ResumenEstadisticas(BaseModel):
    usuarios: int  # cuentas registradas
    activos: int
    inactivos: int
    por_lengua: dict[str, int]  # {"LSM": 8, "ASL": 3} según la lengua de cada cuenta
    letras_logradas: int  # total de letras logradas sumando a todos
    avance_promedio: dict[str, float]  # % promedio de avance por lengua, entre quienes ya empezaron


# ── Comparación de los 5 algoritmos: BFS, DFS, UCS, Greedy y A* (rutas/busqueda.py) ──

# Costo de una conexión: positivo (UCS y A* necesitan costos mayores que 0).
Costo = Annotated[float, Field(gt=0, le=100)]


# POST /api/busqueda/comparar
class ComparacionEntrada(BaseModel):
    # Grafo con costos: cada letra → {vecina: costo}. En la ruta de aprendizaje el costo es
    # cuántos detalles de la mano cambian (lo arma src/lib/aprendizaje/grafoLetras.ts).
    grafo: dict[Nodo, dict[Nodo, Costo]] = Field(min_length=1, max_length=60)
    # Heurística h(n) de cada letra hacia la meta (≥ 0).
    heuristica: dict[Nodo, Annotated[float, Field(ge=0)]]
    inicio: Nodo
    objetivo: Nodo

    @model_validator(mode="after")
    def _nodos_existentes(self):
        nodos = set(self.grafo)
        if self.inicio not in nodos or self.objetivo not in nodos:
            raise ValueError("El inicio y el objetivo deben ser nodos del grafo.")
        if any(v not in nodos for vecinos in self.grafo.values() for v in vecinos):
            raise ValueError("Todos los vecinos deben ser nodos del grafo.")
        if set(self.heuristica) != nodos:
            raise ValueError("La heurística debe tener un valor para cada nodo del grafo.")
        return self


# Un nodo expandido con sus valores (g, h, f o profundidad, según el algoritmo).
class ExpansionSalida(BaseModel):
    nodo: str
    g: float | None
    h: float | None
    f: float | None
    profundidad: int | None


# Resultado de un algoritmo (ResultadoComparado de app/busqueda_costo.py).
class ResultadoComparadoSalida(BaseModel):
    algoritmo: str
    nombre: str
    camino: list[str] | None
    costo: float | None
    pasos: int
    expandidos: list[ExpansionSalida]
    registro: list[str]


class ComparacionSalida(BaseModel):
    resultados: list[ResultadoComparadoSalida]  # en orden: BFS, DFS, UCS, Greedy, A*
    heuristica_consistente: bool  # h(meta) = 0 y h(n) ≤ c(n, m) + h(m) en cada conexión
    fallas_heuristica: list[str]  # conexiones donde no se cumple (vacía si es consistente)
