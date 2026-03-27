import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Add Swagger
  @Post('/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() register: RegisterDto){
    return await this.authService.register(register)
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() login: LoginDto){
    return await this.authService.login(login)
  }
}
