# 🌍 ChesTrips

> Transforma notas de viaje desordenadas, reservas y vuelos en cuadernos de ruta interactivos, editoriales y 100% autónomos con soporte offline ("Modo Avión").

[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Runtime](https://img.shields.io/badge/Runtime-Cloudflare%20Workers%20(V8)-orange?logo=cloudflare)](https://developers.cloudflare.com/pages/platform/functions/)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Gemini%203.5%20Flash--Lite-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Modo%20Avi%C3%B3n-5A0FC8?logo=pwa&logoColor=white)](#-arquitectura-offline-y-pwa)

---

## 📖 Descripción del Proyecto

**ChesTrips** es una plataforma web serverless ultraligera y optimizada para dispositivos móviles. Su propósito es erradicar la dispersión de información al viajar: toma billetes, horarios, reservas y notas en bruto, las procesa mediante **Google Gemini** y genera una guía interactiva con mapas, geolocalización y herramientas de viaje disponible en cualquier lugar, incluso sin conexión.

---

## ⚡ Stack Tecnológico y Arquitectura

- **Hosting y Edge Runtime:** Desplegado sobre **Cloudflare Pages** y **Cloudflare Pages Functions** (entorno V8 sin Node.js nativo para máxima velocidad y latencia cero).
- **Motor de Inteligencia Artificial:** Integración con la API de **Google Gemini** (`gemini-3.5-flash-lite`), instruida para procesar notas libres y generar estructuras de datos JSON estrictas sin formato Markdown.
- **Base de Datos y Caché de Acceso Rápido:** **Cloudflare KV** (`GUIAS_KV`) almacena y sirve al vuelo las guías completas pre-renderizadas bajo rutas `/g/:id`.
- **Respaldo Asíncrono en GitHub:** Tras generar cada guía, se ejecuta una llamada en segundo plano con `context.waitUntil` hacia la API REST de GitHub para persistir una copia en base64 en `/guias/[id].html`.
- **Frontend Editorial Autónomo:** Construido en **Vanilla JavaScript** (sin frameworks pesados tipo React o Vue). Integra **Leaflet** con teselas de CartoDB para cartografía interactiva georreferenciada, iconos de FontAwesome y paleta CSS con soporte nativo para temas claro y oscuro.
- **Arquitectura Offline / PWA:** Service Worker (`sw.js`) en la raíz con precaché dinámico de recursos y dependencias CDN externas, junto con persistencia de estados de usuario en `localStorage` (maleta, checklists gastronómicas y bloc de notas).

---

## 📂 Estructura del Repositorio

```text
chestrips/
├── index.html                  # Portada y formulario de entrada (destino y notas)
├── sw.js                       # Service Worker (Modo Avión y gestión de caché)
├── manifest.json               # Configuración de Progressive Web App
├── icon.svg                    # Iconografía vectorial PWA
├── logo-header.svg             # Logotipo de cabecera
├── guias/                      # Copias de respaldo en HTML autónomo de las guías
├── functions/
│   ├── api/
│   │   └── generar.js          # Endpoint serverless: orquestación de IA, KV y GitHub
│   └── g/
│       └── [id].js             # Endpoint de lectura rápida desde Cloudflare KV
└── README.md                   # Documentación técnica
