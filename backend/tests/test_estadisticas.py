# PRUEBAS DEL PROGRESO Y LAS ESTADÍSTICAS
# Guardar letras logradas (sin repetir, rechazando letras que no existen),
# que el administrador vea el resumen y las 4 gráficas en PNG,
# que un usuario normal no pueda verlas y que al eliminar un usuario se borre su progreso.

PNG = b"\x89PNG"  # los archivos PNG siempre empiezan con estos bytes


def cabeceras(admin):
    return {"Authorization": admin["Authorization"]}


def crear_usuario(cliente, admin, correo, lengua="LSM"):
    datos = {"nombre": correo.split("@")[0].title(), "correo": correo, "contrasena": "secreta123", "lengua": lengua}
    r = cliente.post("/api/usuarios", json=datos, headers=cabeceras(admin))
    assert r.status_code == 201, r.text
    r = cliente.post("/api/auth/login", json={"correo": correo, "contrasena": "secreta123"})
    return r.json()["usuario"]["id"], {"Authorization": f"Bearer {r.json()['token']}"}


def test_progreso(cliente, admin):
    _, sesion = crear_usuario(cliente, admin, "ana@correo.com")
    r = cliente.post("/api/progreso", json={"lengua": "LSM", "letras": ["b", "A", "A"]}, headers=sesion)
    assert r.status_code == 200, r.text
    assert r.json()["letras"] == ["A", "B"]  # en mayúsculas, sin repetir y en orden del alfabeto

    # Volver a mandar una letra ya lograda no la duplica.
    r = cliente.post("/api/progreso", json={"lengua": "LSM", "letras": ["A", "Ñ"]}, headers=sesion)
    assert r.json()["letras"] == ["A", "B", "Ñ"]

    # Cada lengua lleva su propio progreso.
    assert cliente.get("/api/progreso", params={"lengua": "ASL"}, headers=sesion).json()["letras"] == []

    # La Ñ no existe en ASL.
    r = cliente.post("/api/progreso", json={"lengua": "ASL", "letras": ["Ñ"]}, headers=sesion)
    assert r.status_code == 422

    # Sin sesión no se puede.
    assert cliente.get("/api/progreso", params={"lengua": "LSM"}).status_code == 401


def test_estadisticas_admin(cliente, admin):
    id_ana, ana = crear_usuario(cliente, admin, "ana@correo.com")
    _, luis = crear_usuario(cliente, admin, "luis@correo.com", lengua="ASL")
    cliente.post("/api/progreso", json={"lengua": "LSM", "letras": ["A", "B", "C"]}, headers=ana)
    cliente.post("/api/progreso", json={"lengua": "LSM", "letras": ["A"]}, headers=luis)

    r = cliente.get("/api/estadisticas/resumen", headers=cabeceras(admin))
    assert r.status_code == 200, r.text
    resumen = r.json()
    assert resumen["usuarios"] == 3 and resumen["activos"] == 3  # admin + Ana + Luis
    assert resumen["por_lengua"] == {"LSM": 2, "ASL": 1}
    assert resumen["letras_logradas"] == 4
    # Promedio en LSM: (3 + 1) letras / (2 usuarios × 27 letras) = 7.4 %
    assert resumen["avance_promedio"]["LSM"] == 7.4

    for ruta in ("registros.png", "usuarios.png", "letras.png?lengua=LSM", "avance.png?lengua=LSM", "letras.png?lengua=ASL", "avance.png?lengua=ASL"):
        r = cliente.get(f"/api/estadisticas/graficas/{ruta}", headers=cabeceras(admin))
        assert r.status_code == 200, ruta
        assert r.headers["content-type"] == "image/png" and r.content.startswith(PNG)

    # Al eliminar a Ana se borra su progreso.
    cliente.delete(f"/api/usuarios/{id_ana}", headers=cabeceras(admin))
    assert cliente.get("/api/estadisticas/resumen", headers=cabeceras(admin)).json()["letras_logradas"] == 1


def test_estadisticas_solo_admin(cliente, admin):
    _, sesion = crear_usuario(cliente, admin, "ana@correo.com")
    assert cliente.get("/api/estadisticas/resumen", headers=sesion).status_code == 403
    assert cliente.get("/api/estadisticas/graficas/registros.png", headers=sesion).status_code == 403
