import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { createAppointmentSchema } from "@izitailleur/shared";
import type { CreateAppointmentDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AppointmentsService } from "./appointments.service";

@Controller("appointments")
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("from") from: string, @Query("to") to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Paramètres 'from' et 'to' invalides (format ISO attendu)");
    }
    return this.appointmentsService.list(user.workshopId, fromDate, toDate);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAppointmentSchema)) dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(user.workshopId, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.appointmentsService.remove(user.workshopId, id);
  }
}
