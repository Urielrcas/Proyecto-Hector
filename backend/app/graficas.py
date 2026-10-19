"""Gráficas de la pantalla «Estadísticas» del administrador, hechas con matplotlib.

Cada función recibe los datos ya calculados (rutas/estadisticas.py los saca de MongoDB)
y devuelve la imagen PNG en bytes, lista para mandarla al navegador.

Lo que se aplica de las prácticas de clase:
  graficas1.py → título y subtítulo con contexto, ejes con la variable y sus unidades,
                 cuadrícula suave, leyenda, el valor exacto sobre cada dato, línea de promedio,
                 el máximo destacado con flecha, pie con la fuente y sin marco superior/derecho.
  graficas3.py → paleta SECUENCIAL (de claro a oscuro = de menos a más) para cantidades,
                 hecha con el verde azulado de la app (como "Blues" o "Greens", pero en nuestro color),
                 y UN solo color de acento (naranja) para lo que requiere atención.
                 Verde azulado + naranja se distinguen bien también con daltonismo.

Diferencia con las prácticas: aquí se usa Figure() en lugar de plt.figure(). En un servidor
llegan varias peticiones a la vez y plt guarda "la figura actual" de forma global; con Figure()
cada gráfica es independiente. Los métodos (plot, bar, set_title, legend...) son los mismos.
"""

# ▸ Desde Python, módulo datetime (fechas y horas):
#     datetime → fecha y hora (para el pie de la gráfica)
from datetime import datetime
# ▸ Desde Python, módulo io:
#     BytesIO → "archivo" en memoria donde se guarda el PNG sin tocar el disco
from io import BytesIO

# ▸ Desde matplotlib (librería de gráficas):
#     LinearSegmentedColormap → crea una paleta secuencial a partir de dos colores
from matplotlib.colors import LinearSegmentedColormap
# ▸ Desde matplotlib:
#     Figure → una figura independiente (sin el estado global de pyplot)
from matplotlib.figure import Figure
# ▸ Desde matplotlib:
#     Patch → cuadrito de color para la leyenda
from matplotlib.patches import Patch
# ▸ Desde matplotlib:
#     MaxNLocator → marcas del eje solo en números enteros (no hay "2.5 usuarios")
from matplotlib.ticker import MaxNLocator

# ==========================================================
# PALETA DE COLORES (la misma de la app: frontend/src/index.css, color "marca")
# ==========================================================

MARCA_100 = "#d0f5eb"
MARCA_200 = "#a4ead8"
MARCA_300 = "#6dd8c1"
MARCA_700 = "#13695d"  # color principal: líneas y barras
MARCA_800 = "#13544b"
ACENTO = "#c2410c"  # naranja: solo para lo que hay que notar (máximo, letras a reforzar)
TEXTO = "#1c1917"
TEXTO_SUAVE = "#78716c"  # subtítulos, pie y línea de promedio
CUADRICULA = "#e7e5e4"
FONDO_BARRA = "#f5f5f4"  # "riel" gris de las barras de avance

# Paleta secuencial: claro = poco, oscuro = mucho.
SECUENCIAL = LinearSegmentedColormap.from_list("marca", [MARCA_200, MARCA_800])

MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


# ==========================================================
# PIEZAS COMUNES A TODAS LAS GRÁFICAS
# ==========================================================

def _figura(ancho: float = 10, alto: float = 5.2):
    fig = Figure(figsize=(ancho, alto), facecolor="white")
    ax = fig.add_subplot()
    return fig, ax


def _titulos(ax, titulo: str, subtitulo: str) -> None:
    # Título: la PREGUNTA que responde la gráfica. Subtítulo gris: el contexto (qué se mide, periodo).
    ax.set_title(titulo, loc="left", fontsize=16, fontweight="bold", color=TEXTO, pad=30)
    ax.annotate(subtitulo, xy=(0, 1), xycoords="axes fraction", xytext=(0, 10), textcoords="offset points", fontsize=11, color=TEXTO_SUAVE)


def _ejes(ax, eje_x: str, eje_y: str, cuadricula: str = "y") -> None:
    # Etiquetas con la variable y sus unidades.
    ax.set_xlabel(eje_x, fontsize=12, fontweight="bold", color=TEXTO, labelpad=8)
    ax.set_ylabel(eje_y, fontsize=12, fontweight="bold", color=TEXTO, labelpad=8)
    # Cuadrícula punteada y suave, solo en el eje de los valores, detrás de los datos.
    ax.grid(axis=cuadricula, linestyle="--", linewidth=0.7, color=CUADRICULA)
    ax.set_axisbelow(True)
    # Quitar el marco superior y derecho; el resto en gris para que no compita con los datos.
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color("#d6d3d1")
    ax.tick_params(colors=TEXTO, labelsize=10)


def _pie(fig) -> None:
    # Pie de figura: de dónde salen los datos y cuándo se generó.
    fig.text(0.01, 0.005, f"Fuente: base de datos del Traductor de Señas · Generada el {datetime.now():%d/%m/%Y %H:%M}", fontsize=9, color=TEXTO_SUAVE)


def _sin_datos(ax, mensaje: str) -> None:
    ax.text(0.5, 0.5, mensaje, transform=ax.transAxes, ha="center", va="center", fontsize=13, color=TEXTO_SUAVE)
    ax.set_xticks([])
    ax.set_yticks([])


def _png(fig) -> bytes:
    # tight_layout acomoda los márgenes; dpi=150 se ve nítido sin pesar demasiado.
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    buffer = BytesIO()
    fig.savefig(buffer, format="png", dpi=150, bbox_inches="tight", facecolor="white")
    return buffer.getvalue()


def etiqueta_mes(anio: int, mes: int) -> str:
    """'Oct\\n2026': nombre corto del mes y el año abajo."""
    return f"{MESES[mes - 1]}\n{anio}"


# ==========================================================
# 1. REGISTROS POR MES (línea, como la de ventas de graficas1.py)
#    Pregunta: ¿está creciendo la app?
# ==========================================================

def grafica_registros(meses: list[str], cantidades: list[int]) -> bytes:
    fig, ax = _figura()
    periodo = f"{meses[0].replace(chr(10), ' ')} – {meses[-1].replace(chr(10), ' ')}"
    _titulos(ax, "¿Cuántas personas se registran cada mes?", f"Cuentas nuevas por mes · {periodo}")
    _ejes(ax, "Mes", "Usuarios nuevos")

    x = range(len(meses))
    # Área suave bajo la línea: ayuda a leer la tendencia de un vistazo.
    ax.fill_between(x, cantidades, color=MARCA_100, alpha=0.6)
    ax.plot(x, cantidades, color=MARCA_700, linewidth=3, marker="o", markersize=8, markerfacecolor="white", markeredgewidth=2, label="Registros del mes")
    ax.set_xticks(list(x), meses)
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    tope = max(cantidades) if any(cantidades) else 1
    ax.set_ylim(0, tope * 1.3 + 0.5)

    # Mes con más registros (si hay empate, el más reciente). Si todo es 0, no hay máximo que destacar.
    i_max = max(range(len(cantidades)), key=lambda i: (cantidades[i], i)) if any(cantidades) else None

    # Valor exacto sobre cada punto (el del máximo va en su propia anotación, abajo).
    for i, valor in enumerate(cantidades):
        if i != i_max:
            ax.annotate(str(valor), (i, valor), xytext=(0, 9), textcoords="offset points", ha="center", fontsize=10, color=TEXTO)

    if i_max is not None:
        # Línea de promedio: compara cada mes con el promedio del periodo.
        promedio = sum(cantidades) / len(cantidades)
        ax.axhline(promedio, color=TEXTO_SUAVE, linestyle="--", linewidth=1.5, label=f"Promedio: {promedio:.1f} por mes")
        # Destacar el máximo con un punto naranja y una flecha.
        ax.scatter(i_max, cantidades[i_max], s=180, color=ACENTO, zorder=5, label="Mes con más registros")
        ax.annotate(
            f"Mes con más registros: {cantidades[i_max]}",
            xy=(i_max, cantidades[i_max]),
            xytext=(-60 if i_max > len(meses) / 2 else 30, 26),
            textcoords="offset points",
            arrowprops={"arrowstyle": "->", "color": ACENTO, "lw": 1.5},
            fontsize=10,
            color=ACENTO,
        )
    ax.legend(loc="upper left", frameon=False, fontsize=10)
    _pie(fig)
    return _png(fig)


# ==========================================================
# 2. USUARIOS POR LENGUA Y ESTADO (barras agrupadas)
#    Pregunta: ¿qué lengua aprenden más? ¿cuántas cuentas siguen en uso?
# ==========================================================

def grafica_usuarios(por_lengua: dict[str, dict[str, int]]) -> bytes:
    fig, ax = _figura(alto=4.8)
    lenguas = list(por_lengua)
    activos = [por_lengua[l]["activo"] for l in lenguas]
    inactivos = [por_lengua[l]["inactivo"] for l in lenguas]
    total = sum(activos) + sum(inactivos)
    _titulos(ax, "¿Qué lengua aprenden los usuarios?", f"Cuentas por lengua y estado · {total} cuentas en total")
    _ejes(ax, "Lengua de señas", "Número de usuarios")

    ancho = 0.36
    x = range(len(lenguas))
    # Activos en el color principal (lo importante); inactivos en un tono claro del mismo color.
    barras_a = ax.bar([i - ancho / 2 for i in x], activos, ancho, color=MARCA_700, label="Activos")
    barras_i = ax.bar([i + ancho / 2 for i in x], inactivos, ancho, color=MARCA_300, label="Inactivos")
    ax.bar_label(barras_a, padding=4, fontsize=11, fontweight="bold", color=TEXTO)
    ax.bar_label(barras_i, padding=4, fontsize=11, color=TEXTO)
    nombres = {"LSM": "LSM\nLengua de Señas Mexicana", "ASL": "ASL\nAmerican Sign Language"}
    ax.set_xticks(list(x), [nombres.get(l, l) for l in lenguas])
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    ax.set_ylim(0, max(activos + inactivos + [1]) * 1.25)
    ax.legend(loc="upper right", frameon=False, fontsize=10)
    _pie(fig)
    return _png(fig)


# ==========================================================
# 3. LETRAS LOGRADAS (barras por letra, paleta secuencial)
#    Pregunta: ¿qué letras les cuestan más? → esas hay que reforzar.
# ==========================================================

def grafica_letras(lengua: str, letras: list[str], conteos: list[int], personas: int) -> bytes:
    fig, ax = _figura(ancho=12, alto=5.4)
    _titulos(ax, f"¿Qué letras logran los usuarios? · {lengua}", f"Usuarios que lograron cada letra · {personas} {'persona ha' if personas == 1 else 'personas han'} practicado {lengua}")
    _ejes(ax, "Letra", "Usuarios que la lograron")

    if not any(conteos):
        _sin_datos(ax, f"Todavía nadie ha logrado letras en {lengua}.")
        _pie(fig)
        return _png(fig)

    tope = max(conteos)
    minimo = min(conteos)
    # Color por cantidad: más usuarios = verde más oscuro (paleta secuencial).
    colores = [SECUENCIAL(c / tope) for c in conteos]
    barras = ax.bar(letras, conteos, color=colores, width=0.7)
    # Las letras MENOS logradas llevan borde naranja: son las que conviene reforzar.
    for barra, valor in zip(barras, conteos):
        if valor == minimo:
            barra.set_edgecolor(ACENTO)
            barra.set_linewidth(2.5)
    for barra, valor in zip(barras, conteos):
        ax.annotate(str(valor), (barra.get_x() + barra.get_width() / 2, valor), xytext=(0, 4), textcoords="offset points", ha="center", fontsize=9, color=ACENTO if valor == minimo else TEXTO)

    promedio = sum(conteos) / len(conteos)
    ax.axhline(promedio, color=TEXTO_SUAVE, linestyle="--", linewidth=1.5)
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    ax.set_ylim(0, tope * 1.25)
    ax.tick_params(axis="x", labelsize=12)
    ax.legend(
        handles=[
            Patch(color=MARCA_800, label="Más lograda (más oscuro)"),
            Patch(color=MARCA_200, label="Menos lograda (más claro)"),
            Patch(facecolor="white", edgecolor=ACENTO, linewidth=2, label="La menos lograda: reforzar"),
            ax.lines[-1],
        ],
        labels=["Más lograda (más oscuro)", "Menos lograda (más claro)", "La menos lograda: reforzar", f"Promedio: {promedio:.1f} usuarios por letra"],
        loc="upper left",
        bbox_to_anchor=(0, -0.14),
        ncols=4,
        frameon=False,
        fontsize=10,
    )
    _pie(fig)
    return _png(fig)


# ==========================================================
# 4. AVANCE POR USUARIO (barras horizontales tipo "barra de progreso")
#    Pregunta: ¿cuánto lleva cada persona? ¿quién se quedó atrás?
# ==========================================================

def grafica_avance(lengua: str, nombres: list[str], logradas: list[int], total_letras: int, total_usuarios: int) -> bytes:
    filas = len(nombres)
    fig, ax = _figura(alto=max(4.2, 0.48 * filas + 2.4))
    detalle = f"Se muestran los {filas} con más avance de {total_usuarios}" if total_usuarios > filas else f"{total_usuarios} {'usuario' if total_usuarios == 1 else 'usuarios'}"
    _titulos(ax, f"¿Cuánto ha avanzado cada usuario? · {lengua}", f"Letras logradas de {total_letras} · {detalle}")
    _ejes(ax, f"Letras logradas (de {total_letras})", "", cuadricula="x")

    if not filas:
        _sin_datos(ax, f"Todavía nadie ha practicado {lengua}.")
        _pie(fig)
        return _png(fig)

    y = range(filas)
    # "Riel" gris de fondo hasta el total de letras, como una barra de progreso de la app.
    ax.barh(y, [total_letras] * filas, color=FONDO_BARRA, height=0.62)
    barras = ax.barh(y, logradas, color=[SECUENCIAL(n / total_letras) for n in logradas], height=0.62)
    # Etiqueta "12/27 · 44 %" con fondo blanco, para que la línea de promedio no la tape.
    ax.bar_label(
        barras,
        labels=[f"{n}/{total_letras} · {round(100 * n / total_letras)} %" for n in logradas],
        padding=6,
        fontsize=10,
        color=TEXTO,
        bbox={"facecolor": "white", "edgecolor": "none", "pad": 1.5},
        zorder=6,
    )
    ax.set_yticks(list(y), [n if len(n) <= 24 else n[:23] + "…" for n in nombres], fontsize=11)
    ax.invert_yaxis()  # el de más avance arriba
    ax.set_xlim(0, total_letras * 1.22)  # espacio a la derecha para las etiquetas
    # Marcas del eje solo hasta el total de letras (no tiene sentido "32 de 27").
    ax.set_xticks(sorted(set(range(0, total_letras + 1, 3)) | {total_letras}))

    promedio = sum(logradas) / filas
    ax.axvline(promedio, color=ACENTO, linestyle="--", linewidth=1.5, label=f"Promedio: {promedio:.1f} letras")
    ax.legend(loc="lower right", frameon=False, fontsize=10)
    _pie(fig)
    return _png(fig)
