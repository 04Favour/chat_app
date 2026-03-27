import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { Payload } from "src/auth/strategies/jwt.strategy";
import { UsersService } from "src/users/users.service";

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwtService: JwtService, private usersService: UsersService){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient()
            const token = this.extractTokenFromHeader(client)

            if(!token) throw new WsException('Unauthorized client token');

            const payload: Payload = this.jwtService.verify(token)
            const user = await this.usersService.findById(payload.sub)

            if(!user) throw new WsException('Unauthorized client');

            client.data.user = user
            return true
        } catch(error) {
            throw new WsException('Ws cannot be reached')
        }
    }

    private extractTokenFromHeader(client: Socket): string | undefined {
        const authHeader = client.handshake.headers.authorization;
        if (!authHeader) return undefined

        const [type, token] = authHeader.split(' ')
        return type === 'Bearer'? token: undefined
    }
}