# Chatbot Modal - Configuración

## 🤖 Descripción

Se ha agregado un **modal flotante de chatbot** que permite interpretar el dashboard mediante la API de Groq. El chatbot está disponible en todas las páginas del dashboard y puede responder preguntas sobre:

- Ciclos de cultivo (activos, planificados, históricos)
- Fenogramas y evolución fenológica
- Mortandades y problemas de plantas
- Programaciones de actividades
- Comparaciones entre ciclos
- Balanzas y rendimiento post-cosecha
- Métricas y análisis operacionales

## 📋 Archivos Creados/Modificados

### Nuevos:
- `src/components/dashboard/chatbot-modal.tsx` - Componente flotante del chatbot
- `src/app/api/chat/route.ts` - API endpoint para procesar preguntas con Groq
- `CHATBOT_SETUP.md` - Este archivo

### Modificados:
- `.env` - Agregada variable `GROQ_API_KEY`
- `src/app/(dashboard)/layout.tsx` - Integración del ChatbotModal

## 🔑 Configuración Necesaria

### 1. Obtener API Key de Groq

1. Ve a [Groq Console](https://console.groq.com)
2. Crea una cuenta (es gratuito)
3. Genera una API key
4. Copia la key en el archivo `.env`:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
```

### 2. Modelos Disponibles

El endpoint usa el modelo **`openai/gpt-oss-120b`** de Groq:
- ✅ Disponible en Groq
- ✅ Rápido (inferencia optimizada)
- ✅ Excelente para análisis y preguntas complejas
- ✅ Soporte multiidioma (español incluido)

## 🎨 Interfaz de Usuario

### Botón Flotante
- Ubicado en la esquina inferior derecha
- Ícono de chat (`MessageCircle`)
- Gradient background (primary color)
- Animación al pasar el mouse

### Modal de Chat
- Diseño limpio y moderno
- Historial de mensajes con scroll automático
- Input con soporte para Enter (Shift+Enter para saltos de línea)
- Estados de carga visuales
- Responsive (se adapta a dispositivos móviles)

## 💬 Ejemplo de Preguntas

```
- "¿Cuál es la mortandad promedio en el ciclo actual?"
- "Explica el fenograma de la última semana"
- "¿Por qué bajó el rendimiento en esta área?"
- "Compara los últimos dos ciclos"
- "¿Cuántas plantas hay por cama en promedio?"
```

## 🚀 Uso

1. Navega a cualquier página del dashboard (Fenograma, Mortandades, Programaciones, etc.)
2. Haz clic en el botón flotante de chat en la esquina inferior derecha
3. Escribe tu pregunta
4. Presiona Enter o haz clic en el botón de envío
5. El chatbot responderá interpretando tu pregunta según el contexto actual

## 🔧 Desarrollo

### Agregar Contexto Personalizado

Para pasar contexto específico de una página al chatbot:

```tsx
// En cualquier página/componente
<ChatbotModal
  dashboardContext={{
    currentCycle: "Ciclo 2026-001",
    selectedArea: "Area A",
    filters: {...}
  }}
/>
```

### Modificar el Prompt del Sistema

El prompt sistema está definido en `src/app/api/chat/route.ts`:

```typescript
const systemPrompt = `Eres un asistente experto en análisis de dashboards...`
```

## ⚡ Notas Técnicas

- **Stack**: Next.js 16, React 19, Groq API
- **Tipo de componente**: Client Component (usa `"use client"`)
- **Fetch**: Utiliza `fetchJson` helper del proyecto
- **Estilos**: Tailwind CSS con colores del tema
- **Iconos**: Lucide React

## 📊 Límites y Consideraciones

- **Max tokens**: 1024 (respuestas concisas)
- **Temperature**: 0.7 (balance entre creatividad y precisión)
- **Modelo**: Mixtral 8x7b (optimizado para velocidad)
- **Latencia esperada**: 1-3 segundos por respuesta
- **Rate limits**: Groq tiene límites generosos para la API gratuita

## 🐛 Troubleshooting

### "GROQ_API_KEY no configurada"
→ Asegúrate de tener `GROQ_API_KEY` en `.env` y reinicia el servidor

### El modal no aparece
→ Verifica que JavaScript esté habilitado
→ Revisa la consola del navegador para errores

### Las respuestas están cortadas
→ Aumenta `max_tokens` en `/api/chat/route.ts`

### El chatbot no entiende el contexto
→ Agrega más información en el `systemPrompt`
→ Mejora la serialización del `dashboardContext`

## 📝 TODO/Mejoras Futuras

- [ ] Persistir historial en localStorage
- [ ] Agregar ejemplos de preguntas sugeridas
- [ ] Soporte para generación de gráficos basados en preguntas
- [ ] Integración con acciones del dashboard (filtrado automático)
- [ ] Análisis de imágenes (si Groq agrega soporte)
- [ ] Multi-idioma (detectar idioma del usuario)

---

**Versión**: 1.0
**Fecha**: 2026-04-07
**Estado**: ✅ Funcional y listo para producción
