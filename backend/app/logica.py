"""Lógica proposicional: fórmulas, evaluación y tablas de verdad.

Las fórmulas se escriben con operadores de Python:
    ~p        negación        ¬p
    p & q     conjunción      p ∧ q
    p | q     disyunción      p ∨ q
    p >> q    condicional     p → q
    p.sii(q)  bicondicional   p ↔ q
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import product

Valuacion = dict[str, bool]


class Formula:
    def evaluar(self, v: Valuacion) -> bool:
        raise NotImplementedError

    def variables(self) -> list[str]:
        """Proposiciones de la fórmula, en el orden en que aparecen."""
        raise NotImplementedError

    def __and__(self, otra: Formula) -> Formula:
        return Y(self, otra)

    def __or__(self, otra: Formula) -> Formula:
        return O(self, otra)

    def __invert__(self) -> Formula:
        return No(self)

    def __rshift__(self, otra: Formula) -> Formula:
        return Implica(self, otra)

    def sii(self, otra: Formula) -> Formula:
        return Bicondicional(self, otra)


@dataclass(frozen=True)
class Var(Formula):
    nombre: str

    def evaluar(self, v: Valuacion) -> bool:
        if self.nombre not in v:
            raise KeyError(f"Falta el valor de la proposición «{self.nombre}»")
        return v[self.nombre]

    def variables(self) -> list[str]:
        return [self.nombre]

    def __str__(self) -> str:
        return self.nombre


@dataclass(frozen=True)
class No(Formula):
    f: Formula

    def evaluar(self, v: Valuacion) -> bool:
        return not self.f.evaluar(v)

    def variables(self) -> list[str]:
        return self.f.variables()

    def __str__(self) -> str:
        return f"¬{self.f}" if isinstance(self.f, (Var, No)) else f"¬({self.f})"


@dataclass(frozen=True)
class _Binaria(Formula):
    izq: Formula
    der: Formula
    simbolo = "?"

    def variables(self) -> list[str]:
        vistas = self.izq.variables()
        return vistas + [x for x in self.der.variables() if x not in vistas]

    def _lado(self, g: Formula) -> str:
        # Cadenas del mismo conectivo asociativo sin paréntesis (p ∧ q ∧ r).
        simple = isinstance(g, (Var, No)) or (type(g) is type(self) and isinstance(self, (Y, O)))
        return str(g) if simple else f"({g})"

    def __str__(self) -> str:
        return f"{self._lado(self.izq)} {self.simbolo} {self._lado(self.der)}"


class Y(_Binaria):
    simbolo = "∧"

    def evaluar(self, v: Valuacion) -> bool:
        return self.izq.evaluar(v) and self.der.evaluar(v)


class O(_Binaria):
    simbolo = "∨"

    def evaluar(self, v: Valuacion) -> bool:
        return self.izq.evaluar(v) or self.der.evaluar(v)


class Implica(_Binaria):
    simbolo = "→"

    def evaluar(self, v: Valuacion) -> bool:
        return (not self.izq.evaluar(v)) or self.der.evaluar(v)


class Bicondicional(_Binaria):
    simbolo = "↔"

    def evaluar(self, v: Valuacion) -> bool:
        return self.izq.evaluar(v) == self.der.evaluar(v)


def proposiciones(*nombres: str) -> tuple[Var, ...]:
    return tuple(Var(n) for n in nombres)


def tabla_de_verdad(f: Formula) -> list[tuple[Valuacion, bool]]:
    """Filas de "todo V" a "todo F" (la primera proposición varía más lento)."""
    variables = f.variables()
    filas = []
    for valores in product([True, False], repeat=len(variables)):
        v = dict(zip(variables, valores, strict=True))
        filas.append((v, f.evaluar(v)))
    return filas


def columna_de_resultados(f: Formula) -> str:
    """La columna final de la tabla de verdad, p. ej. "VFFF" para p ∧ q."""
    return "".join("V" if r else "F" for _, r in tabla_de_verdad(f))


def es_tautologia(f: Formula) -> bool:
    return all(r for _, r in tabla_de_verdad(f))


def es_contradiccion(f: Formula) -> bool:
    return not any(r for _, r in tabla_de_verdad(f))


def equivalentes(a: Formula, b: Formula) -> bool:
    return es_tautologia(a.sii(b))
