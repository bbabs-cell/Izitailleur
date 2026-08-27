import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { createFabricMovementSchema, fabricSchema } from "@izitailleur/shared";
import type { CreateFabricMovementDto, FabricDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FabricsService } from "./fabrics.service";

@Controller("fabrics")
@UseGuards(JwtAuthGuard)
export class FabricsController {
  constructor(private readonly fabricsService: FabricsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.fabricsService.list(user.workshopId, user.role);
  }

  @Get("low-stock")
  lowStock(@CurrentUser() user: AuthenticatedUser) {
    return this.fabricsService.lowStock(user.workshopId, user.role);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fabricsService.getOrThrow(user.workshopId, id, user.role);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(fabricSchema)) dto: FabricDto,
  ) {
    return this.fabricsService.create(user.workshopId, dto);
  }

  @Post(":id/movements")
  recordMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createFabricMovementSchema)) dto: CreateFabricMovementDto,
  ) {
    return this.fabricsService.recordMovement(user.workshopId, id, dto, user.role);
  }
}
