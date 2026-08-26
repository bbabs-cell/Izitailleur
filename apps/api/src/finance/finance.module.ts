import { Module } from "@nestjs/common";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  imports: [AuthModule],
  controllers: [FinanceController],
  providers: [FinanceService, RolesGuard],
})
export class FinanceModule {}
