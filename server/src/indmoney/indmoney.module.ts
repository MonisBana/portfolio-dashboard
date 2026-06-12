import { Module } from '@nestjs/common';
import { IndMoneyController } from './indmoney.controller';
import { IndMoneyService } from './indmoney.service';

@Module({
    controllers: [IndMoneyController],
    providers: [IndMoneyService],
    exports: [IndMoneyService],
})
export class IndMoneyModule { }
