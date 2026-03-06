import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Will be implemented with Prisma client in Task 2
  }

  async onModuleDestroy() {
    // Will be implemented with Prisma client in Task 2
  }
}
