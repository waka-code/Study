# Sesión 1 — Fundamentos: ¿Qué es C# y cómo funciona por dentro?

> **Objetivo de la sesión**: entender *qué es* C#, *sobre qué* corre (.NET / CLR), y *cómo* tu código pasa de texto a instrucciones que ejecuta el procesador. Al terminar deberías poder explicar con tus palabras qué son CLR, IL, JIT y GC, qué significa "managed code", y tener el SDK instalado ejecutando tu primer programa.

---

## 1. ¿Qué es C#?

C# (se pronuncia *"C sharp"*) es un lenguaje de programación creado por Microsoft (2000, por un equipo liderado por Anders Hejlsberg, el mismo de TypeScript). Sus características fundamentales:

| Característica | Qué significa |
|---|---|
| **Orientado a objetos** | Todo se organiza en clases y objetos (Sesión 5). También soporta programación funcional e imperativa. |
| **Fuertemente tipado** | Cada variable tiene un tipo conocido; el compilador verifica que los usos sean válidos *antes* de ejecutar. |
| **Compilado** | Tu código se traduce a otro formato antes de correr (no se interpreta línea a línea como Python "puro"). |
| **Managed code** | Corre sobre un *runtime* que gestiona memoria, seguridad y ejecución por ti. |
| **Multiplataforma** | Con .NET moderno corre en Windows, Linux y macOS. |

> ⚠️ **C# ≠ .NET**. C# es el **lenguaje** (la gramática que escribes). **.NET** es la **plataforma** (el runtime + las librerías) sobre la que ese lenguaje corre. Puedes escribir .NET también en F# o VB.NET. Es como la diferencia entre "el idioma español" y "el país donde se habla".

---

## 2. El ecosistema .NET (poner orden en los nombres)

Este es un punto donde **todos** se confunden al inicio. Ordenémoslo:

| Nombre | Qué es |
|---|---|
| **.NET Framework** (1.0 – 4.8) | El .NET **antiguo**, solo Windows. Legacy. No empieces aquí. |
| **.NET Core** (1.0 – 3.1) | La reescritura multiplataforma y open source. Nombre ya retirado. |
| **.NET 5, 6, 7, 8, 9…** | La unificación moderna. Desde .NET 5 se eliminó "Core" del nombre: es simplemente **.NET**. Esto es lo que usarás hoy. |
| **.NET Standard** | Una *especificación* de APIs comunes para compartir librerías entre Framework y Core. Cada vez menos relevante. |

**Regla práctica 2026**: usa la última versión **LTS** (Long Term Support). Las versiones **pares** (6, 8, 10…) son LTS (3 años de soporte); las **impares** (7, 9) son STS (18 meses). Para aprender y para producción estable → LTS.

Dentro de .NET distinguimos:
- **SDK** (Software Development Kit): todo lo necesario para **desarrollar** (compilador, CLI `dotnet`, plantillas). Instala esto.
- **Runtime**: solo lo necesario para **ejecutar** una app ya compilada. El SDK incluye el runtime.

---

## 3. Managed Code: la idea central

Cuando programas en C, tú gestionas la memoria a mano (`malloc`, `free`) y compilas directo a código máquina para *un* sistema operativo concreto. Eso es **unmanaged code**.

C# es **managed code**: no compila directo a código máquina, sino a un formato intermedio que corre sobre un **runtime** llamado **CLR**. El CLR se encarga de:

- **Gestión de memoria automática** (el Garbage Collector libera lo que no usas).
- **Seguridad de tipos** (no puedes tratar un `int` como un puntero arbitrario).
- **Manejo de excepciones** unificado.
- **Compilación final** a código máquina del equipo donde corre (JIT).

```
Unmanaged (C/C++)              Managed (C#)
────────────────               ─────────────────
tú gestionas memoria           el GC gestiona memoria
compilas para 1 SO             IL portable + JIT por plataforma
más control, más peligro       más seguro, más productivo
```

> **Frase de entrevista**: *"Managed code es código que corre bajo el control del CLR, que le provee gestión de memoria, seguridad de tipos y manejo de excepciones"*.

---

## 4. Las siglas que SIEMPRE preguntan (CLR, CTS, CLS, IL, JIT, GC)

Memoriza estas. Son el pan de cada entrevista de fundamentos.

### 4.1 CLR — Common Language Runtime
La **máquina virtual** de .NET: el motor que ejecuta tu programa. Carga el código, lo compila a código máquina (JIT), gestiona memoria (GC), hilos, excepciones y seguridad. Es el "corazón" del runtime. *Análogo conceptual*: la JVM de Java.

### 4.2 CTS — Common Type System
El conjunto de reglas que define **cómo son los tipos** en .NET (qué es un `int`, una `class`, un `struct`) de forma común para *todos* los lenguajes .NET. Gracias al CTS, un `int` de C# y un `Integer` de VB.NET son, en el fondo, **el mismo tipo** (`System.Int32`).

### 4.3 CLS — Common Language Specification
Un **subconjunto** de reglas del CTS que garantiza **interoperabilidad** entre lenguajes .NET. Si tu librería es "CLS-compliant", puede usarse desde C#, F#, VB.NET, etc. (Ej: C# distingue mayúsculas/minúsculas pero VB.NET no, así que el CLS prohíbe exponer públicamente dos miembros que solo difieran en el *case*.)

> Relación: **CLS ⊂ CTS**. El CLS es "las reglas comunes mínimas"; el CTS es "el sistema de tipos completo".

### 4.4 IL — Intermediate Language
También llamado **MSIL** o **CIL**. Es el "código máquina universal de .NET": el resultado de compilar tu C#. **No** depende del procesador ni del SO. Se guarda dentro de los archivos `.dll` / `.exe` que produces (llamados **assemblies**).

### 4.5 JIT — Just-In-Time Compiler
Cuando ejecutas la app, el JIT (parte del CLR) traduce el IL a **código máquina nativo** del equipo concreto, **justo antes** de ejecutar cada método (y lo cachea). Por eso el mismo `.dll` corre en Windows x64 y en Linux ARM: el IL es igual, el JIT genera lo específico en cada máquina.

### 4.6 GC — Garbage Collector
El **recolector de basura**: libera automáticamente la memoria de los objetos que ya no se usan, para que no tengas fugas de memoria. Lo veremos a fondo en la **Sesión 14**.

---

## 5. El proceso de compilación (de C# a CPU)

Este diagrama es *el* diagrama de la sesión. Entiéndelo de arriba a abajo:

```
        Tu código C#  (Program.cs)
              │
              ▼
   ┌────────────────────┐
   │  Compilador Roslyn  │   ← compilación (tiempo de BUILD)
   └────────────────────┘
              │
              ▼
   IL + metadata  →  se empaqueta en un ASSEMBLY (.dll / .exe)
              │
              ▼
   ┌────────────────────┐
   │        CLR          │   ← cuando EJECUTAS la app
   └────────────────────┘
              │
              ▼
   ┌────────────────────┐
   │        JIT          │   ← traduce IL → código máquina
   └────────────────────┘
              │
              ▼
     Código máquina nativo  →  lo ejecuta la CPU
```

Dos momentos distintos, no los confundas:
- **Build time** (`dotnet build`): Roslyn convierte C# → **IL**. Aquí se detectan errores de sintaxis y de tipos.
- **Run time** (`dotnet run` / ejecutas el `.dll`): el CLR carga el IL y el **JIT** lo vuelve código máquina.

> ❓ **Entrevista**: *"¿C# es compilado o interpretado?"* → Compilado **en dos pasos**: primero a IL (Roslyn), y luego a código máquina (JIT) en tiempo de ejecución. No es interpretado línea por línea.

### 5.1 ¿Y Native AOT?
Existe una alternativa moderna: **AOT** (Ahead-Of-Time) compila directo a código máquina nativo **en el build**, sin JIT en runtime → arranque más rápido y menor uso de memoria (ideal para microservicios/serverless), a costa de perder algo de flexibilidad (menos reflection). Lo profundizamos en la Sesión 31. Por ahora solo debes saber que **existe** y contrasta con JIT.

---

## 6. Anatomía de un programa C#

Históricamente un "Hola Mundo" se veía así (**estilo clásico**, aún lo verás en código antiguo):

```csharp
using System;                       // importa un namespace (colección de tipos)

namespace MiApp                     // agrupa tu código bajo un nombre
{
    class Program                   // una clase: la unidad básica de C#
    {
        static void Main(string[] args)   // el PUNTO DE ENTRADA del programa
        {
            Console.WriteLine("Hola Mundo");
        }
    }
}
```

Piezas clave:
- **`using System;`** → importa el *namespace* `System` para usar `Console` sin escribir su ruta completa.
- **`namespace`** → un contenedor lógico para organizar tipos y evitar choques de nombres.
- **`class Program`** → una clase (Sesión 5). Todo el código ejecutable vive dentro de tipos.
- **`Main`** → el método que el runtime busca para **empezar** a ejecutar. `static` = no necesita crear un objeto; `string[] args` = argumentos de la línea de comandos.
- **`Console.WriteLine(...)`** → imprime en la consola y salta de línea (`Write` no salta).

### 6.1 El estilo moderno (Top-Level Statements)
Desde C# 9 / .NET 6, las plantillas nuevas generan esto — el compilador **genera el `Main` por ti**:

```csharp
Console.WriteLine("Hola Mundo");
```

¡Una sola línea! Es el mismo programa: el `namespace`, la `class` y el `Main` siguen existiendo, pero el compilador los crea de forma implícita. Lo detallamos en la Sesión 18. Menciono ambos estilos porque **verás los dos** y no debes asustarte.

---

## 7. Manos a la obra: instalar y ejecutar

### 7.1 Instalar el SDK
En macOS (tu sistema) lo más cómodo es Homebrew:

```bash
brew install --cask dotnet-sdk
```

O descarga el instalador desde <https://dotnet.microsoft.com/download>. Verifica:

```bash
dotnet --version        # muestra la versión del SDK, ej: 8.0.xxx
dotnet --info           # runtimes y SDKs instalados + plataforma
```

### 7.2 Crear y correr tu primer proyecto

```bash
dotnet new console -o HolaCSharp   # crea una app de consola en la carpeta HolaCSharp
cd HolaCSharp
dotnet run                          # compila (build) y ejecuta en un solo paso
```

Salida esperada:

```
Hello, World!
```

### 7.3 ¿Qué generó? (estructura mínima)

```
HolaCSharp/
├── HolaCSharp.csproj   ← archivo de PROYECTO (config, versión de .NET, dependencias)
├── Program.cs          ← tu código (con top-level statements)
├── bin/                ← salida compilada (los .dll van aquí)
└── obj/                ← archivos intermedios del build
```

El **`.csproj`** es XML y describe *qué* y *cómo* se compila:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>          <!-- ejecutable -->
    <TargetFramework>net8.0</TargetFramework>  <!-- versión de .NET objetivo -->
    <ImplicitUsings>enable</ImplicitUsings>    <!-- usings comunes automáticos -->
    <Nullable>enable</Nullable>                 <!-- chequeo de nulos (Sesión 15) -->
  </PropertyGroup>
</Project>
```

Comandos que usarás a diario:

| Comando | Qué hace |
|---|---|
| `dotnet new <plantilla>` | Crea un proyecto (`console`, `webapi`, `classlib`…) |
| `dotnet build` | Compila (C# → IL) sin ejecutar |
| `dotnet run` | Compila **y** ejecuta |
| `dotnet add package <X>` | Agrega una dependencia NuGet |
| `dotnet test` | Corre las pruebas |
| `dotnet publish` | Empaqueta la app para desplegar |

---

## 8. Assemblies, NuGet y namespaces (vocabulario base)

- **Assembly**: la unidad compilada (`.dll` o `.exe`) que contiene IL + metadata. Es lo que .NET carga y ejecuta.
- **NuGet**: el gestor de paquetes de .NET (como npm en Node). De ahí bajas librerías de terceros: `dotnet add package Newtonsoft.Json`.
- **Namespace**: un "apellido" lógico para tus tipos (`System.Collections.Generic`). Evita colisiones y organiza el código. Se importan con `using`.

Estos tres los profundizamos en la Sesión 21 (proyecto y ecosistema), pero ya te suenan.

---

## 9. Resumen mental de la sesión

```
C#  ── es el LENGUAJE
.NET ── es la PLATAFORMA (runtime + librerías)
   │
   ├── SDK      → para desarrollar
   └── Runtime  → para ejecutar

Compilar:  C# ──(Roslyn)──▶ IL  ──(JIT)──▶ código máquina
El CLR orquesta todo en runtime: JIT + GC + tipos + seguridad
CTS = sistema de tipos común · CLS = subconjunto para interoperar
```

---

## 10. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Diferencia entre C# y .NET?
2. ❓ ¿Qué es "managed code" y qué le da el CLR?
3. ❓ ¿Qué es el IL y por qué hace a .NET multiplataforma?
4. ❓ ¿Qué hace el JIT y en qué momento actúa? ¿En qué se diferencia de AOT?
5. ❓ ¿CTS vs CLS?
6. ❓ ¿C# es compilado o interpretado? Justifica.
7. ❓ ¿Qué es un assembly? ¿Y un namespace?
8. ❓ ¿Por qué elegirías una versión LTS?

## 11. Ejercicio práctico
1. Instala el SDK y verifica con `dotnet --info`.
2. Crea el proyecto `HolaCSharp` y ejecútalo.
3. Modifica `Program.cs` para que imprima tu nombre y la fecha actual:
   ```csharp
   Console.WriteLine($"Hola, soy Waddini. Hoy es {DateTime.Now:yyyy-MM-dd}");
   ```
4. Corre `dotnet build` y busca el `.dll` generado dentro de `bin/`. Ese archivo contiene **IL**.
5. (Opcional avanzado) Instala la herramienta `dotnet tool install -g dotnet-ildasm` o abre el `.dll` en un descompilador online para *ver* el IL con tus ojos.

---

➡️ **Cuando termines**, marca la Sesión 1 en el [README](Readme.md) y pídeme la **Sesión 2 — Sintaxis básica, variables, tipos de datos y value vs reference (stack/heap)**.
