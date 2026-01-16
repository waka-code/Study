import { GreeterService } from '../core/Greeter';
import { GreeterPort } from '../ports/GreeterPort';
export class GreeterAdapter implements GreeterPort {
  private greeter = new GreeterService();
  greetUser(name: string) {
    return this.greeter.greet(name);
  }
}
