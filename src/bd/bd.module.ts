import { Global, Module } from '@nestjs/common';
import { BdService } from './bd.service.js';

@Global()
@Module({
  providers: [BdService],
  exports: [BdService],
})
export class BdModule {}
