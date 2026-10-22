import { Module } from '@nestjs/common';
import { RutasModule } from '@/modules/rutas/rutas.module';
import { CoolersController } from './coolers.controller';
import { CoolersService } from './coolers.service';
import { CoolersRepository } from './repositories/coolers.repository';

@Module({
  imports: [RutasModule],
  controllers: [CoolersController],
  providers: [CoolersService, CoolersRepository],
})
export class CoolersModule {}
