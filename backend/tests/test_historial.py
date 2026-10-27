# PRUEBAS DEL HISTORIAL Y DEL PERFIL
# Recorren el CRUD del historial (crear, listar, buscar, filtrar, actualizar, borrar),
# verifican que el historial es privado (regla x ∧ p) y el cambio de perfil (regla n → k).


def registrar(cliente, correo="ana@correo.com"):
    r = cliente.post("/api/auth/registro", json={"nombre": "Ana", "correo": correo, "contrasena": "secreta123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def conversacion(*textos, tipo="conversacion"):
    return {
        "tipo": tipo,
        "lengua": "LSM",
        "mensajes": [
            {"autor": "sorda" if i % 2 == 0 else "oyente", "texto": t, "hora": "2026-10-27T10:00:00Z"} for i, t in enumerate(textos)
        ],
    }


def test_crud_historial(cliente):
    ana = registrar(cliente)
    r = cliente.post("/api/historial", json=conversacion("Hola, ¿cómo estás?", "Bien, gracias"), headers=ana)
    assert r.status_code == 201, r.text
    registro = r.json()
    assert registro["titulo"] == "Hola, ¿cómo estás?"
    assert registro["total_mensajes"] == 2

    cliente.post("/api/historial", json=conversacion("Necesito agua", tipo="senas-texto"), headers=ana)

    # Listar (lo más reciente primero), filtrar por tipo y buscar en el texto
    r = cliente.get("/api/historial", headers=ana)
    assert r.json()["total"] == 2 and r.json()["items"][0]["titulo"] == "Necesito agua"
    assert cliente.get("/api/historial", params={"tipo": "senas-texto"}, headers=ana).json()["total"] == 1
    assert cliente.get("/api/historial", params={"buscar": "GRACIAS"}, headers=ana).json()["total"] == 1

    # La conversación siguió: se reemplazan sus mensajes
    r = cliente.put(f"/api/historial/{registro['id']}", json=conversacion("Hola, ¿cómo estás?", "Bien, gracias", "Adiós"), headers=ana)
    assert r.status_code == 200 and r.json()["total_mensajes"] == 3
    assert len(cliente.get(f"/api/historial/{registro['id']}", headers=ana).json()["mensajes"]) == 3

    # Borrar uno y luego todo
    assert cliente.delete(f"/api/historial/{registro['id']}", headers=ana).status_code == 204
    assert cliente.get(f"/api/historial/{registro['id']}", headers=ana).status_code == 404
    assert cliente.delete("/api/historial", headers=ana).status_code == 204
    assert cliente.get("/api/historial", headers=ana).json()["total"] == 0


def test_historial_privado(cliente, admin):
    ana = registrar(cliente)
    luis = registrar(cliente, "luis@correo.com")
    rid = cliente.post("/api/historial", json=conversacion("Secreto"), headers=ana).json()["id"]
    # Ni otra persona ni el administrador pueden verlo, cambiarlo o borrarlo (regla x ∧ p)
    for quien in (luis, {"Authorization": admin["Authorization"]}):
        assert cliente.get(f"/api/historial/{rid}", headers=quien).status_code == 404
        assert cliente.put(f"/api/historial/{rid}", json=conversacion("x"), headers=quien).status_code == 404
        assert cliente.delete(f"/api/historial/{rid}", headers=quien).status_code == 404
        assert cliente.get("/api/historial", headers=quien).json()["total"] == 0
    assert cliente.get("/api/historial").status_code == 401


def test_validaciones_historial(cliente):
    ana = registrar(cliente)
    assert cliente.post("/api/historial", json=conversacion(), headers=ana).status_code == 422  # sin mensajes
    assert cliente.post("/api/historial", json=conversacion("hola") | {"tipo": "otro"}, headers=ana).status_code == 422
    assert cliente.get("/api/historial/no-es-id", headers=ana).status_code == 404


def test_actualizar_perfil(cliente):
    ana = registrar(cliente)
    r = cliente.put("/api/auth/yo", json={"nombre": "Ana María", "lengua": "ASL"}, headers=ana)
    assert r.status_code == 200 and r.json()["nombre"] == "Ana María" and r.json()["lengua"] == "ASL"

    # Regla n → k: para cambiar la contraseña, la actual debe ser correcta
    r = cliente.put("/api/auth/yo", json={"contrasena_actual": "equivocada1", "contrasena_nueva": "nueva12345"}, headers=ana)
    assert r.status_code == 400
    r = cliente.put("/api/auth/yo", json={"contrasena_nueva": "nueva12345"}, headers=ana)
    assert r.status_code == 400
    r = cliente.put("/api/auth/yo", json={"contrasena_actual": "secreta123", "contrasena_nueva": "nueva12345"}, headers=ana)
    assert r.status_code == 200
    login = cliente.post("/api/auth/login", json={"correo": "ana@correo.com", "contrasena": "nueva12345"})
    assert login.status_code == 200
