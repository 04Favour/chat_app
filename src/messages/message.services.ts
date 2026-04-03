import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Repository } from "typeorm";
import { CreateMessageDto } from "src/auth/dto/create-message.dto";
import { User } from "src/users/entities/user.entity";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";

export const getPrivateRoomId = (userId1: string, userId2: string): string =>{
    return [userId1, userId2].sort().join('--')
}

@Injectable()
export class MessageService {
    constructor(@InjectRepository(Message) private readonly messageRepository: Repository<Message>, @Inject(CACHE_MANAGER) private cacheManager: Cache){}

    async create(createMessageDto: CreateMessageDto, user: User): Promise<Message>{
        const message = this.messageRepository.create({
            content: createMessageDto.content,
            roomId: createMessageDto.roomId || 'general',
            userId: user.id,
            user: user,
        })
        const savedMessage = await this.messageRepository.save(message)
        savedMessage.user = user
        return savedMessage
    }

    async findByRoom(roomId: string = 'general', limit: number = 50) {
        return this.messageRepository.find({
            where: { roomId },
            order: {createdAt: 'DESC'},
            take: limit,
            relations: ['user']
        })
    }

    async findAll(limit: number = 100) {
        return this.messageRepository.find({
            order: {createdAt:'DESC'},
            take: limit,
            relations: ['user']
        })
    }

    async createPrivateMessage(user:User, recipientId: string, content: string){
        const roomId = getPrivateRoomId(user.id, recipientId)
        const newMessage = this.messageRepository.create({
            content,
            roomId,
            user: user,
            userId: user.id,
        })
        const savedMessage = await this.messageRepository.save(newMessage)

        const messageWithUser = await this.messageRepository.findOne({
            where: {id: savedMessage.id},
            relations: ['user']
        })
        const cacheKey = `chat_history:${roomId}`
        const cachedData = await this.cacheManager.get<any[]>(cacheKey)
        let history:any[] = cachedData || []
        history.push(messageWithUser)
        if(history.length > 50) history.shift();
        await this.cacheManager.set(cacheKey, history, 3600000)
        return savedMessage
    }

    async getHistory(roomId: string) {
        const cacheKey = `chat_history:${roomId}`
        const cachedHistory = await this.cacheManager.get(cacheKey)
        if(cachedHistory){
            console.log(`[Cache] Serving history for ${roomId}`)
            return cachedHistory
        }

        console.log(`[DB] Fetching history for ${roomId}`);
        const dbHistory = await this.messageRepository.find({
            where: {roomId},
            order: {createdAt: 'ASC'},
            relations: ['user'],
            take: 50
        })
        await this.cacheManager.set(cacheKey, dbHistory, 3600000);
        return dbHistory
    }
}