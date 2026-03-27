import { Inject, UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from 'src/auth/dto/create-message.dto';
import { WsJwtGuard } from 'src/common/guards/ws-jwt.guard';
import { MessageService } from 'src/messages/message.services';
import { RoomsService } from 'src/rooms/rooms.service';


@WebSocketGateway({
  cors: {
    origin: '*',
  }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server
  private activeUsers = new Map<string, string>()

  constructor(private messageService: MessageService, @Inject('REDIS_CLIENT') private readonly redis:Redis, private roomService: RoomsService){}

  async handleConnection(client: Socket) {
    console.log(`client connected: ${client.id}`)
  }
  async handleDisconnect(client: Socket) {
    const username = client.data.user?.username
    const roomId = client.data.currentRoom || 'general'

    await this.redis.srem(`presence: ${roomId}`, username)
    const activeUsers = await this.redis.smembers(`presence: ${roomId}`)

    this.server.to(roomId).emit('userLeft', {
      username,
      activeUsers
    })
    console.log(`Client disconnected: ${client.id}`)
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('createRoom')
  async handleCreateRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomName: string }) {
    const user = client.data.user
    const slug = data.roomName.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    await this.roomService.makeRoom(slug, user.id);

    return this.handleJoinRoom(client, { roomId: slug });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: {roomId: string}){
    const user = client.data.user
    const newRoom = data.roomId;

    const currentRoom = client.data.currentRoom
    if(currentRoom){
      client.leave(currentRoom),
      await this.redis.srem(`presence: ${currentRoom}`, user.username)
    }

    client.join(newRoom)
    client.data.currentRoom = newRoom
    await this.redis.sadd(`presence: ${newRoom}`, user.username)

    const [recentMessages, activeUsers] = await Promise.all([this.messageService.findByRoom(newRoom,50), this.redis.smembers(`presence: ${newRoom}`)])

    client.emit('previousMessages', recentMessages.reverse())

    console.log("Emitting to room:", newRoom)

    this.server.to(newRoom).emit('userJoined', {
      username: user.username,
      activeUsers
    })
    return {room: newRoom};
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() createMessageDto: CreateMessageDto){
    const user = client.data.user
    const roomId = createMessageDto.roomId || 'general'

    const message = await this.messageService.create(createMessageDto, user)

    this.server.to(roomId).emit('newMessage', {
      id: message.id,
      content: message.content,
      user: {
        id: user.id,
        username: user.username
      },
      createdAt: message.createdAt
    })

    return {success: true}
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: {roomId: string, isTyping: true}){
    const user = client.data.user
    const roomId = data.roomId || 'general'

    client.to(roomId).emit('userTyping', {
      username: user.username,
      isTyping: data.isTyping
    })
  }
}
