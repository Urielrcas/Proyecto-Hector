"""Intentos de práctica, expediente de aprendizaje y tablero del administrador.

  POST /api/intentos                              → guarda un intento de «Practicar letra»
  GET  /api/intentos/expediente?lengua=LSM        → el expediente y los consejos del usuario de la sesión
  GET  /api/intentos/expediente/{id}?lengua=LSM   → el expediente de otra persona (solo administrador)
  GET  /api/intentos/tablero?lengua=&desde=&hasta= → consultas para el tablero (solo administrador)
  GET  /api/intentos/confusiones?lengua=LSM       → qué letras se confunden y cuántas personas (solo administrador)

Se guardan en la colección "intentos", un documento por intento:
    {usuario_id, lengua, letra, acierto, puntaje, segundos, letra_detectada, dedos_fallados, fecha}

Antes solo se guardaba la letra LOGRADA (colección "progreso"); ahora también los intentos fallidos,
y con eso salen:
  - el expediente y los consejos personalizados (app/recomendaciones.py, prácticas 18 y 19),
  - la predicción del siguiente intento (app/prediccion.py, prácticas 26 y 27),
  - las consultas del tablero con aggregate: $match, $group, $sort, $lookup, $facet (práctica 16).
La llama el frontend desde src/services/intentos.ts.
"""

# ▸ Desde Python:
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

# ▸ Desde librería bson (tipos de MongoDB):
from bson import ObjectId
# ▸ Desde FastAPI:
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

# ▸ Desde nuestro proyecto:
from ..alfabeto import LETRAS
from ..db import get_db
from ..dependencias import requiere_admin, usuario_actual
from ..modelos import ConfusionesPersonas, ExpedienteSalida, IntentoEntrada, Lengua, TableroIntentos
from ..recomendaciones import construir_expediente, grupos_lsm

router = APIRouter(prefix="/api/intentos", tags=["intentos"])

# «Necesita ayuda»: practica bastante pero casi no logra las letras (igual que ml/p16_consultas_intentos.py).
MIN_INTENTOS_AYUDA = 10
MAX_TASA_AYUDA = 0.15
# Cuántos intentos se leen como máximo para un expediente (los más recientes).
MAX_INTENTOS_EXPEDIENTE = 5000
# Nivel de una persona en una letra: el promedio de sus últimos N intentos (gráfica de dominio).
INTENTOS_NIVEL = 5


def rango_de(nivel: float) -> int:
    """0–20 → 0, 20–40 → 1, 40–60 → 2, 60–80 → 3, 80–100 → 4 (el 100 va en el último)."""
    return min(4, int(nivel // 20))


# POST /api/intentos
@router.post("", status_code=status.HTTP_201_CREATED)
async def registrar(datos: IntentoEntrada, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    letra = datos.letra.upper()
    if letra not in LETRAS[datos.lengua]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"La letra {letra} no existe en {datos.lengua}.")
    documento = datos.model_dump() | {
        "letra": letra,
        "letra_detectada": datos.letra_detectada.upper() if datos.letra_detectada else None,
        "usuario_id": usuario["_id"],
        "fecha": datetime.now(UTC),
    }
    resultado = await db.intentos.insert_one(documento)
    return {"id": str(resultado.inserted_id)}


async def _expediente(db: AsyncDatabase, usuario: dict[str, Any], lengua: str) -> dict[str, Any]:
    filtro = {"usuario_id": usuario["_id"], "lengua": lengua}
    # Los más recientes primero (para limitar) y luego se voltean: del más viejo al más nuevo.
    intentos = await db.intentos.find(filtro, {"_id": 0}).sort("fecha", -1).limit(MAX_INTENTOS_EXPEDIENTE).to_list()
    intentos.reverse()
    logradas = set(await db.progreso.distinct("letra", filtro))
    return construir_expediente(str(usuario["_id"]), usuario["nombre"], lengua, intentos, logradas)


# GET /api/intentos/expediente?lengua=LSM
@router.get("/expediente", response_model=ExpedienteSalida)
async def mi_expediente(lengua: Lengua, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    return await _expediente(db, usuario, lengua)


# GET /api/intentos/expediente/{id_usuario}?lengua=LSM (administrador)
@router.get("/expediente/{id_usuario}", response_model=ExpedienteSalida, dependencies=[Depends(requiere_admin)])
async def expediente_de(id_usuario: str, lengua: Lengua, db: AsyncDatabase = Depends(get_db)):
    usuario = await db.usuarios.find_one({"_id": ObjectId(id_usuario)}) if ObjectId.is_valid(id_usuario) else None
    if usuario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")
    return await _expediente(db, usuario, lengua)


def _rango(desde: date | None, hasta: date | None) -> dict[str, Any]:
    """Filtro de fechas (ambos días incluidos)."""
    fecha: dict[str, Any] = {}
    if desde:
        fecha["$gte"] = datetime.combine(desde, time.min, UTC)
    if hasta:
        fecha["$lt"] = datetime.combine(hasta + timedelta(days=1), time.min, UTC)
    return {"fecha": fecha} if fecha else {}


# GET /api/intentos/tablero?lengua=LSM&desde=2026-11-01&hasta=2026-11-30 (administrador)
@router.get("/tablero", response_model=TableroIntentos, dependencies=[Depends(requiere_admin)])
async def tablero(lengua: Lengua, desde: date | None = None, hasta: date | None = None, db: AsyncDatabase = Depends(get_db)):
    filtro = {"lengua": lengua, **_rango(desde, hasta)}
    tasa = {"$round": [{"$divide": ["$aciertos", "$intentos"]}, 3]}
    aciertos = {"$sum": {"$cond": ["$acierto", 1, 0]}}

    # Una sola consulta con $facet: varias agrupaciones sobre los mismos intentos.
    resultado = await (await db.intentos.aggregate([
        {"$match": filtro},
        {"$facet": {
            # Totales.
            "total": [{"$group": {"_id": None, "intentos": {"$sum": 1}, "aciertos": aciertos, "puntaje": {"$avg": "$puntaje"},
                                  "personas": {"$addToSet": "$usuario_id"}}}],
            # Por letra, de la más difícil a la más fácil.
            "letras": [
                {"$group": {"_id": "$letra", "intentos": {"$sum": 1}, "aciertos": aciertos, "puntaje": {"$avg": "$puntaje"},
                            "personas": {"$addToSet": "$usuario_id"}}},
                {"$project": {"_id": 0, "letra": "$_id", "intentos": 1, "aciertos": 1, "tasa": tasa,
                              "puntaje": {"$round": ["$puntaje", 1]}, "personas": {"$size": "$personas"}}},
                {"$sort": {"tasa": 1, "intentos": -1}},
            ],
            # Con qué letra se confunde cada una ($match de los fallidos).
            "confusiones": [
                {"$match": {"acierto": False, "letra_detectada": {"$ne": None}}},
                {"$match": {"$expr": {"$ne": ["$letra", "$letra_detectada"]}}},
                {"$group": {"_id": {"letra": "$letra", "con": "$letra_detectada"}, "veces": {"$sum": 1}}},
                {"$sort": {"veces": -1}},
                {"$limit": 10},
                {"$project": {"_id": 0, "letra": "$_id.letra", "confundida_con": "$_id.con", "veces": 1}},
            ],
            # Por persona, con su nombre y correo ($lookup a «usuarios»).
            "personas": [
                {"$group": {"_id": "$usuario_id", "intentos": {"$sum": 1}, "aciertos": aciertos, "puntaje": {"$avg": "$puntaje"},
                            "letras": {"$addToSet": "$letra"}, "ultima_vez": {"$max": "$fecha"}}},
                {"$lookup": {"from": "usuarios", "localField": "_id", "foreignField": "_id", "as": "usuario"}},
                {"$unwind": "$usuario"},
                {"$project": {"_id": 0, "usuario_id": {"$toString": "$_id"}, "nombre": "$usuario.nombre", "correo": "$usuario.correo",
                              "intentos": 1, "aciertos": 1, "tasa": tasa, "puntaje": {"$round": ["$puntaje", 1]},
                              "letras": {"$size": "$letras"}, "ultima_vez": 1}},
                {"$sort": {"tasa": 1, "intentos": -1}},
                {"$limit": 200},
            ],
            # Por día.
            "por_dia": [
                {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$fecha"}}, "intentos": {"$sum": 1}, "aciertos": aciertos}},
                {"$sort": {"_id": 1}},
                {"$project": {"_id": 0, "fecha": "$_id", "intentos": 1, "aciertos": 1}},
            ],
            # Nivel de cada persona en cada letra: promedio de sus últimos intentos (para la gráfica de dominio).
            "niveles": [
                {"$sort": {"fecha": 1}},
                {"$group": {"_id": {"usuario": "$usuario_id", "letra": "$letra"}, "puntajes": {"$push": "$puntaje"}}},
                {"$project": {"_id": 0, "letra": "$_id.letra", "nivel": {"$avg": {"$slice": ["$puntajes", -INTENTOS_NIVEL]}}}},
            ],
            # Qué dedo se falla más.
            "dedos": [
                {"$match": {"acierto": False}},
                {"$unwind": "$dedos_fallados"},
                {"$group": {"_id": "$dedos_fallados", "veces": {"$sum": 1}}},
                {"$sort": {"veces": -1}},
                {"$project": {"_id": 0, "dedo": "$_id", "veces": 1}},
            ],
        }},
    ])).to_list()
    r = resultado[0]
    total = r["total"][0] if r["total"] else {"intentos": 0, "aciertos": 0, "puntaje": 0, "personas": []}

    personas = r["personas"]
    for p in personas:
        p["necesita_ayuda"] = p["intentos"] >= MIN_INTENTOS_AYUDA and p["tasa"] <= MAX_TASA_AYUDA
    personas.sort(key=lambda p: (not p["necesita_ayuda"], p["tasa"]))

    # Por grupo de señas parecidas (K-Means, práctica 07): se junta con el grupo de cada letra.
    grupos: dict[str, dict[str, Any]] = {}
    if lengua == "LSM":
        mapa = grupos_lsm()
        for l in r["letras"]:
            if l["letra"] in mapa:
                nombre, letras_grupo = mapa[l["letra"]]
                g = grupos.setdefault(nombre, {"grupo": nombre, "letras": letras_grupo, "intentos": 0, "aciertos": 0})
                g["intentos"] += l["intentos"]
                g["aciertos"] += l["aciertos"]
    lista_grupos = sorted(
        ({"grupo": g["grupo"], "letras": g["letras"], "intentos": g["intentos"], "tasa": round(g["aciertos"] / g["intentos"], 3)} for g in grupos.values()),
        key=lambda g: g["tasa"],
    )

    # Dominio: cuántas personas quedan en cada rango de nivel, por letra (en orden del alfabeto).
    dominio: dict[str, dict[str, Any]] = {}
    for n in r["niveles"]:
        d = dominio.setdefault(n["letra"], {"letra": n["letra"], "personas": 0, "rangos": [0] * 5, "suma": 0.0})
        d["personas"] += 1
        d["rangos"][rango_de(n["nivel"])] += 1
        d["suma"] += n["nivel"]
    orden = {letra: i for i, letra in enumerate(LETRAS.get(lengua, []))}
    lista_dominio = [
        {"letra": d["letra"], "personas": d["personas"], "rangos": d["rangos"], "promedio": round(d["suma"] / d["personas"], 1)}
        for d in sorted(dominio.values(), key=lambda d: orden.get(d["letra"], 99))
    ]

    return {
        "intentos": total["intentos"],
        "aciertos": total["aciertos"],
        "tasa": round(total["aciertos"] / total["intentos"], 3) if total["intentos"] else 0.0,
        "puntaje": round(total["puntaje"] or 0, 1),
        "personas": len(total["personas"]),
        "necesitan_ayuda": sum(1 for p in personas if p["necesita_ayuda"]),
        "letras": r["letras"],
        "confusiones": r["confusiones"],
        "personas_detalle": personas,
        "grupos": lista_grupos,
        "por_dia": r["por_dia"],
        "dedos": r["dedos"],
        "dominio": lista_dominio,
    }


# GET /api/intentos/confusiones?lengua=LSM
# Para «IA por dentro → Señas parecidas»: con qué letra se confunde cada una y CUÁNTAS PERSONAS distintas
# la confundieron así, junto con cuántas personas practicaron cada letra (para sacar el porcentaje).
@router.get("/confusiones", response_model=ConfusionesPersonas, dependencies=[Depends(requiere_admin)])
async def confusiones(lengua: Lengua, db: AsyncDatabase = Depends(get_db)):
    resultado = await (await db.intentos.aggregate([
        {"$match": {"lengua": lengua}},
        {"$facet": {
            "personas": [{"$group": {"_id": "$usuario_id"}}, {"$count": "n"}],
            "practicaron": [
                {"$group": {"_id": "$letra", "personas": {"$addToSet": "$usuario_id"}}},
                {"$project": {"_id": 0, "letra": "$_id", "personas": {"$size": "$personas"}}},
            ],
            "pares": [
                {"$match": {"acierto": False, "letra_detectada": {"$ne": None}}},
                {"$match": {"$expr": {"$ne": ["$letra", "$letra_detectada"]}}},
                {"$group": {"_id": {"letra": "$letra", "con": "$letra_detectada"}, "veces": {"$sum": 1},
                            "personas": {"$addToSet": "$usuario_id"}}},
                {"$project": {"_id": 0, "letra": "$_id.letra", "con": "$_id.con", "veces": 1, "personas": {"$size": "$personas"}}},
                {"$sort": {"personas": -1, "veces": -1}},
                {"$limit": 300},
            ],
        }},
    ])).to_list()
    r = resultado[0]
    return {
        "personas": r["personas"][0]["n"] if r["personas"] else 0,
        "practicaron": {p["letra"]: p["personas"] for p in r["practicaron"]},
        "pares": r["pares"],
    }
