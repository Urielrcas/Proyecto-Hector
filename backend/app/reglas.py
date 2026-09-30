"""Reglas de decisión del backend, en lógica proposicional.

Cada regla tiene su fórmula (la que el código evalúa para decidir) y su tabla de verdad
esperada como especificación. Al importar el módulo se genera la tabla de cada fórmula y
se compara con la especificación: si alguna regla está mal escrita, el servidor no arranca.
"""

from dataclasses import dataclass

from .logica import Formula, columna_de_resultados, proposiciones


@dataclass(frozen=True)
class Regla:
    nombre: str
    formula: Formula
    # Significado de cada proposición, en el orden en que aparecen en la fórmula.
    proposiciones: dict[str, str]
    # Columna final esperada de la tabla de verdad (filas de "todo V" a "todo F").
    tabla_esperada: str

    def cumple(self, **valores: bool) -> bool:
        return self.formula.evaluar(valores)


e, k, v, c, a, y, r, t = proposiciones("e", "k", "v", "c", "a", "y", "r", "t")

PUEDE_INICIAR_SESION = Regla(
    nombre="Inicio de sesión",
    formula=e & k & v,
    proposiciones={"e": "el correo está registrado", "k": "la contraseña es correcta", "v": "la cuenta está activa"},
    tabla_esperada="VFFFFFFF",
)

ES_ADMINISTRADOR = Regla(
    nombre="Administrar usuarios",
    formula=c & a,
    proposiciones={"c": "la sesión es válida", "a": "su rol es administrador"},
    tabla_esperada="VFFF",
)

PUEDE_ELIMINAR_USUARIO = Regla(
    nombre="Eliminar usuario",
    formula=a & ~y,
    proposiciones={"a": "quien elimina es administrador", "y": "intenta eliminarse a sí mismo"},
    tabla_esperada="FVFF",
)

PUEDE_ACTUALIZAR_USUARIO = Regla(
    nombre="Actualizar usuario",
    # Si un administrador se edita a sí mismo, debe conservar el rol de administrador y seguir activo.
    formula=a & (y >> (r & t)),
    proposiciones={
        "a": "quien edita es administrador",
        "y": "se edita a sí mismo",
        "r": "el rol final es administrador",
        "t": "el estado final es activo",
    },
    tabla_esperada="VFFFVVVV" + "F" * 8,
)

REGLAS = [PUEDE_INICIAR_SESION, ES_ADMINISTRADOR, PUEDE_ELIMINAR_USUARIO, PUEDE_ACTUALIZAR_USUARIO]


def verificar(regla: Regla) -> list[str]:
    errores = []
    if regla.formula.variables() != list(regla.proposiciones):
        errores.append(f"proposiciones {regla.formula.variables()} ≠ documentadas {list(regla.proposiciones)}")
    obtenida = columna_de_resultados(regla.formula)
    if obtenida != regla.tabla_esperada:
        errores.append(f"tabla de verdad {obtenida} ≠ esperada {regla.tabla_esperada}")
    return errores


for _regla in REGLAS:
    if _errores := verificar(_regla):
        raise RuntimeError(f"La regla «{_regla.nombre}» no cumple su especificación: {'; '.join(_errores)}")
