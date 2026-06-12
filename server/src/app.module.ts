import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ZerodhaModule } from './zerodha/zerodha.module';
import { GrowwModule } from './groww/groww.module';
import { IndMoneyModule } from './indmoney/indmoney.module';

@Module({
    imports: [AuthModule, ZerodhaModule, GrowwModule, IndMoneyModule],
    controllers: [AppController],
    providers: [],
})
export class AppModule { }
