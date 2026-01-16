import { TransferController } from '../adapters/TransferController';
const controller = new TransferController();
console.log(controller.transfer('A', 'B', 10));
