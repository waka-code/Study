# Tipos de Escalado en ASG

## 1️⃣ Target Tracking (el más usado)

Mantiene una **métrica objetivo** constante. AWS escala automáticamente para mantenerla.

**Ejemplo:**
- CPU promedio = 60%
- Si sube → agrega instancias
- Si baja → elimina instancias

**Ventajas:**
- Simple de configurar
- Eficiente
- Recomendado para la mayoría de casos

---

## 2️⃣ Step Scaling

Escala por **rangos definidos manualmente**.

**Ejemplo:**
| Condición | Acción |
| --- | --- |
| CPU > 70% | +2 instancias |
| CPU > 90% | +5 instancias |
| CPU < 30% | -1 instancia |

**Ventajas:**
- Mayor control
- Reacciones proporcionales a la carga

---

## 3️⃣ Scheduled Scaling

Escala según un **horario predefinido**.

**Ejemplo:**
| Hora | Instancias |
| --- | --- |
| 9:00 AM | 10 instancias |
| 10:00 PM | 2 instancias |

**Casos de uso:**
- Apps con picos predecibles (horario laboral)
- E-commerce con eventos programados

---

## 4️⃣ Predictive Scaling

AWS usa **Machine Learning** para predecir el tráfico futuro y escala antes de que llegue.

**Cómo funciona:**
- Analiza patrones históricos de uso
- Predice la carga futura
- Escala proactivamente antes del pico

**Ideal para:**
- E-commerce
- Eventos recurrentes
- Apps con patrones de uso claros

---

## Comparativa

| Tipo | Basado en | Control | Recomendado para |
| --- | --- | --- | --- |
| Target Tracking | Métrica objetivo | Automático | Mayoría de casos |
| Step Scaling | Rangos manuales | Manual | Control fino |
| Scheduled Scaling | Horario | Manual | Picos predecibles |
| Predictive Scaling | ML / historial | Automático | Patrones recurrentes |
