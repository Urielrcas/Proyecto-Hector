# PRUEBAS DEL MOTOR DE LÓGICA PROPOSICIONAL (backend)
# Comprueban las tablas de verdad de los conectivos, tautologías (modus ponens y tollens),
# equivalencias (De Morgan, contrarrecíproca, distributiva) y que cada regla del servidor
# (reglas.py) cumpla la tabla de verdad que tiene especificada.
# Ejecutar con:  .venv\Scripts\python -m pytest

# ▸ Desde pytest (herramienta de pruebas automáticas)
import pytest

# ▸ Desde nuestro proyecto (app/logica.py):
#     columna_de_resultados → columna final de la tabla de verdad (app/logica.py)
#     equivalentes → compara dos fórmulas (app/logica.py)
#     es_contradiccion → ¿siempre falsa? (app/logica.py)
#     es_tautologia → ¿siempre verdadera? (app/logica.py)
#     proposiciones → crea proposiciones p, q, r... (app/logica.py)
#     tabla_de_verdad → genera la tabla de verdad (app/logica.py)
from app.logica import (
    columna_de_resultados,
    equivalentes,
    es_contradiccion,
    es_tautologia,
    proposiciones,
    tabla_de_verdad,
)
# ▸ Desde nuestro proyecto (app/reglas.py):
#     ES_ADMINISTRADOR → regla c ∧ a (app/reglas.py)
#     PUEDE_ACTUALIZAR_USUARIO → regla a ∧ (y → (r ∧ t)) (app/reglas.py)
#     PUEDE_ELIMINAR_USUARIO → regla a ∧ ¬y (app/reglas.py)
#     PUEDE_INICIAR_SESION → regla e ∧ k ∧ v (app/reglas.py)
#     REGLAS → lista de reglas del servidor (app/reglas.py)
#     Regla → clase de una regla (app/reglas.py)
#     verificar → compara la tabla de una regla con la esperada (app/reglas.py)
from app.reglas import (
    ES_ADMINISTRADOR,
    PUEDE_ACTUALIZAR_USUARIO,
    PUEDE_ELIMINAR_USUARIO,
    PUEDE_INICIAR_SESION,
    REGLAS,
    Regla,
    verificar,
)

p, q, r = proposiciones("p", "q", "r")


def test_tablas_de_los_conectivos():
    # Filas: V V, V F, F V, F F
    assert columna_de_resultados(p & q) == "VFFF"
    assert columna_de_resultados(p | q) == "VVVF"
    assert columna_de_resultados(p >> q) == "VFVV"
    assert columna_de_resultados(p.sii(q)) == "VFFV"
    assert columna_de_resultados(~p) == "FV"


def test_tabla_tiene_2_a_la_n_filas_y_empieza_en_todo_verdadero():
    filas = tabla_de_verdad(p & q & r)
    assert len(filas) == 8
    assert filas[0] == ({"p": True, "q": True, "r": True}, True)
    assert filas[-1][0] == {"p": False, "q": False, "r": False}


def test_escritura_de_formulas():
    assert str((p >> q).sii(~q >> ~p)) == "(p → q) ↔ (¬q → ¬p)"
    assert str(p & q & r) == "p ∧ q ∧ r"
    assert str(~(p & q)) == "¬(p ∧ q)"


def test_clasificacion():
    assert es_tautologia(p | ~p)
    assert es_contradiccion(p & ~p)
    assert es_tautologia(((p >> q) & p) >> q)  # modus ponens
    assert es_tautologia(((p >> q) & ~q) >> ~p)  # modus tollens


@pytest.mark.parametrize(
    ("a", "b"),
    [
        (~(p & q), ~p | ~q),  # De Morgan
        (p >> q, ~q >> ~p),  # contrarrecíproca
        (p >> q, ~p | q),
        (p & (q | r), (p & q) | (p & r)),  # distributiva
    ],
)
def test_equivalencias(a, b):
    assert equivalentes(a, b)


def test_la_reciproca_no_es_equivalente():
    assert not equivalentes(p >> q, q >> p)


@pytest.mark.parametrize("regla", REGLAS, ids=lambda r: r.nombre)
def test_cada_regla_cumple_su_tabla_de_verdad(regla):
    assert verificar(regla) == []


def test_la_verificacion_detecta_una_regla_mal_escrita():
    c, a = proposiciones("c", "a")
    mala = Regla(nombre="mala", formula=c | a, proposiciones={"c": "", "a": ""}, tabla_esperada="VFFF")
    assert verificar(mala) == ["tabla de verdad VVVF ≠ esperada VFFF"]


def test_reglas_del_sistema():
    assert PUEDE_INICIAR_SESION.cumple(e=True, k=True, v=True)
    assert not PUEDE_INICIAR_SESION.cumple(e=True, k=True, v=False)  # cuenta desactivada
    assert not ES_ADMINISTRADOR.cumple(c=True, a=False)
    assert not PUEDE_ELIMINAR_USUARIO.cumple(a=True, y=True)  # no puede eliminarse a sí mismo
    assert PUEDE_ELIMINAR_USUARIO.cumple(a=True, y=False)
    # Un admin puede cambiar libremente a otros, pero no quitarse el rol a sí mismo.
    assert PUEDE_ACTUALIZAR_USUARIO.cumple(a=True, y=False, r=False, t=False)
    assert not PUEDE_ACTUALIZAR_USUARIO.cumple(a=True, y=True, r=False, t=True)
    assert PUEDE_ACTUALIZAR_USUARIO.cumple(a=True, y=True, r=True, t=True)
