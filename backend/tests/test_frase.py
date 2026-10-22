# PRUEBAS DEL CORRECTOR DE FRASES (app/corrector.py y POST /api/frase/corregir)
# No necesitan Ollama encendido: la respuesta del modelo se simula con monkeypatch.
# Comprueban que:
#   - se aceptan las correcciones normales (acentos, signos, palabras separadas, una letra repetida),
#   - se rechazan las que agregan palabras o cambian el sentido (se queda el texto original),
#   - si Ollama está apagado, la ruta responde 503 con un mensaje claro.

# ▸ Desde nuestro proyecto (app/corrector.py):
#     distancia_edicion, es_correccion_valida, mensajes, OllamaNoDisponible, solo_letras
from app import corrector
from app.corrector import OllamaNoDisponible, distancia_edicion, es_correccion_valida, mensajes, solo_letras


def test_solo_letras():
    assert solo_letras("¿Cómo estás?") == "COMOESTAS"
    assert solo_letras("Dónde está el baño") == "DONDEESTAELBAÑO"  # la Ñ se conserva


def test_distancia_edicion():
    assert distancia_edicion("MECLLAMO", "MELLAMO") == 1  # sobra una C
    assert distancia_edicion("HOLA", "HOLA") == 0
    assert distancia_edicion("", "ABC") == 3


def test_correcciones_aceptadas():
    assert es_correccion_valida("HOLACOMOESTAS", "Hola, ¿cómo estás?")
    assert es_correccion_valida("MECLLAMO URIEL", "Me llamo Uriel.")
    assert es_correccion_valida("DONDE ESTA EL BANO", "¿Dónde está el baño?")  # N → Ñ es un cambio pequeño
    assert es_correccion_valida("QUIERO AGUA PORFAVOR", "Quiero agua, por favor.")


def test_correcciones_rechazadas():
    # Inventa algo que no se deletreó.
    assert not es_correccion_valida("XQZ", "¿Qué pasó?")
    # Agrega una pregunta completa.
    assert not es_correccion_valida("TENGO HAMBRE", "Tengo hambre, ¿dónde puedo encontrar algo de comer?")
    # Respuesta vacía.
    assert not es_correccion_valida("HOLA", "¿?")


def test_mensajes_incluyen_ejemplos_y_texto():
    lsm = mensajes("HOLA", "LSM")
    assert "español" in lsm[0]["content"] and lsm[-1] == {"role": "user", "content": "HOLA"}
    assert any(m["role"] == "assistant" for m in lsm)  # ejemplos de respuesta
    assert "inglés" in mensajes("HELLO", "ASL")[0]["content"]


def test_ruta_corrige(cliente, monkeypatch):
    async def ollama_falso(texto, lengua):
        return "Hola, ¿cómo estás?"

    monkeypatch.setattr(corrector, "preguntar_a_ollama", ollama_falso)
    r = cliente.post("/api/frase/corregir", json={"texto": "  HOLACOMO   ESTAS ", "lengua": "LSM"})
    assert r.status_code == 200, r.text
    assert r.json()["frase"] == "Hola, ¿cómo estás?"
    assert r.json()["corregida"] is True


def test_ruta_rechaza_invento(cliente, monkeypatch):
    async def ollama_falso(texto, lengua):
        return "Tengo hambre, ¿dónde puedo encontrar algo de comer?"

    monkeypatch.setattr(corrector, "preguntar_a_ollama", ollama_falso)
    r = cliente.post("/api/frase/corregir", json={"texto": "TENGO HAMBRE"})
    assert r.status_code == 200
    assert r.json() == {"frase": "TENGO HAMBRE", "corregida": False, "modelo": r.json()["modelo"]}


def test_ruta_ollama_apagado(cliente, monkeypatch):
    async def ollama_apagado(texto, lengua):
        raise OllamaNoDisponible("No se pudo conectar con Ollama. ¿Está encendido?")

    monkeypatch.setattr(corrector, "preguntar_a_ollama", ollama_apagado)
    r = cliente.post("/api/frase/corregir", json={"texto": "HOLA"})
    assert r.status_code == 503
    assert "Ollama" in r.json()["detail"]


def test_ruta_valida_entrada(cliente):
    assert cliente.post("/api/frase/corregir", json={"texto": ""}).status_code == 422
    assert cliente.post("/api/frase/corregir", json={"texto": "   "}).status_code == 422
    assert cliente.post("/api/frase/corregir", json={"texto": "A" * 301}).status_code == 422
    assert cliente.post("/api/frase/corregir", json={"texto": "HOLA", "lengua": "XYZ"}).status_code == 422
