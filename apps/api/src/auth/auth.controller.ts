import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { loginSchema, refreshSchema, registerSchema } from "@izitailleur/shared";
import type { LoginDto, RefreshDto, RegisterDto } from "@izitailleur/shared";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
