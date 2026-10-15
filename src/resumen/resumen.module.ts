import { Module } from '@nestjs/common';
import { ResumenController } from './resumen.controller.js';

// Indicadores y resumen de la pantalla de inicio.
@Module({ controllers: [ResumenController] })
export class ResumenModule {}
