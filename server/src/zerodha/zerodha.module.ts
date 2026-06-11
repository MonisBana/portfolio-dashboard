import { Module } from '@nestjs/common';
import { ZerodhaController } from './zerodha.controller';
import { ZerodhaService } from './zerodha.service';

@Module({
    controllers: [ZerodhaController],
    providers: [ZerodhaService],
    exports: [ZerodhaService],
})
export class ZerodhaModule { }
