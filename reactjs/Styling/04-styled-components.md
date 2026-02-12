# styled-components

styled-components es una librería para React que permite escribir CSS en JS, creando componentes con estilos encapsulados.

**Ejemplo básico:**
```js
import styled from 'styled-components';

const Button = styled.button`
  background: #007bff;
  color: white;
  border-radius: 4px;
  transition: background 0.3s;
  &:hover {
    background: #0056b3;
  }
`;

// Uso
<Button>Botón Styled</Button>
```
