import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from './entity/room.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RoomsService {
    constructor(@InjectRepository(Room) private readonly roomRepo: Repository<Room>){}

    async makeRoom(name: string, user): Promise<Room>{
        const roomExists = await this.roomRepo.findOne({where: {name: name}})
        if(roomExists) throw new ConflictException('Room already exists');
        const room = this.roomRepo.create({
            name: name,
            user: user.id
        })
        return await this.roomRepo.save(room)
    }

    async getRooms(): Promise<Room[]>{
        return await this.roomRepo.find({select: ['id', 'name']})
    }

    async findById(id: string): Promise<Room | null>{
        return await this.roomRepo.findOne({where: {id}})
    }

    async removeRoom(id:string){
        const room = await this.roomRepo.findOne({where: {id: id}})
        if(!room) throw new NotFoundException('Room does not exist');
        return await this.roomRepo.delete(room)
    }
}
