# Generics (Genéricos)

```tsx
function identidad<T>(valor: T): T {
  return valor;
}
```

## Array genérico
```tsx
function primero<T>(arr: T[]): T | undefined {
  return arr[0];
}
const n = primero([1, 2, 3]); // n: number | undefined
const s = primero(["a", "b"]); // s: string | undefined
```

## Genéricos en interfaces
```tsx
interface Caja<T> {
  valor: T;
}
const cajaNumero: Caja<number> = { valor: 123 };
const cajaTexto: Caja<string> = { valor: "hola" };
```

## Genéricos con restricciones
```tsx
function longitud<T extends { length: number }>(x: T): number {
  return x.length;
}
longitud("hola"); // 4
longitud([1,2,3]); // 3
// longitud(123); // Error: number no tiene length
```

## Genéricos en clases
```tsx
class Pila<T> {
  private items: T[] = [];
  push(item: T) { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
const pila = new Pila<string>();
pila.push("uno");
```

## Genéricos múltiples
```tsx
function par<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const resultado = par(1, "dos"); // [number, string]
```
