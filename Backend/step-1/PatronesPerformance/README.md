# ⚡ Patrones de Performance en la Programación

Lista de patrones clave para entrevistas senior, con definición breve de cada uno.

---

1. **Caching Pattern**
   Almacenamiento temporal de datos para reducir cálculos costosos o llamadas repetidas.

2. **Lazy Loading Pattern**
   Carga de recursos solo cuando son necesarios, evitando trabajo innecesario inicial.

3. **Eager Loading Pattern**
   Carga anticipada de datos relacionados para evitar múltiples accesos repetidos.

4. **Pagination Pattern**
   División de grandes conjuntos de datos en páginas para reducir carga y consumo de memoria.

5. **Batch Processing Pattern**
   Procesamiento de datos en grupos para reducir sobrecarga y mejorar eficiencia.

6. **Throttling Pattern**
   Limitación controlada del uso de recursos para evitar saturación del sistema.

7. **Rate Limiting Pattern**
   Restricción del número de solicitudes en un periodo de tiempo para proteger rendimiento.

8. **Debounce Pattern**
   Retraso de la ejecución de una acción hasta que cesa una secuencia continua de eventos.

9. **Throttle Pattern**
   Ejecución de una acción a intervalos definidos, sin importar la frecuencia del evento.

10. **Asynchronous Processing Pattern**
    Ejecución de tareas en segundo plano para evitar bloqueos del hilo principal.

11. **Queue-Based Load Leveling Pattern**
    Uso de colas para distribuir carga y suavizar picos de tráfico.

12. **Circuit Breaker Pattern**
    Prevención de llamadas repetidas a servicios fallidos para proteger recursos.

13. **Bulkhead Pattern**
    Aislamiento de recursos para evitar que una falla afecte a todo el sistema.

14. **Connection Pooling Pattern**
    Reutilización de conexiones para evitar el costo de crearlas repetidamente.

15. **Read/Write Splitting Pattern**
    Separación de operaciones de lectura y escritura para escalar de forma eficiente.

16. **Horizontal Scaling Pattern**
    Aumento de capacidad mediante múltiples instancias del servicio.

17. **Vertical Scaling Pattern**
    Aumento de recursos en una sola instancia para mejorar rendimiento.

18. **Data Denormalization Pattern**
    Duplicación controlada de datos para reducir consultas complejas.

19. **Indexing Pattern**
    Uso de índices para acelerar búsquedas y consultas en bases de datos.

20. **Content Delivery Network (CDN) Pattern**
    Distribución de contenido desde servidores cercanos al usuario para reducir latencia.

21. **Compression Pattern**
    Reducción del tamaño de datos transmitidos o almacenados para mejorar velocidad.

22. **Streaming Pattern**
    Procesamiento o envío de datos en flujo continuo sin cargar todo en memoria.

23. **Memoization Pattern**
    Almacenamiento de resultados de funciones costosas para reutilización.

24. **Prefetching Pattern**
    Carga anticipada de datos que probablemente serán requeridos próximamente.

25. **Server-Side Rendering (SSR) Pattern**
    Renderizado del contenido en el servidor para mejorar tiempo de carga inicial.

---

## 🧠 Nota clave para entrevista Senior

No esperan que digas **todos**, sino que:

* Identifiques **el cuello de botella**
* Elijas **el patrón correcto**
* Expliques el **trade-off**

---

¿Quieres que los ordene por Frontend/Backend/Infra, marque imprescindibles o compare performance vs seguridad?
