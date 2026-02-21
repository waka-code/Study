# Grupos de Rutas

Los grupos de rutas en Next.js te permiten organizar tus rutas sin afectar la estructura de la URL. Esto es útil para agrupar archivos relacionados mientras mantienes la URL limpia.

Para crear un grupo de rutas, envuelve el nombre de la carpeta entre paréntesis. Por ejemplo:

```
/pages/(admin)/dashboard.js
/pages/(admin)/settings.js
/pages/home.js
```

Las URLs serán:
- `/dashboard`
- `/settings`
- `/home`

La carpeta `(admin)` no aparecerá en la URL pero ayuda a organizar tus archivos.