import { Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from 'src/auth/dto/create-message.dto';
import { WsJwtGuard } from 'src/common/guards/ws-jwt.guard';
import { WsThrottlerGuard } from 'src/common/guards/ws-throttler.guard';
import { MessageService } from 'src/messages/message.services';
import { RoomsService } from 'src/rooms/rooms.service';


@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  async onModuleInit() {
    const keys = await this.redis.keys('presence:*');
    if (keys.length > 0){
      await this.redis.del(...keys)
      console.log(`🧹 Redis presence cleared: ${keys.length} room reset.`)
    }
  }
  @WebSocketServer()
  server: Server

  constructor(private messageService: MessageService, @Inject('REDIS_CLIENT') private readonly redis:Redis, private roomService: RoomsService){}

  async handleConnection(client: Socket) {
    console.log(`client connected: ${client.id}`)
  }
  async handleDisconnect(client: Socket) {
    const user = client.data.user
    const roomId = client.data.currentRoom || 'general'

    if(user && user.username && roomId){
      await this.redis.srem(`presence:${roomId}`, user.username)
      await this.redis.hdel('user_id_map', user.username)

      const usernames = await this.redis.smembers(`presence:${roomId}`)
      const ids = await Promise.all(usernames.map(username=>this.redis.hget('user_id_map', username)))
      const activeUsers = usernames.map((username,i)=> ({id:ids[i], username}))
  
      this.server.to(roomId).emit('userLeft', {
        username: user.username,
        activeUsers
      })
      console.log(`Client disconnected: ${client.id}`)
    }
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
      client.leave(currentRoom)
      await this.redis.srem(`presence:${currentRoom}`, user.username)
    }

    client.join(newRoom)
    client.data.currentRoom = newRoom

    await this.redis.sadd(`presence:${newRoom}`, user.username)
    await this.redis.hset('user_id_map', user.username, user.id)
    const usernames = await this.redis.smembers(`presence:${newRoom}`)
    const ids = await Promise.all(usernames.map(username=> this.redis.hget('user_id_map', username)))
    const activeUsers = usernames.map((username, i)=> ({id: ids[i], username}))
    const limit = 50
    const recentMessages = await this.messageService.findByRoom(newRoom, limit)

    client.emit('previousMessages', recentMessages.reverse())

    console.log("Emitting to room:", newRoom)

    this.server.to(newRoom).emit('userJoined', {
      username: user.username,
      activeUsers
    })
    return {room: newRoom};
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() createMessageDto: CreateMessageDto){
    const user = client.data.user
    let roomId = createMessageDto.roomId || 'general'
    const {recipientId, content} = createMessageDto

    if(recipientId){
      roomId = [user.id, recipientId].sort().join('--')
      // const recipientSockets = await this.server.fetchSockets()
      // console.log('All connected socket users:', recipientSockets.map(s=>s.data.user?.id))
      // console.log('Looking for recipientId:', recipientId)
      // const recipientSocket = recipientSockets.find(s => s.data.user?.id === recipientId)
      // console.log('Recipient socket found:', !!recipientSocket)
      // if (recipientSocket) {
      //     recipientSocket.join(roomId)
      // }
      const savedMessage = await this.messageService.createPrivateMessage(user, recipientId, content)
      this.server.to(roomId).emit('newMessage', {
        id: savedMessage.id,
        content: savedMessage.content,
        roomId,
        user: {
          id: user.id,
          username: user.username
        },
        createdAt: savedMessage.createdAt
      })
      return {success: true}
    }

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
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: {roomId: string, isTyping: boolean}){
    const user = client.data.user
    const roomId = data.roomId || 'general'

    client.to(roomId).emit('userTyping', {
      username: user.username,
      isTyping: data.isTyping
    })
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('joinPrivateChat')
  async handlePrivateChat(@ConnectedSocket() client: Socket, @MessageBody() data: {recipientId: string}){
    const senderId = client.data.user.id
    const recipientId = data.recipientId

    const roomId = [senderId, recipientId].sort().join('--')

    client.join(roomId)
    console.log(`[Socket] User ${senderId} joined private room: ${roomId}`)
    const history = await this.messageService.getHistory(roomId)

    client.emit('privateChatHistory', {
      roomId,
      history
    })
    return {roomId}
  }

  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('leavePrivateRoom')
  handleLeavePrivateRoom(@ConnectedSocket() client: Socket, @MessageBody() data: {roomId: string}){
    client.leave(data.roomId)
    console.log(`[Socket] User ${client.data.user.username} left Private room: ${data.roomId}`)
  }
}
