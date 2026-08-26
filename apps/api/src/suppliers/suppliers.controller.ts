import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { supplierSchema } from "@izitailleur/shared";
import type { SupplierDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SuppliersService } from "./suppliers.service";

@Controller("suppliers")
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.suppliersService.list(user.workshopId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.suppliersService.getOrThrow(user.workshopId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(supplierSchema)) dto: SupplierDto,
  ) {
    return this.suppliersService.create(user.workshopId, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.suppliersService.remove(user.workshopId, id);
  }
}
