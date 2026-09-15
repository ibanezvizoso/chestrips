// functions/api/generar.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { notas, nombreDestino } = body;

    if (!notas || notas.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Introduce notas o itinerario más detallado." }), { status: 400 });
    }

    // 1. Limpieza básica de slug para el nombre del archivo
    const destinoSlug = (nombreDestino || "viaje")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 25);
    const filename = `${destinoSlug}-${Date.now().toString(36)}.html`;

    // 2. Prompt del sistema para Gemini
    const systemPrompt = `
Eres ChesTrips Engine: diseñador de producto frontend senior y arquitecto de software móvil.
Tu misión es compilar las notas o documentos de viaje del usuario en una Web/App interactiva móvil de nivel de producción, autocontenida en un ÚNICO archivo HTML ejecutable (HTML5, CSS3 y JavaScript vanilla en una IIFE).

REGLA DE SALIDA ESTRICTA:
- Devuelve EXCLUSIVAMENTE el código desde <!DOCTYPE html> hasta </html>.
- CERO texto introductorio, cero explicaciones y cero markdown exterior.
- El código debe estar 100% completo: PROHIBIDO usar "// resto del código aquí", placeholders o dejar funciones a medias.

1. FIDELIDAD ABSOLUTA AL ITINERARIO:
- Respeta íntegramente las fechas, paradas, hoteles, horarios, transportes y notas del viajero.
- Prohibido omitir días o inventar etapas no deseadas. Si faltan datos en algún tramo, maquétalo limpio con lo aportado.
- Sanitización de seguridad: si aparecen números de tarjeta bancaria, contraseñas, DNI, pasaportes o códigos PNR confidenciales, elimínalos o sustitúyelos por "[Dato protegido]".

2. SISTEMA DE DISEÑO (ESTILO NOTEBOOK / PWA MÓVIL):
- Tipografías CDN: Google Fonts 'Fraunces' (titulares y números de impacto), 'Plus Jakarta Sans' (cuerpo e interfaz) y 'JetBrains Mono' (códigos de vuelo, horarios, cifras).
- Iconografía: FontAwesome 6 (CDN: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css).
- Paleta temática dinámica inspirada en el destino:
  * Japón: tonos Torii (#bd3126), Matcha (#2f5a38), Washi (#faf7f2).
  * Sudeste Asiático / Tropical: esmeraldas, dorados templos, ocres especiados.
  * Países nórdicos / Invierno: azul hielo, pizarra profunda, blanco nieve.
  * Mediterráneo: terracota, añil marino, olivo.
- Soporte dual Light / Dark automático mediante 'prefers-color-scheme: dark'.
- Dock de navegación inferior flotante fijo (position: fixed; bottom: 0; backdrop-filter: blur(16px)) con iconos y etiquetas compactas.
- Acordeones interactivos por día con badge de fecha ('08 NOV'), metadatos de transporte y cuerpo colapsable/desplegable.
- Buscador global superior en tiempo real para filtrar templos, barrios o restaurantes.

3. HERRAMIENTAS ADAPTADAS AL DESTINO (ELIGE E IMPLEMENTA AL MENOS 4):
- Conversor de moneda interactivo bidireccional con 'chips' de importes frecuentes (ej: JPY/EUR, USD/EUR, THB/EUR).
- Tarjetas de comunicación gigante (Flashcards táctiles con modal a pantalla completa): textos en idioma local + transcripción fonética para mostrar a taxistas, alérgenos o camareros.
- Pasaporte Gourmet / Checklist de comidas típicas: lista marcable con persistencia en localStorage.
- Quiz cultural interactivo (3 a 5 preguntas sobre curiosidades del país con feedback inmediato y contador de aciertos).
- Guía de protocolo local y etiqueta (normas en templos, propinas, transportes, regateo o tabúes).
- Checklist de equipaje y trámites con barra de progreso interactiva y guardado en localStorage.
- Bloque SOS y emergencias consulares: teléfonos locales (policía, ambulancia), embajada y bloc de notas con guardado local.

4. ARQUITECTURA TÉCNICA Y ENCAPSULACIÓN:
- Encapsula todo el script JS en una IIFE autoejecutable: (() => { /* lógica */ })();
- No declares variables ni funciones en 'window'. Usa un objeto de estado o listeners directos.
- Realiza consultas sobre el contenedor mediante appRoot.querySelector o selectores de clase precisos (.trip-card, .trip-btn).
- No utilices APIs privadas ni claves de pago. Si incluyes mapas de ruta, usa Leaflet con OpenStreetMap o una barra cronológica (Thread de paradas).
`;

    // 3. Llamada a Gemini Flash API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nNOTAS DEL VIAJERO:\n${notas}` }] }
        ]
      })
    });

    if (!geminiResponse.ok) {
      const errorDetalle = await geminiResponse.text();
      return new Response(JSON.stringify({ 
        error: `Error Google (${geminiResponse.status}): ${errorDetalle}` 
      }), { 
        status: 502, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const geminiData = await geminiResponse.json();
    let rawHtml = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Limpiar posibles bloques markdown ```html ... ```
    rawHtml = rawHtml.replace(/^```html/i, "").replace(/```$/i, "").trim();

    // 4. Subir a GitHub vía API REST
    // Codificación UTF-8 segura en base64
    const base64Content = btoa(unescape(encodeURIComponent(rawHtml)));
    const githubUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/guias/${filename}`;

    const ghResponse = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "ChesTrips-App",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Añadir guía: ${filename}`,
        content: base64Content
      })
    });

    if (!ghResponse.ok) {
      return new Response(JSON.stringify({ error: "Error al registrar la guía." }), { status: 502 });
    }

    // 5. Retornar la URL directa
    return new Response(JSON.stringify({
      success: true,
      url: `/guias/${filename}`
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
