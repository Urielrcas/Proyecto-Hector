# EXPEDIENTE DE APRENDIZAJE Y MOTOR DE CONSEJOS (prácticas 18 y 19)
# Versión propia del «motor de recomendaciones» de SmartAcademy (p14), aplicada a las señas.
#
# Recibe TODOS los intentos de una persona en una lengua (colección «intentos») y las letras que
# ya logró (colección «progreso»), y arma su expediente:
#   - por letra: intentos, aciertos, puntaje, tendencia, con qué letra la confunde la IA,
#     qué dedo falla más (y en qué % de los fallos falló cada dedo), su estado (dominada / en progreso / difícil / sin practicar) y la
#     predicción de su próximo intento (red de la práctica 27, app/prediccion.py);
#   - consejos en palabras sencillas, ordenados por importancia;
#   - la letra que conviene practicar ahora,
#   - su perfil de aprendizaje (cluster, práctica 28) y sus vecinos más parecidos (KNN, práctica 29): app/perfiles.py.
#
# Es una función «pura» (no toca la base de datos): así se prueba fácil (tests/test_intentos.py).
#
# Reglas de los consejos (de más a menos importante):
#   1. difícil     → la letra cuesta: ≥ 3 intentos y en los últimos 5 acierta menos de 1 de cada 3.
#   2. confusión   → al fallar, la IA ve casi siempre la misma otra letra (≥ 2 veces).
#   3. grupo       → 2 o más letras difíciles del mismo grupo (los 4 de la práctica 08b): practicarlas juntas.
#   4. repaso      → ya la había logrado, pero sus últimos intentos van a la baja.
#   5. mejorando   → su puntaje subió (felicitar también motiva).
#   6. inactividad → hace más de 7 días que no practica.
#   7. siguiente   → la siguiente letra sin lograr, en orden del alfabeto.
#   8. inicio      → todavía no hay intentos.

# ▸ Desde Python:
import json
from collections import Counter
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

# ▸ Desde nuestro proyecto:
from .alfabeto import LETRAS
from .prediccion import mensaje_prediccion, predecir_siguiente
from .perfiles import perfil_de, vecinos_de

NOMBRE_DEDO = {"pulgar": "el pulgar", "indice": "el índice", "medio": "el dedo medio", "anular": "el anular", "menique": "el meñique"}
MIN_INTENTOS_DIFICIL = 3
TASA_DIFICIL = 1 / 3
DIAS_INACTIVIDAD = 7
MAX_CONSEJOS = 6

# Archivo de los grupos (lo escriben ml/p07_kmeans_manos.py y ml/p08b_familias_senas.py para la app).
ARCHIVO_GRUPOS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "ia" / "grupos" / "grupos.json"


@lru_cache(maxsize=1)
def grupos_lsm() -> dict[str, tuple[str, list[str]]]:
    """Letra → (nombre del grupo, letras del grupo). Vacío si no se encuentra el archivo."""
    if not ARCHIVO_GRUPOS.exists():
        return {}
    datos = json.loads(ARCHIVO_GRUPOS.read_text(encoding="utf-8"))
    # Los 4 grupos de la app (práctica 08b: familias por agrupamiento jerárquico; el profe pidió menos grupos).
    if datos.get("familias", {}).get("grupos"):
        salida: dict[str, tuple[str, list[str]]] = {}
        for g in datos["familias"]["grupos"]:
            letras = sorted(l for clase in g["letras"] for l in clase.split("/"))
            for letra in letras:
                salida[letra] = (g["nombre"], letras)
        return salida
    miembros: dict[int, list[str]] = {}
    for clase, info in datos["letras"].items():
        miembros.setdefault(info["grupo"], []).extend(clase.split("/"))
    nombres = {g["id"]: g["nombre"] for g in datos["grupos"]}
    return {letra: (nombres[gid], sorted(letras)) for gid, letras in miembros.items() for letra in letras}


def _con_zona(fecha: datetime | None) -> datetime | None:
    if fecha is not None and fecha.tzinfo is None:
        return fecha.replace(tzinfo=UTC)
    return fecha


def _resumen_letra(letra: str, intentos: list[dict[str, Any]], lograda: bool) -> dict[str, Any]:
    """El resumen de una letra a partir de sus intentos (ordenados del más viejo al más nuevo)."""
    if not intentos:
        return {
            "letra": letra, "intentos": 0, "aciertos": 0, "tasa": 0.0, "puntaje_promedio": 0.0, "ultimo_puntaje": 0,
            "lograda": lograda, "estado": "dominada" if lograda else "sin practicar", "tendencia": "estable",
            "confundida_con": [], "dedo_mas_fallado": None, "fallidos": 0, "dedos_fallados": [], "ultima_vez": None, "prediccion": None,
        }
    n = len(intentos)
    aciertos = sum(1 for i in intentos if i["acierto"])
    puntajes = [i["puntaje"] for i in intentos]
    recientes = intentos[-5:]
    tasa_reciente = sum(1 for i in recientes if i["acierto"]) / len(recientes)
    lograda = lograda or aciertos > 0

    # Tendencia: los últimos 3 intentos contra los 3 anteriores.
    tendencia = "estable"
    if n >= 4:
        nuevos = puntajes[-3:]
        viejos = puntajes[-6:-3]
        cambio = sum(nuevos) / len(nuevos) - sum(viejos) / len(viejos)
        tendencia = "mejorando" if cambio >= 15 else "bajando" if cambio <= -15 else "estable"

    fallidos = [i for i in intentos if not i["acierto"]]
    confusiones = Counter(i["letra_detectada"] for i in fallidos if i.get("letra_detectada") and i["letra_detectada"] != letra)
    dedos = Counter(d for i in fallidos for d in i.get("dedos_fallados", []))
    dedo, veces_dedo = dedos.most_common(1)[0] if dedos else (None, 0)
    # En qué porcentaje de los intentos fallidos falló cada dedo (para «el 60 % fue por tu pulgar»).
    dedos_fallados = [{"dedo": d, "veces": v, "porcentaje": round(v / len(fallidos), 3)} for d, v in dedos.most_common()]

    # Dominada: ya la logró, el último intento salió bien y al menos 2 de los últimos 3 también.
    if lograda and recientes[-1]["acierto"] and sum(1 for i in intentos[-3:] if i["acierto"]) >= min(2, n):
        estado = "dominada"
    elif n >= MIN_INTENTOS_DIFICIL and tasa_reciente < TASA_DIFICIL:
        estado = "difícil"
    else:
        estado = "en progreso"

    prediccion = None
    if estado != "dominada":
        puntaje = predecir_siguiente(intentos)
        if puntaje is not None:
            prediccion = {"puntaje": puntaje, "mensaje": mensaje_prediccion(letra, puntaje)}

    return {
        "letra": letra,
        "intentos": n,
        "aciertos": aciertos,
        "tasa": round(aciertos / n, 3),
        "puntaje_promedio": round(sum(puntajes) / n, 1),
        "ultimo_puntaje": puntajes[-1],
        "lograda": lograda,
        "estado": estado,
        "tendencia": tendencia,
        "confundida_con": [{"letra": l, "veces": v} for l, v in confusiones.most_common(3)],
        "dedo_mas_fallado": dedo if veces_dedo >= 2 else None,
        "fallidos": len(fallidos),
        "dedos_fallados": dedos_fallados,
        "ultima_vez": _con_zona(intentos[-1].get("fecha")),
        "prediccion": prediccion,
        "_puntajes": puntajes,
    }


def _consejos(lengua: str, letras: list[dict[str, Any]], ahora: datetime, ultima: datetime | None) -> tuple[list[dict[str, Any]], str | None]:
    consejos: list[dict[str, Any]] = []
    practicadas = [l for l in letras if l["intentos"]]
    dificiles = sorted((l for l in letras if l["estado"] == "difícil"), key=lambda l: (l["tasa"], -l["intentos"]))

    if not practicadas:
        primera = next((l["letra"] for l in letras if not l["lograda"]), None)
        if primera:
            consejos.append({"tipo": "inicio", "prioridad": 8, "letra": primera,
                             "mensaje": f"Empieza por la {primera}: mira el dibujo, sigue los pasos y haz la seña frente a la cámara."})
        return consejos, primera

    # 1. Letras difíciles (las dos que más cuestan).
    for l in dificiles[:2]:
        texto = f"Te cuesta la {l['letra']}: la lograste {l['aciertos']} de {l['intentos']} veces."
        if l["dedo_mas_fallado"]:
            texto += f" Fíjate sobre todo en {NOMBRE_DEDO[l['dedo_mas_fallado']]}."
        consejos.append({"tipo": "dificil", "prioridad": 1, "letra": l["letra"], "mensaje": texto})

    # 2. Confusión más repetida.
    confusiones = [(l, l["confundida_con"][0]) for l in practicadas if l["confundida_con"] and l["confundida_con"][0]["veces"] >= 2 and l["estado"] != "dominada"]
    if confusiones:
        l, c = max(confusiones, key=lambda par: par[1]["veces"])
        consejos.append({"tipo": "confusion", "prioridad": 2, "letra": l["letra"],
                         "mensaje": f"Cuando haces la {l['letra']}, la IA ve una {c['letra']} ({c['veces']} veces). Compara los dibujos de las dos y busca el dedo que las hace distintas."})

    # 3. Grupo de señas parecidas con varias letras difíciles (solo LSM: los grupos salieron de manos de LSM).
    if lengua == "LSM":
        grupos = grupos_lsm()
        por_grupo: dict[str, list[str]] = {}
        for l in dificiles:
            if l["letra"] in grupos:
                por_grupo.setdefault(grupos[l["letra"]][0], []).append(l["letra"])
        for nombre, del_grupo in por_grupo.items():
            if len(del_grupo) >= 2:
                todas = ", ".join(next(g[1] for g in grupos.values() if g[0] == nombre))
                consejos.append({"tipo": "grupo", "prioridad": 3, "letra": del_grupo[0],
                                 "mensaje": f"Las letras del grupo «{nombre}» ({todas}) se parecen mucho y te cuestan: practícalas juntas para notar qué cambia entre ellas."})
                break

    # 4. Repaso: la había logrado, pero va a la baja.
    for l in practicadas:
        if l["lograda"] and l["estado"] == "en progreso" and (l["tendencia"] == "bajando" or not any(p == 100 for p in l["_puntajes"][-2:])) and l["intentos"] >= 3:
            consejos.append({"tipo": "repaso", "prioridad": 4, "letra": l["letra"],
                             "mensaje": f"Ya te había salido la {l['letra']}, pero tus últimos intentos no tanto: dale un repaso rápido."})
            break

    # 5. Mejorando.
    mejorando = [l for l in practicadas if l["tendencia"] == "mejorando"]
    if mejorando:
        l = max(mejorando, key=lambda x: x["ultimo_puntaje"])
        antes = round(sum(l["_puntajes"][-6:-3]) / len(l["_puntajes"][-6:-3]))
        ahora_p = round(sum(l["_puntajes"][-3:]) / 3)
        consejos.append({"tipo": "mejorando", "prioridad": 5, "letra": l["letra"],
                         "mensaje": f"¡Vas mejorando en la {l['letra']}! Tu puntaje subió de {antes} % a {ahora_p} %."})

    # 6. Inactividad.
    if ultima is not None:
        dias = (ahora - ultima).days
        if dias > DIAS_INACTIVIDAD:
            consejos.append({"tipo": "inactividad", "prioridad": 6, "letra": None,
                             "mensaje": f"Hace {dias} días que no practicas. Unos minutos al día ayudan a no olvidar las señas."})

    # 7. Siguiente letra: la primera sin lograr que no sea difícil (si todas lo son, la primera sin lograr).
    sin_lograr = [l for l in letras if not l["lograda"]]
    siguiente_l = next((l for l in sin_lograr if l["estado"] != "difícil"), sin_lograr[0] if sin_lograr else None)
    siguiente = siguiente_l["letra"] if siguiente_l else None
    if siguiente:
        consejos.append({"tipo": "siguiente", "prioridad": 7, "letra": siguiente, "mensaje": f"Cuando quieras avanzar, sigue con la {siguiente}."})

    consejos.sort(key=lambda c: c["prioridad"])
    return consejos[:MAX_CONSEJOS], siguiente


def construir_expediente(usuario_id: str, nombre: str, lengua: str, intentos: list[dict[str, Any]], logradas: set[str], ahora: datetime | None = None) -> dict[str, Any]:
    """El expediente completo. `intentos` debe venir ordenado por fecha (del más viejo al más nuevo)."""
    ahora = ahora or datetime.now(UTC)
    por_letra: dict[str, list[dict[str, Any]]] = {}
    for i in intentos:
        por_letra.setdefault(i["letra"], []).append(i)
    letras = [_resumen_letra(letra, por_letra.get(letra, []), letra in logradas) for letra in LETRAS[lengua]]
    ultima = _con_zona(intentos[-1].get("fecha")) if intentos else None
    consejos, siguiente = _consejos(lengua, letras, ahora, ultima)
    n = len(intentos)
    aciertos = sum(1 for i in intentos if i["acierto"])
    dias = {(_con_zona(i["fecha"])).date() for i in intentos if i.get("fecha")}
    for l in letras:
        l.pop("_puntajes", None)
    return {
        "usuario_id": usuario_id,
        "nombre": nombre,
        "lengua": lengua,
        "resumen": {
            "intentos": n,
            "aciertos": aciertos,
            "tasa": round(aciertos / n, 3) if n else 0.0,
            "puntaje_promedio": round(sum(i["puntaje"] for i in intentos) / n, 1) if n else 0.0,
            "letras_practicadas": sum(1 for l in letras if l["intentos"]),
            "letras_logradas": sum(1 for l in letras if l["lograda"]),
            "total_letras": len(letras),
            "dias_practicados": len(dias),
            "ultima_practica": ultima,
        },
        "letras": letras,
        "recomendaciones": consejos,
        "siguiente": siguiente,
        # Práctica 28: tu perfil de aprendizaje (cluster) y dónde quedas en el mapa de perfiles.
        "perfil": perfil_de(intentos),
        # Práctica 29: personas que aprenden como tú (KNN) y lo que eso dice de tus próximas letras.
        "vecinos": vecinos_de(intentos, lengua),
    }
