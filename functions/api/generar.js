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

    const destinoSlug = (nombreDestino || "viaje")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 25) || "viaje";

    const filename = `${destinoSlug}-${Date.now().toString(36)}.html`;

    // 1. Prompt especializado en extracción de datos JSON estructurados
    const systemPrompt = `
Eres un motor extractor y compilador de viajes. Analiza las notas del usuario y devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura:

{
  "tripTitle": "Nombre evocador del viaje",
  "dates": "Fechas legibles (ej: 19 Sep - 02 Oct)",
  "startDateISO": "YYYY-MM-DD (fecha del primer día para cuenta atrás)",
  "badgeText": "Ej: Vietnam · 14 Días",
  "currency": {
    "code": "VND",
    "rateToEUR": 27000,
    "quickChips": [50000, 100000, 250000, 500000, 1000000]
  },
  "stats": { "days": 14, "cities": 5, "hotels": 4, "flights": 2 },
  "routeThread": [
    { "name": "Hanoi", "icon": "fa-building" },
    { "name": "Ha Long", "icon": "fa-water" }
  ],
  "mapCenter": [21.0285, 105.8542],
  "mapZoom": 6,
  "days": [
    {
      "day": 1,
      "dateBadge": "19 SEP",
      "title": "Llegada a Hanoi y paseo inaugural",
      "meta": "Hanoi · Casco Antiguo",
      "lat": 21.0285,
      "lng": 105.8542,
      "hotel": "Ha Noi Lake View Hotel",
      "hotelMapsUrl": "https://maps.google.com/?q=Ha+Noi+Lake+View+Hotel",
      "steps": [
        "14:00h: Llegada y check-in en el hotel.",
        "Paseo por el Lago Hoan Kiem y Puente Rojo The Huc.",
        "Cena callejera en el Casco Antiguo y Mercado Nocturno."
      ],
      "cultureTip": "Al cruzar la calle, mantén un paso constante y predecible; el tráfico fluye sorteándote.",
      "practicalTip": "Cambia dinero en las joyerías de la calle Ha Trung para mejor tasa."
    }
  ],
  "transports": [
    { "date": "23 SEP · 21:30", "title": "Bus Nocturno a Sapa", "desc": "HK Bus VIP Cama desde Tam Coc." }
  ],
  "gourmet": [
    { "dish": "Phở Bò", "desc": "Sopa tradicional de fideos con ternera" }
  ],
  "flashcards": [
    { "local": "Xin chào", "phonetic": "Sin chao", "spanish": "Hola" },
    { "local": "Bao nhiêu tiền?", "phonetic": "Bao ñiu tien?", "spanish": "¿Cuánto cuesta?" },
    { "local": "Tính tiền", "phonetic": "Tinh tien", "spanish": "La cuenta, por favor" }
  ],
  "quiz": [
    {
      "question": "¿Cuál es la moneda oficial de Vietnam?",
      "options": ["Dong (VND)", "Baht", "Riel", "Yen"],
      "correct": 0,
      "explanation": "El Dong (VND) es la divisa oficial."
    }
  ],
  "packing": [
    "Pasaporte y visado electrónico",
    "Seguro médico",
    "Adaptador universal y powerbank",
    "Repelente con DEET > 30%"
  ],
  "emergency": {
    "police": "113",
    "ambulance": "115",
    "embassy": "Embajada de España en Hanoi: +84 24 3771 5207",
    "hospital": "Vinmec International Hospital (Hanoi)"
  }
}

REGLAS ESTRICTAS:
- Genera CADA UNO DE LOS DÍAS del viaje por separado (sin omitir ni resumir).
- Estima coordenadas reales (lat/lng) para cada parada del día para colocarlas en el mapa Leaflet.
- La respuesta DEBE ser un JSON estrictamente válido, sin texto fuera de las llaves.
`;

    const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nNOTAS DEL VIAJE:\nDestino: ${nombreDestino || "Destino"}\n${notas}` }] }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      return new Response(JSON.stringify({ error: `Error Gemini: ${err}` }), { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Validar que el JSON es correcto
    JSON.parse(rawJson);

    // 2. Inyectar el JSON en la plantilla maestra
    const finalHtml = masterTemplateHtml.replace(
      "/* {{TRIP_DATA_INJECTION}} */",
      `window.__TRIP_DATA__ = ${rawJson};`
    );

    // 3. Subir a GitHub
    const base64Content = btoa(unescape(encodeURIComponent(finalHtml)));
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
      return new Response(JSON.stringify({ error: "Error al registrar la guía en GitHub." }), { status: 502 });
    }

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

// -------------------------------------------------------------
// PLANTILLA MAESTRA OUTSTANDING (Autocontenida, offline y reactiva)
// -------------------------------------------------------------
const masterTemplateHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>ChesTrips Engine | Cuaderno de Viaje</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;700;800&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <!-- Leaflet CDN -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <style>
    :root {
      --bg: #faf7f2;
      --card: #ffffff;
      --card-muted: #f4ede2;
      --text: #1a1c1a;
      --muted: #6b6357;
      --border: #e6dec9;
      --primary: #2d5a3f;
      --primary-subtle: #e8f2ec;
      --accent: #bd3126;
      --gold: #ad7919;
      --radius: 18px;
      --radius-sm: 10px;
      --shadow: 0 4px 20px -2px rgba(45, 90, 63, 0.08);
      --font-display: 'Fraunces', serif;
      --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121413;
        --card: #1c201e;
        --card-muted: #252b27;
        --text: #f3f4f3;
        --muted: #9ba39d;
        --border: #2d3630;
        --primary: #529e71;
        --primary-subtle: rgba(82, 158, 113, 0.15);
        --accent: #e25447;
        --gold: #d89e3a;
        --shadow: 0 4px 20px -2px rgba(0,0,0,0.4);
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { font-family: var(--font-sans); background: var(--bg); color: var(--text); padding-bottom: 95px; line-height: 1.5; }
    
    header { background: var(--card); border-bottom: 1px solid var(--border); padding: 14px 18px; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); }
    .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .brand { font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 8px; }
    .badge-dates { font-family: var(--font-mono); font-size: 0.72rem; background: var(--primary-subtle); color: var(--primary); padding: 4px 8px; border-radius: 999px; font-weight: 700; }
    
    .search-box { position: relative; width: 100%; }
    .search-box input { width: 100%; padding: 10px 14px 10px 38px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--card-muted); color: var(--text); font-size: 0.88rem; outline: none; }
    .search-box i { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.85rem; }

    main { max-width: 680px; margin: 0 auto; padding: 16px; }
    .tab-view { display: none; }
    .tab-view.active { display: block; animation: tabIn 0.2s ease-out; }
    @keyframes tabIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

    .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow); }
    h2.title { font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--primary); }

    /* STATS & QUICK THREAD */
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .stat-box { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 6px; text-align: center; }
    .stat-val { font-family: var(--font-display); font-size: 1.35rem; font-weight: 800; color: var(--primary); }
    .stat-lbl { font-size: 0.65rem; color: var(--muted); font-weight: 700; text-transform: uppercase; }

    .thread { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
    .thread-node { background: var(--card); border: 1px solid var(--border); padding: 8px 14px; border-radius: var(--radius-sm); white-space: nowrap; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; }

    /* ACORDEÓN DÍAS */
    .day-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 12px; overflow: hidden; box-shadow: var(--shadow); }
    .day-head { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
    .day-badge { background: var(--primary-subtle); color: var(--primary); font-family: var(--font-mono); font-size: 0.76rem; font-weight: 700; padding: 6px 10px; border-radius: var(--radius-sm); }
    .day-info { margin-left: 12px; flex: 1; }
    .day-info h3 { font-size: 0.95rem; font-weight: 700; }
    .day-info p { font-size: 0.76rem; color: var(--muted); }
    .day-body { display: none; padding: 4px 16px 16px; border-top: 1px solid var(--border); font-size: 0.88rem; }
    .day-card.open .day-body { display: block; }
    .day-card.open .chevron { transform: rotate(180deg); color: var(--primary); }
    .chevron { transition: transform 0.2s ease; color: var(--muted); }

    .hotel-badge { background: var(--card-muted); border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 8px 12px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; }
    .clean-list { list-style: none; margin: 10px 0; }
    .clean-list li { position: relative; padding-left: 16px; margin-bottom: 6px; font-size: 0.86rem; }
    .clean-list li::before { content: "•"; position: absolute; left: 2px; color: var(--primary); font-size: 1.1rem; }

    .tip-box { background: var(--card-muted); border-left: 4px solid var(--gold); padding: 8px 12px; border-radius: 4px; font-size: 0.82rem; margin-top: 8px; }

    /* CHECKLISTS */
    .chk-line { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); cursor: pointer; font-size: 0.88rem; }
    .chk-line:last-child { border-bottom: none; }
    .chk-line input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer; }
    .chk-line.done span { text-decoration: line-through; opacity: 0.5; }

    /* CONVERSOR & MODAL */
    .fx-grid { display: flex; gap: 10px; margin-bottom: 10px; }
    .fx-grid input { flex: 1; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--card-muted); color: var(--text); font-family: var(--font-mono); font-size: 1rem; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip-btn { background: var(--card-muted); border: 1px solid var(--border); padding: 5px 10px; border-radius: 999px; font-size: 0.75rem; font-family: var(--font-mono); cursor: pointer; font-weight: 600; }

    .fc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .fc-card { background: var(--card); border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-sm); text-align: center; cursor: pointer; box-shadow: var(--shadow); }
    .fc-card .loc { font-size: 1.1rem; font-weight: 800; color: var(--primary); font-family: var(--font-display); }
    .fc-card .pho { font-size: 0.76rem; color: var(--muted); font-style: italic; }
    .fc-card .spa { font-size: 0.82rem; margin-top: 4px; font-weight: 600; }

    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px; }
    .modal.active { display: flex; }
    .modal-card { background: var(--card); border-radius: var(--radius); padding: 30px; width: 100%; max-width: 380px; text-align: center; }

    /* DOCK INFERIOR */
    .dock { position: fixed; bottom: 0; left: 0; right: 0; background: var(--card); border-top: 1px solid var(--border); display: flex; justify-content: space-around; padding: 8px 4px 18px; z-index: 900; box-shadow: 0 -4px 15px rgba(0,0,0,0.05); }
    .dock-btn { background: none; border: none; color: var(--muted); font-size: 0.65rem; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; flex: 1; }
    .dock-btn i { font-size: 1.1rem; }
    .dock-btn.active { color: var(--primary); }
  </style>
</head>
<body>

  <!-- MODAL GIGANTE DE COMUNICACIÓN -->
  <div class="modal" id="giantModal" onclick="app.closeModal()">
    <div class="modal-card" onclick="event.stopPropagation()">
      <div style="font-size:0.75rem; text-transform:uppercase; color:var(--muted); font-weight:700;">Traducción en grande</div>
      <div id="mLoc" style="font-family:var(--font-display); font-size:2.2rem; color:var(--primary); margin:12px 0 4px;"></div>
      <div id="mPho" style="font-family:var(--font-mono); font-size:1rem; color:var(--gold); margin-bottom:12px;"></div>
      <div id="mSpa" style="font-size:1.1rem; font-weight:700; background:var(--card-muted); padding:10px; border-radius:var(--radius-sm);"></div>
    </div>
  </div>

  <header>
    <div class="header-top">
      <div class="brand"><i class="fa-solid fa-compass"></i> ChesTrips</div>
      <div class="badge-dates" id="hDates">--</div>
    </div>
    <div class="search-box">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" id="globalSearch" placeholder="Buscar ciudades, templos, restaurantes..." oninput="app.search(this.value)">
    </div>
  </header>

  <main>
    <!-- 1. RESUMEN -->
    <section id="tab-resumen" class="tab-view active">
      <div class="card" style="text-align:center; background:linear-gradient(135deg, var(--primary), #1a3826); color:#fff;">
        <div style="font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; opacity:0.85;">Comienza la aventura</div>
        <div id="countdownTitle" style="font-family:var(--font-display); font-size:1.8rem; font-weight:800; margin:4px 0;">--</div>
        <div id="tripBadge" style="font-size:0.85rem; font-weight:600; opacity:0.9;">--</div>
      </div>

      <div class="stat-grid" id="statGrid"></div>
      <div class="thread" id="routeThread"></div>

      <div class="card">
        <h2 class="title"><i class="fa-solid fa-map-location-dot"></i> Mapa del Viaje</h2>
        <div id="tripMap" style="height:320px; border-radius:var(--radius-sm); z-index:1;"></div>
      </div>
    </section>

    <!-- 2. ITINERARIO -->
    <section id="tab-itinerario" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:0.8rem; font-weight:800; color:var(--muted); text-transform:uppercase;">Día a Día</span>
        <button onclick="app.toggleAllDays()" style="background:none; border:none; color:var(--primary); font-size:0.8rem; font-weight:700; cursor:pointer;">Expandir todo</button>
      </div>
      <div id="itineraryContainer"></div>
    </section>

    <!-- 3. HERRAMIENTAS -->
    <section id="tab-herramientas" class="tab-view">
      <div class="card">
        <h2 class="title"><i class="fa-solid fa-money-bill-transfer"></i> Conversor de Moneda</h2>
        <div class="fx-grid">
          <input type="number" id="fxLocal" oninput="app.calcFxFromLocal()">
          <input type="text" id="fxEur" readonly>
        </div>
        <div class="chips" id="fxChips"></div>
      </div>

      <div class="card">
        <h2 class="title"><i class="fa-solid fa-comments"></i> Tarjetas para el Taxista / Restaurante</h2>
        <p style="font-size:0.8rem; color:var(--muted); margin-bottom:12px;">Toca una frase para mostrarla en grande:</p>
        <div class="fc-grid" id="fcGrid"></div>
      </div>
    </section>

    <!-- 4. GOURMET -->
    <section id="tab-gourmet" class="tab-view">
      <div class="card">
        <h2 class="title"><i class="fa-solid fa-utensils"></i> Pasaporte Gourmet</h2>
        <div id="gourmetList"></div>
      </div>
    </section>

    <!-- 5. MALETA & SOS -->
    <section id="tab-maleta" class="tab-view">
      <div class="card">
        <h2 class="title"><i class="fa-solid fa-suitcase-rolling"></i> Checklist Maleta</h2>
        <div id="packingList"></div>
      </div>

      <div class="card" style="border-left:4px solid var(--accent);">
        <h2 class="title" style="color:var(--accent);"><i class="fa-solid fa-kit-medical"></i> SOS & Emergencias</h2>
        <div id="emergencyBox" style="font-size:0.86rem;"></div>
        <textarea id="localNotes" placeholder="Bloc de notas offline..." style="width:100%; height:100px; margin-top:10px; padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--card-muted); color:var(--text); font-family:inherit; outline:none; resize:none;" oninput="localStorage.setItem('ches_notes', this.value)"></textarea>
      </div>
    </section>
  </main>

  <nav class="dock">
    <button class="dock-btn active" onclick="app.tab('resumen', this)"><i class="fa-solid fa-compass"></i><span>Resumen</span></button>
    <button class="dock-btn" onclick="app.tab('itinerario', this)"><i class="fa-solid fa-calendar-days"></i><span>Ruta</span></button>
    <button class="dock-btn" onclick="app.tab('herramientas', this)"><i class="fa-solid fa-toolbox"></i><span>Tarjetas</span></button>
    <button class="dock-btn" onclick="app.tab('gourmet', this)"><i class="fa-solid fa-bowl-food"></i><span>Comer</span></button>
    <button class="dock-btn" onclick="app.tab('maleta', this)"><i class="fa-solid fa-list-check"></i><span>Maleta</span></button>
  </nav>

  <script>
    /* {{TRIP_DATA_INJECTION}} */

    const app = {
      map: null,
      allExpanded: false,

      init() {
        const data = window.__TRIP_DATA__;
        if (!data) return;

        document.getElementById('hDates').textContent = data.dates || '';
        document.getElementById('tripBadge').textContent = data.badgeText || data.tripTitle;
        this.initCountdown(data.startDateISO);
        this.renderStats(data.stats);
        this.renderThread(data.routeThread);
        this.renderItinerary(data.days);
        this.initMap(data);
        this.initCurrency(data.currency);
        this.renderFlashcards(data.flashcards);
        this.renderChecklist('gourmetList', data.gourmet?.map(g => g.dish + ' (' + g.desc + ')') || [], 'ches_gourmet');
        this.renderChecklist('packingList', data.packing || [], 'ches_packing');
        this.renderEmergency(data.emergency);

        const savedNotes = localStorage.getItem('ches_notes');
        if (savedNotes) document.getElementById('localNotes').value = savedNotes;
      },

      tab(tabId, btn) {
        document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + tabId).classList.add('active');
        if (btn) btn.classList.add('active');
        if (tabId === 'resumen' && this.map) setTimeout(() => this.map.invalidateSize(), 200);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },

      initCountdown(startIso) {
        const title = document.getElementById('countdownTitle');
        if (!startIso) { title.textContent = "¡En marcha!"; return; }
        const diff = Math.ceil((new Date(startIso) - new Date()) / 86400000);
        title.textContent = diff > 0 ? \`Faltan \${diff} días\` : "¡Viaje en curso!";
      },

      renderStats(s) {
        if (!s) return;
        document.getElementById('statGrid').innerHTML = \`
          <div class="stat-box"><div class="stat-val">\${s.days || '--'}</div><div class="stat-lbl">Días</div></div>
          <div class="stat-box"><div class="stat-val">\${s.cities || '--'}</div><div class="stat-lbl">Zonas</div></div>
          <div class="stat-box"><div class="stat-val">\${s.hotels || '--'}</div><div class="stat-lbl">Hoteles</div></div>
          <div class="stat-box"><div class="stat-val">\${s.flights || '--'}</div><div class="stat-lbl">Vuelos</div></div>
        \`;
      },

      renderThread(th) {
        if (!th) return;
        document.getElementById('routeThread').innerHTML = th.map(n => \`
          <div class="thread-node"><i class="fa-solid \${n.icon || 'fa-location-dot'}"></i> \${n.name}</div>
        \`).join('');
      },

      initMap(data) {
        if (!document.getElementById('tripMap') || !window.L) return;
        this.map = L.map('tripMap').setView(data.mapCenter || [21.0, 105.8], data.mapZoom || 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(this.map);

        (data.days || []).forEach(d => {
          if (d.lat && d.lng) {
            L.marker([d.lat, d.lng]).addTo(this.map)
              .bindPopup(\`<b>Día \${d.day}: \${d.title}</b><br>\${d.meta || ''}\`);
          }
        });
      },

      renderItinerary(days) {
        const c = document.getElementById('itineraryContainer');
        c.innerHTML = (days || []).map(d => \`
          <div class="day-card" data-search="\${d.title} \${d.meta} \${d.hotel}">
            <div class="day-head" onclick="this.parentElement.classList.toggle('open')">
              <div class="day-badge">\${d.dateBadge || 'DÍA ' + d.day}</div>
              <div class="day-info">
                <h3>Día \${d.day}: \${d.title}</h3>
                <p>\${d.meta || ''}</p>
              </div>
              <i class="fa-solid fa-chevron-down chevron"></i>
            </div>
            <div class="day-body">
              \${d.hotel ? \`
                <div class="hotel-badge">
                  <span><i class="fa-solid fa-hotel" style="color:var(--primary);"></i> \${d.hotel}</span>
                  \${d.hotelMapsUrl ? \`<a href="\${d.hotelMapsUrl}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none;"><i class="fa-solid fa-location-arrow"></i> Maps</a>\` : ''}
                </div>\` : ''}
              <ul class="clean-list">
                \${(d.steps || []).map(s => \`<li>\${s}</li>\`).join('')}
              </ul>
              \${d.practicalTip ? \`<div class="tip-box"><strong>Consejo:</strong> \${d.practicalTip}</div>\` : ''}
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
        const locIn = document.getElementById('fxLocal');
        const eurIn = document.getElementById('fxEur');

        window.calcFx = () => {
          const val = parseFloat(locIn.value) || 0;
          eurIn.value = (val / rate).toFixed(2) + ' €';
        };
        this.calcFxFromLocal = window.calcFx;

        locIn.value = curr.quickChips?.[0] || 100000;
        window.calcFx();

        document.getElementById('fxChips').innerHTML = (curr.quickChips || []).map(chip => \`
          <button class="chip-btn" onclick="document.getElementById('fxLocal').value=\${chip}; window.calcFx();">
            \${chip.toLocaleString()} \${curr.code}
          </button>
        \`).join('');
      },

      renderFlashcards(cards) {
        document.getElementById('fcGrid').innerHTML = (cards || []).map(c => \`
          <div class="fc-card" onclick="app.openModal('\${c.local}', '\${c.phonetic}', '\${c.spanish}')">
            <div class="loc">\${c.local}</div>
            <div class="pho">\${c.phonetic || ''}</div>
            <div class="spa">\${c.spanish}</div>
          </div>
        \`).join('');
      },

      openModal(loc, pho, spa) {
        document.getElementById('mLoc').textContent = loc;
        document.getElementById('mPho').textContent = pho;
        document.getElementById('mSpa').textContent = spa;
        document.getElementById('giantModal').classList.add('active');
      },

      closeModal() {
        document.getElementById('giantModal').classList.remove('active');
      },

      renderChecklist(containerId, items, storageKey) {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const c = document.getElementById(containerId);
        c.innerHTML = items.map((item, idx) => \`
          <label class="chk-line \${saved[idx] ? 'done' : ''}">
            <input type="checkbox" \${saved[idx] ? 'checked' : ''} onchange="app.toggleChk('\${storageKey}', \${idx}, this)">
            <span>\${item}</span>
          </label>
        \`).join('');
      },

      toggleChk(key, idx, input) {
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        saved[idx] = input.checked;
        localStorage.setItem(key, JSON.stringify(saved));
        input.parentElement.classList.toggle('done', input.checked);
      },

      renderEmergency(em) {
        if (!em) return;
        document.getElementById('emergencyBox').innerHTML = \`
          <p><strong>Policía:</strong> \${em.police || '112'}</p>
          <p><strong>Ambulancia:</strong> \${em.ambulance || '112'}</p>
          <p style="margin-top:6px;"><strong>Embajada:</strong> \${em.embassy || '--'}</p>
          <p><strong>Hospital de referencia:</strong> \${em.hospital || '--'}</p>
        \`;
      },

      search(q) {
        const term = q.toLowerCase();
        document.querySelectorAll('.day-card').forEach(card => {
          const text = (card.getAttribute('data-search') || '').toLowerCase();
          const match = text.includes(term);
          card.style.display = match ? 'block' : 'none';
          if (match && term.length > 2) card.classList.add('open');
        });
      }
    };

    window.addEventListener('DOMContentLoaded', () => app.init());
  </script>
</body>
</html>`;
