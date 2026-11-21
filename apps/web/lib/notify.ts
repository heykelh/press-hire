import "server-only";

/** Notification ntfy (publication JSON : accents et émojis sans souci d'en-têtes). */
export async function ntfy(msg: { title: string; message: string; click?: string; tags?: string[]; priority?: 1 | 2 | 3 | 4 | 5 }): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  const server = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/+$/, "");
  try {
    await fetch(server, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.NTFY_TOKEN ? { authorization: `Bearer ${process.env.NTFY_TOKEN}` } : {}) },
      body: JSON.stringify({ topic, ...msg }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[press-hire] ntfy", (e as Error).message);
  }
}
