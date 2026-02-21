# Rutas Paralelas

Las rutas paralelas en Next.js te permiten renderizar múltiples páginas o layouts en paralelo. Esto es particularmente útil para aplicaciones complejas donde deseas mostrar múltiples vistas simultáneamente.

Puedes definir rutas paralelas en el directorio `app` creando carpetas con el mismo nombre dentro de diferentes grupos de rutas. Por ejemplo:

```
/app/(marketing)/home/page.js
/app/(dashboard)/home/page.js
```

Luego puedes usar el símbolo `@` para referenciar estas rutas en tu layout:

```javascript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <div>{children}</div>
        <div id="marketing">
          <Marketing />
        </div>
      </body>
    </html>
  );
}
```