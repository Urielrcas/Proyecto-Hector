import os

# Las pruebas usan una base aparte que se borra al terminar.
os.environ["MONGODB_DB"] = "traductor_senas_pruebas"
os.environ["ADMIN_CORREO"] = "admin@pruebas.com"
os.environ["ADMIN_CONTRASENA"] = "Admin12345"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pymongo import MongoClient  # noqa: E402

from app.config import config  # noqa: E402
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
