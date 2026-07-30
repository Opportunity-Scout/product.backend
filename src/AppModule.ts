import { Module } from '@nestjs/common';
import { SearchProfileModule } from './modules/searchProfile/SearchProfileModule';

@Module({
  imports: [SearchProfileModule],
})
export class AppModule {}
