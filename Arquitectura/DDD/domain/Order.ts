export class Order {
  constructor(public id: string, public items: OrderItem[], public total: Total) {}
}

export class OrderItem {
  constructor(public name: string, public price: number) {}
}

export class Total {
  constructor(public value: number) {}
}
