import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateUserDto, UserResponseDto } from '@app/shared';
import { ProxyService } from '../proxy.service';

@Controller('users')
export class UsersProxyController {
  private readonly userServiceUrl =
    process.env.USER_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly proxy: ProxyService) {}

  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.proxy.forward(this.userServiceUrl, 'POST', '/users', dto);
  }

  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.proxy.forward(this.userServiceUrl, 'GET', '/users');
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.proxy.forward(this.userServiceUrl, 'GET', `/users/${id}`);
  }
}
