import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { pushSyncSchema } from "@izitailleur/shared";
import type { PushSyncDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SyncService } from "./sync.service";

@Controller("sync")
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get("pull")
  pull(@CurrentUser() user: AuthenticatedUser, @Query("since") since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    if (Number.isNaN(sinceDate.getTime())) {
      throw new BadRequestException("Paramètre 'since' invalide (format ISO attendu)");
    }
    return this.syncService.pull(user.workshopId, sinceDate);
  }

  @Post("push")
  push(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(pushSyncSchema)) dto: PushSyncDto,
  ) {
    return this.syncService.push(user.workshopId, dto);
  }
}
