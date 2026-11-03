"""Recuperar la contraseña con el enlace del correo (regla t ∧ u ∧ a)."""
import re

import pytest

from app import correo as correos
from app.reglas import PUEDE_RESTABLECER


@pytest.fixture
def buzon(monkeypatch):
    """En lugar de mandar el correo, lo guarda aquí para leer el enlace."""
    enviados = []
    monkeypatch.setattr(correos, "enviar", lambda mensaje, enlace="": enviados.append({"para": mensaje["To"], "enlace": enlace}) or True)
    return enviados


def token_de(enlace: str) -> str:
    return re.search(r"token=([^&]+)", enlace).group(1)


def crear_cuenta(cliente, correo="luz@correo.com"):
    r = cliente.post("/api/auth/registro", json={"nombre": "Luz", "correo": correo, "contrasena": "Vieja12345", "lengua": "LSM"})
    assert r.status_code == 201, r.text


def test_regla_restablecer():
    assert PUEDE_RESTABLECER.cumple(t=True, u=True, a=True)
    assert not PUEDE_RESTABLECER.cumple(t=True, u=False, a=True)


def test_recuperar_y_crear_contrasena_nueva(cliente, buzon):
    crear_cuenta(cliente)
    r = cliente.post("/api/auth/recuperar", json={"correo": "luz@correo.com"})
    assert r.status_code == 202
    assert len(buzon) == 1 and buzon[0]["para"] == "luz@correo.com"
    token = token_de(buzon[0]["enlace"])

    r = cliente.post("/api/auth/restablecer", json={"token": token, "contrasena": "Nueva12345"})
    assert r.status_code == 200, r.text
    assert cliente.post("/api/auth/login", json={"correo": "luz@correo.com", "contrasena": "Nueva12345"}).status_code == 200
    assert cliente.post("/api/auth/login", json={"correo": "luz@correo.com", "contrasena": "Vieja12345"}).status_code == 401


def test_el_enlace_solo_sirve_una_vez(cliente, buzon):
    crear_cuenta(cliente)
    cliente.post("/api/auth/recuperar", json={"correo": "luz@correo.com"})
    token = token_de(buzon[0]["enlace"])
    assert cliente.post("/api/auth/restablecer", json={"token": token, "contrasena": "Nueva12345"}).status_code == 200
    assert cliente.post("/api/auth/restablecer", json={"token": token, "contrasena": "Otra123456"}).status_code == 400


def test_correo_desconocido_responde_igual_y_no_manda_nada(cliente, buzon):
    r = cliente.post("/api/auth/recuperar", json={"correo": "nadie@correo.com"})
    assert r.status_code == 202
    assert buzon == []


def test_token_falso_o_de_sesion_no_sirve(cliente, buzon):
    crear_cuenta(cliente)
    sesion = cliente.post("/api/auth/login", json={"correo": "luz@correo.com", "contrasena": "Vieja12345"}).json()["token"]
    assert cliente.post("/api/auth/restablecer", json={"token": "no-es-un-token-valido", "contrasena": "Nueva12345"}).status_code == 400
    # Un token de sesión no sirve para cambiar la contraseña.
    assert cliente.post("/api/auth/restablecer", json={"token": sesion, "contrasena": "Nueva12345"}).status_code == 400


def test_contrasena_nueva_debe_ser_valida(cliente, buzon):
    crear_cuenta(cliente)
    cliente.post("/api/auth/recuperar", json={"correo": "luz@correo.com"})
    token = token_de(buzon[0]["enlace"])
    assert cliente.post("/api/auth/restablecer", json={"token": token, "contrasena": "corta"}).status_code == 422
