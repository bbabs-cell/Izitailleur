import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  createMeasurementProfileSchema,
  createMeasurementSchema,
  customerSchema,
} from "@izitailleur/shared";
import type {
  CreateMeasurementDto,
  CreateMeasurementProfileDto,
  CustomerDto,
} from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CustomersService } from "./customers.service";

@Controller("customers")
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("search") search?: string) {
    return this.customersService.list(user.workshopId, search);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customersService.getOrThrow(user.workshopId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(customerSchema)) dto: CustomerDto,
  ) {
    return this.customersService.create(user.workshopId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(customerSchema.partial())) dto: Partial<CustomerDto>,
  ) {
    return this.customersService.update(user.workshopId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customersService.remove(user.workshopId, id);
  }

  @Post(":id/measurement-profiles")
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") customerId: string,
    @Body(new ZodValidationPipe(createMeasurementProfileSchema)) dto: CreateMeasurementProfileDto,
  ) {
    return this.customersService.createMeasurementProfile(user.workshopId, customerId, dto);
  }

  @Get("measurement-profiles/:profileId/measurements")
  listMeasurements(@CurrentUser() user: AuthenticatedUser, @Param("profileId") profileId: string) {
    return this.customersService.listMeasurements(user.workshopId, profileId);
  }

  @Post("measurement-profiles/:profileId/measurements")
  addMeasurement(
    @CurrentUser() user: AuthenticatedUser,
    @Param("profileId") profileId: string,
    @Body(new ZodValidationPipe(createMeasurementSchema)) dto: CreateMeasurementDto,
  ) {
    return this.customersService.addMeasurement(user.workshopId, profileId, dto);
  }
}
