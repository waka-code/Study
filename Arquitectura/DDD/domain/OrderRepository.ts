import { Order } from './Order';
export interface OrderRepository {
  save(order: Order): void;
  findById(id: string): Order | undefined;
}
