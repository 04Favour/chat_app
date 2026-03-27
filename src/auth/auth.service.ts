import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from 'src/users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService){}

    async register(registerDto: RegisterDto): Promise<{access_token: string, user}>{
        const user = await this.usersService.create(registerDto.username, registerDto.email, registerDto.password)
        const payload = {username: user.username, sub: user.id}
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        }
    }

    async login(loginDto: LoginDto){
        const user = await this.usersService.findByUsername(loginDto.username)
        if(!user) throw new UnauthorizedException('Invalid credentials');
        const isPasswordValid: boolean = await bcrypt.compare(loginDto.password, user.password)
        if(!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
        const payload = {email: user.email, sub: user.id}
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            }
        }
    }

    async validateUser(userId: string): Promise<User | null>{
        return await this.usersService.findById(userId)
    }
}
