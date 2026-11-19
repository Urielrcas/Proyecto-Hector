# PRUEBAS DE LOS INTENTOS, EL EXPEDIENTE, LOS CONSEJOS Y EL TABLERO
# (prácticas 16, 18, 19, 26 y 27)
#   - Guardar intentos (y rechazar datos inválidos).
#   - El expediente: estado de cada letra, confusiones, dedo que más falla, tendencia y predicción.
#   - Los consejos del motor de recomendaciones (incluido el de grupo de K-Means y el de inactividad).
#   - El tablero del administrador (consultas con aggregate) y sus permisos.
#   - Al eliminar un usuario se borran sus intentos.

from datetime import UTC, datetime, timedelta

from app import prediccion
from app.recomendaciones import construir_expediente


def cabeceras(admin):
    return {"Authorization": admin["Authorization"]}


def crear_usuario(cliente, admin, correo, lengua="LSM"):
    datos = {"nombre": correo.split("@")[0].title(), "correo": correo, "contrasena": "secreta123", "lengua": lengua}
    r = cliente.post("/api/usuarios", json=datos, headers=cabeceras(admin))
    assert r.status_code == 201, r.text
    r = cliente.post("/api/auth/login", json={"correo": correo, "contrasena": "secreta123"})
    return r.json()["usuario"]["id"], {"Authorization": f"Bearer {r.json()['token']}"}


def intento(letra, puntaje, acierto=False, detectada=None, dedos=(), segundos=6.0, lengua="LSM"):
    return {"lengua": lengua, "letra": letra, "acierto": acierto, "puntaje": puntaje, "segundos": segundos,
            "letra_detectada": detectada, "dedos_fallados": list(dedos)}


def mandar(cliente, sesion, lista):
    for datos in lista:
        r = cliente.post("/api/intentos", json=datos, headers=sesion)
        assert r.status_code == 201, r.text


def test_registrar_intento(cliente, admin):
    _, ana = crear_usuario(cliente, admin, "ana@correo.com")
    r = cliente.post("/api/intentos", json=intento("e", 60, detectada="a", dedos=["pulgar"]), headers=ana)
    assert r.status_code == 201 and r.json()["id"]
    # Letra que no existe en la lengua, puntaje fuera de rango y dedo inventado → 422.
    assert cliente.post("/api/intentos", json=intento("Ñ", 60, lengua="ASL"), headers=ana).status_code == 422
    assert cliente.post("/api/intentos", json=intento("A", 150), headers=ana).status_code == 422
    assert cliente.post("/api/intentos", json=intento("A", 40, dedos=["codo"]), headers=ana).status_code == 422
    # Sin sesión no se puede.
    assert cliente.post("/api/intentos", json=intento("A", 40)).status_code == 401


def test_expediente_y_consejos(cliente, admin):
    _, ana = crear_usuario(cliente, admin, "ana@correo.com")
    # La E le cuesta: 4 fallos, la IA ve una A y casi siempre falla el pulgar.
    mandar(cliente, ana, [intento("E", p, detectada="A", dedos=["pulgar"]) for p in (40, 60, 40, 60)])
    # La M va mejorando hasta lograrla.
    mandar(cliente, ana, [intento("M", 20), intento("M", 40), intento("M", 40), intento("M", 80), intento("M", 100, True), intento("M", 100, True)])
    cliente.post("/api/progreso", json={"lengua": "LSM", "letras": ["M"]}, headers=ana)

    r = cliente.get("/api/intentos/expediente", params={"lengua": "LSM"}, headers=ana)
    assert r.status_code == 200, r.text
    exp = r.json()
    assert exp["resumen"]["intentos"] == 10 and exp["resumen"]["aciertos"] == 2
    assert exp["resumen"]["letras_practicadas"] == 2 and exp["resumen"]["letras_logradas"] == 1
    assert len(exp["letras"]) == 27  # todo el alfabeto de LSM

    e = next(l for l in exp["letras"] if l["letra"] == "E")
    assert e["estado"] == "difícil"
    assert e["confundida_con"] == [{"letra": "A", "veces": 4}]
    assert e["dedo_mas_fallado"] == "pulgar"
    assert e["prediccion"] is not None and 0 <= e["prediccion"]["puntaje"] <= 100

    m = next(l for l in exp["letras"] if l["letra"] == "M")
    assert m["estado"] == "dominada" and m["tendencia"] == "mejorando" and m["prediccion"] is None
    assert next(l for l in exp["letras"] if l["letra"] == "Z")["estado"] == "sin practicar"

    tipos = [c["tipo"] for c in exp["recomendaciones"]]
    assert tipos[0] == "dificil" and "pulgar" in exp["recomendaciones"][0]["mensaje"]
    assert "confusion" in tipos and "mejorando" in tipos
    # Siguiente: la primera sin lograr que no sea difícil (A).
    assert exp["siguiente"] == "A"

    # Cada lengua tiene su propio expediente.
    vacio = cliente.get("/api/intentos/expediente", params={"lengua": "ASL"}, headers=ana).json()
    assert vacio["resumen"]["intentos"] == 0 and vacio["recomendaciones"][0]["tipo"] == "inicio"


def test_expediente_de_otro_solo_admin(cliente, admin):
    id_ana, ana = crear_usuario(cliente, admin, "ana@correo.com")
    _, luis = crear_usuario(cliente, admin, "luis@correo.com")
    mandar(cliente, ana, [intento("B", 100, True)])
    r = cliente.get(f"/api/intentos/expediente/{id_ana}", params={"lengua": "LSM"}, headers=cabeceras(admin))
    assert r.status_code == 200 and r.json()["nombre"] == "Ana" and r.json()["resumen"]["intentos"] == 1
    assert cliente.get(f"/api/intentos/expediente/{id_ana}", params={"lengua": "LSM"}, headers=luis).status_code == 403
    assert cliente.get("/api/intentos/expediente/noexiste", params={"lengua": "LSM"}, headers=cabeceras(admin)).status_code == 404


def test_tablero(cliente, admin):
    id_ana, ana = crear_usuario(cliente, admin, "ana@correo.com")
    _, luis = crear_usuario(cliente, admin, "luis@correo.com")
    # Ana: 10 fallos en la S (la confunde con la A) → necesita ayuda.
    mandar(cliente, ana, [intento("S", 40, detectada="A", dedos=["pulgar", "indice"]) for _ in range(10)])
    # Luis: le va bien con la B.
    mandar(cliente, luis, [intento("B", 80), intento("B", 100, True), intento("B", 100, True)])

    r = cliente.get("/api/intentos/tablero", params={"lengua": "LSM"}, headers=cabeceras(admin))
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["intentos"] == 13 and t["aciertos"] == 2 and t["personas"] == 2
    assert [l["letra"] for l in t["letras"]] == ["S", "B"]  # la más difícil primero
    assert t["confusiones"][0] == {"letra": "S", "confundida_con": "A", "veces": 10}
    assert t["necesitan_ayuda"] == 1
    primera = t["personas_detalle"][0]
    assert primera["usuario_id"] == id_ana and primera["nombre"] == "Ana" and primera["necesita_ayuda"]
    assert t["dedos"][0] == {"dedo": "indice", "veces": 10} or t["dedos"][0]["veces"] == 10
    assert sum(d["intentos"] for d in t["por_dia"]) == 13
    assert any(g["grupo"] == "Puño cerrado" for g in t["grupos"])  # la S es del grupo de puño cerrado (K-Means)

    # Filtro de fechas: mañana no hay intentos.
    manana = (datetime.now(UTC) + timedelta(days=1)).date().isoformat()
    assert cliente.get("/api/intentos/tablero", params={"lengua": "LSM", "desde": manana}, headers=cabeceras(admin)).json()["intentos"] == 0
    # Solo el administrador.
    assert cliente.get("/api/intentos/tablero", params={"lengua": "LSM"}, headers=ana).status_code == 403

    # Al eliminar a Ana se borran sus intentos.
    cliente.delete(f"/api/usuarios/{id_ana}", headers=cabeceras(admin))
    assert cliente.get("/api/intentos/tablero", params={"lengua": "LSM"}, headers=cabeceras(admin)).json()["intentos"] == 3


def test_consejo_de_grupo_e_inactividad():
    # Sin servidor: el motor de consejos es una función pura.
    hace_un_mes = datetime.now(UTC) - timedelta(days=30)
    intentos = [
        {"letra": letra, "acierto": False, "puntaje": 40, "segundos": 8, "letra_detectada": None, "dedos_fallados": [], "fecha": hace_un_mes}
        for letra in ("A", "E", "S")
        for _ in range(3)
    ]
    exp = construir_expediente("x", "Prueba", "LSM", intentos, set())
    tipos = [c["tipo"] for c in exp["recomendaciones"]]
    assert "grupo" in tipos  # A, E y S son del grupo «Puño cerrado»
    assert "inactividad" in tipos
    assert exp["siguiente"] == "B"  # la primera sin lograr que no es difícil


def test_prediccion_igual_que_pytorch():
    # El cálculo con numpy da lo mismo que la red de PyTorch (ejemplo guardado por ml/p27).
    assert prediccion.comprobar() < 1e-3
    assert prediccion.predecir_siguiente([{"puntaje": 100, "segundos": 3, "acierto": True}]) is None  # hacen falta 2 intentos
    alto = prediccion.predecir_siguiente([{"puntaje": 80, "segundos": 4, "acierto": False}, {"puntaje": 100, "segundos": 3, "acierto": True}])
    bajo = prediccion.predecir_siguiente([{"puntaje": 0, "segundos": 25, "acierto": False}, {"puntaje": 20, "segundos": 25, "acierto": False}])
    assert alto > bajo
