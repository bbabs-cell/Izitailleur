import { Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("unread") unread?: string) {
    return this.notificationsService.list(user.workshopId, unread === "true");
  }

  @Post("scan")
  scan(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.scan(user.workshopId);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.notificationsService.markRead(user.workshopId, id);
  }
}
