import { Module } from '@nestjs/common';
import { RutasModule } from '../rutas/rutas.module.js';
import { CoolersController } from './coolers.controller.js';

@Module({
  imports: [RutasModule],
  controllers: [CoolersController],
})
export class CoolersModule {}
