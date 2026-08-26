import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { createIssueSchema, updateIssueStatusSchema, type IssueStatus } from "@izitailleur/shared";
import type { CreateIssueDto, UpdateIssueStatusDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { IssuesService } from "./issues.service";

@Controller("issues")
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: IssueStatus) {
    return this.issuesService.list(user.workshopId, status);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.issuesService.getOrThrow(user.workshopId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createIssueSchema)) dto: CreateIssueDto,
  ) {
    return this.issuesService.create(user.workshopId, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateIssueStatusSchema)) dto: UpdateIssueStatusDto,
  ) {
    return this.issuesService.updateStatus(user.workshopId, id, dto.status, dto.solution);
  }
}
