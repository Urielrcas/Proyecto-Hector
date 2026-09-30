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
