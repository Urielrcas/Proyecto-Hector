"""Estadísticas para el administrador. Todas las rutas requieren rol de administrador.

  GET /api/estadisticas/resumen                       → números de las tarjetas (JSON)
  GET /api/estadisticas/graficas/registros.png        → usuarios nuevos por mes (línea)
  GET /api/estadisticas/graficas/usuarios.png         → usuarios por lengua y estado (barras)
  GET /api/estadisticas/graficas/letras.png?lengua=   → cuántos lograron cada letra (barras)
  GET /api/estadisticas/graficas/avance.png?lengua=   → avance de cada usuario (barras de progreso)

Los datos salen de las colecciones "usuarios" y "progreso" de MongoDB; las imágenes
se dibujan con matplotlib en app/graficas.py.
La llama el frontend desde src/services/estadisticas.ts (pantalla «Estadísticas»).
"""

# ▸ Desde Python, módulo collections (estructuras de datos):
#     Counter → cuenta cuántas veces aparece cada valor
from collections import Counter
# ▸ Desde Python, módulo datetime (fechas y horas):
#     UTC → zona horaria universal
#     datetime → fecha y hora
from datetime import UTC, datetime

# ▸ Desde FastAPI (framework para crear la API):
#     APIRouter → grupo de rutas de la API
#     Depends → pide a FastAPI ejecutar una función antes (seguridad, base de datos)
#     Response → respuesta HTTP (aquí, una imagen PNG)
from fastapi import APIRouter, Depends, Response
# ▸ Desde FastAPI (Starlette), concurrencia:
#     run_in_threadpool → corre el dibujo de matplotlib aparte, sin detener las demás peticiones
from fastapi.concurrency import run_in_threadpool
# ▸ Desde PyMongo (tipo de la base de datos asíncrona):
#     AsyncDatabase → tipo: la base de datos
from pymongo.asynchronous.database import AsyncDatabase

# ▸ Desde nuestro proyecto (carpeta app/alfabeto):
#     LETRAS → letras que existen en LSM y en ASL (app/alfabeto.py)
from ..alfabeto import LETRAS
# ▸ Desde nuestro proyecto (carpeta app/db):
#     get_db → entrega la base de datos a cada ruta (app/db.py)
from ..db import get_db
# ▸ Desde nuestro proyecto (carpeta app/dependencias):
#     requiere_admin → exige rol de administrador (app/dependencias.py)
from ..dependencias import requiere_admin
# ▸ Desde nuestro proyecto (carpeta app/graficas):
#     etiqueta_mes → texto del mes para el eje ("Oct\n2026")
#     grafica_avance, grafica_letras, grafica_registros, grafica_usuarios → dibujan cada gráfica (app/graficas.py)
from ..graficas import etiqueta_mes, grafica_avance, grafica_letras, grafica_registros, grafica_usuarios
# ▸ Desde nuestro proyecto (carpeta app/modelos):
#     Lengua → tipo: 'LSM' o 'ASL' (app/modelos.py)
#     ResumenEstadisticas → números de las tarjetas (app/modelos.py)
from ..modelos import Lengua, ResumenEstadisticas

router = APIRouter(prefix="/api/estadisticas", tags=["estadísticas"], dependencies=[Depends(requiere_admin)])

# En la gráfica de avance se muestran como máximo estos usuarios (los de más avance).
MAX_USUARIOS_AVANCE = 15


def _png(contenido: bytes) -> Response:
    # no-store: el navegador no guarda la imagen; al recargar siempre trae los datos al día.
    return Response(contenido, media_type="image/png", headers={"Cache-Control": "no-store"})


# Cuántas letras logró cada usuario en una lengua: {id_usuario: número de letras}.
async def _letras_por_usuario(db: AsyncDatabase, lengua: str) -> Counter:
    # Cada documento de "progreso" es una letra lograda (no se repiten: índice único en db.py).
    return Counter([doc["usuario_id"] async for doc in db.progreso.find({"lengua": lengua}, {"usuario_id": 1})])


# GET /api/estadisticas/resumen
@router.get("/resumen", response_model=ResumenEstadisticas)
async def resumen(db: AsyncDatabase = Depends(get_db)):
    usuarios = await db.usuarios.count_documents({})
    activos = await db.usuarios.count_documents({"estado": "activo"})
    por_lengua = {lengua: await db.usuarios.count_documents({"lengua": lengua}) for lengua in LETRAS}

    # Avance promedio: entre quienes ya lograron al menos una letra en esa lengua.
    avance_promedio = {}
    for lengua, letras in LETRAS.items():
        conteo = await _letras_por_usuario(db, lengua)
        avance_promedio[lengua] = round(100 * sum(conteo.values()) / (len(conteo) * len(letras)), 1) if conteo else 0.0

    return ResumenEstadisticas(
        usuarios=usuarios,
        activos=activos,
        inactivos=usuarios - activos,
        por_lengua=por_lengua,
        letras_logradas=await db.progreso.count_documents({}),
        avance_promedio=avance_promedio,
    )


# GET /api/estadisticas/graficas/registros.png — últimos 12 meses (incluido el actual)
@router.get("/graficas/registros.png")
async def registros(db: AsyncDatabase = Depends(get_db)):
    # Lista de los 12 meses como (año, mes), del más antiguo al actual.
    hoy = datetime.now(UTC)
    meses = []
    for atras in range(11, -1, -1):
        total = hoy.year * 12 + hoy.month - 1 - atras
        meses.append((total // 12, total % 12 + 1))

    # Contar las cuentas creadas en cada mes.
    conteo = Counter()
    async for doc in db.usuarios.find({}, {"creado_en": 1}):
        conteo[(doc["creado_en"].year, doc["creado_en"].month)] += 1

    etiquetas = [etiqueta_mes(anio, mes) for anio, mes in meses]
    cantidades = [conteo[m] for m in meses]
    return _png(await run_in_threadpool(grafica_registros, etiquetas, cantidades))


# GET /api/estadisticas/graficas/usuarios.png
@router.get("/graficas/usuarios.png")
async def usuarios_por_lengua(db: AsyncDatabase = Depends(get_db)):
    datos = {lengua: {"activo": 0, "inactivo": 0} for lengua in LETRAS}
    async for doc in db.usuarios.find({}, {"lengua": 1, "estado": 1}):
        datos[doc["lengua"]][doc["estado"]] += 1
    return _png(await run_in_threadpool(grafica_usuarios, datos))


# GET /api/estadisticas/graficas/letras.png?lengua=LSM
@router.get("/graficas/letras.png")
async def letras_logradas(lengua: Lengua = "LSM", db: AsyncDatabase = Depends(get_db)):
    letras = LETRAS[lengua]
    # Cuántos usuarios lograron cada letra.
    por_letra = Counter([doc["letra"] async for doc in db.progreso.find({"lengua": lengua}, {"letra": 1})])
    personas = len(await db.progreso.distinct("usuario_id", {"lengua": lengua}))
    return _png(await run_in_threadpool(grafica_letras, lengua, letras, [por_letra[l] for l in letras], personas))


# GET /api/estadisticas/graficas/avance.png?lengua=LSM
@router.get("/graficas/avance.png")
async def avance(lengua: Lengua = "LSM", db: AsyncDatabase = Depends(get_db)):
    conteo = await _letras_por_usuario(db, lengua)
    # Los de más avance primero; solo se dibujan los primeros MAX_USUARIOS_AVANCE.
    primeros = conteo.most_common(MAX_USUARIOS_AVANCE)
    nombres_por_id = {doc["_id"]: doc["nombre"] async for doc in db.usuarios.find({"_id": {"$in": [i for i, _ in primeros]}}, {"nombre": 1})}
    nombres = [nombres_por_id.get(i, "(cuenta eliminada)") for i, _ in primeros]
    logradas = [n for _, n in primeros]
    return _png(await run_in_threadpool(grafica_avance, lengua, nombres, logradas, len(LETRAS[lengua]), len(conteo)))
