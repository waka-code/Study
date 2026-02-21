# Rutas Dinámicas

Las rutas dinámicas te permiten crear páginas con contenido dinámico basado en la URL. En Next.js, puedes crear una ruta dinámica utilizando corchetes en el nombre del archivo dentro del directorio `pages`.

Por ejemplo:

```
/pages/post/[id].js
```

Este archivo coincidirá con cualquier ruta como `/post/1`, `/post/2`, etc. El parámetro `id` se puede acceder utilizando el hook `useRouter` o las funciones `getServerSideProps`/`getStaticProps`.

Ejemplo:

```javascript
import { useRouter } from 'next/router';

const Post = () => {
  const router = useRouter();
  const { id } = router.query;

  return <p>ID del Post: {id}</p>;
};

export default Post;
```