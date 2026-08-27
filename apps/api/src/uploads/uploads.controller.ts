import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { presignOrderImageSchema } from "@izitailleur/shared";
import type { PresignOrderImageDto } from "@izitailleur/shared";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { UploadsService } from "./uploads.service";
import { OrdersService } from "../orders/orders.service";

@Controller("orders/:orderId/images")
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post("upload-url")
  async presign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body(new ZodValidationPipe(presignOrderImageSchema)) dto: PresignOrderImageDto,
  ) {
    // Vérifie que la commande appartient bien à l'atelier de l'utilisateur avant d'émettre une
    // URL de téléversement — sans ça n'importe quel compte authentifié pourrait écrire dans le
    // dossier photos d'une autre commande en devinant son id.
    await this.ordersService.getOrThrow(user.workshopId, orderId, user.role);
    return this.uploadsService.presignOrderImageUpload(user.workshopId, orderId, dto.contentType);
  }
}
