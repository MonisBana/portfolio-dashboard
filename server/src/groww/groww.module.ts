import { Module } from '@nestjs/common';
import { GrowwController } from './groww.controller';
import { GrowwService } from './groww.service';

@Module({
    controllers: [GrowwController],
    providers: [GrowwService],
    exports: [GrowwService],
})
export class GrowwModule { }
