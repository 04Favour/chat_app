import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text')
    content: string

    @Column({nullable: true})
    roomId: string

    @ManyToOne(()=> User, (user)=> user.messages, {eager: true})
    @JoinColumn({name: 'userId'})
    user: User

    @Column()
    userId: string

    @CreateDateColumn()
    createdAt: Date
}