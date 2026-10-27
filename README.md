# Traductor e Intérprete Asistivo de Lengua de Señas

Aplicación web que traduce entre lengua de señas (LSM/ASL) y español.

| Carpeta | Contenido |
|---|---|
| `frontend/` | React + Vite + TypeScript + Tailwind |
| `backend/` | FastAPI + MongoDB |
| `ml/` | (próximamente) entrenamiento de modelos |

## Requisitos
- Node 20+ y Python 3.11+
- MongoDB local (servicio de Windows `MongoDB`) **o** un clúster de MongoDB Atlas

## Cómo levantarlo

**1. Backend** (terminal 1)
```bash
cd backend
python -m venv .venv                 # solo la primera vez
.venv\Scripts\activate
pip install -r requirements.txt      # solo la primera vez
copy .env.example .env               # solo la primera vez; ajusta los valores
uvicorn app.main:app --reload --port 8000
```
Documentación interactiva de la API: http://localhost:8000/docs

**2. Frontend** (terminal 2)
```bash
cd frontend
npm install                          # solo la primera vez
npm run dev
```
Abre http://localhost:5173

## Abrir en el celular
El celular solo deja usar la cámara y el micrófono si la página abre por **https**.
1. Crea el certificado (solo la primera vez, desde Git Bash, en `frontend/`):
   ```bash
   mkdir -p certs && MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes -days 365      -keyout certs/clave.pem -out certs/certificado.pem -subj "/CN=Traductor de Senas (desarrollo)"
   ```
2. Arranca el frontend con `npm run dev:celular` (el backend igual que siempre).
3. Conecta el celular a la **misma red Wi-Fi** y abre la dirección «Network» que muestra Vite
   (por ejemplo `https://10.1.16.105:5173`).
4. El navegador avisará que la conexión no es privada (el certificado es nuestro, no de una
   autoridad): toca **Avanzado → Continuar**. Si no carga, permite Node.js en el firewall de Windows.

## Usuario administrador
Al arrancar, si no existe ningún administrador, el backend crea uno con los datos
de `ADMIN_CORREO` y `ADMIN_CONTRASENA` del archivo `.env`
(por defecto `admin@senas.app` / `Admin12345`). **Cambia esa contraseña.**

## Usar MongoDB Atlas en lugar de la base local
1. En Atlas, crea un clúster gratuito (M0), un usuario de base de datos y permite tu IP.
2. Copia la cadena de conexión (Connect → Drivers).
3. En `backend/.env` cambia `MONGODB_URI=mongodb+srv://...` y reinicia el backend.

## Pruebas
```bash
cd backend
.venv\Scripts\python -m pytest
```
Las pruebas usan una base aparte (`traductor_senas_pruebas`) que se borra al terminar.
