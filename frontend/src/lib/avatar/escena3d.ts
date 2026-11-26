/**
 * LA ESCENA 3D DEL AVATAR DE CUERPO COMPLETO (Three.js, sin React)
 *
 * Arma el personaje con piezas simples (esferas, cápsulas, cilindros) y lo anima en cada cuadro:
 *   - Las dos manos: los 21 puntos de cada una salen de lib/avatar/cuerpo.ts (la misma mano 3D que
 *     evalúa la cámara); aquí se dibujan como palma + falanges + articulaciones.
 *   - Los brazos: del hombro a la muñeca, con el codo por cinemática inversa (codoPorIK).
 *   - Vida: respira, parpadea, mira hacia su mano y cambia la expresión (sonrisa, seria…).
 *   - Cámara: cuerpo completo o de cerca; se puede girar al personaje arrastrando.
 * El componente components/AvatarCuerpo.tsx crea una EscenaAvatar y le pasa cada seña.
 */
import * as THREE from 'three'
import { leerConfiguracion } from '../configuracion'
import { CUERPO, codoPorIK, colocarMano, hombro, poloCodo, type Cara, type Lado, type PasoAvatar } from './cuerpo'

const COLORES = {
  piel: '#f2c6a0',
  pielSombra: '#e3a983',
  pelo: '#3b2a20',
  pantalon: '#334155',
  zapato: '#1e293b',
  ojo: '#2b1d16',
  boca: '#8f3b3b',
  rubor: '#f59e8b',
  fondo: '#f5f5f4',
  piso: '#e7e5e4',
}

/** Segmentos de los dedos: [desde, hasta, radio] (índices de los 21 puntos de MediaPipe). */
const SEGMENTOS: [number, number, number][] = [
  [1, 2, 0.15], [2, 3, 0.135], [3, 4, 0.125],
  [5, 6, 0.125], [6, 7, 0.115], [7, 8, 0.105],
  [9, 10, 0.13], [10, 11, 0.12], [11, 12, 0.108],
  [13, 14, 0.122], [14, 15, 0.112], [15, 16, 0.102],
  [17, 18, 0.11], [18, 19, 0.1], [19, 20, 0.092],
]
const ARTICULACIONES: [number, number][] = [
  [1, 0.16], [2, 0.15], [3, 0.135], [4, 0.125], [5, 0.13], [6, 0.12], [7, 0.11], [8, 0.105],
  [9, 0.135], [10, 0.125], [11, 0.113], [12, 0.108], [13, 0.127], [14, 0.117], [15, 0.107], [16, 0.102],
  [17, 0.115], [18, 0.105], [19, 0.096], [20, 0.092],
]
const CEJAS: Record<Cara, { alto: number; giro: number }> = {
  neutra: { alto: 0, giro: 0 },
  sonrisa: { alto: 0.05, giro: 0.08 },
  pregunta: { alto: 0.16, giro: -0.15 },
  seria: { alto: -0.05, giro: -0.28 },
}
const VISTAS = {
  cuerpo: { pos: new THREE.Vector3(0, 7.2, 33), mira: new THREE.Vector3(0, 6.6, 0) },
  cerca: { pos: new THREE.Vector3(0, 9.6, 19), mira: new THREE.Vector3(0, 9.2, 0) },
}
export type VistaAvatar = keyof typeof VISTAS

const Y = new THREE.Vector3(0, 1, 0)
const tmp1 = new THREE.Vector3()
const tmp2 = new THREE.Vector3()

/** Pone una pieza de alto 1 (eje y) entre dos puntos, con el grosor indicado. */
function entre(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radio: number) {
  const dir = tmp1.subVectors(b, a)
  const largo = dir.length()
  m.position.copy(tmp2.addVectors(a, b).multiplyScalar(0.5))
  m.scale.set(radio, Math.max(1e-4, largo), radio)
  if (largo > 1e-6) m.quaternion.setFromUnitVectors(Y, dir.normalize())
}

interface PiezasMano {
  palma: THREE.Mesh
  base: THREE.Mesh
  segmentos: THREE.Mesh[]
  articulaciones: THREE.Mesh[]
}

interface PiezasBrazo {
  hombro: THREE.Mesh
  arriba: THREE.Mesh
  codo: THREE.Mesh
  abajo: THREE.Mesh
  muneca: THREE.Mesh
}

export class EscenaAvatar {
  private renderer: THREE.WebGLRenderer
  private escena = new THREE.Scene()
  private camara = new THREE.PerspectiveCamera(30, 1, 0.5, 200)
  private reloj = new THREE.Clock()
  private recursos: { dispose: () => void }[] = []
  private reducir = leerConfiguracion().reducirMovimiento

  private personaje = new THREE.Group()
  private torso = new THREE.Group()
  private cabeza = new THREE.Group()
  private ojos: THREE.Group[] = []
  private cejas: THREE.Mesh[] = []
  private bocas: Record<'sonrisa' | 'neutra' | 'seria', THREE.Mesh>
  private manos: Record<Lado, PiezasMano>
  private brazos: Record<Lado, PiezasBrazo>
  private vistos: Record<Lado, THREE.Vector3[] | null> = { [-1]: null, [1]: null } as Record<Lado, THREE.Vector3[] | null>

  private paso: PasoAvatar | null = null
  private inicioPaso = 0
  private msMovimiento = 1200
  private vista: VistaAvatar = 'cuerpo'
  /** Giro que da el usuario arrastrando (radianes). */
  giroUsuario = 0
  private parpadeo = { siguiente: 2, hasta: 0 }
  private cuadro = 0
  private activo = true

  constructor(lienzo: HTMLCanvasElement, colorCamisa: string, colorCamisaOscuro: string) {
    this.renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.escena.background = new THREE.Color(COLORES.fondo)
    this.camara.position.copy(VISTAS.cuerpo.pos)
    this.camara.lookAt(VISTAS.cuerpo.mira)

    // Luces: cielo/suelo, una principal con sombras y un relleno suave.
    this.escena.add(new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.15))
    const sol = new THREE.DirectionalLight('#ffffff', 1.6)
    sol.position.set(-8, 16, 14)
    sol.castShadow = true
    sol.shadow.mapSize.set(1024, 1024)
    Object.assign(sol.shadow.camera, { left: -10, right: 10, top: 16, bottom: -2 })
    sol.shadow.bias = -0.0005
    this.escena.add(sol)
    const relleno = new THREE.DirectionalLight('#ffffff', 0.45)
    relleno.position.set(10, 6, 6)
    this.escena.add(relleno)

    // Piso
    const piso = new THREE.Mesh(this.geo(new THREE.CircleGeometry(7, 48)), this.mat(COLORES.piso, 1))
    piso.rotation.x = -Math.PI / 2
    piso.receiveShadow = true
    this.escena.add(piso)

    // Materiales y geometrías compartidas
    const piel = this.mat(COLORES.piel, 0.62)
    const pielSombra = this.mat(COLORES.pielSombra, 0.7)
    const pelo = this.mat(COLORES.pelo, 0.9)
    const camisa = this.mat(colorCamisa, 0.75)
    const camisaOscura = this.mat(colorCamisaOscuro, 0.8)
    const pantalon = this.mat(COLORES.pantalon, 0.85)
    const zapato = this.mat(COLORES.zapato, 0.6)
    const blanco = this.mat('#ffffff', 0.3)
    const ojo = this.mat(COLORES.ojo, 0.25)
    const boca = this.mat(COLORES.boca, 0.6)
    const rubor = new THREE.MeshStandardMaterial({ color: COLORES.rubor, roughness: 1, transparent: true, opacity: 0.45 })
    this.recursos.push(rubor)
    const cilindro = this.geo(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true))
    const esfera = this.geo(new THREE.SphereGeometry(1, 20, 14))
    const malla = (g: THREE.BufferGeometry, m: THREE.Material, sombra = true) => {
      const x = new THREE.Mesh(g, m)
      x.castShadow = sombra
      return x
    }
    const en = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
      o.position.set(x, y, z)
      return o
    }

    // Piernas, zapatos y cinturón
    const pierna = this.geo(new THREE.CapsuleGeometry(0.74, 4.2, 6, 16))
    const pie = this.geo(new THREE.CapsuleGeometry(0.42, 0.9, 6, 12))
    for (const lado of [-1, 1]) {
      this.personaje.add(en(malla(pierna, pantalon), lado * CUERPO.piernaX, 3.1, 0))
      const zap = en(malla(pie, zapato), lado * (CUERPO.piernaX + 0.04), 0.42, 0.42)
      zap.rotation.x = Math.PI / 2
      zap.scale.set(1.18, 1, 0.85)
      this.personaje.add(zap)
    }
    this.personaje.add(en(malla(this.geo(new THREE.CylinderGeometry(1.42, 1.42, 0.6, 24)), pantalon), 0, CUERPO.cadera + 0.05, 0))

    // Torso (respira) y cuello de la playera
    this.torso.position.y = CUERPO.cadera
    const pecho = en(malla(this.geo(new THREE.CapsuleGeometry(1.5, 1.4, 8, 24)), camisa), 0, 1.85, 0)
    pecho.scale.set(1.18, 1, 0.74)
    this.torso.add(pecho)
    const collar = en(malla(this.geo(new THREE.TorusGeometry(0.6, 0.12, 10, 24)), camisaOscura, false), 0, 3.55, 0)
    collar.rotation.x = Math.PI / 2
    this.torso.add(collar)
    // Emblema en la playera: una manita (como Mani)
    const emblema = new THREE.Group()
    emblema.position.set(0.62, 2.55, 1.13)
    emblema.rotation.y = 0.32
    const palmita = en(malla(esfera, blanco, false), 0, 0, 0)
    palmita.scale.set(0.24, 0.22, 0.05)
    emblema.add(palmita)
    ;[-0.15, -0.05, 0.05, 0.15].forEach((x, i) => {
      const dedo = en(malla(esfera, blanco, false), x, 0.25 + (i === 1 || i === 2 ? 0.04 : 0), 0)
      dedo.scale.set(0.055, 0.13, 0.04)
      emblema.add(dedo)
    })
    this.torso.add(emblema)
    this.personaje.add(this.torso)
    this.personaje.add(en(malla(this.geo(new THREE.CylinderGeometry(0.45, 0.5, 0.9, 16)), pielSombra), 0, CUERPO.cuelloY, 0))

    // Cabeza: gira desde el cuello
    this.cabeza.position.set(CUERPO.cabeza.x, CUERPO.cabeza.y - 0.9, CUERPO.cabeza.z)
    const cara = new THREE.Group()
    cara.position.y = 0.9
    this.cabeza.add(cara)
    const craneo = malla(this.geo(new THREE.SphereGeometry(CUERPO.radioCabeza, 32, 24)), piel)
    craneo.scale.set(1, 1.07, 0.97)
    cara.add(craneo)
    for (const l of [-1, 1]) {
      const oreja = en(malla(esfera, pielSombra, false), l * 1.42, -0.05, -0.05)
      oreja.scale.set(0.32, 0.45, 0.25)
      cara.add(oreja)
    }
    const casquete = en(malla(this.geo(new THREE.SphereGeometry(CUERPO.radioCabeza, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)), pelo), 0, 0.12, -0.05)
    casquete.scale.set(1.06, 1.06, 1.04)
    cara.add(casquete)
    const nuca = en(malla(this.geo(new THREE.SphereGeometry(CUERPO.radioCabeza, 24, 16, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.4)), pelo, false), 0, 0.05, -0.35)
    nuca.scale.set(1.07, 1.02, 0.9)
    cara.add(nuca)
    const fleco = en(malla(this.geo(new THREE.SphereGeometry(0.7, 16, 10)), pelo, false), 0.25, 1.05, 0.92)
    fleco.rotation.set(0.5, 0, -0.35)
    fleco.scale.set(1.1, 0.35, 0.45)
    cara.add(fleco)
    for (const l of [-1, 1]) {
      const g = new THREE.Group()
      g.position.set(l * 0.5, 0.12, 1.28)
      const blancoOjo = malla(esfera, blanco, false)
      blancoOjo.scale.set(0.27, 0.32, 0.12)
      const pupila = en(malla(esfera, ojo, false), 0, -0.02, 0.09)
      pupila.scale.set(0.16, 0.2, 0.08)
      const brillo = en(malla(esfera, blanco, false), 0.05, 0.06, 0.16)
      brillo.scale.setScalar(0.05)
      g.add(blancoOjo, pupila, brillo)
      cara.add(g)
      this.ojos.push(g)
      const ceja = en(malla(this.geo(new THREE.BoxGeometry(0.46, 0.09, 0.08)), pelo, false), l * 0.5, 0.67, 1.3)
      cara.add(ceja)
      this.cejas.push(ceja)
      const r = en(malla(esfera, rubor, false), l * 0.85, -0.3, 1.12)
      r.rotation.y = l * 0.55
      r.scale.set(0.26, 0.15, 0.04)
      cara.add(r)
    }
    const nariz = en(malla(esfera, pielSombra, false), 0, -0.18, 1.42)
    nariz.scale.set(0.14, 0.12, 0.1)
    cara.add(nariz)
    const sonrisa = en(malla(this.geo(new THREE.TorusGeometry(0.3, 0.06, 8, 20, Math.PI)), boca, false), 0, -0.52, 1.3)
    sonrisa.rotation.set(0.2, 0, Math.PI)
    const neutra = en(malla(this.geo(new THREE.TorusGeometry(0.2, 0.055, 8, 16, Math.PI * 0.8)), boca, false), 0, -0.55, 1.33)
    neutra.rotation.set(0.25, 0, Math.PI - 0.1 * Math.PI)
    const seria = en(malla(this.geo(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8)), boca, false), 0, -0.6, 1.33)
    seria.rotation.z = Math.PI / 2
    cara.add(sonrisa, neutra, seria)
    this.bocas = { sonrisa, neutra, seria }
    this.personaje.add(this.cabeza)

    // Brazos y manos (se colocan en cada cuadro)
    const brazo = (): PiezasBrazo => {
      const b = { hombro: malla(esfera, camisa), arriba: malla(cilindro, camisa), codo: malla(esfera, piel), abajo: malla(cilindro, piel), muneca: malla(esfera, piel) }
      b.hombro.scale.setScalar(0.62)
      b.codo.scale.setScalar(0.4)
      b.muneca.scale.setScalar(0.3)
      this.personaje.add(...Object.values(b))
      return b
    }
    const manoNueva = (): PiezasMano => {
      const m = {
        palma: malla(this.geo(new THREE.BoxGeometry(1, 1, 1, 2, 2, 2)), piel),
        base: malla(cilindro, piel),
        segmentos: SEGMENTOS.map(() => malla(cilindro, piel)),
        articulaciones: ARTICULACIONES.map(() => malla(esfera, piel)),
      }
      this.personaje.add(m.palma, m.base, ...m.segmentos, ...m.articulaciones)
      return m
    }
    this.brazos = { [-1]: brazo(), [1]: brazo() } as Record<Lado, PiezasBrazo>
    this.manos = { [-1]: manoNueva(), [1]: manoNueva() } as Record<Lado, PiezasMano>
    this.escena.add(this.personaje)

    this.renderer.setAnimationLoop(() => this.animar())
  }

  private geo<T extends THREE.BufferGeometry>(g: T): T {
    this.recursos.push(g)
    return g
  }

  private mat(color: string, aspereza: number) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: aspereza })
    this.recursos.push(m)
    return m
  }

  /** La seña que debe hacer ahora (clave cambia aunque se repita la misma seña). */
  ponerPaso(paso: PasoAvatar, msMovimiento: number) {
    this.paso = paso
    this.msMovimiento = msMovimiento
    this.inicioPaso = this.reloj.getElapsedTime()
  }

  ponerVista(vista: VistaAvatar) {
    this.vista = vista
  }

  /** Pausa el dibujo cuando no se ve (ahorra batería). */
  ponerActivo(activo: boolean) {
    this.activo = activo
  }

  ajustarTamano(ancho: number, alto: number) {
    if (!ancho || !alto) return
    this.renderer.setSize(ancho, alto, false)
    this.camara.aspect = ancho / alto
    this.camara.updateProjectionMatrix()
  }

  private colocarMano(m: PiezasMano, p: THREE.Vector3[]) {
    // Palma: una caja con la orientación de la mano (arriba = muñeca → nudillo del medio).
    const arriba = tmp1.subVectors(p[9], p[0])
    const alto = arriba.length()
    const yv = arriba.clone().normalize()
    const derecha = new THREE.Vector3().subVectors(p[5], p[17])
    const ancho = derecha.length() + 0.22
    const xv = derecha.sub(yv.clone().multiplyScalar(derecha.dot(yv))).normalize()
    const zv = new THREE.Vector3().crossVectors(xv, yv).normalize()
    m.palma.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv, yv, zv))
    const nudillos = new THREE.Vector3().addVectors(p[5], p[17]).multiplyScalar(0.5)
    m.palma.position.copy(new THREE.Vector3().addVectors(p[0], nudillos).multiplyScalar(0.5))
    m.palma.scale.set(ancho, alto * 0.95, 0.36)
    entre(m.base, p[0], p[1], 0.2)
    SEGMENTOS.forEach(([a, b, radio], i) => entre(m.segmentos[i], p[a], p[b], radio))
    ARTICULACIONES.forEach(([i, radio], k) => {
      m.articulaciones[k].position.copy(p[i])
      m.articulaciones[k].scale.setScalar(radio)
    })
  }

  private animar() {
    if (!this.activo || !this.paso) return
    const dt = Math.min(0.1, this.reloj.getDelta())
    const ahora = this.reloj.getElapsedTime()
    const t = Math.min(1, ((ahora - this.inicioPaso) * 1000) / Math.max(400, this.msMovimiento * 0.85))
    const suavizar = 1 - Math.exp(-dt * (this.reducir ? 30 : 11))
    this.cuadro++

    // 1) Manos y brazos
    for (const lado of [-1, 1] as Lado[]) {
      const mp = lado === -1 ? this.paso.derecha : this.paso.izquierda
      const objetivo = colocarMano(mp, lado, t).puntos.map((q) => new THREE.Vector3(q.x, q.y, q.z))
      const vistos = this.vistos[lado]
      if (!vistos) this.vistos[lado] = objetivo
      else vistos.forEach((q, i) => q.lerp(objetivo[i], suavizar))
      const puntos = this.vistos[lado]!
      this.colocarMano(this.manos[lado], puntos)

      const s = hombro(lado)
      const { codo, muneca } = codoPorIK(s, { x: puntos[0].x, y: puntos[0].y, z: puntos[0].z }, CUERPO.brazo, CUERPO.antebrazo, poloCodo(lado))
      const b = this.brazos[lado]
      const vs = new THREE.Vector3(s.x, s.y, s.z)
      const vc = new THREE.Vector3(codo.x, codo.y, codo.z)
      const vm = new THREE.Vector3(muneca.x, muneca.y, muneca.z)
      b.hombro.position.copy(vs)
      entre(b.arriba, vs, vc, 0.5)
      b.codo.position.copy(vc)
      entre(b.abajo, vc, vm, 0.36)
      b.muneca.position.copy(vm)
    }

    // 2) Vida: respirar, mirar a la mano, parpadear, expresión
    const respiro = this.reducir ? 0 : Math.sin(ahora * 1.6) * 0.012
    this.torso.scale.set(1 + respiro * 0.5, 1 + respiro, 1 + respiro * 0.5)
    const der = this.vistos[-1]?.[9]
    const mira = der ? THREE.MathUtils.clamp(der.x * 0.06, -0.25, 0.25) : 0
    const baja = der ? THREE.MathUtils.clamp((CUERPO.cabeza.y - der.y) * 0.035, -0.1, 0.22) : 0
    this.cabeza.rotation.y += (mira - this.cabeza.rotation.y) * suavizar
    this.cabeza.rotation.x += (baja - this.cabeza.rotation.x) * suavizar
    this.cabeza.rotation.z = this.reducir ? 0 : Math.sin(ahora * 0.7) * 0.025
    const pp = this.parpadeo
    if (ahora > pp.siguiente) {
      pp.hasta = ahora + 0.13
      pp.siguiente = ahora + 2.5 + Math.random() * 3
    }
    const abierto = ahora < pp.hasta ? 0.12 : 1
    this.ojos.forEach((o) => (o.scale.y += (abierto - o.scale.y) * 0.5))
    const c = CEJAS[this.paso.cara]
    this.cejas.forEach((o, i) => {
      o.position.y += (0.67 + c.alto - o.position.y) * suavizar
      o.rotation.z += ((i === 0 ? c.giro : -c.giro) - o.rotation.z) * suavizar
    })
    const boca = this.paso.cara === 'pregunta' ? 'neutra' : this.paso.cara
    for (const k of ['sonrisa', 'neutra', 'seria'] as const) this.bocas[k].visible = k === boca

    // 3) Giro del usuario y cámara
    this.personaje.rotation.y += (this.giroUsuario - this.personaje.rotation.y) * suavizar
    const v = VISTAS[this.vista]
    this.camara.position.lerp(v.pos, 1 - Math.exp(-dt * 4))
    this.camara.lookAt(v.mira)

    this.renderer.render(this.escena, this.camara)
  }

  /** Libera la memoria de la tarjeta gráfica al quitar el avatar. */
  destruir() {
    this.renderer.setAnimationLoop(null)
    this.recursos.forEach((r) => r.dispose())
    this.renderer.dispose()
  }
}
