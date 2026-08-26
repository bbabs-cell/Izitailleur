import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { createPaymentSchema } from "@izitailleur/shared";
import type { CreatePaymentDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PaymentsService } from "./payments.service";

@Controller("orders/:orderId/payments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN", "MANAGER")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param("orderId") orderId: string) {
    return this.paymentsService.list(user.workshopId, orderId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body(new ZodValidationPipe(createPaymentSchema)) dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(user.workshopId, orderId, dto, user.sub);
  }
}
