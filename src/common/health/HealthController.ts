import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

// Internal liveness check (Docker healthcheck, future uptime monitoring) —
// deliberately not part of the public API surface, so it's excluded from Swagger.
@ApiExcludeController()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
