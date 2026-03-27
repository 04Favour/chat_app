import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {ExtractJwt, Strategy} from 'passport-jwt'
import { AuthService } from "../auth.service";
import { ConfigService } from "@nestjs/config";
import { User } from "src/users/entities/user.entity";

export interface Payload {
    username: string,
    sub: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService, private readonly configService: ConfigService){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')
        })
    }

    async validate(payload: Payload): Promise<User> {
        const user = await this.authService.validateUser(payload.sub)
        if(!user) throw new UnauthorizedException(`User not authorized`);
        return user
    }
}