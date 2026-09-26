# Sesión 21 — .NET SDK, CLI, estructura de proyecto y NuGet: el ecosistema de trabajo real

> **Objetivo de la sesión**: dominar las herramientas con las que se construye cualquier proyecto .NET profesional: el **SDK** y su versionado (`global.json`), la **CLI `dotnet`**, el formato **SDK-style `.csproj`** y MSBuild, las **soluciones** multi-proyecto, **NuGet** (paquetes, versiones, lock files, Central Package Management), configuración compartida con `Directory.Build.props`, y los modos de **publish** (framework-dependent, self-contained, single-file, AOT). Al terminar deberías poder montar desde cero una solución con API + librería + tests, lista para CI, y explicar en una entrevista qué pasa exactamente cuando ejecutas `dotnet build`.

---

## 1. SDK vs Runtime (repaso rápido y lo que falta)

En la **Sesión 1** vimos que el **SDK** es para desarrollar y el **Runtime** para ejecutar. Ahora el detalle:

```
.NET SDK 8.0.4xx
├── CLI  (dotnet.exe / dotnet)      ← el "driver" que despacha comandos
├── MSBuild                         ← el motor de build real
├── Roslyn (csc)                    ← compilador C# → IL
├── NuGet client                    ← restore de paquetes
├── Templates                       ← dotnet new
└── Runtimes incluidos
     ├── Microsoft.NETCore.App        (runtime base: consola, librerías)
     ├── Microsoft.AspNetCore.App     (ASP.NET Core — Sesión 23)
     └── Microsoft.WindowsDesktop.App (solo Windows: WPF/WinForms)
```

Los tres runtimes son **shared frameworks**: se instalan una vez en la máquina y todas las apps framework-dependent los comparten.

```bash
dotnet --list-sdks        # 8.0.404 [/usr/local/share/dotnet/sdk]  ...
dotnet --list-runtimes    # Microsoft.NETCore.App 8.0.11 ... Microsoft.AspNetCore.App 8.0.11 ...
dotnet --info             # todo lo anterior + RID de la máquina (osx-arm64)
```

> ⚠️ **Versión del SDK ≠ versión del runtime ≠ versión de C#**. SDK `8.0.404` trae runtime `8.0.11` y compila C# 12 por defecto. El `TargetFramework` del proyecto (`net8.0`) decide contra qué runtime corres; el SDK decide qué herramientas usas.

| Concepto | Ejemplo | Lo decide |
|---|---|---|
| Versión SDK | 8.0.404 | `global.json` o el más nuevo instalado |
| Target Framework (TFM) | `net8.0` | `<TargetFramework>` en el `.csproj` |
| Versión runtime en ejecución | 8.0.11 | Roll-forward: el último *patch* instalado de 8.0 |
| Versión de C# | 12 | Por defecto según TFM; `<LangVersion>` la fuerza |

### 1.1 `global.json`: fijar el SDK

Sin `global.json`, la CLI usa **el SDK más nuevo instalado**. Si un compañero tiene .NET 9 SDK y tú el 8, pueden obtener resultados distintos (analizadores nuevos, warnings nuevos). En equipos y CI se fija:

```bash
dotnet new globaljson --sdk-version 8.0.404 --roll-forward latestFeature
```

```json
{
  "sdk": {
    "version": "8.0.404",
    "rollForward": "latestFeature"
  }
}
```

`rollForward: latestFeature` = acepta cualquier 8.0.4xx o superior dentro de 8.0 (8.0.5xx…), pero no salta a 9.0. La CLI busca `global.json` subiendo desde el directorio actual.

> ❓ **Entrevista**: *"¿Para qué sirve `global.json`?"* → Para fijar qué versión del SDK usa la CLI en ese repositorio, garantizando builds reproducibles entre desarrolladores y CI. No afecta al runtime en el que corre la app (eso lo hace el `TargetFramework`).

---

## 2. La CLI `dotnet` a fondo

| Comando | Qué hace | Flags útiles |
|---|---|---|
| `dotnet new <tpl>` | Crea proyecto/archivo desde plantilla | `-o`, `-n`, `--framework`, `dotnet new list` |
| `dotnet restore` | Descarga dependencias NuGet → `obj/project.assets.json` | `--locked-mode` |
| `dotnet build` | restore + compila → `bin/<Config>/<TFM>/` | `-c Release`, `--no-restore`, `-warnaserror` |
| `dotnet run` | build + ejecuta el proyecto | `--project`, `-- <args de la app>` |
| `dotnet watch` | Recompila / hot reload al guardar | `dotnet watch run` |
| `dotnet test` | build + ejecuta tests | `--filter`, `--collect:"XPlat Code Coverage"` |
| `dotnet publish` | Prepara la salida para desplegar | `-c Release`, `-r linux-x64`, `--self-contained` |
| `dotnet pack` | Crea un paquete `.nupkg` | `-c Release`, `-o ./nupkgs` |
| `dotnet add package` | Agrega `PackageReference` | `--version` |
| `dotnet add reference` | Agrega `ProjectReference` | |
| `dotnet sln` | Gestiona la solución | `add`, `remove`, `list` |
| `dotnet list package` | Lista paquetes | `--outdated`, `--vulnerable`, `--include-transitive` |
| `dotnet format` | Aplica estilo según `.editorconfig` | `--verify-no-changes` (CI) |
| `dotnet tool` | Herramientas .NET (global/local) | `install -g`, `restore` |
| `dotnet clean` | Borra salidas del build | |

Los comandos **encadenan** implícitamente: `run` → `build` → `restore`. En CI se separan para cachear y fallar rápido:

```bash
dotnet restore --locked-mode
dotnet build -c Release --no-restore -warnaserror
dotnet test  -c Release --no-build
dotnet publish src/Api -c Release --no-build -o ./out
```

> ⚠️ En `dotnet run`, los argumentos para **tu app** van después de `--`: `dotnet run -- --puerto 8080`. Sin el `--`, la CLI intenta interpretarlos ella.

### 2.1 ¿Qué pasa exactamente en `dotnet build`?

```
dotnet build
   │
   ▼
CLI ──► MSBuild evalúa el .csproj
          │  (importa Sdk.props → tu .csproj → Sdk.targets, Directory.Build.*)
          ▼
        Target Restore  ──► NuGet: resuelve grafo, baja a ~/.nuget/packages
          │                  escribe obj/project.assets.json
          ▼
        Target CoreCompile ─► Roslyn (csc) + analyzers + source generators (Sesión 20)
          │                  C# → IL  → obj/Debug/net8.0/MiApp.dll
          ▼
        Copy to output ──► bin/Debug/net8.0/
                             MiApp.dll          (IL + metadata)
                             MiApp.exe/MiApp    (apphost nativo: lanzador)
                             MiApp.deps.json    (grafo de dependencias)
                             MiApp.runtimeconfig.json (qué runtime necesita)
                             MiApp.pdb          (símbolos de debug)
```

```json
// MiApp.runtimeconfig.json — lo lee el host (dotnet) al arrancar
{
  "runtimeOptions": {
    "tfm": "net8.0",
    "framework": { "name": "Microsoft.NETCore.App", "version": "8.0.0" }
  }
}
```

> ❓ **Entrevista**: *"¿Qué relación hay entre la CLI `dotnet` y MSBuild?"* → La CLI es una fachada: `build`, `publish`, `pack`, `test` delegan en **MSBuild**, que evalúa el `.csproj` (un archivo MSBuild) y ejecuta *targets*. `dotnet build` ≈ `dotnet msbuild -restore -t:Build`.

---

## 3. El `.csproj` SDK-style

Antes (.NET Framework) el `.csproj` listaba **cada archivo** y tenía cientos de líneas. El formato SDK-style es declarativo y mínimo: **todos los `*.cs` bajo la carpeta se incluyen por defecto** (*globbing*).

```xml
<Project Sdk="Microsoft.NET.Sdk">             <!-- el SDK aporta props/targets por defecto -->

  <PropertyGroup>
    <OutputType>Exe</OutputType>              <!-- Exe | Library (default) -->
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>   <!-- global usings generados (Sesión 18) -->
    <Nullable>enable</Nullable>               <!-- NRT (Sesión 15) -->
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <RootNamespace>Tienda.Cli</RootNamespace>
    <AssemblyName>tienda</AssemblyName>
    <InvariantGlobalization>true</InvariantGlobalization>  <!-- menos tamaño en contenedores -->
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Serilog" Version="4.0.1" />               <!-- NuGet -->
    <ProjectReference Include="..\Tienda.Dominio\Tienda.Dominio.csproj" /> <!-- otro proyecto -->
  </ItemGroup>

  <ItemGroup>
    <None Update="appsettings.json" CopyToOutputDirectory="PreserveNewest" />
    <Compile Remove="Legacy\**" />                                        <!-- excluir archivos -->
    <InternalsVisibleTo Include="Tienda.Cli.Tests" />                      <!-- internals a tests -->
  </ItemGroup>

</Project>
```

Conceptos de MSBuild que debes reconocer:

| Elemento | Qué es | Ejemplo |
|---|---|---|
| **Property** | Variable escalar (`$(Nombre)`) | `<Configuration>Release</Configuration>` |
| **Item** | Lista de cosas con metadata (`@(Tipo)`) | `<Compile Include="*.cs" />`, `PackageReference` |
| **Target** | Unidad de trabajo con dependencias | `Build`, `Restore`, `Publish` |
| **Task** | Acción concreta dentro de un target | `Csc`, `Copy`, `Exec` |
| **Condition** | Condicional sobre cualquier elemento | `Condition="'$(Configuration)'=='Debug'"` |

### 3.1 Los distintos SDKs

| `Sdk=` | Para qué |
|---|---|
| `Microsoft.NET.Sdk` | Consola, librerías, tests |
| `Microsoft.NET.Sdk.Web` | ASP.NET Core (agrega `Microsoft.AspNetCore.App`, usings web, `launchSettings`) |
| `Microsoft.NET.Sdk.Worker` | Background services / Worker |
| `Microsoft.NET.Sdk.Razor` | Librerías de componentes Razor/Blazor |

### 3.2 Multi-targeting

Una librería puede compilarse para varios frameworks a la vez (plural: `TargetFrameworks`):

```xml
<PropertyGroup>
  <TargetFrameworks>net8.0;netstandard2.0</TargetFrameworks>
</PropertyGroup>
```

```csharp
#if NET8_0_OR_GREATER
    return string.Create(...);          // API moderna
#else
    return new string(...);             // fallback para netstandard2.0
#endif
```

> ⚠️ `TargetFramework` (singular) vs `TargetFrameworks` (plural) — un error de una letra que provoca builds raros. Y `netstandard2.0` solo tiene sentido para librerías que deben correr también en .NET Framework (Sesión 1).

### 3.3 Debug vs Release

| | Debug | Release |
|---|---|---|
| Optimizaciones del compilador | ❌ | ✅ |
| Constante `DEBUG` | ✅ (`#if DEBUG`, `[Conditional("DEBUG")]`) | ❌ |
| JIT | Menos agresivo, variables vivas para debugger | Inlining, eliminación de código |
| Uso | Desarrollo | Benchmarks (Sesión 30), producción |

> ⚠️ **Nunca** midas rendimiento en Debug. Y nunca despliegues Debug a producción.

---

## 4. Soluciones y estructura de repositorio

Una **solución** (`.sln`, o el nuevo formato XML `.slnx` soportado desde SDK 9.0.200) agrupa proyectos para abrirlos juntos en el IDE y construirlos con un solo comando. No afecta al build de cada proyecto; las dependencias reales son las `ProjectReference`.

Estructura típica profesional:

```
Tienda/
├── global.json                   ← fija el SDK
├── Directory.Build.props         ← config común a TODOS los proyectos
├── Directory.Packages.props      ← versiones NuGet centralizadas
├── .editorconfig                 ← estilo + severidad de analyzers
├── nuget.config                  ← fuentes NuGet (feeds privados)
├── Tienda.sln
├── src/
│   ├── Tienda.Api/               ← Microsoft.NET.Sdk.Web
│   ├── Tienda.Aplicacion/        ← casos de uso (Sesión 26)
│   ├── Tienda.Dominio/           ← entidades, sin dependencias
│   └── Tienda.Infraestructura/   ← EF Core (Sesión 25), clientes HTTP
└── tests/
    ├── Tienda.Dominio.Tests/     ← xUnit (Sesión 27)
    └── Tienda.Api.IntegrationTests/
```

Montarla desde cero con la CLI:

```bash
mkdir Tienda && cd Tienda
dotnet new globaljson --sdk-version 8.0.404 --roll-forward latestFeature
dotnet new sln -n Tienda
dotnet new editorconfig
dotnet new gitignore

dotnet new classlib -o src/Tienda.Dominio
dotnet new webapi   -o src/Tienda.Api
dotnet new xunit    -o tests/Tienda.Dominio.Tests

dotnet sln add src/Tienda.Dominio src/Tienda.Api tests/Tienda.Dominio.Tests

dotnet add src/Tienda.Api reference src/Tienda.Dominio
dotnet add tests/Tienda.Dominio.Tests reference src/Tienda.Dominio

dotnet build      # construye todo en orden topológico de dependencias
dotnet test
```

```
Grafo de referencias (debe ser acíclico):

Tienda.Api ──► Tienda.Aplicacion ──► Tienda.Dominio
     │                                    ▲
     └──► Tienda.Infraestructura ─────────┘
Tienda.Dominio.Tests ──► Tienda.Dominio
```

> ⚠️ MSBuild **prohíbe referencias circulares** entre proyectos. Si A necesita B y B necesita A, falta una abstracción (interfaz en un tercer proyecto) — exactamente lo que resuelve la inversión de dependencias (Sesiones 24 y 26).

### 4.1 `Directory.Build.props`: configuración compartida

MSBuild importa automáticamente el `Directory.Build.props` más cercano subiendo desde cada proyecto (antes del `.csproj`), y `Directory.Build.targets` (después). Evitas repetir lo mismo en 15 proyectos:

```xml
<!-- Directory.Build.props en la raíz -->
<Project>
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>   <!-- analyzers CAxxxx -->
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>  <!-- IDExxxx en build -->
    <Deterministic>true</Deterministic>
    <Authors>Waddini</Authors>
  </PropertyGroup>
</Project>
```

Ahora cada `.csproj` queda casi vacío: solo lo específico.

---

## 5. NuGet: el gestor de paquetes

**NuGet** es a .NET lo que npm a Node o Maven a Java. Un paquete es un `.nupkg` (un ZIP) con:

```
Serilog.4.0.1.nupkg
├── Serilog.nuspec              ← metadata: id, versión, dependencias, licencia
├── lib/
│   ├── net8.0/Serilog.dll      ← un assembly por TFM soportado
│   └── netstandard2.0/Serilog.dll
├── analyzers/  (opcional)      ← analyzers / source generators
└── build/      (opcional)      ← .props/.targets que se inyectan en tu build
```

Al restaurar, NuGet elige la carpeta `lib/<tfm>` **más compatible** con tu `TargetFramework`.

### 5.1 Dónde vive cada cosa

| Ubicación | Qué contiene |
|---|---|
| `nuget.org` | Feed público oficial |
| `~/.nuget/packages/` | **Cache global**: paquetes extraídos, compartidos por todos tus proyectos |
| `obj/project.assets.json` | Grafo resuelto de *este* proyecto (lo lee el build) |
| `nuget.config` | Fuentes (feeds), credenciales, mapeo de fuentes |

```xml
<!-- nuget.config: feed privado + source mapping (mitiga "dependency confusion") -->
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="empresa"   value="https://pkgs.dev.azure.com/empresa/_packaging/interno/nuget/v3/index.json" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="empresa"><package pattern="Empresa.*" /></packageSource>
    <packageSource key="nuget.org"><package pattern="*" /></packageSource>
  </packageSourceMapping>
</configuration>
```

> ⚠️ **Dependency confusion**: si tu paquete interno `Empresa.Utils` no está mapeado a tu feed, un atacante puede publicar `Empresa.Utils` con versión mayor en nuget.org y tu restore lo bajaría. `packageSourceMapping` lo impide.

### 5.2 Versionado: SemVer y rangos

NuGet usa **SemVer**: `MAJOR.MINOR.PATCH[-prerelease]` → `2.1.3`, `3.0.0-beta.2`.

| Sintaxis | Significado |
|---|---|
| `Version="4.0.1"` | **Mínimo** 4.0.1 (≥ 4.0.1), no "exactamente" |
| `Version="[4.0.1]"` | Exactamente 4.0.1 |
| `Version="[4.0,5.0)"` | ≥ 4.0 y < 5.0 |
| `Version="4.*"` | Flotante: la última 4.x disponible (evitar en producción) |

Regla de resolución para dependencias transitivas: **"lowest applicable version"** — NuGet elige la versión *más baja* que satisface el rango (a diferencia de npm, que tiende a la más alta). Y **"direct dependency wins"**: si tú referencias directamente una versión, gana sobre la transitiva.

```
MiApp ──► A 1.0 ──► Newtonsoft.Json ≥ 12.0
      └─► B 2.0 ──► Newtonsoft.Json ≥ 13.0.1
NuGet resuelve Newtonsoft.Json = 13.0.1  (la mínima que satisface a ambos)
```

> ⚠️ **NU1605 (downgrade detectado)**: si tú referencias `X 12.0` pero una dependencia pide `X ≥ 13.0`, NuGet avisa (y con warnings-as-errors, falla). Solución: subir tu referencia directa.

> ❓ **Entrevista**: *"¿Qué versión elige NuGet si dos paquetes piden rangos distintos de la misma dependencia?"* → La **más baja** que satisfaga todos los rangos ("lowest applicable"). Si hay referencia directa, esa gana. Si los rangos no se intersectan, es un conflicto de restore (NU1107).

### 5.3 Lock files: restores reproducibles

Con rangos y dependencias transitivas, dos restores en días distintos pueden resolver versiones distintas (p.ej. si un paquete se borra o un flotante avanza). Para fijarlo:

```xml
<PropertyGroup>
  <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
</PropertyGroup>
```

Genera `packages.lock.json` (se **commitea**). En CI: `dotnet restore --locked-mode` falla si el lock no coincide con el `.csproj`.

### 5.4 Central Package Management (CPM)

En una solución grande, cada proyecto con su propio `Version=` termina en versiones distintas del mismo paquete. CPM centraliza:

```xml
<!-- Directory.Packages.props (raíz) -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Serilog" Version="4.0.1" />
    <PackageVersion Include="xunit" Version="2.9.2" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore" Version="8.0.10" />
  </ItemGroup>
</Project>
```

```xml
<!-- en cada .csproj: SIN versión -->
<ItemGroup>
  <PackageReference Include="Serilog" />
</ItemGroup>
```

### 5.5 Seguridad y mantenimiento

```bash
dotnet list package --outdated              # qué se puede actualizar
dotnet list package --vulnerable --include-transitive   # CVEs conocidos (también transitivos)
```

Desde .NET 8, `dotnet restore` además emite **NU1901–NU1904** (auditoría de vulnerabilidades) automáticamente. Configurable con `<NuGetAudit>` y `<NuGetAuditMode>all</NuGetAuditMode>` (incluye transitivas; default desde .NET 9).

### 5.6 Tipos de referencia y `PrivateAssets`

```xml
<!-- Analyzer / herramienta de build: que NO se propague a quien consuma tu paquete -->
<PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="8.0.0">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; analyzers</IncludeAssets>
</PackageReference>
```

| Referencia | Apunta a | Cuándo |
|---|---|---|
| `PackageReference` | Paquete NuGet | Dependencias externas o internas versionadas |
| `ProjectReference` | Otro `.csproj` de la misma solución | Código en el mismo repo |
| `Reference` | Un `.dll` suelto | Legacy; evitar |
| `FrameworkReference` | Shared framework | `Microsoft.AspNetCore.App` desde una classlib |

---

## 6. Crear y publicar tu propio paquete

```xml
<!-- Tienda.Dominio.csproj -->
<PropertyGroup>
  <PackageId>Waddini.Tienda.Dominio</PackageId>
  <Version>1.2.0</Version>
  <Description>Entidades y reglas del dominio Tienda</Description>
  <PackageLicenseExpression>MIT</PackageLicenseExpression>
  <PackageReadmeFile>README.md</PackageReadmeFile>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>   <!-- XML docs → IntelliSense -->
  <IncludeSymbols>true</IncludeSymbols>
  <SymbolPackageFormat>snupkg</SymbolPackageFormat>             <!-- símbolos para depurar -->
</PropertyGroup>
<ItemGroup>
  <None Include="README.md" Pack="true" PackagePath="\" />
</ItemGroup>
```

```bash
dotnet pack src/Tienda.Dominio -c Release -o ./nupkgs
dotnet nuget push ./nupkgs/Waddini.Tienda.Dominio.1.2.0.nupkg \
  --source https://api.nuget.org/v3/index.json --api-key $NUGET_API_KEY
```

> 💡 Para versionar automáticamente desde tags de git, herramientas como **MinVer** o **Nerdbank.GitVersioning** calculan `<Version>` en el build.

---

## 7. `dotnet publish`: modos de despliegue

`build` es para desarrollar; `publish` produce **lo que va a producción**. Desde .NET 8, `publish` usa `Release` por defecto.

| Modo | Comando | Requiere runtime instalado | Tamaño | Notas |
|---|---|---|---|---|
| **Framework-dependent** (FDD) | `dotnet publish -c Release` | ✅ | Muy pequeño | Default. Ideal con imágenes Docker `aspnet` |
| **Self-contained** (SCD) | `-r linux-x64 --self-contained` | ❌ (lo incluye) | ~70 MB+ | Una carpeta por RID |
| **Single-file** | `-p:PublishSingleFile=true` | según FDD/SCD | 1 ejecutable | Extrae/mapea nativos en runtime |
| **Trimmed** | `-p:PublishTrimmed=true` (requiere SCD) | ❌ | Mucho menor | Riesgo con Reflection (Sesión 20) |
| **ReadyToRun** | `-p:PublishReadyToRun=true` | según modo | Mayor | IL + código nativo precompilado: arranque más rápido, JIT sigue disponible |
| **Native AOT** | `<PublishAot>true</PublishAot>` + `-r` | ❌ | Pequeño | Sin JIT, arranque ms, restricciones (Sesión 31) |

**RID** (Runtime Identifier): `win-x64`, `linux-x64`, `linux-musl-x64` (Alpine), `linux-arm64`, `osx-arm64`.

```bash
# API para contenedor Linux, framework-dependent
dotnet publish src/Tienda.Api -c Release -o ./out

# CLI autocontenida de un solo archivo para Mac M1/M2
dotnet publish src/Tienda.Cli -c Release -r osx-arm64 --self-contained -p:PublishSingleFile=true

# .NET 8: publicar DIRECTO a imagen de contenedor, sin Dockerfile
dotnet publish src/Tienda.Api -c Release -t:PublishContainer -p:ContainerImageTag=1.2.0
```

> ❓ **Entrevista**: *"¿Framework-dependent vs self-contained?"* → FDD requiere que el runtime .NET esté instalado en el destino y produce un artefacto pequeño que se beneficia de parches de seguridad del runtime compartido. SCD incluye el runtime: no depende de la máquina, pero pesa más, es por plataforma (RID) y tú eres responsable de republicar para aplicar parches.

> ❓ **Entrevista**: *"¿ReadyToRun vs Native AOT?"* → R2R precompila a nativo pero conserva el IL y el JIT (tiered compilation puede reoptimizar); es compatible con todo. AOT elimina el JIT por completo: arranque y memoria mínimos, pero sin generación dinámica de código y con restricciones de Reflection.

---

## 8. Herramientas .NET y calidad en el build

**Tools** son apps de consola distribuidas por NuGet:

```bash
# Global (en tu máquina)
dotnet tool install -g dotnet-ef              # migraciones EF Core (Sesión 25)
dotnet tool install -g dotnet-counters        # métricas en vivo (GC, threadpool — Sesión 14)
dotnet tool install -g dotnet-trace

# Local (versionadas en el repo → .config/dotnet-tools.json)
dotnet new tool-manifest
dotnet tool install dotnet-ef --version 8.0.10
dotnet tool restore                           # en CI o en la máquina de un compañero
```

Calidad automática desde el `.editorconfig` + analyzers:

```ini
# .editorconfig
root = true
[*.cs]
indent_style = space
indent_size = 4
csharp_style_namespace_declarations = file_scoped:warning   # IDE0161
dotnet_diagnostic.CA2007.severity = none                     # ConfigureAwait (Sesión 13) — no aplica a apps ASP.NET Core
dotnet_diagnostic.CA1848.severity = warning                  # usar LoggerMessage (Sesión 20)
```

```bash
dotnet format --verify-no-changes   # falla en CI si el código no respeta el estilo
```

---

## 9. Pipeline de CI mínimo (todo junto)

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          global-json-file: global.json         # usa EXACTAMENTE el SDK fijado
      - uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: nuget-${{ hashFiles('**/packages.lock.json') }}
      - run: dotnet restore --locked-mode
      - run: dotnet format --verify-no-changes --no-restore
      - run: dotnet build -c Release --no-restore
      - run: dotnet test -c Release --no-build --collect:"XPlat Code Coverage"
      - run: dotnet list package --vulnerable --include-transitive
```

Cada pieza de la sesión aparece aquí: `global.json` (1.1), comandos separados (2), lock files (5.3), analyzers y formato (8).

---

## Resumen mental de la sesión

```
SDK (CLI + MSBuild + Roslyn + NuGet + templates + runtimes)
  global.json → fija versión SDK (rollForward)
  TFM (net8.0) → contra qué runtime compilas/corres

dotnet run ─► build ─► restore     (en CI: separarlos con --no-restore/--no-build)
build = MSBuild: evalúa .csproj → Restore → CoreCompile (Roslyn) → bin/
  salida: .dll (IL) · apphost · deps.json · runtimeconfig.json · pdb

.csproj SDK-style: globbing, Properties / Items / Targets
Directory.Build.props → config común · Directory.Packages.props → CPM
.sln agrupa · ProjectReference = dependencia real (grafo acíclico)

NuGet: .nupkg (lib/<tfm>) · cache ~/.nuget/packages · project.assets.json
  Version="x" = MÍNIMO · lowest applicable · direct wins
  lock file + --locked-mode · packageSourceMapping · audit de CVEs

publish: FDD (default, pequeño) · SCD (-r, incluye runtime)
         single-file · trimmed · ReadyToRun · Native AOT
```

---

## Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué contiene el SDK? ¿Qué diferencia hay entre versión de SDK, TFM y versión de runtime?
2. ❓ ¿Para qué sirve `global.json` y qué hace `rollForward`?
3. ❓ ¿Qué ocurre, paso a paso, cuando ejecutas `dotnet build`? ¿Qué papel tiene MSBuild?
4. ❓ ¿Qué archivos genera el build además del `.dll` y para qué sirven `deps.json` y `runtimeconfig.json`?
5. ❓ ¿Qué ventajas tiene el `.csproj` SDK-style? ¿Qué son Properties, Items y Targets?
6. ❓ ¿Para qué sirven `Directory.Build.props` y `Directory.Packages.props`?
7. ❓ En NuGet, ¿qué significa `Version="4.0.1"`? ¿Cómo se resuelven conflictos de versiones transitivas?
8. ❓ ¿Qué es un lock file y cómo lo usarías en CI?
9. ❓ ¿Qué es un ataque de *dependency confusion* y cómo lo mitigas en NuGet?
10. ❓ Framework-dependent vs self-contained vs Native AOT: ¿cuándo cada uno?
11. ❓ ¿Qué es un RID? ¿Y ReadyToRun?
12. ❓ ¿Diferencia entre una herramienta .NET global y una local?

## Ejercicio práctico
1. Monta desde cero la solución `Tienda` de la sección 4 (con `global.json`, `.editorconfig`, `.gitignore`, `src/` y `tests/`) usando **solo la CLI**.
2. Crea `Directory.Build.props` con `Nullable`, `ImplicitUsings`, `TreatWarningsAsErrors` y `TargetFramework`, y elimina esas líneas de cada `.csproj`. Verifica que `dotnet build` sigue funcionando.
3. Activa Central Package Management con `Directory.Packages.props`; agrega `Serilog` a `Tienda.Api` y `FluentAssertions` a los tests sin especificar versión en los `.csproj`.
4. Activa `RestorePackagesWithLockFile`, haz restore, inspecciona `packages.lock.json`, y luego cambia una versión a mano y ejecuta `dotnet restore --locked-mode` para ver cómo falla.
5. Ejecuta `dotnet list package --outdated` y `dotnet list package --vulnerable --include-transitive`.
6. Empaqueta `Tienda.Dominio` con `dotnet pack` y consúmelo desde un proyecto **fuera** de la solución usando un feed local: `dotnet nuget add source ./nupkgs -n local`.
7. Publica `Tienda.Api` en tres modos (FDD, self-contained `osx-arm64`, single-file) y compara tamaños de las carpetas con `du -sh`.
8. (Opcional avanzado) Escribe el workflow de GitHub Actions de la sección 9 y hazlo pasar en verde.

---

➡️ **Cuando termines**, marca la Sesión 21 en el [README](Readme.md) y pídeme la **Sesión 22 — HTTP, REST, JSON (intro backend)**.
