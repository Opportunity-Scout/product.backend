import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DEFAULT_THROTTLE_LIMIT, DEFAULT_THROTTLE_TTL_MS } from '@app/common/rateLimiting/throttleLimits';
import { HealthController } from '@app/common/health/HealthController';
import { SearchProfileModule } from './modules/searchProfile/SearchProfileModule';
import { UserModule } from './modules/user/UserModule';
import { AuthModule } from './modules/auth/AuthModule';

@Module({
  controllers: [HealthController],
  imports: [
    ThrottlerModule.forRoot([
      // IP-based, applies to every route — catches volumetric abuse from one IP.
      { name: 'default', ttl: DEFAULT_THROTTLE_TTL_MS, limit: DEFAULT_THROTTLE_LIMIT },
      // Same as `default` everywhere except AuthController.login(), which overrides
      // both the limit and tracker to add per-account protection on top.
      { name: 'perAccount', ttl: DEFAULT_THROTTLE_TTL_MS, limit: DEFAULT_THROTTLE_LIMIT },
    ]),
    SearchProfileModule,
    UserModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
