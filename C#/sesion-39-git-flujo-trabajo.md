# Sesión 39 — Git y flujo de trabajo profesional: del commit al comportamiento senior

> **Objetivo de la sesión**: entender *cómo funciona Git por dentro* (objetos, ramas, HEAD) para dejar de "memorizar comandos" y empezar a razonar sobre el historial; elegir una estrategia de ramas con criterio; escribir commits y versiones que las máquinas y las personas entiendan (Conventional Commits + SemVer + NuGet); hacer y recibir code reviews como un senior; y cerrar el curso con las prácticas que diferencian a un senior: refactorizar legacy sin romperlo, documentar decisiones (ADRs), comunicar y entender el negocio.

---

## 1. Git por dentro: todo es un grafo de snapshots

La mayoría usa Git como una caja negra de comandos. Un senior entiende el **modelo de datos**, porque con él cualquier comando (rebase, reset, cherry-pick) se vuelve obvio.

Git es una **base de datos clave-valor direccionada por contenido**: cada objeto se guarda bajo el hash (SHA-1, opcionalmente SHA-256) de su contenido. Hay cuatro tipos de objetos:

| Objeto | Qué guarda |
|---|---|
| **blob** | El contenido de un archivo (sin nombre, sin permisos). |
| **tree** | Un directorio: lista de nombres → blobs/trees + permisos. |
| **commit** | Un puntero a un *tree* raíz (el snapshot completo), el/los commit(s) **padre**, autor, committer, fecha y mensaje. |
| **tag** (anotado) | Un puntero con nombre, mensaje y autor a otro objeto (normalmente un commit). |

> ⚠️ **Git guarda snapshots, no diffs.** Cada commit apunta al árbol *completo* del proyecto. Los archivos que no cambiaron se reutilizan (mismo hash → mismo blob), y los *packfiles* comprimen con deltas, pero conceptualmente cada commit es una foto completa.

Puedes verlo con tus ojos:

```bash
git cat-file -t HEAD          # commit
git cat-file -p HEAD          # tree 3f2a..., parent 9c1b..., author..., mensaje
git cat-file -p HEAD^{tree}   # lista de blobs y trees del snapshot
```

### 1.1 Ramas, HEAD y tags: solo son punteros

```
                         HEAD
                          │  (ref simbólica)
                          ▼
                        main  (.git/refs/heads/main = hash de C4)
                          │
  C1 ◀── C2 ◀── C3 ◀──── C4
                 ▲
                 └────── C5 ◀── C6
                                 ▲
                          feature/pagos
```

- Una **rama** es un archivo de 41 bytes con el hash de un commit. Crear una rama es gratis: no copia nada.
- Cuando haces commit, la rama a la que apunta **HEAD** avanza al nuevo commit.
- **HEAD** es "dónde estás": normalmente apunta a una rama (`ref: refs/heads/main`). Si haces `git checkout <hash>` apunta directo a un commit → **detached HEAD**: los commits que hagas ahí no pertenecen a ninguna rama y quedarán huérfanos si no creas una (`git switch -c rescate`).
- Un **tag** es un puntero que **no se mueve** (ideal para releases).
- Los commits apuntan a su **padre** (hacia atrás), por eso el historial es un **DAG** (grafo dirigido acíclico).

> ❓ **Entrevista**: *"¿Qué es una rama en Git?"* → Un puntero móvil a un commit. No contiene archivos; el historial se reconstruye siguiendo los padres desde ese commit.

### 1.2 Las tres zonas

```
 Working directory ──git add──▶ Staging (index) ──git commit──▶ Repositorio (.git)
        ▲                                                            │
        └──────────────── git restore / git switch ──────────────────┘
```

Usa los comandos modernos `git switch` (cambiar/crear rama) y `git restore` (descartar cambios, `--staged` para sacar del staging) en vez del sobrecargado `git checkout`.

### 1.3 `reset`: mover la rama (y qué pasa con tus cambios)

| Modo | Mueve la rama | Staging | Working dir |
|---|---|---|---|
| `--soft` | ✅ | se conserva | se conserva |
| `--mixed` (default) | ✅ | se limpia | se conserva |
| `--hard` | ✅ | se limpia | ⚠️ **se pierde** |

```bash
git reset --soft HEAD~3   # "deshacer" 3 commits dejando todo en staging → re-commit como uno solo
```

> ⚠️ `reset` y `rebase` **reescriben historia**. En ramas compartidas usa `git revert <hash>`, que crea un commit nuevo que invierte al anterior sin reescribir nada.

---

## 2. Integrar trabajo: merge vs rebase

Tienes `main` y `feature` divergidas:

```
          A ── B ── C            main
               \
                D ── E           feature
```

### 2.1 Merge

```bash
git switch main
git merge feature
```

```
          A ── B ── C ─────── M   main      (M tiene DOS padres: C y E)
               \             /
                D ──────── E      feature
```

- **Fast-forward**: si `main` no avanzó desde que nació `feature`, Git solo mueve el puntero (no hay commit de merge). `--no-ff` fuerza el commit de merge para dejar registro de "aquí entró la feature".
- **3-way merge**: usa el ancestro común (B), `main` (C) y `feature` (E) para combinar. Si ambos tocaron las mismas líneas → **conflicto**.
- ✅ No reescribe historia, es seguro en ramas públicas. ❌ Historial con "rombos" que puede ser ruidoso.

### 2.2 Rebase

```bash
git switch feature
git rebase main
```

```
          A ── B ── C              main
                     \
                      D' ── E'     feature   (D' y E' son commits NUEVOS, otros hashes)
```

Rebase **re-aplica** tus commits uno por uno encima de la nueva base. Como el padre cambia, el hash cambia: son commits distintos con el mismo diff.

- ✅ Historial lineal, fácil de leer y de bisectar. ❌ Reescribe historia.
- **Regla de oro**: *nunca hagas rebase de commits que otros ya tienen* (ramas compartidas, `main`). Sobre tu propia rama de feature, sí.
- Tras rebasear una rama ya pusheada necesitas forzar el push. Usa **siempre**:

```bash
git push --force-with-lease   # falla si alguien pusheó algo que tú no has visto
```

> ⚠️ `git push --force` a secas pisa el trabajo de tus compañeros sin avisar. `--force-with-lease` es el único force aceptable.

### 2.3 Rebase interactivo: limpiar antes del PR

```bash
git rebase -i HEAD~4
```

```
pick   a1b2c3 feat(pedidos): endpoint POST /pedidos
fixup  d4e5f6 wip
reword 789abc fix: typo
drop   111222 console.log de debug
```

`pick` (mantener), `reword` (cambiar mensaje), `squash`/`fixup` (fusionar con el anterior), `drop` (eliminar), `edit` (parar para modificar). Truco pro: `git commit --fixup=<hash>` y luego `git rebase -i --autosquash main` los coloca solos.

### 2.4 Estrategias de merge en GitHub/Azure DevOps

| Opción del PR | Resultado en `main` | Cuándo |
|---|---|---|
| **Merge commit** | Todos los commits + commit de merge | Quieres preservar el historial exacto de la rama |
| **Squash and merge** | Un único commit por PR | Lo más común: 1 PR = 1 commit = 1 cambio revertible |
| **Rebase and merge** | Commits de la rama, lineales, sin merge commit | Commits de la rama ya limpios y atómicos |

> ❓ **Entrevista**: *"¿Merge o rebase?"* → No es religión: rebase para mantener *tu* rama al día y limpia antes del PR; merge (o squash) para integrar en la rama compartida. Nunca rebase de historia pública.

---

## 3. Herramientas de rescate y diagnóstico

### 3.1 `cherry-pick`: traer un commit concreto

Caso típico: arreglaste un bug en `main` y necesitas el mismo fix en la rama `release/2.3` sin traer todo lo demás.

```bash
git switch release/2.3
git cherry-pick -x 4f9e2a1     # -x añade "(cherry picked from commit 4f9e2a1)" al mensaje
```

Crea un commit **nuevo** con el mismo diff. ⚠️ Abusar de cherry-pick entre ramas de larga vida produce commits duplicados y conflictos futuros: es una herramienta quirúrgica, no un flujo.

### 3.2 `reflog`: la red de seguridad

El **reflog** registra cada movimiento de HEAD y de tus ramas *en tu repo local* (commits, resets, rebases, checkouts). Si "perdiste" commits con un `reset --hard` o un rebase mal hecho, casi seguro siguen ahí:

```bash
git reflog
# 9c1b2d3 HEAD@{0}: reset: moving to HEAD~3
# 7a8b9c0 HEAD@{1}: commit: feat(pagos): reintentos con Polly
# ...
git switch -c rescate 7a8b9c0     # o: git reset --hard HEAD@{1}
```

- Es **local**: no se sube al remoto y no sirve para recuperar lo que nunca estuvo en tu máquina.
- Las entradas expiran (por defecto ~90 días las alcanzables, ~30 las inalcanzables) y luego `git gc` puede borrar los objetos.

> ❓ **Entrevista**: *"Hice `git reset --hard` y perdí mi trabajo, ¿qué hago?"* → Si estaba commiteado: `git reflog`, encuentro el hash y creo una rama ahí. Si **nunca** fue commiteado ni añadido al staging, Git no puede recuperarlo.

### 3.3 `bisect`: búsqueda binaria del commit culpable

"Funcionaba en la v2.1, en la v2.4 no, y hay 300 commits entre medio". Bisect lo encuentra en ~log₂(300) ≈ 9 pasos:

```bash
git bisect start
git bisect bad                 # el commit actual está roto
git bisect good v2.1.0         # este funcionaba
# Git te deja en un commit intermedio: pruebas y dices
git bisect good                # o: git bisect bad
# ... hasta que imprime "abc123 is the first bad commit"
git bisect reset
```

Automatizado con un test (exit code 0 = good, ≠ 0 = bad, 125 = saltar):

```bash
git bisect start HEAD v2.1.0
git bisect run dotnet test tests/OrderFlow.Domain.Tests --filter "FullyQualifiedName~Descuentos"
```

> Esto solo funciona bien si **cada commit compila y pasa los tests**. Otra razón para commits atómicos y para squash de "wip".

### 3.4 Otros imprescindibles

```bash
git log --oneline --graph --all          # ver el DAG
git log -S "CalcularDescuento" --oneline # commits que añadieron/quitaron ese texto (pickaxe)
git blame -w -C src/Pedido.cs            # quién cambió cada línea (ignorando espacios, siguiendo movimientos)
git stash push -m "a medias"             # guardar cambios temporales
git worktree add ../hotfix release/2.3   # segunda carpeta de trabajo sobre otra rama, sin stash
```

---

## 4. Estrategias de ramas: Git Flow vs GitHub Flow vs Trunk-Based

### 4.1 Git Flow (Vincent Driessen, 2010)

```
main     ●─────────────────●──────────────●        (solo releases, con tag)
          \               / \            /
hotfix     \             /   ●──────────●
            \           /                \
release      \     ●───●                  \
              \   /     \                  \
develop  ●─────●─●───────●──────────────────●──     (integración)
            \   /   \   /
feature      ●─●     ●─●
```

Ramas de larga vida `main` + `develop`, más `feature/*`, `release/*`, `hotfix/*`. Pensado para software **con versiones empaquetadas** (librerías, apps de escritorio, móviles) que mantiene varias versiones en paralelo.

### 4.2 GitHub Flow

```
main   ●────●────────●──────●────▶  (siempre desplegable)
         \  /         \    /
          ●●  PR #12   ●●●  PR #13
```

Una sola rama de larga vida (`main`). Rama corta → PR → review + CI → merge → deploy. Simple, ideal para apps web con despliegue continuo.

### 4.3 Trunk-Based Development

Todos integran en `main` (el *trunk*) **al menos una vez al día**, con ramas que viven horas, no semanas. El trabajo incompleto se esconde tras **feature flags** (`Microsoft.FeatureManagement`), no en ramas. Requiere CI muy sólido y buena cobertura de tests. Es lo que usan Google o Microsoft internamente y lo que el informe DORA asocia con equipos de alto rendimiento.

```csharp
// Program.cs — la feature está en main, pero apagada en producción
builder.Services.AddFeatureManagement();

app.MapPost("/pedidos/{id}/reembolso", async (Guid id, IFeatureManager fm, ...) =>
    await fm.IsEnabledAsync("Reembolsos")
        ? await ProcesarReembolso(id)
        : Results.NotFound());
```

### 4.4 Comparativa

| Criterio | Git Flow | GitHub Flow | Trunk-Based |
|---|---|---|---|
| Ramas de larga vida | `main` + `develop` (+ release) | `main` | `main` |
| Vida de una feature branch | Días/semanas | Días | Horas (≤ 1-2 días) |
| Frecuencia de release | Por versiones planificadas | Continua | Continua (varias al día) |
| Conflictos de merge | Frecuentes y grandes | Moderados | Pequeños y constantes |
| Requiere | Disciplina de proceso | CI + review | CI excelente, feature flags, tests |
| Encaja con | Librerías NuGet, desktop, móvil, varias versiones soportadas | SaaS / APIs web | Equipos maduros con CD |

> ⚠️ Las ramas largas son la raíz de los *merge hell*: cuanto más vive una rama, más diverge y más duele integrarla. El problema no es Git, es la **integración tardía**.

> ❓ **Entrevista**: *"¿Qué estrategia de branching usarías?"* → Depende del modelo de entrega. Para una API desplegada continuamente, GitHub Flow o trunk-based con feature flags. Si publico una librería con varias versiones mayores soportadas, algo tipo Git Flow con ramas `release/x.y` para backports. Y lo justifico por coste de integración y frecuencia de despliegue.

---

## 5. Conventional Commits: mensajes que las máquinas entienden

Formato ([conventionalcommits.org](https://www.conventionalcommits.org)):

```
<tipo>(<ámbito opcional>)!: <descripción en imperativo>

<cuerpo opcional: el PORQUÉ, no el qué>

<footers opcionales: BREAKING CHANGE: ..., Refs: #123>
```

| Tipo | Uso | Efecto en SemVer |
|---|---|---|
| `feat` | Nueva funcionalidad | MINOR |
| `fix` | Corrección de bug | PATCH |
| `perf` | Mejora de rendimiento | PATCH (por convención) |
| `refactor` | Cambio interno sin cambiar comportamiento | — |
| `test`, `docs`, `style` | Tests, documentación, formato | — |
| `build`, `ci`, `chore` | Build, pipelines, tareas varias | — |
| `!` o footer `BREAKING CHANGE:` | Rompe compatibilidad | **MAJOR** |

Ejemplos buenos:

```
feat(pedidos): permitir cancelar pedidos en estado Pagado

Los clientes pedían cancelar antes del envío. Se emite PedidoCancelado
para que Pagos inicie el reembolso (saga, sesión 35).

Refs: #142
```

```
feat(api)!: cambiar /pedidos a paginación por cursor

BREAKING CHANGE: se eliminan los parámetros page/pageSize; usar cursor.
```

Ejemplos malos: `fix`, `cambios`, `wip`, `arreglos varios`, `actualizo cosas`.

**Por qué importa**: permite generar el **CHANGELOG** y calcular la **siguiente versión** automáticamente (herramientas como *release-please*, *semantic-release*, *GitVersion*), y hace que `git log` sea navegable. Se puede forzar con un hook `commit-msg` (p. ej. *commitlint*, o *Husky.Net* en proyectos .NET) o validando el título del PR en CI cuando se usa squash.

> 💡 El commit explica el **porqué**. El **qué** ya lo dice el diff.

---

## 6. Semantic Versioning y versionado en NuGet

### 6.1 SemVer 2.0

```
  2 . 4 . 1 - beta.3 + sha.5f2a9c
  │   │   │   │          └─ build metadata (no afecta la precedencia)
  │   │   │   └─ pre-release (menor precedencia que 2.4.1)
  │   │   └─ PATCH: arreglos compatibles
  │   └─ MINOR: funcionalidad nueva compatible
  └─ MAJOR: cambios incompatibles en la API pública
```

- Orden: `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-beta < 1.0.0-rc.1 < 1.0.0`.
- `0.y.z` = desarrollo inicial: *cualquier cosa puede romperse*.
- La "API pública" hay que definirla: en una librería .NET es todo lo `public`/`protected` de tus assemblies. Cambiar la firma de un método público, eliminar un tipo o añadir un miembro abstracto a una clase base pública **es breaking** → MAJOR.

> ❓ **Entrevista**: *"¿Añadir un método a una interfaz pública es breaking?"* → Sí, rompe a quien la implementa. Salvo que tenga implementación por defecto (DIM, sesión 32), y aun así hay que evaluarlo.

### 6.2 Versiones en un proyecto .NET

```xml
<PropertyGroup>
  <!-- Versión del paquete NuGet (SemVer 2) -->
  <VersionPrefix>2.4.1</VersionPrefix>
  <VersionSuffix>beta.3</VersionSuffix>          <!-- → Version = 2.4.1-beta.3 -->

  <!-- Versiones del assembly -->
  <AssemblyVersion>2.0.0.0</AssemblyVersion>     <!-- la que usa el binding del CLR: cámbiala solo en MAJOR -->
  <FileVersion>2.4.1.0</FileVersion>             <!-- la que ve Windows en propiedades del .dll -->
  <!-- InformationalVersion por defecto = Version (+ hash del commit con SourceLink) -->
</PropertyGroup>
```

```bash
dotnet pack -c Release -p:Version=2.4.1          # sobreescribe desde CI
dotnet pack -c Release --version-suffix "beta.3" # usa VersionPrefix del csproj
```

Mejor todavía: **deriva la versión del tag de Git** con **MinVer**, **GitVersion** o **Nerdbank.GitVersioning**. Con MinVer, taggear `v2.4.1` y hacer `dotnet pack` produce `2.4.1`; los commits posteriores generan automáticamente `2.4.2-alpha.0.N`.

### 6.3 Rangos de versión en NuGet (y cómo resuelve)

| Notación | Significado |
|---|---|
| `1.2.0` | **≥ 1.2.0** (versión mínima, *no* exacta) |
| `[1.2.0]` | Exactamente 1.2.0 |
| `[1.2.0,2.0.0)` | ≥ 1.2.0 y < 2.0.0 |
| `1.*` | Flotante: la más alta 1.x disponible |

⚠️ NuGet aplica la regla de la **menor versión aplicable**: con `Version="1.2.0"` restaura 1.2.0 aunque exista 1.9.0 (a menos que otra dependencia exija más). Para builds reproducibles:

- **Central Package Management**: `Directory.Packages.props` con `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` y una sola versión por paquete en toda la solución (sesión 21).
- **Lock files**: `<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>` genera `packages.lock.json`; en CI `dotnet restore --locked-mode` falla si cambió algo.
- Evita versiones flotantes en producción.

---

## 7. `.gitignore`, `.gitattributes` y qué NO subir

```bash
dotnet new gitignore        # plantilla oficial para .NET/Visual Studio
dotnet new editorconfig     # estilo de código compartido (lo revisa el build con analyzers)
```

Lo esencial que debe ignorar:

```gitignore
# Build
[Bb]in/
[Oo]bj/
artifacts/

# IDEs
.vs/
.idea/
*.user
*.suo

# Tests y cobertura
TestResults/
coverage*.xml

# Secretos y configuración local
appsettings.*.local.json
*.env
.env
```

`.gitattributes` para evitar guerras de fin de línea entre Windows y macOS/Linux:

```gitattributes
* text=auto
*.sh text eol=lf
*.cs text diff=csharp
```

> ⚠️ **Nunca** subas secretos. En desarrollo usa **User Secrets** (`dotnet user-secrets set "Jwt:Key" "..."`, se guardan fuera del repo); en producción, Key Vault / AWS Secrets Manager (sesión 28). Si un secreto llegó a un commit, **rótalo inmediatamente**: borrarlo en un commit nuevo no sirve, sigue en la historia (y reescribirla con `git filter-repo` no garantiza que nadie lo haya clonado).

> ⚠️ `.gitignore` no afecta a archivos **ya trackeados**. Si subiste `bin/` por error: `git rm -r --cached bin/` y commit.

---

## 8. Proteger ramas

`main` debe ser inviolable. En GitHub (Branch protection o **Rulesets**) / Azure DevOps (Branch policies):

| Regla | Por qué |
|---|---|
| Requerir PR antes de merge | Nada entra sin revisión |
| ≥ 1 (o 2) aprobaciones, descartar aprobaciones al pushear cambios nuevos | La aprobación vale para el código que se mergea, no para uno anterior |
| Requerir revisión de **CODEOWNERS** | Los dueños de cada área revisan lo suyo |
| Status checks obligatorios (build, tests, análisis) | CI verde o no entra (sesión 36) |
| Requerir rama actualizada con `main` | Evita "verde en la rama, rojo tras el merge" (o usar *merge queue*) |
| Bloquear force push y borrado | Historia de `main` inmutable |
| Historial lineal / firma de commits (opcional) | Legibilidad / trazabilidad |
| Aplicar también a administradores | Sin puertas traseras |

`.github/CODEOWNERS`:

```
*                         @orderflow/backend
/src/OrderFlow.Payments/  @orderflow/pagos
/.github/workflows/       @orderflow/platform
*.sql                     @orderflow/dba
```

Con la CLI de GitHub:

```bash
gh api -X PUT repos/waddini/orderflow/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["build-and-test"] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
EOF
```

---

## 9. Pull Requests y code review

### 9.1 Un buen PR

- **Pequeño**: idealmente < 400 líneas de diff. La calidad de la revisión cae en picado con PRs grandes ("500 líneas: *LGTM*; 10 líneas: 10 comentarios").
- **Una sola cosa**: no mezcles refactor + feature + formateo. Si necesitas refactorizar, primero un PR de refactor sin cambio de comportamiento.
- **Descripción** que responda: *qué* cambia, *por qué*, *cómo probarlo*, riesgos, capturas si aplica.
- Te **auto-revisas** antes de pedir revisión (lee tu diff en la web como si fuera de otro).
- Draft PR temprano para feedback de diseño antes de invertir días.
- Estandariza la descripción con `.github/pull_request_template.md` (Qué y por qué · Cómo probarlo · Riesgos · `Closes #`).

### 9.2 Qué mira un senior al revisar

En orden de importancia (lo automatizable —formato, estilo, linters— lo hace la CI, no una persona):

| Nivel | Preguntas |
|---|---|
| **Diseño** | ¿Resuelve el problema correcto? ¿Encaja en la arquitectura (capas, límites de contexto)? ¿Hay una solución más simple? |
| **Corrección** | Casos borde, nulos, concurrencia (sesión 29), idempotencia (34), transacciones, zonas horarias, `decimal` para dinero |
| **Seguridad** | Autorización en cada endpoint, validación de entrada, SQL injection, secretos, datos personales en logs (sesión 28) |
| **Rendimiento** | N+1 en EF Core, `ToList()` antes de filtrar, llamadas síncronas bloqueantes (`.Result`), allocations en caminos calientes |
| **Operabilidad** | Logs útiles y estructurados, métricas, manejo de errores, qué pasa si la dependencia cae |
| **Tests** | ¿Prueban comportamiento o implementación? ¿Fallarían si el código estuviera mal? |
| **Mantenibilidad** | Nombres, cohesión, API pública mínima, compatibilidad hacia atrás, migraciones reversibles |

### 9.3 Cómo dar feedback

- Comenta el **código**, no a la persona: "Esta consulta hace N+1" en vez de "Hiciste mal la consulta".
- Explica el **porqué** y, si puedes, propone alternativa.
- Distingue la severidad con prefijos (estilo *Conventional Comments*):

```
blocker: este endpoint no valida que el pedido pertenezca al usuario (IDOR).
suggestion: podrías usar ExecuteUpdateAsync y evitar cargar la entidad.
nit: el nombre `tmp` no dice mucho, ¿`pedidosPendientes`?
question: ¿por qué Singleton aquí? El DbContext es Scoped.
praise: muy buena la prueba de concurrencia con Barrier 👌
```

- Pregunta antes de afirmar cuando no estés seguro. Aprueba con *nits* pendientes si no bloquean.
- Revisa **rápido** (en horas, no días): un PR esperando bloquea a una persona y alarga la vida de la rama.
- Si un hilo pasa de 3 idas y vueltas, **llamada de 10 minutos**.

Al **recibir** feedback: no es personal, agradece, responde cada comentario (aplicado / discrepo porque…), y no marques como resuelto lo que el revisor debería validar.

> ❓ **Entrevista**: *"¿Qué buscas cuando revisas un PR?"* → Primero diseño y corrección (¿resuelve el problema, casos borde, concurrencia, seguridad), después rendimiento y operabilidad, luego tests. El estilo lo delego a analyzers y `dotnet format` en CI. Y cuido el tono: comentarios accionables, con porqué y severidad.

---

## 10. Buenas prácticas senior

Lo que separa a un senior de un mid no es saber más sintaxis: es **reducir riesgo, multiplicar al equipo y alinear la técnica con el negocio**.

### 10.1 Refactorizar código legacy sin romperlo

*"Código legacy es código sin tests"* (Michael Feathers, *Working Effectively with Legacy Code*). El problema no es la edad, es que no puedes cambiarlo con seguridad.

**Paso 1 — Tests de caracterización**: no pruebas lo que el código *debería* hacer, sino lo que **hace hoy** (incluidos sus bugs). Congelas el comportamiento y después refactorizas con red.

```csharp
public class CalculadoraFacturaLegacyTests
{
    [Theory]
    [InlineData(100, "CL", false)]
    [InlineData(100, "CL", true)]
    [InlineData(0,   "AR", false)]
    [InlineData(-5,  "CL", true)]   // entrada "absurda": igual la caracterizamos
    public Task Caracterizar_total(decimal monto, string pais, bool esVip)
    {
        var resultado = new CalculadoraFacturaLegacy().Calcular(monto, pais, esVip);
        // Snapshot testing con Verify: la primera ejecución guarda el resultado
        // aprobado (*.verified.txt); las siguientes fallan si cambia.
        return Verify(resultado).UseParameters(monto, pais, esVip);
    }
}
```

**Paso 2 — Buscar *seams*** (costuras): puntos donde puedes sustituir una dependencia sin editar la lógica (extraer interfaz sobre `DateTime.Now` → `TimeProvider`, envolver el `new SqlConnection` en un repositorio, inyectar por constructor, sesión 24).

**Paso 3 — Refactors pequeños**, cada uno en su commit, con los tests en verde entre medio. Nunca "la gran reescritura" en un PR de 5.000 líneas.

**Strangler Fig** (Martin Fowler) para sistemas enteros: en vez de reescribir de golpe, pones una fachada delante y vas migrando ruta a ruta hasta que el legacy queda vacío y se apaga.

```
               ┌───────────────────────┐
  Clientes ──▶ │ Fachada / API Gateway │   (YARP, sesión 35)
               └──────┬──────────┬─────┘
          /pedidos/*  │          │  todo lo demás
                      ▼          ▼
            ┌──────────────┐  ┌──────────────────┐
            │ OrderFlow    │  │ Monolito legacy  │  ← se va "estrangulando"
            │ (.NET nuevo) │  │ (.NET Framework) │
            └──────────────┘  └──────────────────┘
```

> ⚠️ La reescritura desde cero ("big bang") es de los proyectos que más fracasan: el sistema viejo contiene años de reglas de negocio no documentadas. Strangler + tests de caracterización reducen ese riesgo a pasos pequeños y reversibles.

### 10.2 Decisiones técnicas y ADRs

Toda decisión relevante (base de datos, broker, arquitectura, librería clave) tiene **trade-offs**. Un senior no dice "Kafka es mejor", dice "para nuestro caso, Kafka por X, aceptando Y".

Un **ADR** (*Architecture Decision Record*, formato de Michael Nygard) es un archivo Markdown corto, versionado junto al código, que registra **una** decisión. Nunca se edita la decisión: si cambia, se crea un ADR nuevo que *reemplaza* al anterior.

`docs/adr/0003-usar-rabbitmq-con-masstransit.md`:

```markdown
# 3. Usar RabbitMQ con MassTransit para eventos de dominio

- Estado: Aceptado (reemplaza a nadie) · Fecha: 2026-09-20
- Decisores: @waddini, @orderflow/backend

## Contexto
Pedidos debe notificar a Pagos e Inventario sin acoplarse (sesión 34).
Volumen estimado: ~200 msg/s en pico. Equipo sin experiencia operando Kafka.
Necesitamos reintentos, dead-letter y Outbox.

## Decisión
RabbitMQ (Amazon MQ en prod) con MassTransit y su Outbox transaccional sobre EF Core.

## Alternativas consideradas
- Kafka: replay y throughput altísimo, pero coste operativo alto y no necesitamos replay hoy.
- Azure Service Bus / SQS: lock-in de proveedor; entorno local más difícil.

## Consecuencias
+ Reintentos, DLQ y Outbox listos con poco código.
+ Docker Compose local trivial.
- Sin replay de eventos históricos; si lo necesitamos, nuevo ADR.
- Dependencia de MassTransit (revisar su licencia en cada versión mayor).
```

> ❓ **Entrevista**: *"Cuéntame una decisión técnica difícil que tomaste"* → Estructura: contexto, opciones, criterios (coste, riesgo, equipo, plazos), decisión, consecuencias y qué aprendiste. Es exactamente un ADR contado en voz alta.

### 10.3 Documentación que sí se lee

| Documento | Contenido |
|---|---|
| `README.md` | Qué es, cómo levantarlo en < 5 min (`docker compose up`), cómo correr tests, enlaces |
| `docs/adr/` | Decisiones y su porqué |
| Diagramas (C4: contexto, contenedores) | Cómo encajan las piezas, en Mermaid o PlantUML versionado |
| OpenAPI | Contrato de la API generado desde el código (sesión 23) |
| Runbooks | Qué hacer cuando salta la alerta X (sesión 36) |
| `CONTRIBUTING.md` | Flujo de ramas, convención de commits, cómo abrir un PR |

Principio: *docs as code* — la documentación vive en el repo, se revisa en PR y se actualiza en el mismo cambio que el código. Los comentarios en el código explican el **porqué** ("usamos `decimal` porque el redondeo bancario lo exige la normativa"), no el qué.

### 10.4 Mentoría

- **Pair programming** y *mob* en problemas difíciles: el conocimiento se transfiere haciendo.
- Deja que los juniors lleguen a la respuesta: pregunta "¿qué pasaría si dos requests llegan a la vez?" en lugar de reescribir su código.
- Reparte el trabajo interesante, no solo el aburrido. Delega con contexto y criterio de éxito claros.
- Tu impacto se mide por **lo que el equipo entrega**, no solo por lo que tú escribes.

### 10.5 Comunicación técnica

- **Adapta el nivel a la audiencia**: a un PM le importa impacto, plazo y riesgo; a un dev, el diseño; a negocio, dinero y clientes.
- Empieza por la conclusión (*BLUF: bottom line up front*): "Recomiendo posponer la migración dos semanas; motivo: ..."
- Comunica riesgos **temprano** y con opciones: "Si mantenemos la fecha, sale sin reembolsos; si los incluimos, +1 semana".
- Estima con rangos y supuestos, no con un número mágico.
- Postmortems **sin culpables** (*blameless*): qué pasó, por qué el sistema lo permitió, qué cambiamos.

### 10.6 Entender el negocio

El mejor código es el que **no hace falta escribir**. Antes de implementar, pregunta:

- ¿Qué problema de negocio resolvemos y cómo mediremos el éxito?
- ¿Hay una solución más barata (configuración, proceso manual temporal, producto existente)?
- ¿Cuál es el coste de equivocarnos? (Un bug en pagos ≠ un bug en el color de un botón.)

Conocer el dominio (el *lenguaje ubicuo* de DDD, sesión 26) te permite detectar requisitos contradictorios, proponer alternativas y priorizar deuda técnica en términos que negocio entiende: "este refactor reduce los incidentes de cobro duplicado que nos cuestan X al mes".

> ❓ **Entrevista**: *"¿Qué diferencia a un senior de un semi-senior?"* → Autonomía ante problemas ambiguos, criterio en trade-offs, foco en reducir riesgo (tests, despliegues reversibles, observabilidad), elevar al equipo (reviews, mentoría, documentación) y conectar decisiones técnicas con impacto de negocio.

---

## 11. Resumen mental de la sesión

```
Git = DAG de commits (snapshots) · rama/tag/HEAD = punteros
  merge   → no reescribe, commit con 2 padres · fast-forward si no hubo divergencia
  rebase  → re-aplica commits (hashes nuevos) · nunca en historia pública · --force-with-lease
  revert (público) vs reset (local) · cherry-pick -x (quirúrgico)
  reflog = red de seguridad local · bisect run = búsqueda binaria automatizada

Branching:  Git Flow (versiones en paralelo) · GitHub Flow (main + PRs) · Trunk-based (+ feature flags)
Commits:    tipo(ámbito)!: descripción  → feat=MINOR · fix=PATCH · BREAKING=MAJOR
SemVer:     MAJOR.MINOR.PATCH-pre+meta · NuGet "1.2.0" = ≥1.2.0, menor versión aplicable
            CPM + lock files + versión desde tag (MinVer/GitVersion)
Repo:       dotnet new gitignore · .gitattributes · nada de secretos (rotar si se filtra)
            main protegida: PR + review + CODEOWNERS + CI verde + sin force push
Review:     diseño > corrección > seguridad > rendimiento > operabilidad > tests > estilo(CI)
            feedback con porqué y severidad (blocker/suggestion/nit)
Senior:     tests de caracterización + seams + strangler fig · ADRs · docs as code
            mentoría · comunicación por audiencia · negocio primero
```

---

## 12. Chequeo de entrevista (respóndelas de memoria)
1. ❓ ¿Qué es realmente un commit en Git? ¿Y una rama? ¿Y HEAD? ¿Qué es un *detached HEAD*?
2. ❓ ¿Diferencia entre merge y rebase? ¿Cuándo usarías cada uno y cuál es la regla de oro del rebase?
3. ❓ ¿Por qué `--force-with-lease` en lugar de `--force`?
4. ❓ ¿`git revert` vs `git reset --hard`? ¿Cuál usarías en `main`?
5. ❓ Perdiste commits tras un rebase mal hecho. ¿Cómo los recuperas?
6. ❓ Un test empezó a fallar en algún punto de los últimos 200 commits. ¿Cómo encuentras el culpable rápido?
7. ❓ Compara Git Flow, GitHub Flow y trunk-based. ¿Qué papel juegan las feature flags?
8. ❓ ¿Qué es Conventional Commits y cómo se relaciona con SemVer y la automatización de releases?
9. ❓ Tu librería NuGet elimina un método público. ¿Qué número de versión cambia? ¿Y si solo añades una sobrecarga?
10. ❓ ¿Qué significa `<PackageReference Include="X" Version="1.2.0" />` en NuGet y cómo logras builds reproducibles?
11. ❓ ¿Qué reglas de protección pondrías en `main` y por qué?
12. ❓ Te toca modificar un módulo legacy sin tests. ¿Cuál es tu plan? (caracterización, seams, strangler fig)

## 13. Ejercicio práctico
Prepara el repositorio de **OrderFlow** (capstone de la sesión 32) como lo haría un equipo profesional:

1. Inicializa el repo y los archivos base:
   ```bash
   git init -b main orderflow && cd orderflow
   dotnet new gitignore && dotnet new editorconfig
   printf '* text=auto\n*.sh text eol=lf\n' > .gitattributes
   git add . && git commit -m "chore: estructura inicial del repositorio"
   gh repo create orderflow --public --source=. --push
   ```
2. Crea `.github/CODEOWNERS`, `.github/pull_request_template.md` y un workflow `build-and-test` (sesión 36).
3. Protege `main` con el comando `gh api` de la sección 8 (PR obligatorio, 1 aprobación, CI verde, sin force push, historial lineal).
4. Escribe `docs/adr/0001-registrar-decisiones-de-arquitectura.md` y `0002-clean-architecture-con-cqrs.md` con el formato Contexto / Decisión / Alternativas / Consecuencias.
5. Desarrolla una feature en `feat/cancelar-pedido` con al menos 3 commits Conventional; límpialos con `git rebase -i --autosquash main`, abre el PR con `gh pr create --fill` y mergéalo con *squash*.
6. Añade **MinVer** (`dotnet add src/OrderFlow.Api package MinVer`), crea el primer release y comprueba la versión:
   ```bash
   git tag -a v0.1.0 -m "release: v0.1.0"
   git push origin v0.1.0
   dotnet pack -c Release    # el .nupkg debe salir como 0.1.0
   ```
7. **Simula un incidente**: introduce a propósito un bug en el cálculo de descuentos en un commit intermedio, añade 5 commits más encima y encuéntralo con `git bisect run dotnet test`. Luego arréglalo con `git revert`.
8. (Opcional) Haz un `git reset --hard HEAD~3`, "pierde" trabajo y recupéralo con `git reflog`.

---

## 🎓 ¡Felicitaciones: terminaste el curso completo!

Has completado las **39 sesiones** en **6 bloques**: fundamentos del lenguaje y el runtime, C# intermedio y avanzado, features modernas e internals, backend profesional con ASP.NET Core y EF Core, arquitectura, testing, seguridad y performance, y por último el bloque **Senior en producción**: ASP.NET Core avanzado, mensajería y resiliencia, microservicios, Docker/CI/CD/observabilidad, SOLID y patrones, SQL, y hoy Git y las prácticas de trabajo de un senior. Eso cubre el temario de una entrevista **senior .NET** y, sobre todo, cómo trabaja uno en el día a día.

Marca la Sesión 39 en el [README](Readme.md) y cierra el círculo **terminando el capstone OrderFlow** (sesión 32), ahora con las piezas del Bloque 6:

| Pieza nueva | Qué añadir a OrderFlow | Sesión |
|---|---|---|
| **Mensajería y resiliencia** | Publicar `PedidoCreado`/`PedidoPagado` con MassTransit + RabbitMQ, Outbox transaccional, consumidores idempotentes, Polly en el cliente del proveedor de pagos | 34 |
| **Microservicios** | Separar Pagos e Inventario en servicios propios, saga de pedido con compensaciones, YARP como API Gateway, gRPC entre servicios, SignalR para notificar el estado al cliente | 35 |
| **Docker, CI/CD y observabilidad** | Dockerfiles multi-stage, Docker Compose de todo el sistema, GitHub Actions (build, tests con Testcontainers, imagen, deploy), OpenTelemetry con trazas distribuidas entre servicios, Serilog estructurado | 36 |
| **Flujo de trabajo** | Todo lo de esta sesión: `main` protegida, Conventional Commits, releases con tag, ADRs de cada decisión grande | 39 |

Cuando lo tengas, tendrás algo muy valioso para una entrevista: un sistema real, desplegable y observable, con un historial de Git limpio y ADRs que explican **por qué** cada decisión. Eso es lo que un entrevistador senior quiere escuchar.

➡️ **Cuando termines el capstone**, pídeme una **simulación de entrevista técnica senior .NET** basada en tu proyecto.
