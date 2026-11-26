/**
 * PERFILES DE APRENDIZAJE (práctica 28, ml/p28_perfiles_usuarios.py)
 * K-Means agrupó a las personas según cómo aprenden (aciertos, puntaje, intentos por letra, letras
 * practicadas, mejora y rapidez). Aquí está lo necesario para el mapa de perfiles: el nombre y color de
 * cada perfil y una muestra de personas en el mapa PCA. El perfil de cada usuario lo calcula el servidor.
 */
import perfilesJson from './perfiles.json'

export const PERFILES = perfilesJson as {
  fecha: string
  origen: string
  caracteristicas: string[]
  k: number
  siluetas: Record<string, number>
  perfiles: { id: number; nombre: string; descripcion: string; consejo: string; color: string; personas: number; centro: Record<string, number> }[]
  pca: { media: number[]; componentes: number[][]; varianza: number[] }
  muestra: { x: number[]; y: number[]; perfil: number[] }
  centrosPca: { perfil: number; x: number; y: number }[]
}
