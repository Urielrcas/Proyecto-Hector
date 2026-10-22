"""Corrector de frases deletreadas con Ollama (modelo de lenguaje que corre en la misma computadora).

La cámara reconoce letra por letra, así que el texto llega en MAYÚSCULAS, sin acentos ni signos y a
veces con palabras pegadas:  "HOLACOMO ESTAS"  →  Ollama lo devuelve como  "Hola, ¿cómo estás?".

Cómo se evita que el modelo invente:
  1. Instrucciones con ejemplos (pocos ejemplos de entrada → salida, uno por cada caso típico).
  2. Una revisión hecha por nosotros (es_correccion_valida): se comparan solo las LETRAS de lo
     deletreado y de la frase corregida. Si el modelo cambió demasiadas letras (agregó palabras o
     cambió el sentido), la corrección se rechaza y se queda el texto original.

Ollama se configura en el .env (OLLAMA_URL y OLLAMA_MODELO). Lo usa la ruta app/rutas/frase.py.
"""

# ▸ Desde Python, módulo json (leer y escribir JSON)
import json
# ▸ Desde Python, módulo unicodedata (quitar acentos: á → a)
import unicodedata

# ▸ Desde httpx (peticiones HTTP; aquí, a la API de Ollama)
import httpx

# ▸ Desde nuestro proyecto (carpeta app/config):
#     config → la configuración ya cargada (app/config.py)
from .config import config

# Instrucciones para el modelo. {idioma} = español (LSM) o inglés (ASL).
INSTRUCCIONES = """Corriges texto deletreado con el alfabeto manual de lengua de señas. Llega en MAYÚSCULAS, \
sin acentos ni signos, y puede tener espacios faltantes o sobrantes o una letra repetida.
Devuelve exactamente las mismas palabras, bien escritas en {idioma}: separa palabras pegadas, pon acentos, \
mayúscula inicial y signos de puntuación{signos}.
PROHIBIDO agregar palabras, preguntas o ideas nuevas. Si no reconoces una palabra, déjala igual en minúsculas.
Responde solo con JSON: {{"frase": "..."}}"""

# Ejemplos de entrada → salida que se le muestran al modelo antes del texto real.
EJEMPLOS = {
    "LSM": [
        ("HOLACOMO ESTAS", "Hola, ¿cómo estás?"),
        ("TENGO SED", "Tengo sed."),
        ("MI NOMBRE ES ANNA", "Mi nombre es Ana."),
        ("QRT", "qrt"),
    ],
    "ASL": [
        ("HELLOHOW ARE YOU", "Hello, how are you?"),
        ("IAM THIRSTY", "I am thirsty."),
        ("MY NAME IS JOHHN", "My name is John."),
        ("QRT", "qrt"),
    ],
}

# Le pedimos a Ollama que conteste con este formato JSON exacto.
FORMATO = {"type": "object", "properties": {"frase": {"type": "string"}}, "required": ["frase"]}


class OllamaNoDisponible(Exception):
    """Ollama está apagado, no tiene el modelo o tardó demasiado."""


def solo_letras(texto: str) -> str:
    """Las letras de un texto, en mayúsculas y sin acentos: "¿Cómo estás?" → "COMOESTAS". La Ñ se conserva."""
    texto = unicodedata.normalize("NFD", texto.upper()).replace("Ñ", "Ñ")
    return "".join(c for c in texto if c.isalpha() and not unicodedata.combining(c))


def distancia_edicion(a: str, b: str) -> int:
    """Cuántas letras hay que agregar, quitar o cambiar para pasar de "a" a "b" (distancia de Levenshtein).

    Ej.: distancia_edicion("MECLLAMO", "MELLAMO") = 1 (sobra una C).
    """
    anterior = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        actual = [i]
        for j, y in enumerate(b, 1):
            actual.append(min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + (x != y)))
        anterior = actual
    return anterior[-1]


def es_correccion_valida(original: str, frase: str) -> bool:
    """La frase corregida es aceptable si sus letras casi no cambiaron respecto a lo deletreado.

    Se permite cambiar hasta 1 de cada 5 letras (mínimo 2): suficiente para quitar una letra repetida o
    arreglar una equivocada, pero no para agregar palabras. Ej.: "XQZ" → "¿Qué pasó?" se rechaza.
    """
    a, b = solo_letras(original), solo_letras(frase)
    if not b:
        return False
    return distancia_edicion(a, b) <= max(2, len(a) // 5)


def mensajes(texto: str, lengua: str) -> list[dict[str, str]]:
    """La conversación que se le manda a Ollama: instrucciones, ejemplos y el texto deletreado."""
    espanol = lengua == "LSM"
    sistema = INSTRUCCIONES.format(idioma="español" if espanol else "inglés", signos=" (¿ ? ¡ ! en español)" if espanol else "")
    lista = [{"role": "system", "content": sistema}]
    for entrada, salida in EJEMPLOS[lengua]:
        lista.append({"role": "user", "content": entrada})
        lista.append({"role": "assistant", "content": json.dumps({"frase": salida}, ensure_ascii=False)})
    lista.append({"role": "user", "content": texto})
    return lista


async def preguntar_a_ollama(texto: str, lengua: str) -> str:
    """Manda el texto a Ollama y devuelve la frase que propone (sin revisar)."""
    cuerpo = {
        "model": config.ollama_modelo,
        "messages": mensajes(texto, lengua),
        "format": FORMATO,
        "stream": False,  # la respuesta completa de una vez
        "keep_alive": "10m",  # deja el modelo cargado 10 min: las siguientes frases responden más rápido
        "options": {"temperature": 0},  # siempre la misma respuesta para el mismo texto
    }
    try:
        async with httpx.AsyncClient(timeout=config.ollama_segundos) as cliente:
            r = await cliente.post(f"{config.ollama_url}/api/chat", json=cuerpo)
    except httpx.TimeoutException as e:
        raise OllamaNoDisponible("Ollama tardó demasiado en responder.") from e
    except httpx.HTTPError as e:
        raise OllamaNoDisponible("No se pudo conectar con Ollama. ¿Está encendido?") from e
    if r.status_code == 404:
        raise OllamaNoDisponible(f"Ollama no tiene el modelo «{config.ollama_modelo}». Descárgalo con: ollama pull {config.ollama_modelo}")
    if r.status_code != 200:
        raise OllamaNoDisponible(f"Ollama respondió con error {r.status_code}.")
    try:
        return str(json.loads(r.json()["message"]["content"])["frase"]).strip()
    except (KeyError, ValueError, TypeError) as e:
        raise OllamaNoDisponible("Ollama respondió en un formato inesperado.") from e


async def corregir(texto: str, lengua: str) -> tuple[str, bool]:
    """Devuelve (frase, corregida). Si la propuesta de Ollama no pasa la revisión, regresa el texto original."""
    propuesta = await preguntar_a_ollama(texto, lengua)
    if es_correccion_valida(texto, propuesta):
        return propuesta, True
    return texto, False
