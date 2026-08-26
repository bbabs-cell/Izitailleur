import { Module } from "@nestjs/common";
import { FabricsController } from "./fabrics.controller";
import { FabricsService } from "./fabrics.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [FabricsController],
  providers: [FabricsService],
  exports: [FabricsService],
})
export class FabricsModule {}
