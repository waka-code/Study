import { Transfer } from '../usecases/Transfer';
import { Account } from '../entities/Account';
export class TransferController {
  transfer(fromId: string, toId: string, amount: number) {
    // Simulación: obtención de cuentas
    const from = new Account(fromId, 100);
    const to = new Account(toId, 50);
    new Transfer().execute(from, to, amount);
    return { from, to };
  }
}
