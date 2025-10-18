# Proyecto Full-Stack: Asistente con IA (Frontend React + Backend FastAPI)

Este repositorio contiene un proyecto Full-Stack dividido en dos partes: un **Frontend** desarrollado con React (usando Create React App y Craco) y un un **Backend** construido con FastAPI.

El proyecto ha sido configurado para un **despliegue unificado y optimizado en Vercel** como un monorepo, utilizando funciones Serverless para el Backend de Python.

---

## 🚀 Despliegue en Vercel

El despliegue de este proyecto es directo gracias al archivo de configuración `vercel.json` incluido.

### Pasos para el Despliegue

1.  **Conectar a Vercel:** Asegúrate de que tu cuenta de Vercel esté conectada a tu cuenta de GitHub.
2.  **Importar el Proyecto:** En el dashboard de Vercel, haz clic en **"Add New..."** y luego en **"Project"**.
3.  **Seleccionar el Repositorio:** Busca y selecciona el repositorio `isai2122/oruevamanus-con-la-ai-asistente`.
4.  **Configuración de Despliegue:** Vercel detectará automáticamente la configuración del monorepo gracias al `vercel.json`.
    *   **Root Directory:** Deja este campo vacío.
    *   **Build Command:** Vercel usará el comando definido en `vercel.json`.
    *   **Output Directory:** Vercel usará el directorio `build` dentro de `frontend`.

5.  **Variables de Entorno (IMPORTANTE):**
    *   Si tu proyecto utiliza variables de entorno (como claves de API, secretos, etc.), **debes añadirlas manualmente** en la sección de **Environment Variables** de la configuración del proyecto en Vercel.

6.  **Desplegar:** Haz clic en **"Deploy"**.

Una vez completado, Vercel gestionará automáticamente:
*   La construcción del Frontend de React.
*   El despliegue del Backend de FastAPI como una función Serverless en la ruta `/api/*`.

---

## 🛠️ Estructura del Proyecto

*   **`/frontend`**: Contiene la aplicación de React.
    *   `package.json`: Define las dependencias de Node.js.
*   **`/backend`**: Contiene la API de FastAPI.
    *   `requirements.txt`: Define las dependencias de Python.
    *   `server.py`: El punto de entrada de la aplicación FastAPI.
*   **`vercel.json`**: El archivo clave que configura el despliegue de ambas partes en Vercel.

---

## 💻 Desarrollo Local

Para ejecutar el proyecto localmente, necesitarás configurar ambos entornos:

### 1. Backend (Python/FastAPI)

```bash
# Navegar al directorio del backend
cd backend

# Crear y activar un entorno virtual (recomendado)
python3 -m venv venv
source venv/bin/activate  # En Linux/macOS

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar el servidor (Revisa tu documentación para el comando exacto)
# Ejemplo: uvicorn server:app --reload
```

### 2. Frontend (React)

```bash
# Navegar al directorio del frontend
cd frontend

# Instalar dependencias
npm install

# Ejecutar la aplicación
npm start
```
