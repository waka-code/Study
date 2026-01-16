export interface Greeter {
  greet(name: string): string;
}

export class GreeterService implements Greeter {
  greet(name: string) { return `Hola, ${name}`; }
}
