import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>){}

    async create(username: string, email: string, password: string): Promise<User>{
        const existingUser = await this.usersRepository.findOne({
            where: [{email}, {username}]
        })
        if (existingUser) throw new ConflictException(`${email} already exist`);
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = this.usersRepository.create({
            username,
            email,
            password: hashedPassword,
        })
        return await this.usersRepository.save(user)
    }

    async findByUsername(username: string): Promise<User | null>{
        return await this.usersRepository.findOne({where: {username}})
    }

    async findById(id: string): Promise<User | null>{
        return await this.usersRepository.findOne({where: {id}})
    }

    async findAll(): Promise<User[]>{
        return await this.usersRepository.find({select: ['id', 'username', 'email', 'createdAt']})
    }
}
