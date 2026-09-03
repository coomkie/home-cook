import { Controller, Get } from '@nestjs/common';

/** Phase 1+ stubs inside recipe-service */
@Controller('reviews')
export class ReviewsStubController {
  @Get('health')
  health() {
    return {
      status: 'stub',
      module: 'reviews',
      message: 'Phase 2: cooked reviews & ratings',
    };
  }
}
