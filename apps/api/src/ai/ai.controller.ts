import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { askAiSchema } from "@izitailleur/shared";
import type { AskAiDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("ask")
  ask(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(askAiSchema)) dto: AskAiDto,
  ) {
    return this.aiService.ask(user.workshopId, user.sub, user.role, dto.question);
  }
}
