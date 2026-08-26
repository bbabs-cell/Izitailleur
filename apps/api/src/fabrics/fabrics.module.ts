import { Module } from "@nestjs/common";
import { FabricsController } from "./fabrics.controller";
import { FabricsService } from "./fabrics.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [FabricsController],
  providers: [FabricsService],
  exports: [FabricsService],
})
export class FabricsModule {}
