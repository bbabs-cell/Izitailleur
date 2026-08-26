import { Module } from "@nestjs/common";
import { WorkshopController } from "./workshop.controller";
import { WorkshopService } from "./workshop.service";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../common/guards/roles.guard";

@Module({
  imports: [AuthModule],
  controllers: [WorkshopController],
  providers: [WorkshopService, RolesGuard],
})
export class WorkshopModule {}
