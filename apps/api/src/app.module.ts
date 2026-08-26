import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CustomersModule } from "./customers/customers.module";
import { OrdersModule } from "./orders/orders.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { EmployeesModule } from "./employees/employees.module";
import { FabricsModule } from "./fabrics/fabrics.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { IssuesModule } from "./issues/issues.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    OrdersModule,
    AppointmentsModule,
    EmployeesModule,
    FabricsModule,
    SuppliersModule,
    IssuesModule,
  ],
})
export class AppModule {}
