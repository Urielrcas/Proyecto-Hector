import re
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field

Rol = Literal["admin", "usuario"]
Estado = Literal["activo", "inactivo"]
Lengua = Literal["LSM", "ASL"]


def _validar_contrasena(valor: str) -> str:
    if not re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", valor) or not re.search(r"\d", valor):
        raise ValueError("Debe incluir al menos una letra y un número.")
    return valor


# bcrypt solo usa los primeros 72 bytes, por eso el máximo.
Contrasena = Annotated[str, Field(min_length=8, max_length=72), AfterValidator(_validar_contrasena)]
Correo = Annotated[EmailStr, AfterValidator(lambda c: c.lower())]
Nombre = Annotated[str, Field(min_length=2, max_length=80), AfterValidator(str.strip)]


class RegistroEntrada(BaseModel):
    nombre: Nombre
    correo: Correo
    contrasena: Contrasena
    lengua: Lengua = "LSM"


class LoginEntrada(BaseModel):
    correo: Correo
    contrasena: str


class RecuperarEntrada(BaseModel):
    correo: Correo


class UsuarioCrear(RegistroEntrada):
    rol: Rol = "usuario"
    estado: Estado = "activo"


class UsuarioActualizar(BaseModel):
    """Todos los campos son opcionales: solo se cambian los que se envían."""

    nombre: Nombre | None = None
    correo: Correo | None = None
    contrasena: Contrasena | None = None
    lengua: Lengua | None = None
    rol: Rol | None = None
    estado: Estado | None = None


class UsuarioPublico(BaseModel):
    id: str
    nombre: str
    correo: str
    lengua: Lengua
    rol: Rol
    estado: Estado
    creado_en: datetime

    @classmethod
    def desde_documento(cls, doc: dict[str, Any]) -> "UsuarioPublico":
        return cls(id=str(doc["_id"]), **{k: doc[k] for k in ("nombre", "correo", "lengua", "rol", "estado", "creado_en")})


class SesionSalida(BaseModel):
    token: str
    usuario: UsuarioPublico


class PaginaUsuarios(BaseModel):
    items: list[UsuarioPublico]
    total: int
    pagina: int
    por_pagina: int
