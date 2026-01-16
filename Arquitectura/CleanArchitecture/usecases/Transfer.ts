import { Account } from '../entities/Account';
export class Transfer {
  execute(from: Account, to: Account, amount: number) {
    from.debit(amount);
    to.credit(amount);
  }
}
