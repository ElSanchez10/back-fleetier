import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { BdModule } from './bd/bd.module.js';
import { SaludController } from './salud/salud.controller.js';

@Module({
  imports: [BdModule, AuthModule],
  controllers: [SaludController],
})
export class AppModule {}
