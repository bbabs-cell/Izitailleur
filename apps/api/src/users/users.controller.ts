import { Controller, Get, NotFoundException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@CurrentUser() authUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.sub },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        workshopId: true,
        workshop: { select: { id: true, name: true } },
      },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    return user;
  }
}
