import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.get(user.workshopId, user.sub, user.role);
  }
}
