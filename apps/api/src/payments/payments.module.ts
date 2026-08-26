import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { ReceiptsController } from "./receipts.controller";
import { ReceiptsService } from "./receipts.service";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController, ReceiptsController],
  providers: [PaymentsService, ReceiptsService, RolesGuard],
})
export class PaymentsModule {}
