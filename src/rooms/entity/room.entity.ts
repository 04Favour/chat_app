import { Message } from "src/messages/entities/message.entity";
import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToOne(()=> User, (user)=> user.rooms, {eager: true})
  @JoinColumn({name: 'userId'})
  user: User

  @CreateDateColumn()
  createdAt: Date;
}