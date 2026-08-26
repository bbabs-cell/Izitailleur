import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { loginSchema, refreshSchema, registerSchema } from "@izitailleur/shared";
import type { LoginDto, RefreshDto, RegisterDto } from "@izitailleur/shared";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

// Limite stricte anti-brute-force sur les routes d'authentification (au-delà de la
// limite globale de l'application) : 10 tentatives par minute par IP. Relâchée sous les
// tests automatisés (nombreuses inscriptions/connexions dans une même minute).
const AUTH_THROTTLE = {
  default: { limit: process.env.NODE_ENV === "test" ? 100000 : 10, ttl: 60000 },
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle(AUTH_THROTTLE)
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
