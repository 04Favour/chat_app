import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MessageModule } from 'src/messages/message.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { RoomsModule } from 'src/rooms/rooms.module';

@Module({
  imports: [MessageModule, AuthModule, UsersModule, RoomsModule],
  providers: [ChatGateway]

})
export class ChatModule {}
