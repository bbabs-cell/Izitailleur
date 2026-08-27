import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { garmentModelSchema } from "@izitailleur/shared";
import type { GarmentModelDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ModelsService } from "./models.service";

@Controller("models")
@UseGuards(JwtAuthGuard)
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.modelsService.list(user.workshopId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.modelsService.getOrThrow(user.workshopId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(garmentModelSchema)) dto: GarmentModelDto,
  ) {
    return this.modelsService.create(user.workshopId, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.modelsService.remove(user.workshopId, id);
  }
}
