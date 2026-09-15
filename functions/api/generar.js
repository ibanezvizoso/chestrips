// functions/api/generar.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // 1. Validar variables mínimas en Cloudflare
    if (!env.GEMINI_API_KEY || !env.GUIAS_KV) {
      return new Response(JSON.stringify({ 
        error: "Falta configurar GEMINI_API_KEY o vincular el namespace GUIAS_KV en Cloudflare Pages." 
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const body = await request.json();
    const { notas, nombreDestino } = body;

    if (!notas || notas.trim().length < 15) {
      return new Response(JSON.stringify({ 
        error: "Por favor, introduce un itinerario o notas más detalladas (mínimo 15 caracteres)." 
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const destinoSlug = (nombreDestino || "viaje")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 25) || "viaje";

    const id = `${destinoSlug}-${Date.now().toString(36)}`;

    // 2. Prompt de extracción enciclopédica y estructurada
    const systemPrompt = `
Eres ChesTrips Knowledge & Travel Engine, un redactor de guías de viaje de élite, historiador de campo y asistente local hiperdetallista.
Tu cometido es transformar las notas del usuario en una enciclopedia interactiva y práctica de viaje con acabado editorial premium.
Debes devolver EXCLUSIVAMENTE un objeto JSON estrictamente válido, sin markdown (\`\`\`json) ni texto exterior.

ESTRUCTURA DEL JSON:
{
  "tripTitle": "Título evocador del viaje",
  "dates": "Rango de fechas legible (ej: 08 Nov – 24 Nov · 17 días)",
  "startDateISO": "YYYY-MM-DD del día 1",
  "badgeText": "Ej: Japón · 17 Días · Ruta Momiji & Alpes",
  "stats": { "days": 17, "cities": 8, "hotels": 4, "flights": 4 },
  "flights": [
    {
      "locator": "MKZQD",
      "code": "IB0462",
      "route": "LCG → MAD",
      "time": "Vie 08 Nov · 21:40 - 23:00"
    }
  ],
  "quickFacts": [
    { "icon": "fa-train", "title": "Transporte Clave", "desc": "Regla de oro sobre pases, tarjetas IC o trenes de alta velocidad." },
    { "icon": "fa-credit-card", "title": "Pagos & Dinero", "desc": "Cajero sin comisiones, aceptación de tarjeta o necesidad de efectivo." },
    { "icon": "fa-plug", "title": "Enchufes & Red", "desc": "Tipo de clavija, voltaje y necesidad de eSIM o Pocket WiFi." },
    { "icon": "fa-trash-can", "title": "Costumbre Urbana", "desc": "Dato práctico sobre papeleras, ruido en transporte o calzado." }
  ],
  "currency": {
    "code": "JPY",
    "symbol": "¥",
    "rateToEUR": 164.5,
    "quickChips": [500, 1000, 3000, 5000, 10000]
  },
  "routeThread": [
    { "name": "Osaka", "icon": "fa-building", "query": "osaka" },
    { "name": "Kioto", "icon": "fa-torii-gate", "query": "kioto" }
  ],
  "weatherTable": [
    { "region": "Kansai (Osaka/Kioto)", "temp": "9–18°C", "desc": "Clima templado, arces en apogeo otoñal." }
  ],
  "mapCenter": [35.0, 136.0],
  "mapZoom": 6,
  "days": [
    {
      "day": 1,
      "dateBadge": "08 NOV",
      "title": "Salida: Enlace y Vuelo Nocturno",
      "isSuggestion": false,
      "meta": "A Coruña · Tránsito · Vuelo",
      "lat": 43.302,
      "lng": -8.377,
      "hotel": "Nombre Hotel o Alojamiento",
      "hotelAddress": "Dirección completa",
      "hotelMapsUrl": "https://maps.google.com/?q=Hotel+Ejemplo",
      "historyContext": "Contexto histórico real, origen de un templo, leyenda urbana o crónica del shogunato/dinastía local.",
      "steps": [
        "21:40h: Salida en el vuelo...",
        "Detalle secuencial paso a paso con datos concretos..."
      ],
      "cultureTip": "Norma social, leyenda o curiosidad vinculada a este punto.",
      "practicalTip": "Horario óptimo para evitar colas, dónde comprar billetes o advertencia."
    }
  ],
  "curiosities": [
    {
      "title": "Propinas: ¡Nunca las dejes!",
      "icon": "fa-ban",
      "desc": "Explicación histórica/social de por qué no se da propina o se considera una ofensa."
    },
    {
      "title": "Costumbres en Baños / Templos",
      "icon": "fa-hot-tub-person",
      "desc": "Protocolo específico, uso de calzado, tatuajes o purificación en fuentes temizuya."
    }
  ],
  "etiquette": [
    {
      "title": "Reglas en Transporte Público",
      "icon": "fa-volume-xmark",
      "desc": "Modo silencio, escaleras mecánicas (diferencias por ciudad) o comida en vagones."
    }
  ],
  "transports": [
    {
      "date": "10 NOV · 11:30",
      "title": "Narita Express (N'EX)",
      "desc": "Narita Airport → Tokio. Asientos reservados y canje de billetes."
    }
  ],
  "gourmet": [
    {
      "dish": "Takoyaki",
      "desc": "Bolas de masa rellenas de pulpo servidas con salsa dulce, mayonesa y katsuobushi.",
      "city": "Osaka (Dotonbori)",
      "recommendedSpot": "Acchichi Honpo"
    }
  ],
  "flashcards": [
    { "category": "Restaurante", "local": "お会計をお願いします", "phonetic": "O-kaikei o-negai shimasu", "spanish": "La cuenta, por favor" },
    { "category": "Carta", "local": "英語のメニューはありますか？", "phonetic": "Eigo no menyuu wa arimasu ka?", "spanish": "¿Tienen menú en inglés?" },
    { "category": "Compras", "local": "袋は結構です", "phonetic": "Fukuro wa kekkou desu", "spanish": "Sin bolsa de plástico, gracias" },
    { "category": "Urgencias", "local": "お手洗いはどこですか？", "phonetic": "O-tearai wa doko desu ka?", "spanish": "¿Dónde está el baño?" },
    { "category": "Taxi", "local": "駅までお願いします", "phonetic": "Eki made o-negai shimasu", "spanish": "A la estación, por favor" },
    { "category": "Alergias", "local": "豚肉は入っていますか？", "phonetic": "Butaniku wa haitte imasu ka?", "spanish": "¿Lleva carne de cerdo?" }
  ],
  "quiz": [
    {
      "question": "¿Por qué se consideran sagrados los ciervos Sika del Parque de Nara?",
      "options": [
        "Eran mensajeros divinos según la mitología sintoísta",
        "Regalo personal del emperador Meiji",
        "Guardianes del jardín botánico"
      ],
      "correct": 0,
      "explanation": "El dios Takemikazuchi llegó montado en un ciervo blanco para proteger la ciudad sagrada."
    }
  ],
  "packing": [
    { "cat": "Documentación & Pagos", "item": "Pasaporte en regla (> 6 meses) y códigos QR aduaneros" },
    { "cat": "Electrónica & Logística", "item": "Adaptador de enchufe local y powerbank de 10.000 mAh" },
    { "cat": "Ropa & Calzado", "item": "Calzado fácil de descalzar y calcetines impecables para templos" }
  ],
  "emergency": {
    "police": "110",
    "ambulance": "119",
    "embassy": "Embajada de España en Tokio: (+81) 3 3583 8531 · Emergencia 24h: (+81) 80 4368 2883",
    "hospital": "St. Luke's International Hospital (Tokio) - Urgencias en inglés"
  }
}

DIRECTIVAS CRÍTICAS DE CALIDAD Y FIDELIDAD:
1. FIDELIDAD MILIMÉTRICA vs SUGERENCIAS:
   - Si las notas del usuario incluyen vuelos, códigos de reserva, fechas exactas, hoteles concretos o planes fijados, respétalos con precisión absoluta en orden cronológico. NO cambies horarios ni omitas traslados dados por el usuario. En esos días, pon "isSuggestion": false.
   - Si las notas tienen huecos, días libres sin detallar o no especifican planes para alguna jornada, complétalas con planes locales de máxima categoría. En esos casos, pon "isSuggestion": true y antepón "[Sugerencia]" al título del día para que el usuario distinga de inmediato lo confirmado de lo propuesto.
2. HISTORIA CON ALMA: En cada día ("historyContext"), no pongas generalidades de folleto turístico. Narra episodios históricos reales, anécdotas feudales, guerras de clanes, leyendas mitológicas o significado espiritual del lugar visitado.
3. VUELOS: Si las notas contienen vuelos y localizadores, llena el array "flights". Si no hay vuelos en las notas, devuelve un array vacío [].
4. CURIOSIDADES & ETIQUETA: Genera un mínimo de 5 "curiosities" profundas (propinas, tabúes, normas de mesa, onsen/templos) y 4 de "etiquette".
5. GOURMET & FLASHCARDS: Mínimo 10 especialidades gastronómicas detalladas y entre 10 y 14 tarjetas de idioma (abarcando Restaurante, Compras, Transporte, Cortesía y Alergias/Emergencias con caracteres originales y fonética limpia).
6. QUIZ: Genera 4 o 5 preguntas con datos históricos y explicaciones enriquecedoras.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nDESTINO: ${nombreDestino || "Destino"}\nNOTAS DEL VIAJERO:\n${notas}` }] }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      return new Response(JSON.stringify({ error: `Error de Gemini (${geminiResponse.status}): ${err}` }), { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Limpieza de seguridad por si el modelo añade cercas markdown
    const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    // Validar JSON
    JSON.parse(cleanJson);

    // 4. Inyección segura en la Plantilla Maestra (función flecha para neutralizar patrones de reemplazo '$')
    const finalHtml = masterTemplateHtml.replace(
      "/* {{TRIP_DATA_INJECTION}} */",
      () => `window.__TRIP_DATA__ = ${cleanJson};`
    );

    // 5. Guardado inmediato en Cloudflare KV
    await env.GUIAS_KV.put(id, finalHtml, {
      metadata: { createdAt: Date.now(), destino: nombreDestino || "viaje" }
    });

    // 6. Respaldo asíncrono en GitHub en segundo plano
    if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
      context.waitUntil((async () => {
        try {
          const utf8Bytes = new TextEncoder().encode(finalHtml);
          let binary = "";
          for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
          const base64Content = btoa(binary);

          await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/guias/${id}.html`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
              "User-Agent": "ChesTrips-Engine",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: `Backup automático: ${id} [skip ci]`,
              content: base64Content
            })
          });
        } catch (_) {}
      })());
    }

    // 7. Respuesta con URL dinámica inmediata
    return new Response(JSON.stringify({
      success: true,
      url: `/g/${id}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// ----------------------------------------------------------------------------
// PLANTILLA MAESTRA INTEGRAL (Offline, Reactiva, con Leaflet y Dock Completo)
// ----------------------------------------------------------------------------
const masterTemplateHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>ChesTrips Engine | Cuaderno de Ruta</title>
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#121413">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700;800&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <style>
    :root {
      --paper: #faf7f2;
      --paper-card: #ffffff;
      --paper-muted: #f3ede2;
      --paper-subtle: #ece4d5;
      --ink: #1a1c1a;
      --muted: #626863;
      --border: #e6dec9;
      --border-subtle: #ede5d7;

      --primary: #bd3126;
      --primary-subtle: #fbeae8;
      --secondary: #2f5a38;
      --secondary-subtle: #e5efe7;
      --accent: #ad7919;
      --accent-subtle: #f8f1de;

      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --shadow-sm: 0 2px 5px rgba(30, 27, 24, 0.04);
      --shadow-md: 0 8px 20px -4px rgba(30, 27, 24, 0.08);

      --font-display: 'Fraunces', Georgia, serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --paper: #121413;
        --paper-card: #1c201e;
        --paper-muted: #242826;
        --paper-subtle: #2d3330;
        --ink: #f3f4f3;
        --muted: #a1a8a3;
        --border: #2d332f;
        --border-subtle: #252b27;

        --primary: #e05246;
        --primary-subtle: rgba(224, 82, 70, 0.16);
        --secondary: #6cb07e;
        --secondary-subtle: rgba(108, 176, 126, 0.15);
        --accent: #e5b27d;
        --accent-subtle: rgba(229, 178, 125, 0.15);

        --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.35);
        --shadow-md: 0 10px 24px -6px rgba(0, 0, 0, 0.55);
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-sans);
      background-color: var(--paper);
      color: var(--ink);
      line-height: 1.6;
      padding-bottom: 115px;
    }
    h1, h2, h3, h4 { font-family: var(--font-display); letter-spacing: -0.015em; }

    /* Encabezado sin sticky: desaparece naturalmente al hacer scroll */
    header {
      background: color-mix(in srgb, var(--paper) 92%, transparent);
      border-bottom: 1px solid var(--border);
    }
    .header-inner {
      max-width: 860px;
      margin: 0 auto;
      padding: 14px 16px;
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    .brand-title { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      font-weight: 800; 
      font-size: 1.35rem; 
      margin-left: 10px;
    }
    .brand-title img { 
      height: 44px; 
      width: auto; 
      display: block; 
    }
    .brand-dates { 
      font-size: 0.78rem; 
      color: var(--muted); 
      font-weight: 600; 
      margin-left: 10px;
      margin-top: 3px;
    }

    .top-controls { max-width: 860px; margin: 12px auto 0; padding: 0 16px; }
    .search-box { position: relative; display: flex; align-items: center; }
    .search-box i { position: absolute; left: 14px; color: var(--muted); font-size: 0.88rem; }
    .search-box input {
      width: 100%;
      padding: 11px 14px 11px 40px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--paper-card);
      color: var(--ink);
      font-size: 0.9rem;
      outline: none;
      box-shadow: var(--shadow-sm);
    }

    main { max-width: 860px; margin: 16px auto; padding: 0 16px; }
    .tab-view { display: none; }
    .tab-view.active { display: block; animation: tabFade 0.2s ease-out forwards; }
    @keyframes tabFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-card {
      background: var(--paper-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 12px 6px;
      text-align: center;
      box-shadow: var(--shadow-sm);
    }
    .stat-num { font-family: var(--font-display); font-weight: 700; font-size: 1.45rem; color: var(--primary); line-height: 1; }
    .stat-lbl { font-size: 0.68rem; color: var(--muted); font-weight: 800; margin-top: 5px; }

    .route-thread {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 2px 2px 12px;
      margin-bottom: 14px;
      scrollbar-width: none;
    }
    .route-thread::-webkit-scrollbar { display: none; }
    .thread-stop {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--paper-card);
      min-width: 82px;
      box-shadow: var(--shadow-sm);
    }
    .thread-stop:active { background: var(--secondary-subtle); border-color: var(--secondary); }
    .thread-stop i { font-size: 1.1rem; color: var(--secondary); }
    .thread-stop span { font-size: 0.72rem; font-weight: 700; white-space: nowrap; }

    /* ACORDEÓN DÍAS */
    .day-card {
      background: var(--paper-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      margin-bottom: 12px;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .day-card.open { border-color: var(--secondary); }
    .day-header { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
    .day-badge {
      font-family: var(--font-mono);
      background: var(--secondary-subtle);
      color: var(--secondary);
      font-weight: 700;
      font-size: 0.78rem;
      padding: 5px 8px;
      border-radius: var(--radius-sm);
      min-width: 72px;
      text-align: center;
    }
    .day-title-wrap { margin-left: 12px; }
    .day-title { font-weight: 700; font-size: 0.95rem; line-height: 1.35; }
    .day-meta { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }
    .day-chevron { color: var(--muted); transition: transform 0.25s ease; font-size: 0.85rem; }
    .day-card.open .day-chevron { transform: rotate(180deg); color: var(--secondary); }
    .day-body { display: none; padding: 14px 16px 16px; border-top: 1px solid var(--border-subtle); font-size: 0.9rem; }
    .day-card.open .day-body { display: block; }

    .history-box {
      background: var(--secondary-subtle);
      border-left: 4px solid var(--secondary);
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 0.84rem;
      margin-bottom: 12px;
      line-height: 1.45;
    }
    .hotel-subcard {
      background: var(--paper-muted);
      border: 1px dashed var(--secondary);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      margin-bottom: 12px;
    }
    ul.clean-steps { list-style: none; margin: 10px 0; }
    ul.clean-steps li { position: relative; padding-left: 18px; margin-bottom: 8px; font-size: 0.88rem; line-height: 1.5; }
    ul.clean-steps li::before { content: "•"; position: absolute; left: 3px; color: var(--secondary); font-weight: 800; font-size: 1.1rem; }

    .tip-card {
      background: var(--accent-subtle);
      border-left: 4px solid var(--accent);
      border-radius: 4px;
      padding: 10px 12px;
      margin-top: 10px;
      font-size: 0.84rem;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--paper-card);
      border: 1px solid var(--border);
      color: var(--ink);
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      margin-top: 6px;
      cursor: pointer;
    }

    /* MAPA LEAFLET */
    #mapContainer {
      height: 480px;
      width: 100%;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      margin-bottom: 16px;
    }

    /* PROGRESO & CHECKLISTS */
    .progress-wrap { background: var(--paper-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 16px; }
    .progress-track { height: 9px; background: var(--paper-muted); border-radius: 999px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--secondary), var(--primary)); width: 0%; transition: width 0.35s ease; }
    .check-box-group { background: var(--paper-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 15px 18px; margin-bottom: 14px; box-shadow: var(--shadow-sm); }
    .check-box-group h3 { font-size: 0.98rem; font-weight: 700; margin-bottom: 12px; color: var(--secondary); display: flex; align-items: center; gap: 8px; }
    .check-line { display: flex; align-items: flex-start; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--border-subtle); cursor: pointer; }
    .check-line:last-child { border-bottom: none; }
    .check-line input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--secondary); cursor: pointer; margin-top: 2px; }
    .check-line.checked-done label { text-decoration: line-through; color: var(--muted); }

    /* CONVERSOR & FRASES */
    .fx-widget { background: var(--paper-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-sm); }
    .fx-row { display: flex; align-items: center; gap: 10px; }
    .fx-col { flex: 1; }
    .fx-col input { width: 100%; padding: 10px; font-family: var(--font-mono); font-size: 1rem; background: var(--paper-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--ink); outline: none; }
    .fx-quick-chips { display: flex; gap: 6px; overflow-x: auto; margin-top: 10px; scrollbar-width: none; }
    .fx-chip { background: var(--paper-muted); border: 1px solid var(--border); font-size: 0.75rem; font-weight: 700; padding: 5px 10px; border-radius: 999px; cursor: pointer; white-space: nowrap; }

    .flashcard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .flashcard { background: var(--paper-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 13px; cursor: pointer; box-shadow: var(--shadow-sm); }
    .giant-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; justify-content: center; align-items: center; padding: 20px; }
    .giant-modal.active { display: flex; }
    .giant-card { background: #ffffff; color: #111; padding: 30px 22px; border-radius: 22px; text-align: center; width: 380px; max-width: 95%; }
    .giant-local { font-size: 2.1rem; font-weight: 800; color: var(--primary); margin: 10px 0; font-family: var(--font-display); }
    .giant-phonetic { font-family: var(--font-mono); font-size: 1rem; color: #555; }

    /* Tarjeta de vuelos */
    .flight-card { background: var(--paper-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow-sm); }
    .flight-segment { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border); }
    .flight-segment:last-child { border-bottom: none; padding-bottom: 0; }
    .flight-code { font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; color: var(--primary); }
    .flight-route { font-size: 0.88rem; font-weight: 700; margin-left: 6px; }
    .flight-time { font-size: 0.78rem; color: var(--muted); font-weight: 500; }

    /* Fact Grid 2x2 */
    .fact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .fact-card { background: var(--paper-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 13px 14px; box-shadow: var(--shadow-sm); }
    .fact-card i { color: var(--secondary); margin-bottom: 6px; display: block; font-size: 1.1rem; }
    .fact-card h5 { font-size: 0.86rem; font-weight: 800; margin-bottom: 3px; }
    .fact-card p { font-size: 0.78rem; color: var(--muted); line-height: 1.4; }

    /* Chip de sugerencia */
    .suggestion-chip { background: var(--accent-subtle); color: var(--accent); font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; margin-right: 6px; }

    /* Curiosidades culturales */
    .curiosity-card { background: var(--paper-card); border: 1px solid var(--border); border-left: 5px solid var(--primary); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 12px; box-shadow: var(--shadow-sm); }
    .curiosity-card h5 { font-size: 0.92rem; font-weight: 800; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
    .curiosity-card p { font-size: 0.85rem; color: var(--muted); line-height: 1.5; }

    /* QUIZ */
    .quiz-card { background: var(--paper-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; box-shadow: var(--shadow-sm); }
    .quiz-q { font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; }
    .quiz-opts { display: flex; flex-direction: column; gap: 8px; }
    .quiz-btn { background: var(--paper-muted); border: 1px solid var(--border); color: var(--ink); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.86rem; text-align: left; cursor: pointer; font-family: inherit; }
    .quiz-btn.correct { background: var(--secondary-subtle); border-color: var(--secondary); color: var(--secondary); font-weight: 700; }
    .quiz-btn.wrong { background: var(--primary-subtle); border-color: var(--primary); color: var(--primary); font-weight: 700; }
    .quiz-exp { display: none; margin-top: 8px; font-size: 0.82rem; color: var(--muted); padding: 8px; background: var(--paper); border-radius: var(--radius-sm); }

    /* BOTTOM DOCK */
    .bottom-dock {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: color-mix(in srgb, var(--paper) 95%, transparent);
      backdrop-filter: blur(16px);
      border-top: 1px solid var(--border);
      display: flex;
      overflow-x: auto;
      padding: 6px 4px max(6px, env(safe-area-inset-bottom));
      z-index: 50;
      scrollbar-width: none;
    }
    .bottom-dock::-webkit-scrollbar { display: none; }
    .dock-tab-btn {
      background: none; border: none; color: var(--muted);
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      font-size: 0.65rem; font-weight: 700; cursor: pointer; padding: 6px 12px; flex: 0 0 auto; font-family: inherit;
    }
    .dock-tab-btn.active { color: var(--secondary); }
  </style>
</head>
<body>

  <!-- MODAL GIGANTE DE PANTALLA -->
  <div class="giant-modal" id="giantModal" onclick="app.closeModal()">
    <div class="giant-card" onclick="event.stopPropagation()">
      <div style="font-size:0.75rem; font-weight:800; color:#888; text-transform:uppercase;" id="gModalCat">TRADUCCIÓN</div>
      <div class="giant-local" id="gModalLocal">--</div>
      <div class="giant-phonetic" id="gModalPhonetic">--</div>
      <div style="font-size:1.05rem; font-weight:700; margin-top:10px;" id="gModalSpanish">--</div>
      <button class="action-btn" style="margin-top:16px;" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i> Cerrar</button>
    </div>
  </div>

  <!-- CABECERA (Desaparece en el scroll, sin contador) -->
  <header>
    <div class="header-inner">
      <div>
        <div class="brand-title" id="hTitle">
          <img src="/logo-header.svg" alt="ChesTrips">
          <span>ChesTrips</span>
        </div>
        <div class="brand-dates" id="hDates">--</div>
      </div>
    </div>
  </header>

  <!-- BUSCADOR -->
  <div class="top-controls">
    <div class="search-box">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="search" id="globalSearch" placeholder="Buscar paradas, platos, templos, hoteles..." oninput="app.search(this.value)">
    </div>
  </div>

  <main>
    <!-- TAB 1: RESUMEN -->
    <section id="tab-resumen" class="tab-view active">
      <div class="stat-grid" id="statGrid"></div>
      <div class="route-thread" id="routeThread"></div>
      
      <div class="check-box-group" id="weatherContainer" style="margin-bottom:14px;">
        <h3><i class="fa-solid fa-cloud-sun"></i> Clima & Estacionalidad</h3>
        <div id="weatherList" style="font-size:0.86rem; color:var(--muted);"></div>
      </div>
      <div id="flightsContainer"></div>
      <div class="fact-grid" id="quickFactsGrid"></div>
      <div class="check-box-group">
        <h3><i class="fa-solid fa-ticket"></i> Transportes & Logística Clave</h3>
        <div id="transportsList"></div>
      </div>
    </section>

    <!-- TAB 2: ITINERARIO -->
    <section id="tab-itinerario" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:0.8rem; font-weight:800; color:var(--muted); text-transform:uppercase;">Ruta Día a Día</span>
        <button class="action-btn" onclick="app.toggleAllDays()">Expandir / Plegar todo</button>
      </div>
      <div id="itineraryContainer"></div>
    </section>

    <!-- TAB 3: MAPA INTERACTIVO -->
    <section id="tab-mapa" class="tab-view">
      <div style="margin-bottom:12px;">
        <h2 style="font-size:1.35rem; font-weight:700;">Ruta Georreferenciada</h2>
        <p style="font-size:0.85rem; color:var(--muted);">Trazado de paradas con polilínea de conexión en vivo.</p>
      </div>
      <div id="mapContainer"></div>
    </section>

    <!-- TAB 4: GOURMET -->
    <section id="tab-gourmet" class="tab-view">
      <div class="progress-wrap">
        <div style="display:flex; justify-content:space-between; font-size:0.84rem; font-weight:700;">
          <span>Pasaporte Culinario</span>
          <span id="gourmetLabel">0 / 0 (0%)</span>
        </div>
        <div class="progress-track"><div class="progress-fill" id="gourmetBar"></div></div>
      </div>
      <div class="check-box-group">
        <h3><i class="fa-solid fa-utensils"></i> Especialidades que no te puedes perder</h3>
        <div id="gourmetList"></div>
      </div>
    </section>

    <!-- TAB 5: ETIQUETA & CULTURA -->
    <section id="tab-etiqueta" class="tab-view">
      <div style="margin-bottom:14px;">
        <h2 style="font-size:1.35rem; font-weight:700;">Curiosidades & Costumbres</h2>
        <p style="font-size:0.85rem; color:var(--muted);">Secretos históricos, leyendas y normas de protocolo.</p>
      </div>
      <div id="curiositiesList"></div>
      <div style="margin-top:20px; margin-bottom:12px;">
        <h3 style="font-size:1.1rem; font-weight:700;">Protocolo & Etiqueta Diaria</h3>
      </div>
      <div id="etiquetteList"></div>
    </section>

    <!-- TAB 6: HERRAMIENTAS & IDIOMA -->
    <section id="tab-herramientas" class="tab-view">
      <div class="fx-widget">
        <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:8px;"><i class="fa-solid fa-money-bill-transfer"></i> Conversor de Divisa</h4>
        <div class="fx-row">
          <div class="fx-col"><label style="font-size:0.75rem; font-weight:800; color:var(--muted);" id="fxLabelLocal">LOCAL</label><input type="number" id="fxLocal" oninput="app.calcFxLocal()"></div>
          <i class="fa-solid fa-arrow-right-arrow-left" style="color:var(--muted); font-size:0.8rem; margin-top:14px;"></i>
          <div class="fx-col"><label style="font-size:0.75rem; font-weight:800; color:var(--muted);">EUR (€)</label><input type="number" id="fxEur" oninput="app.calcFxEur()"></div>
        </div>
        <div class="fx-quick-chips" id="fxChips"></div>
      </div>

      <div style="font-size:0.8rem; font-weight:800; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">Toca una tarjeta para verla en grande</div>
      <div class="flashcard-grid" id="fcGrid"></div>
    </section>

    <!-- TAB 7: QUIZ CULTURAL -->
    <section id="tab-quiz" class="tab-view">
      <div class="stat-card" style="margin-bottom:14px; text-align:left; padding:12px 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; font-size:0.9rem;">Puntuación del Quiz:</span>
          <span class="stat-num" id="quizScoreText" style="font-size:1.2rem;">0 / 0</span>
        </div>
      </div>
      <div id="quizContainer"></div>
    </section>

    <!-- TAB 8: MALETA -->
    <section id="tab-maleta" class="tab-view">
      <div class="progress-wrap">
        <div style="display:flex; justify-content:space-between; font-size:0.84rem; font-weight:700;">
          <span>Equipaje listo</span>
          <span id="luggageLabel">0 / 0 (0%)</span>
        </div>
        <div class="progress-track"><div class="progress-fill" id="luggageBar"></div></div>
      </div>
      <div class="check-box-group">
        <h3><i class="fa-solid fa-suitcase-rolling"></i> Checklist Preparativos</h3>
        <div id="packingList"></div>
      </div>
    </section>

    <!-- TAB 9: SOS & NOTAS -->
    <section id="tab-sos" class="tab-view">
      <div style="background:var(--primary-subtle); border:1px solid var(--primary); border-radius:var(--radius-md); padding:16px; margin-bottom:14px;">
        <h3 style="color:var(--primary); font-size:1rem; font-weight:700; margin-bottom:6px;"><i class="fa-solid fa-shield-halved"></i> Asistencia Consular</h3>
        <p style="font-size:0.86rem;" id="sosEmbassy">--</p>
      </div>

      <div class="stat-card" style="text-align:left; padding:16px; margin-bottom:14px;">
        <h4 style="font-size:0.92rem; font-weight:700; margin-bottom:8px;"><i class="fa-solid fa-phone"></i> Teléfonos de Emergencia</h4>
        <div id="sosPhones" style="font-size:0.86rem;"></div>
      </div>

      <div class="stat-card" style="text-align:left; padding:16px;">
        <h4 style="font-size:0.92rem; font-weight:700; margin-bottom:6px;"><i class="fa-solid fa-note-sticky"></i> Bloc de Notas Offline</h4>
        <textarea id="localNotes" style="width:100%; min-height:100px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--paper-muted); color:var(--ink); padding:8px; font-family:inherit; font-size:0.85rem;" placeholder="Pólizas, reservas o apuntes..." oninput="app.saveNotes()"></textarea>
      </div>
    </section>
  </main>

  <!-- BARRA DE NAVEGACIÓN INFERIOR -->
  <nav class="bottom-dock">
    <button class="dock-tab-btn active" onclick="app.tab('resumen', this)"><i class="fa-solid fa-compass"></i><span>Resumen</span></button>
    <button class="dock-tab-btn" onclick="app.tab('itinerario', this)"><i class="fa-solid fa-calendar-days"></i><span>Ruta</span></button>
    <button class="dock-tab-btn" onclick="app.tab('mapa', this)"><i class="fa-solid fa-map-location-dot"></i><span>Mapa</span></button>
    <button class="dock-tab-btn" onclick="app.tab('gourmet', this)"><i class="fa-solid fa-bowl-rice"></i><span>Gourmet</span></button>
    <button class="dock-tab-btn" onclick="app.tab('etiqueta', this)"><i class="fa-solid fa-handshake"></i><span>Etiqueta</span></button>
    <button class="dock-tab-btn" onclick="app.tab('herramientas', this)"><i class="fa-solid fa-toolbox"></i><span>Tarjetas</span></button>
    <button class="dock-tab-btn" onclick="app.tab('quiz', this)"><i class="fa-solid fa-circle-question"></i><span>Quiz</span></button>
    <button class="dock-tab-btn" onclick="app.tab('maleta', this)"><i class="fa-solid fa-list-check"></i><span>Maleta</span></button>
    <button class="dock-tab-btn" onclick="app.tab('sos', this)"><i class="fa-solid fa-kit-medical"></i><span>SOS</span></button>
  </nav>

  <script>
    /* {{TRIP_DATA_INJECTION}} */

    const app = {
      map: null,
      allExpanded: false,
      quizScore: 0,
      quizAnswered: {},

      init() {
        const d = window.__TRIP_DATA__;
        if (!d) return;

        const hTitle = document.getElementById('hTitle');
        if (hTitle) {
          hTitle.innerHTML = \`
            <img src="/logo-header.svg" alt="ChesTrips">
            <span>\${d.tripTitle || 'ChesTrips'}</span>
          \`;
        }
        
        const hDates = document.getElementById('hDates');
        if (hDates) hDates.textContent = d.dates || '';

        this.renderStats(d.stats);
        this.renderFlights(d.flights);
        this.renderQuickFacts(d.quickFacts);
        this.renderThread(d.routeThread);
        this.renderWeather(d.weatherTable);
        this.renderTransports(d.transports);
        this.renderItinerary(d.days);
        this.initCurrency(d.currency);
        this.renderGourmet(d.gourmet);
        this.renderCuriosities(d.curiosities);
        this.renderEtiquette(d.etiquette);
        this.renderFlashcards(d.flashcards);
        this.renderQuiz(d.quiz);
        this.renderPacking(d.packing);
        this.renderSOS(d.emergency);

        const notesEl = document.getElementById('localNotes');
        if (notesEl) {
          const savedNotes = localStorage.getItem('ches_notes_' + (d.tripTitle || 'v'));
          if (savedNotes) notesEl.value = savedNotes;
        }

        this.loadChecklistStates();
      },

      tab(tabId, btn) {
        document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.dock-tab-btn').forEach(b => b.classList.remove('active'));
        const target = document.getElementById('tab-' + tabId);
        if (target) target.classList.add('active');
        if (btn) {
          btn.classList.add('active');
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
        if (tabId === 'mapa') {
          setTimeout(() => this.initMap(), 200);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },

      renderStats(s) {
        const c = document.getElementById('statGrid');
        if (!c || !s) return;
        c.innerHTML = \`
          <div class="stat-card"><div class="stat-num">\${s.days || '--'}</div><div class="stat-lbl">Días</div></div>
          <div class="stat-card"><div class="stat-num">\${s.cities || '--'}</div><div class="stat-lbl">Zonas</div></div>
          <div class="stat-card"><div class="stat-num">\${s.hotels || '--'}</div><div class="stat-lbl">Hoteles</div></div>
          <div class="stat-card"><div class="stat-num">\${s.flights || '--'}</div><div class="stat-lbl">Vuelos</div></div>
        \`;
      },

      renderFlights(fl) {
        const c = document.getElementById('flightsContainer');
        if (!c) return;
        if (!fl || !fl.length) { c.style.display = 'none'; return; }
        c.style.display = 'block';
        c.innerHTML = \`
          <div class="flight-card">
            <h4 style="font-size:0.9rem; font-weight:800; margin-bottom:10px; color:var(--primary);">
              <i class="fa-solid fa-plane"></i> Vuelos Reservados \${fl[0]?.locator ? '<span style="font-family:var(--font-mono); font-size:0.8rem; font-weight:700; color:var(--muted); margin-left:6px;">(Ref: ' + fl[0].locator + ')</span>' : ''}
            </h4>
            \${fl.map(f => \`
              <div class="flight-segment">
                <div>
                  <span class="flight-code">\${f.code || 'Vuelo'}</span>
                  <span class="flight-route">\${f.route || ''}</span>
                </div>
                <div class="flight-time">\${f.time || ''}</div>
              </div>
            \`).join('')}
          </div>
        \`;
      },

      renderQuickFacts(qf) {
        const c = document.getElementById('quickFactsGrid');
        if (!c) return;
        if (!qf || !qf.length) { c.style.display = 'none'; return; }
        c.style.display = 'grid';
        c.innerHTML = qf.map(f => \`
          <div class="fact-card">
            <i class="fa-solid \${f.icon || 'fa-circle-info'}"></i>
            <h5>\${f.title}</h5>
            <p>\${f.desc}</p>
          </div>
        \`).join('');
      },

      renderThread(th) {
        const c = document.getElementById('routeThread');
        if (!c || !th) return;
        c.innerHTML = th.map(node => \`
          <div class="thread-stop" onclick="app.filterByThread('\${node.query || node.name}')">
            <i class="fa-solid \${node.icon || 'fa-location-dot'}"></i>
            <span>\${node.name}</span>
          </div>
        \`).join('');
      },

      filterByThread(q) {
        this.tab('itinerario');
        const s = document.getElementById('globalSearch');
        if (s) { s.value = q; this.search(q); }
      },

      renderWeather(w) {
        const c = document.getElementById('weatherList');
        if (!c) return;
        if (!w || !w.length) { c.innerHTML = '<p>Clima estacional favorable.</p>'; return; }
        c.innerHTML = w.map(row => \`
          <p style="margin-bottom:6px;"><strong>\${row.region}:</strong> \${row.temp} · \${row.desc}</p>
        \`).join('');
      },

      renderTransports(tr) {
        const c = document.getElementById('transportsList');
        if (!c) return;
        if (!tr || !tr.length) { c.innerHTML = '<p style="font-size:0.86rem; color:var(--muted);">Sin traslados complejos registrados.</p>'; return; }
        c.innerHTML = tr.map(t => \`
          <div style="padding:8px 0; border-bottom:1px solid var(--border-subtle); font-size:0.86rem;">
            <div style="font-weight:700; color:var(--primary);"><i class="fa-solid fa-route"></i> \${t.date}: \${t.title}</div>
            <div style="color:var(--muted); font-size:0.8rem;">\${t.desc}</div>
          </div>
        \`).join('');
      },

      initMap() {
        const d = window.__TRIP_DATA__;
        const container = document.getElementById('mapContainer');
        if (!d || !container) return;
        if (this.map) {
          this.map.invalidateSize();
          return;
        }

        this.map = L.map('mapContainer').setView(d.mapCenter || [16.0, 107.0], d.mapZoom || 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 18,
          attribution: '&copy; CARTO'
        }).addTo(this.map);

        const latLngs = [];
        (d.days || []).forEach(day => {
          if (day.lat && day.lng) {
            latLngs.push([day.lat, day.lng]);
            L.circleMarker([day.lat, day.lng], {
              radius: 6,
              fillColor: '#bd3126',
              color: '#ffffff',
              weight: 2,
              fillOpacity: 1
            }).addTo(this.map).bindPopup(\`<b>Día \${day.day}: \${day.title}</b><br>\${day.meta || ''}\`);
          }
        });

        if (latLngs.length > 1) {
          L.polyline(latLngs, { color: '#2f5a38', weight: 3, dashArray: '6, 8' }).addTo(this.map);
        }
      },

      renderItinerary(days) {
        const c = document.getElementById('itineraryContainer');
        if (!c) return;
        c.innerHTML = (days || []).map((day, idx) => \`
          <div class="day-card searchable-card \${idx === 0 ? 'open' : ''}" data-search="\${day.title} \${day.meta || ''} \${day.hotel || ''}">
            <div class="day-header" onclick="this.parentElement.classList.toggle('open')">
              <div style="display:flex; align-items:center; min-width:0;">
                <span class="day-badge">\${day.dateBadge || 'DÍA ' + day.day}</span>
                <div class="day-title-wrap">
                  <div class="day-title">
                    Día \${day.day}: \${day.title}
                    \${day.isSuggestion ? '<span class="suggestion-chip"><i class="fa-solid fa-sparkles"></i> Sugerencia</span>' : ''}
                  </div>
                  <div class="day-meta">\${day.meta || ''}</div>
                </div>
              </div>
              <i class="fa-solid fa-chevron-down day-chevron"></i>
            </div>
            <div class="day-body">
              \${day.historyContext ? \`<div class="history-box"><i class="fa-solid fa-landmark"></i> \${day.historyContext}</div>\` : ''}
              \${day.hotel ? \`
                <div class="hotel-subcard">
                  <div style="font-weight:700; color:var(--secondary);"><i class="fa-solid fa-hotel"></i> \${day.hotel}</div>
                  \${day.hotelAddress ? \`<div style="font-size:0.8rem; color:var(--muted);">\${day.hotelAddress}</div>\` : ''}
                  \${day.hotelMapsUrl ? \`<a href="\${day.hotelMapsUrl}" target="_blank" class="action-btn"><i class="fa-solid fa-map-location-dot"></i> Google Maps</a>\` : ''}
                </div>\` : ''}
              <ul class="clean-steps">
                \${(day.steps || []).map(s => \`<li>\${s}</li>\`).join('')}
              </ul>
              \${day.cultureTip ? \`<div class="tip-card" style="border-left-color:var(--secondary);"><i class="fa-solid fa-eye"></i> <strong>Cultura:</strong> \${day.cultureTip}</div>\` : ''}
              \${day.practicalTip ? \`<div class="tip-card"><i class="fa-solid fa-lightbulb"></i> <strong>Consejo:</strong> \${day.practicalTip}</div>\` : ''}
            </div>
          </div>
        \`).join('');
      },

      toggleAllDays() {
        this.allExpanded = !this.allExpanded;
        document.querySelectorAll('.day-card').forEach(c => c.classList.toggle('open', this.allExpanded));
      },

      initCurrency(curr) {
        if (!curr) return;
        const rate = curr.rateToEUR || 1;
        const lbl = document.getElementById('fxLabelLocal');
        if (lbl) lbl.textContent = curr.code || 'LOCAL';
        const locIn = document.getElementById('fxLocal');
        const eurIn = document.getElementById('fxEur');

        this.calcFxLocal = () => {
          if (!locIn || !eurIn) return;
          const val = parseFloat(locIn.value) || 0;
          eurIn.value = (val / rate).toFixed(2);
        };
        this.calcFxEur = () => {
          if (!locIn || !eurIn) return;
          const val = parseFloat(eurIn.value) || 0;
          locIn.value = Math.round(val * rate);
        };

        if (locIn) {
          locIn.value = curr.quickChips?.[1] || 100000;
          this.calcFxLocal();
        }

        const chipsContainer = document.getElementById('fxChips');
        if (chipsContainer) {
          chipsContainer.innerHTML = (curr.quickChips || []).map(chip => \`
            <span class="fx-chip" onclick="document.getElementById('fxLocal').value=\${chip}; app.calcFxLocal();">\${chip.toLocaleString()} \${curr.code}</span>
          \`).join('');
        }
      },

      renderGourmet(gList) {
        const c = document.getElementById('gourmetList');
        if (!c || !gList) return;
        c.innerHTML = gList.map((g, idx) => \`
          <div class="check-line" onclick="app.toggleCheck('gourmet', \${idx}, this, event)">
            <input type="checkbox" id="chk-g-\${idx}" onclick="event.stopPropagation(); app.toggleCheck('gourmet', \${idx}, this.parentElement, event)">
            <label for="chk-g-\${idx}" style="cursor:pointer; flex:1;">
              <strong>\${g.dish}</strong> \${g.city ? '(' + g.city + ')' : ''}: \${g.desc}
              \${g.recommendedSpot ? '<span style="color:var(--primary); font-weight:700; display:block; font-size:0.78rem; margin-top:2px;"><i class="fa-solid fa-location-dot"></i> Recomendado: ' + g.recommendedSpot + '</span>' : ''}
            </label>
          </div>
        \`).join('');
        this.calcProgress('gourmet');
      },

      renderCuriosities(cur) {
        const c = document.getElementById('curiositiesList');
        if (!c) return;
        if (!cur || !cur.length) { c.style.display = 'none'; return; }
        c.style.display = 'block';
        c.innerHTML = cur.map(row => \`
          <div class="curiosity-card">
            <h5><i class="fa-solid \${row.icon || 'fa-landmark'}"></i> \${row.title}</h5>
            <p>\${row.desc}</p>
          </div>
        \`).join('');
      },

      renderEtiquette(etList) {
        const c = document.getElementById('etiquetteList');
        if (!c || !etList) return;
        c.innerHTML = etList.map(e => \`
          <div class="check-box-group" style="margin-bottom:12px;">
            <h3><i class="fa-solid \${e.icon || 'fa-handshake'}"></i> \${e.title}</h3>
            <p style="font-size:0.86rem; color:var(--muted); line-height:1.45;">\${e.desc}</p>
          </div>
        \`).join('');
      },

      renderFlashcards(cards) {
        const c = document.getElementById('fcGrid');
        if (!c || !cards) return;
        c.innerHTML = cards.map(fc => \`
          <div class="flashcard" onclick="app.openModal('\${fc.category || ''}', '\${fc.local}', '\${fc.phonetic || ''}', '\${fc.spanish}')">
            <div style="font-size:0.75rem; font-weight:800; color:var(--muted);">\${fc.category || 'Frase'}</div>
            <div style="font-size:1.05rem; font-weight:800; color:var(--secondary); margin:4px 0;">\${fc.local}</div>
            <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent);">\${fc.phonetic || ''}</div>
            <div style="font-size:0.82rem; margin-top:2px;">\${fc.spanish}</div>
          </div>
        \`).join('');
      },

      openModal(cat, loc, pho, spa) {
        document.getElementById('gModalCat').textContent = cat || 'COMUNICACIÓN';
        document.getElementById('gModalLocal').textContent = loc;
        document.getElementById('gModalPhonetic').textContent = pho;
        document.getElementById('gModalSpanish').textContent = spa;
        document.getElementById('giantModal').classList.add('active');
      },
      closeModal() {
        document.getElementById('giantModal').classList.remove('active');
      },

      renderQuiz(quiz) {
        const c = document.getElementById('quizContainer');
        if (!c || !quiz || !quiz.length) return;
        const scoreEl = document.getElementById('quizScoreText');
        if (scoreEl) scoreEl.textContent = '0 / ' + quiz.length;
        c.innerHTML = quiz.map((q, idx) => \`
          <div class="quiz-card" id="qcard-\${idx}">
            <div class="quiz-q">\${idx + 1}. \${q.question}</div>
            <div class="quiz-opts">
              \${q.options.map((opt, oIdx) => \`
                <button class="quiz-btn" onclick="app.answerQuiz(\${idx}, \${oIdx}, \${q.correct})">\${opt}</button>
              \`).join('')}
            </div>
            <div class="quiz-exp" id="qexp-\${idx}">\${q.explanation}</div>
          </div>
        \`).join('');
      },

      answerQuiz(qIdx, oIdx, correct) {
        if (this.quizAnswered[qIdx]) return;
        this.quizAnswered[qIdx] = true;

        const card = document.getElementById('qcard-' + qIdx);
        if (!card) return;
        const btns = card.querySelectorAll('.quiz-btn');
        const exp = document.getElementById('qexp-' + qIdx);

        if (oIdx === correct) {
          btns[oIdx].classList.add('correct');
          this.quizScore++;
        } else {
          btns[oIdx].classList.add('wrong');
          if (btns[correct]) btns[correct].classList.add('correct');
        }
        if (exp) exp.style.display = 'block';
        const total = (window.__TRIP_DATA__.quiz || []).length;
        const scoreEl = document.getElementById('quizScoreText');
        if (scoreEl) scoreEl.textContent = this.quizScore + ' / ' + total;
      },

      renderPacking(pack) {
        const c = document.getElementById('packingList');
        if (!c || !pack) return;
        c.innerHTML = pack.map((p, idx) => {
          const itemText = typeof p === 'string' ? p : ('[' + p.cat + '] ' + p.item);
          return \`
            <div class="check-line" onclick="app.toggleCheck('packing', \${idx}, this, event)">
              <input type="checkbox" id="chk-p-\${idx}" onclick="event.stopPropagation(); app.toggleCheck('packing', \${idx}, this.parentElement, event)">
              <label for="chk-p-\${idx}" style="cursor:pointer; flex:1;">\${itemText}</label>
            </div>
          \`;
        }).join('');
        this.calcProgress('packing');
      },

      renderSOS(em) {
        const embassyEl = document.getElementById('sosEmbassy');
        if (embassyEl && em) embassyEl.textContent = em.embassy || 'Consultar con el consulado general de tu país.';
        const phonesEl = document.getElementById('sosPhones');
        if (phonesEl && em) {
          phonesEl.innerHTML = \`
            <p>• <strong>Policía:</strong> \${em.police || '112'} | • <strong>Ambulancia:</strong> \${em.ambulance || '112'}</p>
            \${em.hospital ? \`<p style="margin-top:6px;">• <strong>Hospital:</strong> \${em.hospital}</p>\` : ''}
          \`;
        }
      },

      toggleCheck(group, idx, lineEl, evt) {
        const chk = lineEl.querySelector('input[type="checkbox"]');
        if (chk && evt && evt.target !== chk) chk.checked = !chk.checked;
        if (chk) lineEl.classList.toggle('checked-done', chk.checked);

        const tripKey = window.__TRIP_DATA__?.tripTitle || 'default';
        const stateKey = 'ches_' + group + '_' + tripKey;
        const saved = JSON.parse(localStorage.getItem(stateKey) || '{}');
        if (chk) saved[idx] = chk.checked;
        localStorage.setItem(stateKey, JSON.stringify(saved));

        this.calcProgress(group);
      },

      calcProgress(group) {
        const container = document.getElementById(group === 'gourmet' ? 'gourmetList' : 'packingList');
        if (!container) return;
        const total = container.querySelectorAll('input[type="checkbox"]').length;
        const done = container.querySelectorAll('input[type="checkbox"]:checked').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        const lbl = document.getElementById(group === 'gourmet' ? 'gourmetLabel' : 'luggageLabel');
        const bar = document.getElementById(group === 'gourmet' ? 'gourmetBar' : 'luggageBar');
        if (lbl) lbl.textContent = done + ' / ' + total + ' (' + pct + '%)';
        if (bar) bar.style.width = pct + '%';
      },

      loadChecklistStates() {
        const tripKey = window.__TRIP_DATA__?.tripTitle || 'default';
        ['gourmet', 'packing'].forEach(group => {
          const stateKey = 'ches_' + group + '_' + tripKey;
          const saved = JSON.parse(localStorage.getItem(stateKey) || '{}');
          const prefix = group === 'gourmet' ? 'chk-g-' : 'chk-p-';
          Object.keys(saved).forEach(idx => {
            const chk = document.getElementById(prefix + idx);
            if (chk && saved[idx]) {
              chk.checked = true;
              const parentLine = chk.closest('.check-line');
              if (parentLine) parentLine.classList.add('checked-done');
            }
          });
          this.calcProgress(group);
        });
      },

      saveNotes() {
        const d = window.__TRIP_DATA__;
        const notesEl = document.getElementById('localNotes');
        if (notesEl && d) {
          localStorage.setItem('ches_notes_' + (d.tripTitle || 'v'), notesEl.value);
        }
      },

      search(query) {
        const q = (query || '').toLowerCase().trim();
        document.querySelectorAll('.searchable-card').forEach(el => {
          const text = (el.innerText + ' ' + (el.getAttribute('data-search') || '')).toLowerCase();
          if (text.includes(q)) {
            el.style.display = '';
            if (q.length > 2) el.classList.add('open');
          } else {
            el.style.display = 'none';
          }
        });
      }
    };

    window.addEventListener('DOMContentLoaded', () => app.init());
  </script>
</body>
</html>`;
