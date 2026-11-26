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


# Crear la contraseña nueva con el enlace del correo.
class RestablecerEntrada(BaseModel):
    token: str = Field(min_length=10, max_length=2000)
    contrasena: Contrasena


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
    # Juegos
    partidas: int = 0  # partidas jugadas (todas las cuentas)
    jugadores: int = 0  # cuentas que han jugado al menos una vez
    # Historial (solo cuántos registros hay; el contenido es privado)
    registros_historial: int = 0
    # Inteligencia artificial
    usuarios_con_ia: int = 0  # cuentas con modelo de IA guardado
    redes_entrenadas: int = 0  # cuentas con su red neuronal entrenada
    precision_red: float | None = None  # % promedio de precisión de las redes
    posturas: int = 0  # posturas de mano guardadas para entrenar
    precision_corrector: float | None = None  # % de correcciones automáticas que nadie deshizo


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


# ── Corrector de frases deletreadas con Ollama (rutas/frase.py) ──


# Lo que manda el frontend: POST /api/frase/corregir
class FraseEntrada(BaseModel):
    texto: Annotated[str, Field(min_length=1, max_length=300)]  # lo deletreado: "HOLACOMO ESTAS"
    lengua: Lengua = "LSM"  # LSM → corrige en español; ASL → en inglés


# Lo que responde: la frase corregida, o la original si la corrección no pasó la revisión.
class FraseSalida(BaseModel):
    frase: str  # "Hola, ¿cómo estás?"
    corregida: bool  # False = Ollama propuso algo con letras muy distintas y se dejó el texto original
    modelo: str  # modelo de Ollama que se usó (llama3.2)


# ── Perfil (el propio usuario cambia sus datos) ──


class PerfilActualizar(BaseModel):
    """Todos los campos son opcionales. Para cambiar la contraseña hay que mandar la actual."""

    nombre: Nombre | None = None
    lengua: Lengua | None = None
    contrasena_actual: str | None = None
    contrasena_nueva: Contrasena | None = None


# ── Historial de traducciones y conversaciones ──

# senas-texto: lo que deletreó la persona sorda; voz-senas: lo que se dijo/escribió y se mostró en señas;
# conversacion: los mensajes de las dos personas en el Modo conversación.
TipoHistorial = Literal["senas-texto", "voz-senas", "conversacion"]


class MensajeHistorial(BaseModel):
    autor: Literal["sorda", "oyente"]  # sorda = lo hizo en señas; oyente = lo dijo o escribió
    texto: Annotated[str, Field(min_length=1, max_length=500)]
    hora: datetime


class HistorialEntrada(BaseModel):
    tipo: TipoHistorial
    lengua: Lengua
    mensajes: list[MensajeHistorial] = Field(min_length=1, max_length=300)


class HistorialResumen(BaseModel):
    id: str
    tipo: TipoHistorial
    lengua: Lengua
    titulo: str  # el primer mensaje, recortado (para la tabla)
    total_mensajes: int
    creado_en: datetime
    actualizado_en: datetime


class HistorialSalida(HistorialResumen):
    mensajes: list[MensajeHistorial]


class PaginaHistorial(BaseModel):
    items: list[HistorialResumen]
    total: int
    pagina: int
    por_pagina: int


# ── Juegos (partidas, para las estadísticas del administrador) ──

NombreJuego = Literal["adivina", "reto", "palabra", "memorama"]


class PartidaEntrada(BaseModel):
    lengua: Lengua
    juego: NombreJuego
    puntos: int = Field(ge=0, le=100_000)
    aciertos: int = Field(ge=0, le=1000)
    total: int = Field(ge=0, le=1000)
    racha: int = Field(0, ge=0, le=1000)
    pistas: int = Field(0, ge=0, le=1000)
    estrellas: int = Field(0, ge=0, le=3)
    falladas: list[Annotated[str, Field(min_length=1, max_length=2)]] = Field(default_factory=list, max_length=40)


# ── Modelo de IA de cada usuario (lo que la IA aprendió de él) ──


class EstadoLetraIA(BaseModel):
    p: float = Field(ge=0, le=1)  # probabilidad de que domine la letra
    intentos: int = Field(ge=0)
    aciertos: int = Field(ge=0)
    ultima: float  # fecha del último intento (ms)


class EpocaIA(BaseModel):
    epoca: int
    perdida: float
    precision: float
    validacion: float


class RedIA(BaseModel):
    pesos: Annotated[str, Field(max_length=800_000)]  # pesos de la red en base64
    clases: list[str] = Field(max_length=40)
    precision: float = Field(ge=0, le=1)
    historia: list[EpocaIA] = Field(max_length=50)
    entrenadaEn: float
    muestrasUsadas: int = Field(ge=0)
    parametros: int = Field(ge=0)


class CorrectorIA(BaseModel):
    aplicadas: int = Field(ge=0)
    deshechas: int = Field(ge=0)
    palabras: dict[Annotated[str, Field(max_length=40)], int] = Field(max_length=3000)


class ModeloIA(BaseModel):
    dominio: dict[Annotated[str, Field(max_length=2)], EstadoLetraIA] = Field(max_length=40)
    # Posturas de la mano: por letra, hasta 25 listas de 42 números (x, y de los 21 puntos).
    muestras: dict[Annotated[str, Field(max_length=2)], list[Annotated[list[float], Field(max_length=42)]]] = Field(max_length=40)
    # Formas personales: cómo hace el usuario ciertas letras (hasta 30 posturas por letra).
    personales: dict[Annotated[str, Field(max_length=2)], list[Annotated[list[float], Field(max_length=42)]]] = Field(default_factory=dict, max_length=40)
    red: RedIA | None = None
    corrector: CorrectorIA
    actualizadoEn: float

    @model_validator(mode="after")
    def _limite_muestras(self):
        if any(len(lista) > 25 for lista in self.muestras.values()):
            raise ValueError("Máximo 25 posturas por letra.")
        if any(len(lista) > 30 for lista in self.personales.values()):
            raise ValueError("Máximo 30 formas personales por letra.")
        return self


class ModeloIAEntrada(BaseModel):
    lengua: Lengua
    modelo: ModeloIA


class ModeloIASalida(BaseModel):
    modelo: ModeloIA | None


# ── Intentos de práctica, expediente y consejos (prácticas 16, 18, 19, 26 y 27) ──
Dedo = Literal["pulgar", "indice", "medio", "anular", "menique"]


# Un intento de hacer una letra en «Practicar letra».
class IntentoEntrada(BaseModel):
    lengua: Lengua
    letra: str = Field(min_length=1, max_length=2)
    acierto: bool  # ¿la logró?
    puntaje: int = Field(ge=0, le=100)  # qué tanto de la seña estuvo bien en su mejor momento (dedos × 20)
    segundos: float = Field(ge=0, le=600)  # cuánto duró el intento
    letra_detectada: str | None = Field(default=None, max_length=5)  # si falló: con qué letra la confundió la IA
    dedos_fallados: list[Dedo] = Field(default_factory=list, max_length=5)


class ConfusionSalida(BaseModel):
    letra: str
    veces: int


class PrediccionSalida(BaseModel):
    puntaje: int  # puntaje esperado del siguiente intento (0 a 100)
    mensaje: str


# El resumen de una letra en el expediente.
class DedoFallado(BaseModel):
    dedo: Dedo
    veces: int
    porcentaje: float  # de los intentos fallidos de la letra (0 a 1)


class LetraExpediente(BaseModel):
    letra: str
    intentos: int
    aciertos: int
    tasa: float  # aciertos / intentos (0 a 1)
    puntaje_promedio: float
    ultimo_puntaje: int
    lograda: bool  # está en el progreso (colección «progreso»)
    estado: Literal["dominada", "en progreso", "difícil", "sin practicar"]
    tendencia: Literal["mejorando", "estable", "bajando"]
    confundida_con: list[ConfusionSalida]
    dedo_mas_fallado: Dedo | None
    fallidos: int = 0  # intentos sin lograrla
    dedos_fallados: list[DedoFallado] = []  # en qué % de los fallidos falló cada dedo (del que más al que menos)
    ultima_vez: datetime | None
    prediccion: PrediccionSalida | None


class Recomendacion(BaseModel):
    tipo: Literal["dificil", "confusion", "grupo", "repaso", "mejorando", "siguiente", "inactividad", "inicio"]
    prioridad: int  # 1 = lo más importante
    letra: str | None
    mensaje: str


class ResumenExpediente(BaseModel):
    intentos: int
    aciertos: int
    tasa: float
    puntaje_promedio: float
    letras_practicadas: int
    letras_logradas: int
    total_letras: int
    dias_practicados: int
    ultima_practica: datetime | None


# El expediente de aprendizaje de una persona (práctica 19: registro integral).
class PerfilSalida(BaseModel):
    """Perfil de aprendizaje (cluster de K-Means, práctica 28) y su lugar en el mapa PCA de perfiles."""
    id: int
    nombre: str
    descripcion: str
    consejo: str
    x: float
    y: float
    rasgos: dict[str, float]


class LetraVecinos(BaseModel):
    letra: str
    nivel: float  # nivel promedio de tus vecinos en esa letra (0 a 100)
    tuyo: float | None = None


class InfoLetraVecinos(BaseModel):
    nivel_vecinos: float
    vecinos_con_dato: int
    les_costo: int  # cuántos de tus vecinos tienen menos de 60 % en esa letra


class VecinosSalida(BaseModel):
    """Personas que aprenden como tú (KNN, práctica 29)."""
    k: int
    poblacion: int
    origen: str  # «simulada» mientras no haya suficientes usuarios reales
    parecido: float  # qué tanto se parecen a ti (0 a 100)
    faciles: list[LetraVecinos]  # letras que aún no practicas y que a ellos les salieron bien
    dificiles: list[LetraVecinos]  # letras que les costaron
    por_debajo: list[LetraVecinos]  # letras que practicas y en las que vas por debajo de ellos
    por_letra: dict[str, InfoLetraVecinos]


class ExpedienteSalida(BaseModel):
    usuario_id: str
    nombre: str
    lengua: Lengua
    resumen: ResumenExpediente
    letras: list[LetraExpediente]  # en orden del alfabeto (incluye las no practicadas)
    recomendaciones: list[Recomendacion]
    siguiente: str | None  # la letra que conviene practicar ahora
    perfil: PerfilSalida | None = None
    vecinos: VecinosSalida | None = None


# Tablero del administrador (práctica 16: consultas con aggregate).
class LetraTablero(BaseModel):
    letra: str
    intentos: int
    aciertos: int
    tasa: float
    puntaje: float
    personas: int


class ConfusionTablero(BaseModel):
    letra: str
    confundida_con: str
    veces: int


class PersonaTablero(BaseModel):
    usuario_id: str
    nombre: str
    correo: str
    intentos: int
    aciertos: int
    tasa: float
    puntaje: float
    letras: int
    ultima_vez: datetime | None
    necesita_ayuda: bool


class GrupoTablero(BaseModel):
    grupo: str
    letras: list[str]
    intentos: int
    tasa: float


class DiaTablero(BaseModel):
    fecha: str  # AAAA-MM-DD
    intentos: int
    aciertos: int


class DedoTablero(BaseModel):
    dedo: Dedo
    veces: int


class DominioLetra(BaseModel):
    """Cuántas personas hay en cada nivel de una letra (promedio de sus últimos 5 intentos)."""
    letra: str
    personas: int
    rangos: list[int]  # personas en 0–20, 20–40, 40–60, 60–80 y 80–100 %
    promedio: float


class ParConfusion(BaseModel):
    letra: str
    con: str  # la letra que vio la IA
    veces: int
    personas: int  # personas distintas que la confundieron así


class ConfusionesPersonas(BaseModel):
    personas: int  # personas con intentos en la lengua
    practicaron: dict[str, int]  # letra → personas que la practicaron
    pares: list[ParConfusion]  # de la confusión con más personas a la de menos


class TableroIntentos(BaseModel):
    intentos: int
    aciertos: int
    tasa: float
    puntaje: float
    personas: int
    necesitan_ayuda: int
    letras: list[LetraTablero]  # de la más difícil a la más fácil
    confusiones: list[ConfusionTablero]
    personas_detalle: list[PersonaTablero]  # quien necesita ayuda primero
    grupos: list[GrupoTablero]
    por_dia: list[DiaTablero]
    dedos: list[DedoTablero]  # qué dedo se falla más
    dominio: list[DominioLetra] = []  # cómo se reparten las personas por nivel en cada letra
