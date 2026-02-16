import { Controller, Get } from '@nestjs/common';
import { LandingService } from './landing.service';

@Controller('landing')
export class LandingController {
    constructor(private readonly landingService: LandingService) { }

    @Get('features')
    getFeatures() {
        return this.landingService.getFeatures();
    }

    @Get('steps')
    getSteps() {
        return this.landingService.getSteps();
    }
}
