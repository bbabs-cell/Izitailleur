import { Module } from "@nestjs/common";
import { IssuesController } from "./issues.controller";
import { IssuesService } from "./issues.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
