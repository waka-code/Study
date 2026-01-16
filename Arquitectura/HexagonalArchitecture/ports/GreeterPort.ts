import { Greeter } from '../core/Greeter';
export interface GreeterPort {
  greetUser(name: string): string;
}
