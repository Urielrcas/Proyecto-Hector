/*
 * HOOK: PUNTOS FLOTANTES
 * Lista de textos («+16», «−1 ❤») que suben y desaparecen; se dibujan con <PuntosFlotantes />.
 *   const { flotantes, lanzar } = useFlotantes()
 *   lanzar('+16')
 */
// ▸ Desde React:
import { useState } from 'react'
// ▸ Desde nuestro proyecto: src/components/juegos/PiezasJuego.tsx:
import type { Flotante } from '../components/juegos/PiezasJuego'

/** Hook para lanzar puntos flotantes: const { flotantes, lanzar } = useFlotantes() */
export function useFlotantes() {
  const [flotantes, setFlotantes] = useState<Flotante[]>([])
  const lanzar = (texto: string, bueno = true) => {
    const id = Date.now() + Math.random()
    setFlotantes((fs) => [...fs, { id, texto, bueno }])
    setTimeout(() => setFlotantes((fs) => fs.filter((f) => f.id !== id)), 1200)
  }
  return { flotantes, lanzar }
}

