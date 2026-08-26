import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
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
import { PaymentsModule } from "./payments/payments.module";
import { FinanceModule } from "./finance/finance.module";
import { SyncModule } from "./sync/sync.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AiModule } from "./ai/ai.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { WorkshopModule } from "./workshop/workshop.module";
import { UploadsModule } from "./uploads/uploads.module";

@Module({
  imports: [
    // Limites relâchées sous les tests automatisés (nombreuses inscriptions/connexions dans
    // une même minute depuis la même IP) ; strictes en développement/production.
    //
    // Stockage des compteurs : en mémoire par défaut (suffisant sur un processus persistant type
    // Railway/Render/VPS). Sur un hébergement serverless (Vercel), chaque invocation peut
    // démarrer une instance sans mémoire partagée — la protection anti-brute-force ne serait
    // alors plus effective sans un stockage partagé. Si REDIS_URL est défini (ex : Upstash Redis
    // en production), les compteurs sont stockés dans Redis et restent valides entre invocations.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: process.env.NODE_ENV === "test" ? 100000 : 120 }],
      ...(process.env.REDIS_URL
        ? { storage: new ThrottlerStorageRedisService(process.env.REDIS_URL) }
        : {}),
    }),
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
    PaymentsModule,
    FinanceModule,
    SyncModule,
    NotificationsModule,
    AiModule,
    DashboardModule,
    WorkshopModule,
    UploadsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
