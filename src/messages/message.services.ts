import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Repository } from "typeorm";
import { CreateMessageDto } from "src/auth/dto/create-message.dto";
import { User } from "src/users/entities/user.entity";

export const getPrivateRoomId = (userId1: string, userId2: string): string =>{
    return [userId1, userId2].sort().join('--')
}

@Injectable()
export class MessageService {
    constructor(@InjectRepository(Message) private readonly messageRepository: Repository<Message>){}

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

    async createPrivateMessage(senderId: string, recipientId: string, content: string){
        const roomId = getPrivateRoomId(senderId, recipientId)
        const newMessage = this.messageRepository.create({
            content,
            roomId,
            userId: senderId
        })
    }
}