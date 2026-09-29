# Seguridad de Datos

Integrar un LLM significa **enviar datos a un tercero** (el proveedor), **guardarlos en sitios nuevos** (vector DB, logs de prompts, cachés, datasets de evals) y **exponerlos a un sistema que puede mezclarlos** (el modelo no distingue qué usuario puede ver qué). La seguridad de datos en LLMs cubre qué datos salen, dónde quedan, cuánto tiempo, quién puede recuperarlos y cómo se cumple la regulación.

**Por qué importa en producción:** los incidentes típicos no son hackeos sofisticados, sino un RAG multi-tenant que devuelve el documento de otro cliente, logs de prompts con RUTs y tarjetas en texto plano, o un dataset de evals con conversaciones reales compartido en un bucket. En B2B, las preguntas sobre esto aparecen en **cada revisión de seguridad** de un cliente enterprise.

---

## ⚙️ Superficie de datos en una app LLM

```
                    ┌────────────────── TU INFRAESTRUCTURA ──────────────────┐
 usuario ──prompt──▶│ API ──▶ logs/tracing ──▶ caché ──▶ cola                │
                    │  │                                                      │
                    │  ├──▶ vector DB (chunks + embeddings + metadata)       │
                    │  ├──▶ historial de conversación (DB)                   │
                    │  └──▶ datasets de evals / feedback                     │
                    └──┬──────────────────────────────────────────────────────┘
                       │ HTTPS
                       ▼
                    ┌────────────── PROVEEDOR LLM ──────────────┐
                    │ procesamiento, logs de abuso (retención),  │
                    │ ¿entrenamiento?, región de procesamiento   │
                    └────────────────────────────────────────────┘
```

Cada flecha es un lugar donde el dato puede filtrarse o quedarse más tiempo del debido.

---

## 🔴 Problemas comunes

- **Fuga cross-tenant en RAG**: la búsqueda vectorial no filtra por tenant → el modelo responde con datos de otra empresa.
- **Permisos ignorados**: se indexa todo el Drive/Confluence y cualquiera puede preguntar por documentos de RRHH.
- **Logs con PII**: prompts y respuestas completos en Datadog/CloudWatch, retenidos 1 año, accesibles para todo ingeniería.
- **Embeddings tratados como anónimos**: se pueden invertir parcialmente para reconstruir texto; son datos sensibles.
- **Caché compartido**: respuesta personalizada servida a otro usuario.
- **Proveedor sin contrato adecuado** (DPA) o con uso de datos para entrenamiento en planes de consumidor.
- **Derecho al olvido**: se borra al usuario de la DB, pero sus datos siguen en vector DB, logs y datasets.

---

## ✅ Minimizar PII antes de enviarla

La mejor PII es la que nunca sale.

```typescript
// ✅ Pseudonimización reversible: el modelo ve tokens, tu backend reidentifica
export class Pseudonymizer {
  private map = new Map<string, string>();
  private reverse = new Map<string, string>();

  mask(text: string, patterns: Record<string, RegExp>): string {
    let out = text;
    for (const [type, re] of Object.entries(patterns)) {
      out = out.replace(re, (match) => {
        if (!this.map.has(match)) {
          const token = `<${type}_${this.map.size + 1}>`;
          this.map.set(match, token);
          this.reverse.set(token, match);
        }
        return this.map.get(match)!;
      });
    }
    return out;
  }

  unmask(text: string): string {
    return text.replace(/<[a-z]+_\d+>/g, (t) => this.reverse.get(t) ?? t);
  }
}

// "Juan (juan@acme.cl, RUT 12.345.678-9) pide reembolso"
// → "Juan (<email_1>, RUT <rut_2>) pide reembolso" → LLM → unmask en la respuesta
```

- Envía **solo los campos necesarios** (no el objeto `customer` completo).
- Para nombres/direcciones, NER (Presidio, servicios cloud de detección de PII).
- Si el caso de uso exige PII (p. ej. redactar un contrato), asegúrate de tener la base legal y el contrato con el proveedor.

---

## ✅ Proveedor: retención, entrenamiento y ZDR

Preguntas que hay que responder (y que un cliente enterprise hará):

| Pregunta | Qué buscar |
|---|---|
| ¿Usan mis datos para entrenar? | En APIs comerciales normalmente **no por defecto**; verificar términos vigentes |
| ¿Cuánto retienen inputs/outputs? | Retención limitada (días/semanas) para monitoreo de abuso, según política |
| ¿Zero Data Retention (ZDR)? | Acuerdo por el que no se almacenan prompts/respuestas tras procesarlos; suele requerir contrato y excluye algunas features |
| ¿Dónde se procesan? | Región / residencia de datos (UE, US); o vía cloud (Bedrock, Vertex, Azure) en tu región |
| ¿Hay DPA y subprocesadores listados? | Necesario para GDPR |
| ¿Certificaciones? | SOC 2 Type II, ISO 27001, HIPAA BAA si aplica |

⚠️ Features con estado (batch, archivos subidos, prompt caching, threads/assistants almacenados) pueden implicar retención adicional: revísalo por feature.

Opciones según sensibilidad:

```
 menos sensible ─────────────────────────────────────────▶ más sensible
 API pública     API con DPA     Cloud provider en      Modelo open-weights
 estándar        + ZDR           tu región/VPC          self-hosted en tu infra
```

---

## ✅ Multi-tenant en RAG y permisos a nivel de documento

**Regla de oro:** el filtrado de permisos ocurre **en el retrieval**, en el backend, antes de que el texto llegue al modelo. Nunca pidas al modelo que "no muestre documentos de otros".

```typescript
// ❌ Búsqueda global, "filtrar después" o confiar en el prompt
const chunks = await vectorDb.search({ vector, topK: 5 });

// ✅ Filtro por tenant + ACL en la query vectorial (pgvector)
const chunks = await db.$queryRaw<Chunk[]>`
  SELECT c.id, c.content, c.document_id
  FROM chunks c
  WHERE c.tenant_id = ${user.tenantId}
    AND c.acl_groups && ${user.groupIds}::text[]      -- permisos a nivel de documento
  ORDER BY c.embedding <=> ${vector}::vector
  LIMIT 5`;
```

Estrategias de aislamiento:

| Estrategia | Aislamiento | Costo operativo |
|---|---|---|
| Filtro de metadata (`tenant_id`) en índice compartido | Lógico (depende de no olvidar el filtro) | Bajo |
| Namespace / colección por tenant | Mejor | Medio |
| Índice / DB por tenant | Fuerte | Alto |
| Row-Level Security en Postgres (pgvector) | Enforcement en la DB | Bajo–medio |

```sql
-- ✅ RLS: aunque el código olvide el WHERE, la DB lo impone
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON chunks
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

- Sincroniza ACLs con la fuente (Drive, SharePoint, Confluence): si se revoca acceso al documento, debe dejar de recuperarse.
- Los permisos se evalúan con la identidad **del usuario final**, no con la service account del indexador.
- Tests automáticos de aislamiento: "usuario del tenant A pregunta por dato del tenant B" → 0 resultados.

---

## ✅ Cifrado y secretos

- **En tránsito**: TLS hacia el proveedor y entre servicios.
- **En reposo**: cifrado de DB, vector DB, buckets y backups (KMS); claves por tenant si el cliente lo exige (BYOK).
- API keys del proveedor en un secret manager, rotadas, **una por entorno/servicio** para poder revocar y atribuir consumo.
- El modelo nunca ve secretos (ver [24-prompt-injection](./24-prompt-injection.md)).

---

## ✅ Logs y observabilidad sin filtrar datos

```typescript
// ❌
logger.info({ prompt, response }, 'llm call');

// ✅ Metadata por defecto; contenido solo redactado, muestreado y con retención corta
logger.info({
  traceId, tenantId, model, promptVersion,
  inputTokens: res.usage.input_tokens,
  outputTokens: res.usage.output_tokens,
  latencyMs,
}, 'llm call');

if (shouldSampleContent(tenantId)) {
  await llmTraceStore.save({
    traceId,
    prompt: redactPII(prompt).text,
    response: redactPII(text).text,
    expiresAt: addDays(new Date(), 30), // ✅ TTL
  });
}
```

- Acceso a trazas con contenido restringido y auditado.
- Tenants enterprise pueden exigir **no loggear contenido** (flag por tenant).
- Datasets de evals desde producción: anonimizados y con consentimiento/base legal.

---

## ✅ Cumplimiento: GDPR y leyes locales

- **GDPR (UE)**: base legal, minimización, DPA con el proveedor (subencargado), transferencias internacionales (cláusulas contractuales tipo), derechos de acceso/rectificación/**supresión**, DPIA para tratamientos de alto riesgo, derecho a no ser objeto de decisiones automatizadas con efectos significativos sin intervención humana.
- **Chile**: la Ley 21.719 (nueva ley de protección de datos personales, que reemplaza a la Ley 19.628 y crea una agencia de protección de datos) se inspira en GDPR: consentimiento/base legal, derechos ARCO+, transferencia internacional y sanciones. Revisa su entrada en vigencia y reglamentos.
- **Otras**: LGPD (Brasil), CCPA/CPRA (California), HIPAA (salud en EE. UU.), EU AI Act (obligaciones según nivel de riesgo del sistema de IA).
- **Derecho al olvido end-to-end**: al borrar un usuario, borra también sus chunks/embeddings, historial, cachés, trazas y casos de evals.

```typescript
async function eraseUserData(userId: string) {
  await Promise.all([
    db.conversation.deleteMany({ where: { userId } }),
    vectorDb.delete({ filter: { ownerId: userId } }),
    deleteByPattern(redis, `llm:user:${userId}:*`), // helper con SCAN + DEL (nunca KEYS en prod)
    llmTraceStore.deleteByUser(userId),
  ]);
  await auditLog.record({ action: 'erasure', userId });
}
```

---

## ⚖️ Trade-offs

| Decisión | Pro | Contra |
|---|---|---|
| Redactar PII antes del LLM | Menos exposición | Puede degradar la calidad si el dato era necesario |
| ZDR | Máxima privacidad con el proveedor | Contrato, algunas features no disponibles, menos debug |
| Self-hosting | Control total de datos | Costo de GPU, operación, modelos menos capaces |
| Índice por tenant | Aislamiento fuerte | Más infraestructura, costo por tenant pequeño |
| No loggear contenido | Privacidad | Debugging y evals mucho más difíciles |

---

## 📊 Números de referencia (aproximados)

- Retención de logs con contenido: **~7–30 días** es un rango habitual; metadata puede vivir más.
- Retención del proveedor sin ZDR: del orden de **días a semanas** según política (verificar la vigente).
- Multas GDPR: hasta **4% de la facturación global anual** o €20M, lo que sea mayor.

---

## 🎤 Preguntas de entrevista

**1. ¿Cómo evitas que un RAG multi-tenant filtre datos entre clientes?**
Filtro obligatorio por tenant y ACL en la query vectorial (idealmente impuesto por RLS o por namespace), identidad del usuario final, tests automáticos de aislamiento y caché particionado por tenant. Nunca delego eso al prompt.

**2. ¿Qué es Zero Data Retention?**
Acuerdo con el proveedor por el que no almacena prompts ni respuestas más allá del procesamiento. Suele requerir contrato enterprise y puede limitar features con estado.

**3. ¿Los embeddings son datos personales?**
Pueden serlo: derivan del texto y se pueden invertir parcialmente. Los trato con el mismo nivel de protección que el texto fuente, incluido el borrado.

**4. Un cliente enterprise pregunta qué pasa con sus datos. ¿Qué respondes?**
Qué datos enviamos (minimizados), a qué proveedor y región, bajo qué DPA, retención y si hay ZDR, que no se usan para entrenamiento, cifrado, aislamiento por tenant, qué logueamos y por cuánto tiempo, y cómo ejercen borrado.

**5. ¿Cómo loggeas llamadas LLM sin violar privacidad?**
Metadata siempre (tokens, latencia, modelo, versión de prompt); contenido redactado, muestreado, con TTL corto y acceso auditado; opt-out por tenant.

**6. ¿Cómo implementas el derecho de supresión en una app con RAG?**
Mantengo un mapa de dónde vive cada dato del usuario (DB, vector DB, caché, trazas, datasets) y un proceso de borrado que los recorre todos, con registro de auditoría.

**7. ¿Cuándo self-hostearías un modelo?**
Cuando la regulación o el contrato impide enviar datos a terceros, o hay requisitos de residencia no cubiertos por el proveedor o el cloud; asumiendo el costo operativo y la posible pérdida de calidad.

---

## 🔗 Relacionado

- [09-embeddings](./09-embeddings.md)
- [10-vector-databases](./10-vector-databases.md)
- [11-rag](./11-rag.md)
- [22-guardrails](./22-guardrails.md)
- [24-prompt-injection](./24-prompt-injection.md)
- [31-observabilidad-llmops](./31-observabilidad-llmops.md)
- [34-arquitectura-llm-en-produccion](./34-arquitectura-llm-en-produccion.md)
