import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: Record<string, unknown>;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = (await request.json()) as ChatRequest;

    // Log para debugging
    console.log("[CHAT] Context recibido:", JSON.stringify(context));
    console.log("[CHAT] Messages:", messages.length, "mensajes");

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Construir contexto para el sistema - OPTIMIZADO PARA TOKENS
    const contextStr = context ? JSON.stringify(context) : "{}";
    const systemPrompt = `Eres un asistente del dashboard agrícola. Responde EN ESPAÑOL sobre ciclos, áreas, variedades.

HECHOS (usa estos números exactamente):
- ${context?.activeCount || 0} ciclos ACTIVOS ahora
- ${context?.plannedCount || 0} ciclos PLANIFICADOS
- ${context?.historyCount || 0} ciclos en HISTORIA
- Áreas: ${Array.isArray(context?.areas) ? context.areas.length : 0} (${Array.isArray(context?.areas) ? context.areas.join(", ") : "ninguna"})
- Variedades: ${Array.isArray(context?.varieties) ? context.varieties.length : 0} (${Array.isArray(context?.varieties) ? context.varieties.join(", ") : "ninguna"})
- Total: ${context?.totalStems?.toLocaleString("es-ES") || "0"} tallos
- Fecha: ${context?.today || "desconocida"}

IMPORTANTE: Responde SIEMPRE con los números y datos que ves arriba. Sé directo y conciso.
CONTEXTO JSON: ${contextStr}`;

    // Preparar mensajes para Groq
    const groqMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Llamar a Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: groqMessages,
        temperature: 0.2, // Bajo: respuestas enfocadas
        max_tokens: 256,  // Reducido: respuestas cortas
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[CHAT] Groq API error:", response.status, errorData);

      // Log the request details for debugging
      console.error("[CHAT] Request body:", JSON.stringify({
        model: "mixtral-8x7b-32768",
        temperature: 0.7,
        max_tokens: 1024,
      }));

      return NextResponse.json(
        { error: `Groq API error (${response.status}): ${errorData.substring(0, 200)}` },
        { status: 500 } // Return 500 instead of Groq's status for clearer client-side handling
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content || "Sin respuesta";

    return NextResponse.json({ content });
  } catch (error) {
    console.error("[CHAT] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
