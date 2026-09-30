def cabeceras(admin):
    return {"Authorization": admin["Authorization"]}


NUEVO = {"nombre": "María López", "correo": "Maria@Correo.com", "contrasena": "secreta123", "rol": "usuario"}


def test_crud_completo(cliente, admin):
    # Crear
    r = cliente.post("/api/usuarios", json=NUEVO, headers=cabeceras(admin))
    assert r.status_code == 201, r.text
    creado = r.json()
    assert creado["correo"] == "maria@correo.com"
    assert creado["estado"] == "activo"
    assert "hash_contrasena" not in creado and "contrasena" not in creado

    # Leer uno
    r = cliente.get(f"/api/usuarios/{creado['id']}", headers=cabeceras(admin))
    assert r.status_code == 200 and r.json()["nombre"] == "María López"

    # Listar y buscar
    r = cliente.get("/api/usuarios", params={"buscar": "maría"}, headers=cabeceras(admin))
    assert r.json()["total"] == 1
    r = cliente.get("/api/usuarios", headers=cabeceras(admin))
    assert r.json()["total"] == 2  # admin + María

    # Actualizar (sin tocar la contraseña)
    r = cliente.put(f"/api/usuarios/{creado['id']}", json={"nombre": "María L.", "estado": "inactivo"}, headers=cabeceras(admin))
    assert r.status_code == 200
    assert r.json()["nombre"] == "María L." and r.json()["estado"] == "inactivo"

    # Un usuario inactivo no puede iniciar sesión
    r = cliente.post("/api/auth/login", json={"correo": "maria@correo.com", "contrasena": "secreta123"})
    assert r.status_code == 403

    # Eliminar
    r = cliente.delete(f"/api/usuarios/{creado['id']}", headers=cabeceras(admin))
    assert r.status_code == 204
    r = cliente.get(f"/api/usuarios/{creado['id']}", headers=cabeceras(admin))
    assert r.status_code == 404


def test_correo_duplicado(cliente, admin):
    assert cliente.post("/api/usuarios", json=NUEVO, headers=cabeceras(admin)).status_code == 201
    r = cliente.post("/api/usuarios", json=NUEVO | {"correo": "maria@correo.com"}, headers=cabeceras(admin))
    assert r.status_code == 409


def test_validaciones(cliente, admin):
    r = cliente.post("/api/usuarios", json=NUEVO | {"contrasena": "corta"}, headers=cabeceras(admin))
    assert r.status_code == 422
    r = cliente.post("/api/usuarios", json=NUEVO | {"correo": "no-es-correo"}, headers=cabeceras(admin))
    assert r.status_code == 422


def test_cambiar_contrasena(cliente, admin):
    uid = cliente.post("/api/usuarios", json=NUEVO, headers=cabeceras(admin)).json()["id"]
    cliente.put(f"/api/usuarios/{uid}", json={"contrasena": "nueva4567"}, headers=cabeceras(admin))
    assert cliente.post("/api/auth/login", json={"correo": NUEVO["correo"], "contrasena": "secreta123"}).status_code == 401
    assert cliente.post("/api/auth/login", json={"correo": NUEVO["correo"], "contrasena": "nueva4567"}).status_code == 200


def test_admin_no_puede_bloquearse(cliente, admin):
    assert cliente.delete(f"/api/usuarios/{admin['id']}", headers=cabeceras(admin)).status_code == 400
    assert cliente.put(f"/api/usuarios/{admin['id']}", json={"rol": "usuario"}, headers=cabeceras(admin)).status_code == 400


def test_permisos(cliente):
    assert cliente.get("/api/usuarios").status_code == 401
    # Un usuario normal registrado no puede administrar usuarios
    r = cliente.post("/api/auth/registro", json={"nombre": "Luis", "correo": "luis@correo.com", "contrasena": "secreta123"})
    assert r.status_code == 201 and r.json()["usuario"]["rol"] == "usuario"
    token = r.json()["token"]
    assert cliente.get("/api/usuarios", headers={"Authorization": f"Bearer {token}"}).status_code == 403
    assert cliente.get("/api/auth/yo", headers={"Authorization": f"Bearer {token}"}).json()["correo"] == "luis@correo.com"


def test_id_invalido(cliente, admin):
    assert cliente.get("/api/usuarios/no-es-un-id", headers=cabeceras(admin)).status_code == 404
