import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { AuthModule } from "../auth/auth.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
