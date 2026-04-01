import { Exclude } from "class-transformer";
import { Message } from "src/messages/entities/message.entity";
import { Room } from "src/rooms/entity/room.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({unique: true})
    username: string

    @Column({unique: true})
    email: string

    @Column({default: true})
    @Exclude()
    password: string

    @Column({default: true})
    isActive: boolean

    @OneToMany(()=> Message, (message)=> message.user)
    messages: Message[] 

    @OneToMany(()=>Room, (room)=> room.user)
    rooms: Room[]

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}