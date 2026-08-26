import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { updateWorkshopSchema } from "@izitailleur/shared";
import type { UpdateWorkshopDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { WorkshopService } from "./workshop.service";

@Controller("workshop")
@UseGuards(JwtAuthGuard)
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.workshopService.get(user.workshopId);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateWorkshopSchema)) dto: UpdateWorkshopDto,
  ) {
    return this.workshopService.update(user.workshopId, dto);
  }
}
