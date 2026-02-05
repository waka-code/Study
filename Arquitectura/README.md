# Arquitectura en Capas (Layered Architecture)

La arquitectura en capas es un patrón clásico de organización de software que separa la aplicación en capas bien definidas, cada una con responsabilidades claras.

## Capas típicas

```
UI
Application
Domain
Infrastructure
```

### Descripción de cada capa

- **UI (User Interface):** Interfaz de usuario, responsable de la interacción con el usuario. No accede directamente a la base de datos ni a detalles de infraestructura.
- **Application:** Orquesta los casos de uso y la lógica de aplicación. Coordina el flujo entre UI y Domain.
- **Domain:** Contiene la lógica de negocio pura y las reglas del dominio. No depende de frameworks ni de detalles de infraestructura.
- **Infrastructure:** Implementa detalles técnicos como acceso a base de datos, servicios externos, frameworks, etc. Es reemplazable y no debe afectar la lógica de negocio.

## Reglas clave

- **UI no habla con DB:** La interfaz de usuario nunca accede directamente a la base de datos ni a la infraestructura.
- **Domain no depende de frameworks:** El dominio es puro y no tiene dependencias con frameworks o tecnologías externas.
- **Infrastructure es reemplazable:** Puedes cambiar la infraestructura (por ejemplo, cambiar de base de datos) sin afectar el dominio ni la lógica de aplicación.

---

## Relación con Clean Architecture

La arquitectura en capas es la base de la Clean Architecture, que refuerza la separación de responsabilidades y la independencia del dominio respecto a detalles externos.

---

## Ejemplo visual

```mermaid
graph TD;
  UI --> Application;
  Application --> Domain;
  Application --> Infrastructure;
  Infrastructure --> Domain;
```

---

## ¿Por qué usarla?
- Facilita el mantenimiento y la escalabilidad.
- Permite pruebas más sencillas.
- Hace posible reemplazar tecnologías sin reescribir la lógica de negocio.

---

## Ejemplo mínimo en TypeScript

Supongamos una app de tareas:

### UI
```typescript
// ui/App.ts
import { TaskService } from '../application/TaskService';
const service = new TaskService();
console.log(service.getTasks());
```

### Application
```typescript
// application/TaskService.ts
import { TaskRepository } from '../infrastructure/TaskRepository';
export class TaskService {
  private repo = new TaskRepository();
  getTasks() { return this.repo.findAll(); }
}
```

### Domain
```typescript
// domain/Task.ts
export class Task {
  constructor(public id: number, public title: string) {}
}
```

### Infrastructure
```typescript
// infrastructure/TaskRepository.ts
import { Task } from '../domain/Task';
export class TaskRepository {
  findAll() { return [new Task(1, 'Aprender SOLID')]; }
}
```

# 🧠 PATRONES MODERNOS (NO GOF)

## 🔹 Dependency Injection
Permite desacoplar la creación de dependencias de la lógica de negocio, facilitando el testing y la mantenibilidad. Muy usado en frameworks modernos.

## 🔹 Repository
Abstrae el acceso a datos, permitiendo trabajar con colecciones de objetos como si fueran una base de datos en memoria. Facilita el cambio de fuente de datos y el testing.

## 🔹 Unit of Work
Gestiona un conjunto de operaciones como una única transacción, asegurando la consistencia y el control de cambios en el almacenamiento de datos.

## 🔹 CQRS
Separa los modelos de lectura y escritura, permitiendo optimizar y escalar cada uno de forma independiente. Útil en sistemas con alta demanda de consultas y comandos complejos.

## 🔹 Event Sourcing
En lugar de almacenar solo el estado actual, guarda todos los eventos que modifican el estado. Permite reconstruir el estado y auditar cambios fácilmente.

## 🔹 Specification
Permite encapsular reglas de negocio y criterios de consulta en objetos reutilizables y combinables, facilitando la validación y filtrado complejo.

## 🔹 Clean Architecture
Arquitectura que separa el dominio de detalles externos (frameworks, bases de datos, UI), facilitando el testing, la mantenibilidad y la evolución del sistema.

## 🔹 Hexagonal Architecture
También llamada Ports and Adapters, aísla el core de la aplicación de detalles externos mediante puertos y adaptadores, facilitando pruebas y cambios tecnológicos.
