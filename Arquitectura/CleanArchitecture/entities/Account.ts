export class Account {
  constructor(public id: string, public balance: number) {}
  debit(amount: number) { this.balance -= amount; }
  credit(amount: number) { this.balance += amount; }
}
