import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .config import config
from .db import conectar, desconectar
from .rutas import auth, usuarios
from .seguridad import hashear_contrasena

log = logging.getLogger("uvicorn.error")


async def _crear_admin_inicial(db) -> None:
    """Si no hay ningún administrador, crea uno con los datos de la configuración."""
    if await db.usuarios.count_documents({"rol": "admin"}, limit=1):
        return
    ahora = datetime.now(UTC)
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
    db = await conectar(config.mongodb_uri, config.mongodb_db)
    log.info("Conectado a MongoDB, base '%s'", config.mongodb_db)
    await _crear_admin_inicial(db)
    yield
    await desconectar()


app = FastAPI(title="Traductor de Señas API", version="0.1.0", lifespan=ciclo_de_vida)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origenes,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)


@app.get("/", include_in_schema=False)
async def raiz():
    # La API no tiene página propia: llevar a la documentación interactiva.
    return RedirectResponse("/docs")


@app.get("/api/salud", tags=["sistema"])
async def salud():
    return {"estado": "ok"}
