import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Role } from "@izitailleur/shared";

export interface AuthenticatedUser {
  sub: string;
  workshopId: string;
  role: Role;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token manquant");
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = this.jwtService.verify<AuthenticatedUser>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token invalide ou expiré");
    }
  }
}
