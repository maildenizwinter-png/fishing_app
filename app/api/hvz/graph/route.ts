// Proxy für die HVZ-Abfluss-Grafik (GIF). Serverseitig geholt, um Hotlink-/
// CORS-/Referrer-Probleme zu vermeiden. type=2002 = Abfluss (Q), 2001 = Wasserstand (W).
const BASE = "https://www.hvz.baden-wuerttemberg.de/gifs/";
const UA = { headers: { "User-Agent": "Mozilla/5.0" } };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim();
  const type = url.searchParams.get("type") === "2001" ? "2001" : "2002";
  if (!/^\d{4,6}$/.test(id)) {
    return new Response("bad id", { status: 400 });
  }
  try {
    const res = await fetch(`${BASE}${id}-${type}.GIF`, { ...UA, next: { revalidate: 900 } });
    if (!res.ok) return new Response("not found", { status: 404 });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
}
