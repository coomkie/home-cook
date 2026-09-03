import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('stubs')
@Controller('chefs')
export class ChefsStubController {
  @Get('health')
  @ApiOperation({ summary: 'Phase 1 stub — Chef module' })
  health() {
    return {
      status: 'stub',
      module: 'chefs',
      message: 'Phase 1: Chef registration & profiles',
    };
  }
}
