# Ayudante compartido por las prácticas 20 a 27: guarda sus resultados en un solo archivo JSON
# que la app lee en «IA por dentro» (frontend/src/lib/ia/cnn1d/practicas.json).
# Cada práctica escribe SOLO su sección; las demás se conservan.

import json
from datetime import date
from pathlib import Path

ARCHIVO = Path(__file__).parent.parent / "frontend" / "src" / "lib" / "ia" / "cnn1d" / "practicas.json"


def actualizar(seccion, datos):
    ARCHIVO.parent.mkdir(parents=True, exist_ok=True)
    todo = json.loads(ARCHIVO.read_text(encoding="utf-8")) if ARCHIVO.exists() else {}
    todo[seccion] = {"fecha": date.today().isoformat(), **datos}
    ARCHIVO.write_text(json.dumps(todo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"App: sección «{seccion}» guardada en frontend/src/lib/ia/cnn1d/practicas.json")
