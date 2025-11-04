import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  getRoot(): { status: string; timestamp: string } {
    return { 
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}


