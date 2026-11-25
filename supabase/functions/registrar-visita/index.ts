import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
    "https://rep0sitorios.github.io",
    "http://localhost:8000",
]);
const corsHeaders = (origin: string) => ({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
});
const allowedPages = new Set(["inicio", "enviar", "recuerdos", "admin"]);

Deno.serve(async (request) => {
    const origin = request.headers.get("origin") ?? "";
    if (!allowedOrigins.has(origin))
        return new Response("Origen no permitido", { status: 403 });
    const headers = corsHeaders(origin);
    if (request.method === "OPTIONS") return new Response("ok", { headers });
    if (request.method !== "POST")
        return new Response("Método no permitido", { status: 405, headers });

    try {
        const { pagina } = await request.json();
        if (!allowedPages.has(pagina))
            return new Response("Página no válida", { status: 400, headers });

        const forwarded = request.headers.get("x-forwarded-for");
        const ip =
            forwarded?.split(",")[0]?.trim() ||
            request.headers.get("cf-connecting-ip") ||
            null;
        const client = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        const { error } = await client.from("visitas").insert({ pagina, ip });
        if (error) throw error;
        return Response.json({ ok: true }, { headers });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "No se pudo registrar la visita.";
        return Response.json({ error: message }, { status: 500, headers });
    }
});
