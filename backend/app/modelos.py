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
from pydantic import AfterValidator, BaseModel, EmailStr, Field

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
