# PREPARACIÓN DE LAS PRUEBAS (pytest)
# Antes de cada prueba se usa una base de datos aparte ("traductor_senas_pruebas")
# para no tocar los datos reales, y se borra al terminar.
#   - cliente: arranca el servidor en modo de prueba.
#   - admin:   inicia sesión como administrador y entrega el token para las pruebas.

# ▸ Desde Python, módulo os (variables de entorno y sistema)
import os

# Las pruebas usan una base aparte que se borra al terminar.
os.environ["MONGODB_DB"] = "traductor_senas_pruebas"
os.environ["ADMIN_CORREO"] = "admin@pruebas.com"
os.environ["ADMIN_CONTRASENA"] = "Admin12345"

# ▸ Desde pytest (herramienta de pruebas automáticas)
import pytest  # noqa: E402
# ▸ Desde FastAPI, cliente de pruebas:
#     TestClient → simula peticiones al servidor en las pruebas
from fastapi.testclient import TestClient  # noqa: E402
# ▸ Desde PyMongo (conexión con MongoDB):
#     MongoClient → cliente de MongoDB (no asíncrono)
from pymongo import MongoClient  # noqa: E402

# ▸ Desde nuestro proyecto (app/config.py):
#     config → la configuración ya cargada (app/config.py)
from app.config import config  # noqa: E402
# ▸ Desde nuestro proyecto (app/main.py):
#     app → la aplicación FastAPI (app/main.py)
from app.main import app  # noqa: E402


def _borrar_base():
    with MongoClient(config.mongodb_uri, serverSelectionTimeoutMS=3000) as cliente:
        cliente.drop_database(config.mongodb_db)


@pytest.fixture
def cliente():
    _borrar_base()
    with TestClient(app) as c:  # ejecuta el arranque: conexión y admin inicial
        yield c
    _borrar_base()


@pytest.fixture
def admin(cliente):
    r = cliente.post("/api/auth/login", json={"correo": "admin@pruebas.com", "contrasena": "Admin12345"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", "id": r.json()["usuario"]["id"]}
