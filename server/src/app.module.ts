import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ZerodhaModule } from './zerodha/zerodha.module';
import { GrowwModule } from './groww/groww.module';

@Module({
    imports: [AuthModule, ZerodhaModule, GrowwModule],
    controllers: [AppController],
    providers: [],
})
export class AppModule { }
