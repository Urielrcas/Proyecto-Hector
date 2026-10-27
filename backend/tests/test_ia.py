# PRUEBAS DE LA IA, LOS JUEGOS Y LAS ESTADÍSTICAS NUEVAS
# - El modelo de IA de cada usuario se guarda y se recupera (y es solo suyo).
# - Las partidas se registran.
# - El administrador ve las estadísticas de juegos, historial e IA (solo números, nunca contenido).
# - Al eliminar una cuenta se borra lo que la IA aprendió de ella.


def registrar(cliente, correo="ana@correo.com"):
    r = cliente.post("/api/auth/registro", json={"nombre": "Ana", "correo": correo, "contrasena": "secreta123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}, r.json()["usuario"]["id"]


def modelo(**cambios):
    base = {
        "dominio": {"A": {"p": 0.9, "intentos": 5, "aciertos": 5, "ultima": 1_700_000_000_000}, "R": {"p": 0.2, "intentos": 4, "aciertos": 1, "ultima": 1_700_000_000_000}},
        "muestras": {"A": [[0.0] * 42, [0.01] * 42]},
        "personales": {"A": [[0.02] * 42]},
        "red": {
            "pesos": "AAAA",
            "clases": ["A", "B"],
            "precision": 0.9,
            "historia": [{"epoca": 1, "perdida": 1.2, "precision": 0.5, "validacion": 0.6}],
            "entrenadaEn": 1_700_000_000_000,
            "muestrasUsadas": 2,
            "parametros": 30000,
        },
        "corrector": {"aplicadas": 4, "deshechas": 1, "palabras": {"HOLA": 3}},
        "actualizadoEn": 1_700_000_000_000,
    }
    return base | cambios


def test_guardar_y_recuperar_modelo(cliente):
    ana, _ = registrar(cliente)
    assert cliente.get("/api/ia/modelo", params={"lengua": "LSM"}, headers=ana).json() == {"modelo": None}
    r = cliente.put("/api/ia/modelo", json={"lengua": "LSM", "modelo": modelo()}, headers=ana)
    assert r.status_code == 204, r.text
    guardado = cliente.get("/api/ia/modelo", params={"lengua": "LSM"}, headers=ana).json()["modelo"]
    assert guardado["dominio"]["A"]["p"] == 0.9
    assert guardado["red"]["precision"] == 0.9
    assert len(guardado["personales"]["A"]) == 1  # su forma personal de la A
    # Cada lengua tiene su propio modelo
    assert cliente.get("/api/ia/modelo", params={"lengua": "ASL"}, headers=ana).json()["modelo"] is None


def test_modelo_privado_y_validado(cliente):
    ana, _ = registrar(cliente)
    luis, _ = registrar(cliente, "luis@correo.com")
    cliente.put("/api/ia/modelo", json={"lengua": "LSM", "modelo": modelo()}, headers=ana)
    assert cliente.get("/api/ia/modelo", params={"lengua": "LSM"}, headers=luis).json()["modelo"] is None
    assert cliente.get("/api/ia/modelo", params={"lengua": "LSM"}).status_code == 401
    # Más de 25 posturas por letra o probabilidades fuera de 0–1: rechazado
    demasiadas = modelo(muestras={"A": [[0.0] * 42] * 26})
    assert cliente.put("/api/ia/modelo", json={"lengua": "LSM", "modelo": demasiadas}, headers=ana).status_code == 422
    muchas_personales = modelo(personales={"A": [[0.0] * 42] * 31})
    assert cliente.put("/api/ia/modelo", json={"lengua": "LSM", "modelo": muchas_personales}, headers=ana).status_code == 422
    mala = modelo(dominio={"A": {"p": 1.5, "intentos": 1, "aciertos": 1, "ultima": 0}})
    assert cliente.put("/api/ia/modelo", json={"lengua": "LSM", "modelo": mala}, headers=ana).status_code == 422


def test_partidas(cliente):
    ana, _ = registrar(cliente)
    partida = {"lengua": "LSM", "juego": "reto", "puntos": 120, "aciertos": 7, "total": 8, "racha": 5, "pistas": 0, "estrellas": 2, "falladas": ["R"]}
    assert cliente.post("/api/juegos/partidas", json=partida, headers=ana).status_code == 201
    assert cliente.post("/api/juegos/partidas", json=partida | {"juego": "otro"}, headers=ana).status_code == 422
    assert cliente.post("/api/juegos/partidas", json=partida).status_code == 401


def test_estadisticas_del_administrador(cliente, admin):
    ana, _ = registrar(cliente)
    cliente.put("/api/ia/modelo", json={"lengua": "LSM", "modelo": modelo()}, headers=ana)
    cliente.post("/api/juegos/partidas", json={"lengua": "LSM", "juego": "adivina", "puntos": 80, "aciertos": 8, "total": 10}, headers=ana)
    cliente.post(
        "/api/historial",
        json={"tipo": "senas-texto", "lengua": "LSM", "mensajes": [{"autor": "sorda", "texto": "Hola", "hora": "2026-10-27T10:00:00Z"}]},
        headers=ana,
    )
    cab = {"Authorization": admin["Authorization"]}
    r = cliente.get("/api/estadisticas/resumen", headers=cab).json()
    assert r["partidas"] == 1 and r["jugadores"] == 1
    assert r["registros_historial"] == 1
    assert r["usuarios_con_ia"] == 1 and r["redes_entrenadas"] == 1
    assert r["precision_red"] == 90.0
    assert r["posturas"] == 2
    assert r["precision_corrector"] == 75.0  # 4 aplicadas, 1 deshecha
    for grafica in ("juegos", "dificultad", "historial"):
        g = cliente.get(f"/api/estadisticas/graficas/{grafica}.png", headers=cab)
        assert g.status_code == 200 and g.headers["content-type"] == "image/png"
        assert g.content[:4] == b"\x89PNG"
    # Un usuario normal no puede verlas
    assert cliente.get("/api/estadisticas/graficas/juegos.png", headers=ana).status_code == 403


def test_borrar_cuenta_borra_su_ia(cliente, admin):
    ana, id_ana = registrar(cliente)
    cliente.put("/api/ia/modelo", json={"lengua": "LSM", "modelo": modelo()}, headers=ana)
    cliente.post("/api/juegos/partidas", json={"lengua": "LSM", "juego": "memorama", "puntos": 50, "aciertos": 6, "total": 9}, headers=ana)
    cab = {"Authorization": admin["Authorization"]}
    assert cliente.delete(f"/api/usuarios/{id_ana}", headers=cab).status_code == 204
    r = cliente.get("/api/estadisticas/resumen", headers=cab).json()
    assert r["usuarios_con_ia"] == 0 and r["partidas"] == 0
