import { Order, OrderItem, Total } from './domain/Order';
const order = new Order('1', [new OrderItem('Libro', 20)], new Total(20));
console.log(order);
