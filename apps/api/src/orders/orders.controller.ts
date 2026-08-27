import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  createOrderImageSchema,
  createOrderSchema,
  createOrderTaskSchema,
  updateOrderStatusSchema,
  updateOrderTaskStatusSchema,
  type OrderStatus,
} from "@izitailleur/shared";
import type {
  CreateOrderDto,
  CreateOrderImageDto,
  CreateOrderTaskDto,
} from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: OrderStatus) {
    return this.ordersService.list(user.workshopId, user.role, status);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ordersService.getOrThrow(user.workshopId, id, user.role);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto,
  ) {
    return this.ordersService.create(user.workshopId, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema)) dto: { status: OrderStatus },
  ) {
    return this.ordersService.updateStatus(user.workshopId, id, dto.status);
  }

  @Get(":id/images")
  listImages(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ordersService.listImages(user.workshopId, id);
  }

  @Post(":id/images")
  addImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createOrderImageSchema)) dto: CreateOrderImageDto,
  ) {
    return this.ordersService.addImage(user.workshopId, id, dto);
  }

  @Post(":id/tasks")
  addTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createOrderTaskSchema)) dto: CreateOrderTaskDto,
  ) {
    return this.ordersService.addTask(user.workshopId, id, dto);
  }

  @Patch(":id/tasks/:taskId/status")
  updateTaskStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("taskId") taskId: string,
    @Body(new ZodValidationPipe(updateOrderTaskStatusSchema))
    dto: { status: "TODO" | "IN_PROGRESS" | "DONE" },
  ) {
    return this.ordersService.updateTaskStatus(user.workshopId, id, taskId, dto.status);
  }
}
