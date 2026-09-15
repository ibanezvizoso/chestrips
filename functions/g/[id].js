// functions/g/[id].js

export async function onRequestGet(context) {
  const { params, env } = context;
  const id = params.id;

  if (!env.GUIAS_KV) {
    return new Response("Error: KV no vinculado en Cloudflare.", { status: 500 });
  }

  // Leer el HTML generado directamente de la memoria Edge de Cloudflare
  const html = await env.GUIAS_KV.get(id);

  if (!html) {
    return new Response("La guía solicitada no existe o aún se está procesando.", { 
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  // Devolver el HTML listo para renderizar en el navegador al instante
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
