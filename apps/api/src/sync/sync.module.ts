import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { AuthModule } from "../auth/auth.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
