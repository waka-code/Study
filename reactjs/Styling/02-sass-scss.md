# Sass / SCSS

Sass/SCSS es un preprocesador de CSS que permite variables, anidamiento, mixins y funciones.

**Ejemplo básico:**
```scss
$primary: #007bff;
.button {
  background: $primary;
  color: white;
  border-radius: 4px;
  &:hover {
    background: darken($primary, 10%);
  }
}
```
