# ============================================================
# PRACTICA 1 - PARTE B (adaptada a nuestro proyecto)
# TOMAR UNA DECISION MEDIANTE UNA REGLA FIJA
# ============================================================
#
# En clase la regla era "si estudia 6 horas o más, probablemente aprueba".
# En nuestro proyecto hacemos lo mismo con una letra: escribimos a mano
# una regla para reconocer la A.
#
#   La A es: los cuatro dedos doblados (sus puntas cerca de la palma)
#            y el pulgar estirado al lado del índice.
#
# Así funcionaba todo nuestro reconocimiento al principio: una regla por letra.
# El problema, que vamos a ver con números en la práctica 3, es que una regla
# escrita a mano no se adapta: si la mano está girada o la persona dobla
# un poco distinto los dedos, la regla falla.

from pathlib import Path

import pandas as pd

AQUI = Path(__file__).parent

# Usamos manos de la tabla que armó la app (práctica 2): unas son A y otras no.
df = pd.read_csv(AQUI / "datos" / "manos_crudas.csv")
df = df[df["origen"] == "avatar3d"]
muestra = pd.concat([df[df["letra"] == "A"].head(6), df[df["letra"] == "E"].head(3), df[df["letra"] == "B"].head(3)])


# ------------------------------------------------------------
# DEFINIR UNA REGLA MANUAL
# ------------------------------------------------------------
# Las medidas están en "palmas" (la palma mide 1), así no importa
# qué tan cerca de la cámara esté la mano.
def es_a_con_regla(mano):
    dedos_doblados = all(
        mano[f"punta_{d}_a_palma"] < 0.95 for d in ["indice", "medio", "anular", "menique"]
    )
    # El pulgar al lado del índice: su punta (punto 4) queda del lado del índice (u negativo o casi 0)
    # y a la altura de los nudillos o más arriba (v alto).
    pulgar_al_lado = mano["p4_u"] < 0.05 and mano["p4_v"] > 0.6
    return "Es A" if dedos_doblados and pulgar_al_lado else "No es A"


# ------------------------------------------------------------
# APLICAR LA REGLA A CADA MANO
# ------------------------------------------------------------
print("=== RESULTADO DE LA REGLA FIJA ===")
aciertos = 0
for _, mano in muestra.iterrows():
    resultado = es_a_con_regla(mano)
    correcto = (resultado == "Es A") == (mano["letra"] == "A")
    aciertos += correcto
    print(f"Mano #{int(mano['id']):<5} | letra real: {mano['letra']:<3} | regla: {resultado:<8} | {'bien' if correcto else 'MAL'}")

print(f"\nLa regla acertó {aciertos} de {len(muestra)}.")
print("Fíjate en las E que se leen como A: es el mismo error que vimos al probar con una mano real.")
print("La E también tiene los dedos doblados; solo cambia dónde queda el pulgar, y la regla no alcanza a verlo.")
