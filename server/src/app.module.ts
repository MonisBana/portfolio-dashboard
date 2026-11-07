import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ZerodhaModule } from './zerodha/zerodha.module';
import { GrowwModule } from './groww/groww.module';
import { IndMoneyModule } from './indmoney/indmoney.module';
import { VestedModule } from './vested/vested.module';

@Module({
    imports: [ZerodhaModule, GrowwModule, IndMoneyModule, VestedModule],
    controllers: [AppController],
    providers: [],
})
export class AppModule { }
