# Accesibilidad (a11y) en React

## ¿Qué es la accesibilidad web?

La accesibilidad web (a11y) garantiza que personas con discapacidades puedan usar aplicaciones web. Incluye:
- Discapacidades visuales (ciegos, baja visión, daltonismo)
- Discapacidades motoras (dificultad para usar mouse/teclado)
- Discapacidades cognitivas (dislexia, ADHD)
- Discapacidades auditivas

**Importancia:**
- Requisito legal (WCAG, ADA en EE.UU.)
- Mejora la UX para todos los usuarios
- Aumenta el mercado potencial (15% de la población mundial)

---

## HTML Semántico

### Usa elementos HTML apropiados

❌ **Incorrecto:**
```jsx
<div onClick={handleClick} role="button">Click me</div>
```

✅ **Correcto:**
```jsx
<button onClick={handleClick}>Click me</button>
```

### Jerarquía de encabezados

```jsx
<h1>Título principal</h1>
<h2>Sección 1</h2>
<h3>Subsección</h3>
<h2>Sección 2</h2>
```

### Landmarks para navegación

```jsx
<header>
  <nav aria-label="Navegación principal">
    <ul>
      <li><a href="/">Inicio</a></li>
      <li><a href="/about">Acerca de</a></li>
    </ul>
  </nav>
</header>

<main>
  <h1>Contenido principal</h1>
</main>

<aside aria-label="Barra lateral">
  {/* Contenido relacionado */}
</aside>

<footer>
  <p>© 2024 Mi Sitio</p>
</footer>
```

---

## ARIA Attributes

### Cuándo usar ARIA

**Regla de oro:** Usa HTML semántico primero, ARIA solo cuando sea necesario.

### Roles comunes

```jsx
// Botón personalizado
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>
  Custom Button
</div>

// Diálogo modal
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Título del diálogo</h2>
  <p>Contenido del diálogo</p>
</div>

// Menú
<ul role="menu" aria-label="Opciones">
  <li role="menuitem">Opción 1</li>
  <li role="menuitem">Opción 2</li>
</ul>
```

### Estados y propiedades

```jsx
// Expandible
<button
  aria-expanded={isOpen}
  aria-controls="panel-id"
  onClick={toggle}
>
  Toggle
</button>
<div id="panel-id" hidden={!isOpen}>
  Contenido
</div>

// Live regions para contenido dinámico
<div aria-live="polite" aria-atomic="true">
  {message && <p>{message}</p>}
</div>

// Contenido oculto
<span aria-hidden="true">Icono decorativo</span>
```

### Labels: aria-label vs aria-labelledby vs aria-describedby

```jsx
// aria-label: Texto alternativo cuando no hay etiqueta visible
<button aria-label="Cerrar modal">×</button>

// aria-labelledby: Referencia a otro elemento con texto
<input
  id="username"
  aria-labelledby="username-label"
/>
<label id="username-label" htmlFor="username">
  Nombre de usuario
</label>

// aria-describedby: Descripción adicional
<input
  id="email"
  aria-describedby="email-help"
/>
<span id="email-help">Usa tu correo corporativo</span>
```

---

## Navegación por Teclado

### Gestión de focus

```jsx
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Guardar el focus anterior
      previousFocusRef.current = document.activeElement;
      // Focus en el modal
      modalRef.current?.focus();
      
      // Trap focus dentro del modal
      const handleTab = (e) => {
        if (e.key !== 'Tab') return;
        
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };
      
      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    } else {
      // Restaurar focus al cerrar
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  return isOpen ? (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* Contenido del modal */}
    </div>
  ) : null;
}
```

### Skip links

```jsx
function App() {
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        style={{
          position: 'absolute',
          top: '-40px',
          left: 0,
          background: '#000',
          color: '#fff',
          padding: '8px',
          zIndex: 100,
        }}
      >
        Saltar al contenido principal
      </a>
      <header>...</header>
      <main id="main-content">
        {/* Contenido principal */}
      </main>
    </>
  );
}
```

### Atajos de teclado

```jsx
function Search() {
  const handleKeyDown = (e) => {
    // Ctrl/Cmd + K para abrir búsqueda
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Abrir modal de búsqueda
    }
    // Escape para cerrar
    if (e.key === 'Escape') {
      // Cerrar modal
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <div>Presiona Ctrl/Cmd + K para buscar</div>;
}
```

---

## Patrones Específicos en React

### Componente de botón accesible

```jsx
function AccessibleButton({ children, onClick, ...props }) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Custom hook para focus

```jsx
function useFocusTrap(isActive) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isActive]);

  return containerRef;
}
```

### Modales con Portal

```jsx
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

---

## Color y Diseño Visual

### Contraste de color

- **Texto normal:** Mínimo 4.5:1
- **Texto grande:** Mínimo 3:1
- **Componentes UI:** Mínimo 3:1

```jsx
// ❌ Bajo contraste
<button style={{ background: '#ffff00', color: '#ffffff' }}>
  Click
</button>

// ✅ Buen contraste
<button style={{ background: '#0066cc', color: '#ffffff' }}>
  Click
</button>
```

### No depender solo del color

```jsx
// ❌ Solo color indica estado
<div style={{ color: error ? 'red' : 'green' }}>
  {message}
</div>

// ✅ Icono + color
<div style={{ color: error ? 'red' : 'green' }}>
  {error ? '❌ ' : '✅ '}
  {message}
</div>
```

### Indicadores de focus

```css
/* Siempre mostrar focus visible */
button:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}

/* Opcional: ocultar focus solo con mouse */
button:focus:not(:focus-visible) {
  outline: none;
}
```

---

## Consideraciones para Screen Readers

### Testing con lectores de pantalla

- **NVDA** (Windows, gratuito)
- **JAWS** (Windows, comercial)
- **VoiceOver** (macOS/iOS, integrado)
- **TalkBack** (Android, integrado)

### Live regions para contenido dinámico

```jsx
function Notification() {
  const [notification, setNotification] = useState(null);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {notification && <p>{notification}</p>}
    </div>
  );
}

// aria-live="polite": Anuncia cuando el usuario está inactivo
// aria-live="assertive": Anuncia inmediatamente (solo para errores críticos)
// aria-atomic="true": Anuncia todo el contenido, no solo lo cambiado
```

### Contenido oculto para screen readers

```jsx
// Texto solo para screen readers
<span className="sr-only">
  (abre en nueva pestaña)
</span>

/* CSS */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Herramientas de Testing

### Herramientas automatizadas

```bash
# Instalar axe-core
npm install --save-dev @axe-core/react

# Instalar eslint-plugin-jsx-a11y
npm install --save-dev eslint-plugin-jsx-a11y
```

```javascript
// jest-axe para testing unitario
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component should be accessible', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Configuración de ESLint

```json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "jsx-a11y/anchor-is-valid": "warn",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/no-static-element-interactions": "warn"
  }
}
```

### Lighthouse

```bash
# Ejecutar Lighthouse con accesibilidad
npx lighthouse http://localhost:3000 --only-categories=accessibility
```

### Testing manual - Checklist

- [ ] Navegar solo con teclado (Tab, Shift+Tab, Enter, Escape)
- [ ] Verificar orden de focus lógico
- [ ] Probar con screen reader
- [ ] Verificar contraste de colores
- [ ] Probar zoom al 200%
- [ ] Verificar que todos los elementos interactivos son accesibles
- [ ] Probar con modo alto contraste
- [ ] Verificar que los formularios tienen labels

---

## Anti-Patrones Comunes en React

### 1. onClick en elementos no interactivos

❌ **Incorrecto:**
```jsx
<div onClick={handleClick}>Click me</div>
```

✅ **Correcto:**
```jsx
<button onClick={handleClick}>Click me</button>
// O si necesitas un div:
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  }}
>
  Click me
</div>
```

### 2. Labels faltantes en forms

❌ **Incorrecto:**
```jsx
<input type="text" placeholder="Nombre" />
```

✅ **Correcto:**
```jsx
<label htmlFor="name">
  Nombre
  <input id="name" type="text" />
</label>
// O
<input
  id="name"
  type="text"
  aria-label="Nombre"
/>
```

### 3. Auto-focus problemático

❌ **Incorrecto:**
```jsx
useEffect(() => {
  inputRef.current.focus();
}, []); // Siempre hace focus al cargar
```

✅ **Correcto:**
```jsx
useEffect(() => {
  if (shouldAutoFocus) {
    inputRef.current.focus();
  }
}, [shouldAutoFocus]);
```

### 4. Contenido dinámico sin anuncios

❌ **Incorrecto:**
```jsx
<div>{errorMessage}</div>
```

✅ **Correcto:**
```jsx
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

---

## Recursos y Referencias

### Documentación oficial
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Accessibility Documentation](https://react.dev/learn/accessibility)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

### Herramientas
- [axe DevTools](https://www.deque.com/axe/devtools/) - Extensión de navegador
- [WAVE](https://wave.webaim.org/) - Evaluador web de accesibilidad
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Bibliotecas útiles
- `@headlessui/react` - Componentes accesibles
- `radix-ui` - Componentes UI accesibles y sin estilos
- `react-aria` - Hooks para accesibilidad

### Aprender más
- [WebAIM Accessibility Tutorials](https://webaim.org/tutorials/)
- [a11y-project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)
