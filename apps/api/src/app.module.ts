import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CustomersModule } from "./customers/customers.module";
import { OrdersModule } from "./orders/orders.module";
import { AppointmentsModule } from "./appointments/appointments.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    OrdersModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
