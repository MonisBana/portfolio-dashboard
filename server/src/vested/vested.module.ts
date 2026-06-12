import { Module } from '@nestjs/common';
import { VestedController } from './vested.controller';
import { VestedService } from './vested.service';

@Module({
    controllers: [VestedController],
    providers: [VestedService],
    exports: [VestedService],
})
export class VestedModule { }
