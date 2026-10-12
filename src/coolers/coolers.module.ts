import { Module } from '@nestjs/common';
import { CoolersController } from './coolers.controller.js';

@Module({
  controllers: [CoolersController],
})
export class CoolersModule {}
