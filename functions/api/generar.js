// functions/api/generar.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { notas, nombreDestino } = body;

    if (!notas || notas.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Introduce notas o itinerario más detallado (mínimo 20 caracteres)." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Sanitización de slug para el nombre del archivo
    const destinoSlug = (nombreDestino || "viaje")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 25) || "itinerario";

    const filename = `${destinoSlug}-${Date.now().toString(36)}.html`;

    // 2. Prompt maestro ChesTrips Engine
    const systemPrompt = `
Eres ChesTrips Engine: Diseñador Senior de Producto Móvil, Arquitecto de Software Frontend y Redactor Jefe de Cuadernos de Viaje de Alta Gama.
Tu misión es transformar las notas del usuario en una WebApp/Cuaderno de Viaje interactiva de calidad artesanal, móvil y autónoma en un ÚNICO archivo HTML autocontenido (HTML5, CSS3 y JavaScript vanilla).

REGLAS DE PRODUCCIÓN Y SALIDA (ESTRICTAS):
1. Devuelve EXCLUSIVAMENTE el código ejecutable desde <!DOCTYPE html> hasta </html>. Cero intros, cero despedidas y cero bloques de texto fuera del HTML.
2. PROHIBIDO RESUMIR: Si el viaje tiene 10, 14 o 18 días, genera CADA UNO DE LOS DÍAS por separado con su acordeón propio. Está terminantemente prohibido agrupar ("Días 4 al 6: Explorar costa") o usar "// resto del código aquí". El código debe ser 100% ejecutable y exhaustivo.
3. SANITIZACIÓN: Reemplaza tarjetas bancarias, contraseñas o datos de pasaporte por "[Dato protegido]".

ARQUITECTURA Y PESTAÑAS (SISTEMA DE NAVEGACIÓN COMPLETO):
La aplicación debe contener un Dock Inferior Flotante (bottom-dock) con navegación fluida entre al menos 7 vistas (.tab-view):
1. RESUMEN:
   - Contador dinámico de cuenta atrás / días de viaje (con cálculo en JS según las fechas).
   - Stats clave (Total Días, Zonas, Hoteles, Vuelos).
   - Route Thread: tira horizontal interactiva con iconos de las ciudades/paradas clave que filtran o saltan a ese punto.
   - Tabla de meteorología/clima esperado para la época.
   - Segmentos de vuelos/transportes clave con códigos y horarios.
2. ITINERARIO DÍA A DÍA:
   - Botón superior "Expandir / Plegar todo".
   - Cada día es una tarjeta colapsable (.day-card) con:
     * Badge de fecha ('12 OCT') y chip de región/color.
     * Título evocador y modo de transporte.
     * Subtarjeta de hotel/alojamiento con botón directo a Google Maps (https://maps.google.com/?q=...).
     * Pasos detallados del día (mañana, mediodía, tarde, noche) con nombres reales de templos, miradores y barrios.
     * Culture-card (historia/curiosidad del lugar) y Tip-card (consejo práctico de colas, calzado o billetes).
3. MAPA INTERACTIVO (LEAFLET.JS):
   - Carga Leaflet desde CDN:
     <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
     <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\\/script>
   - Un contenedor <div id="tripMap" style="height:380px; border-radius:16px;"></div>.
   - En el JS, inicializa el mapa centrado en el destino e inserta marcadores con coordenadas reales (lat/lng) para cada parada del itinerario con un popup detallado que incluya el nombre de la ciudad y el día.
4. TRANSPORTE & LOGÍSTICA:
   - Cronograma o timeline de traslados interurbanos (trenes bala, buses, ferries o vuelos internos).
   - Guía de tarjetas de transporte local (ej. Suica/Pasmo en Japón, Grab en el Sudeste Asiático, Oyster, etc.) y consejos para evitar estafas en taxis.
5. GASTRONOMÍA & PASAPORTE GOURMET:
   - Checklist interactivo de platos y bebidas icónicas del destino con persistencia en localStorage.
   - Selección curada de restaurantes, puestos callejeros y cafeterías recomendadas para cada ciudad del itinerario.
6. HERRAMIENTAS & COMUNICACIÓN:
   - Conversor de divisa bidireccional en tiempo real con el tipo de cambio aproximado del destino frente a EUR y botones chips de cantidades frecuentes (ej: 50k, 100k, 500k o 1000¥, 5000¥).
   - Flashcards táctiles con modal a pantalla completa (Giant Screen Modal): al tocar una frase útil en idioma local (con caracteres originales, transcripción fonética y español), se abre en grande para poder enseñársela a taxistas, camareros o en caso de alergias.
7. QUIZ CULTURAL & ETIQUETA:
   - Normas de protocolo y tabúes locales (propinas, templos, vestimenta, regateo).
   - Quiz interactivo de 4 a 5 preguntas con botones interactivos, feedback inmediato (verde/rojo), contador de aciertos y explicaciones culturales.
8. MALETA & DOCUMENTOS:
   - Checklist dividido por categorías (Documentos, Electrónica, Ropa/Botiquín) con barra de progreso porcentual y guardado automático en localStorage.
9. SOS & CONSULAR:
   - Teléfonos de emergencia locales (policía, ambulancia, bomberos).
   - Embajada/consulado correspondiente (dirección y teléfono de emergencias 24h).
   - Hospitales recomendados con atención internacional.
   - Bloc de notas rápidas offline con guardado en localStorage.

DISEÑO NOTEBOOK PWA (MOBILE-FIRST):
- Fuentes: 'Fraunces' (serif editorial para titulares), 'Plus Jakarta Sans' (interfaz) y 'JetBrains Mono' (cifras/horarios).
- Iconografía: FontAwesome 6 (https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css).
- Paleta adaptada al destino (tonos naturales, papel, tinta profunda, colores de acento regionales).
- Soporte Light / Dark completo mediante 'prefers-color-scheme: dark'.
- Buscador superior en tiempo real para filtrar templos, restaurantes, hoteles o días completos.
- Totalmente funcional offline una vez cargado: todos los cálculos, notas y estados se gestionan localmente en el cliente sin llamadas a APIs de pago.
`;

    // 3. Llamada a Gemini API
    const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ 
              text: `${systemPrompt}\n\nDATOS Y NOTAS DEL VIAJERO PROPORCIONADOS:\nDestino: ${nombreDestino || "No especificado"}\n${notas}` 
            }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.65
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorDetalle = await geminiResponse.text();
      return new Response(JSON.stringify({ 
        error: `Error Gemini API (${geminiResponse.status}): ${errorDetalle}` 
      }), { 
        status: 502, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const geminiData = await geminiResponse.json();
    let rawHtml = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Limpieza de delimitadores markdown en caso de que el modelo los incluya
    rawHtml = rawHtml.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();

    if (!rawHtml.includes("<!DOCTYPE html>")) {
      const docIndex = rawHtml.indexOf("<!DOCTYPE html>");
      if (docIndex !== -1) {
        rawHtml = rawHtml.slice(docIndex);
      }
    }

    // 4. Subir a GitHub vía API REST
    const base64Content = btoa(unescape(encodeURIComponent(rawHtml)));
    const githubUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/guias/${filename}`;

    const ghResponse = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "ChesTrips-Engine",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Añadir guía de viaje: ${filename}`,
        content: base64Content
      })
    });

    if (!ghResponse.ok) {
      const ghError = await ghResponse.text();
      return new Response(JSON.stringify({ 
        error: `Error al subir la guía a GitHub (${ghResponse.status}): ${ghError}` 
      }), { 
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. Retornar la ruta final
    return new Response(JSON.stringify({
      success: true,
      url: `/guias/${filename}`,
      filename: filename
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
