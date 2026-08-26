import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { inviteEmployeeSchema, updateEmployeeRoleSchema } from "@izitailleur/shared";
import type { InviteEmployeeDto, UpdateEmployeeRoleDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { EmployeesService } from "./employees.service";

@Controller("employees")
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.list(user.workshopId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN")
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(inviteEmployeeSchema)) dto: InviteEmployeeDto,
  ) {
    return this.employeesService.invite(user.workshopId, dto);
  }

  @Patch(":id/role")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN")
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateEmployeeRoleSchema)) dto: UpdateEmployeeRoleDto,
  ) {
    return this.employeesService.updateRole(user.workshopId, id, dto.role);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("OWNER", "ADMIN")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.employeesService.remove(user.workshopId, id, user.sub);
  }
}
