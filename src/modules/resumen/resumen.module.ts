import { Module } from '@nestjs/common';
import { ResumenRepository } from './repositories/resumen.repository';
import { ResumenController } from './resumen.controller';
import { ResumenService } from './resumen.service';

// Indicadores y resumen de la pantalla de inicio.
@Module({
  controllers: [ResumenController],
  providers: [ResumenService, ResumenRepository],
})
export class ResumenModule {}
