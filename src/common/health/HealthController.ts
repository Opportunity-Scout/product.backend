import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness check — used by the Docker healthcheck, no auth required' })
  @ApiOkResponse({ description: 'The process is up and serving requests' })
  check() {
    return { status: 'ok' };
  }
}
