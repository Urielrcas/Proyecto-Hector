# PUNTO DE ARRANQUE DEL SERVIDOR (FastAPI)
# Se ejecuta con:  uvicorn app.main:app --reload --port 8000
# Al arrancar: se conecta a MongoDB y crea el administrador inicial si no existe ninguno.
# Registra las rutas (auth, usuarios, progreso, estadísticas y búsqueda), permite que el navegador llame a la API (CORS)
# y redirige la dirección raíz "/" a la documentación interactiva "/docs".

# ▸ Desde Python, módulo logging (mensajes en la consola del servidor)
import logging
# ▸ Desde Python, módulo contextlib:
#     asynccontextmanager → define qué hacer al arrancar y al apagar el servidor
from contextlib import asynccontextmanager
# ▸ Desde Python, módulo datetime (fechas y horas):
#     UTC → zona horaria universal
#     datetime → fecha y hora
from datetime import UTC, datetime

# ▸ Desde FastAPI (framework para crear la API):
#     FastAPI → la aplicación del servidor
from fastapi import FastAPI
# ▸ Desde FastAPI, CORS (permitir peticiones desde el navegador):
#     CORSMiddleware → permite que el frontend llame a la API
from fastapi.middleware.cors import CORSMiddleware
# ▸ Desde FastAPI, respuestas especiales:
#     RedirectResponse → respuesta que redirige a otra dirección
from fastapi.responses import RedirectResponse

# ▸ Desde nuestro proyecto (carpeta app/config):
#     config → la configuración ya cargada (app/config.py)
from .config import config
# ▸ Desde nuestro proyecto (carpeta app/db):
#     conectar → abre la conexión a MongoDB (app/db.py)
#     desconectar → cierra la conexión (app/db.py)
from .db import conectar, desconectar
# ▸ Desde nuestro proyecto (carpeta app/rutas):
#     auth → rutas de autenticación (app/rutas/auth.py)
#     busqueda → ruta de aprendizaje con DFS/BFS (app/rutas/busqueda.py)
#     estadisticas → gráficas del administrador (app/rutas/estadisticas.py)
#     progreso → letras logradas por cada usuario (app/rutas/progreso.py)
#     usuarios → rutas del CRUD de usuarios (app/rutas/usuarios.py)
from .rutas import auth, busqueda, estadisticas, progreso, usuarios
# ▸ Desde nuestro proyecto (carpeta app/seguridad):
#     hashear_contrasena → cifra una contraseña con bcrypt (app/seguridad.py)
from .seguridad import hashear_contrasena

log = logging.getLogger("uvicorn.error")


async def _crear_admin_inicial(db) -> None:
    """Si no hay ningún administrador, crea uno con los datos de la configuración."""
    if await db.usuarios.count_documents({"rol": "admin"}, limit=1):
        return  # ya hay al menos un administrador: no hacer nada
    ahora = datetime.now(UTC)
    # "upsert": si el correo ya existe lo convierte en admin; si no, crea el usuario.
    await db.usuarios.update_one(
        {"correo": config.admin_correo.lower()},
        {
            "$set": {"rol": "admin", "estado": "activo", "actualizado_en": ahora},
            "$setOnInsert": {
                "nombre": config.admin_nombre,
                "hash_contrasena": hashear_contrasena(config.admin_contrasena),
                "lengua": "LSM",
                "creado_en": ahora,
            },
        },
        upsert=True,
    )
    log.warning("Administrador inicial creado: %s (cambia su contraseña)", config.admin_correo)


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    # Lo de antes del "yield" se ejecuta al ARRANCAR el servidor...
    db = await conectar(config.mongodb_uri, config.mongodb_db)
    log.info("Conectado a MongoDB, base '%s'", config.mongodb_db)
    await _crear_admin_inicial(db)
    yield
    # ...y lo de después, al APAGARLO.
    await desconectar()


# La aplicación FastAPI. Su documentación interactiva se ve en http://localhost:8000/docs
app = FastAPI(title="Traductor de Señas API", version="0.1.0", lifespan=ciclo_de_vida)

# CORS: permite que el frontend (localhost:5173) haga peticiones a esta API desde el navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origenes,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar los grupos de rutas: /api/auth/..., /api/usuarios/..., /api/progreso, /api/estadisticas/... y /api/busqueda/...
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(progreso.router)
app.include_router(estadisticas.router)
app.include_router(busqueda.router)


@app.get("/", include_in_schema=False)
async def raiz():
    # La API no tiene página propia: llevar a la documentación interactiva.
    return RedirectResponse("/docs")


@app.get("/api/salud", tags=["sistema"])
async def salud():
    # Para comprobar rápidamente que el servidor está encendido.
    return {"estado": "ok"}
