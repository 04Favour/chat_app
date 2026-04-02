import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerRequest } from "@nestjs/throttler";
import { WsException } from "@nestjs/websockets";

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
    protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
        const {context, limit, ttl, throttler, blockDuration} = requestProps
        if(throttler.name !== 'chat_limit') return true;
        const client = context.switchToWs().getClient()

        const user = client.data?.user
        const tracker = user?.username ? `user_${user.username}` : client.conn.remoteAddress

        const key = this.generateKey(context, tracker, throttler.name!)
        console.log(`[Throttler] Tracking activity for: ${tracker}`);
        const {totalHits} = await this.storageService.increment(
            key,
            ttl,
            limit,
            blockDuration,
            throttler.name!
        )
        if(totalHits > limit) {
            throw new WsException(`Whoah dude, slow down!`)
        }
        return true
    }
}