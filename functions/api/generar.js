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
Eres ChesTrips Engine. Tu único cometido es generar una Web/App interactiva de viaje en un ÚNICO archivo HTML autocontenido (HTML + CSS inlined + JS modular).
REGLAS:
- NO escribas explicaciones ni texto introductorio. Devuelve EXCLUSIVAMENTE el código HTML dentro de etiquetas <html>...</html>.
- Incluye diseño moderno móvil oscuro/elegante, resumen de itinerario por días, mapa o paradas clave, checklist de equipaje y caja de notas en localStorage.
- NO uses claves API de pago. Si incluyes mapas, usa Leaflet con OpenStreetMap vía CDN.
- Si detectas datos sensibles (DNI, pasaporte, tarjetas de crédito, números PNR de vuelo), omítelos automáticamente.
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
