import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './common/transformer.interceptor';
import { minutes, seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigValidation } from './common/schemaValidation.joi';
import { MessageModule } from './messages/message.module';
import { Redis } from 'ioredis';
import { RedisModule } from './redis/redis.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validationSchema: ConfigValidation
    }),
    
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbConfig = config.get<TypeOrmModuleOptions>('database');
        if(!dbConfig) throw new Error('Database configuration not found');
        return dbConfig;
      }
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: seconds(60),
            limit: 4,
            blockDuration: minutes(2)
          },
        ],
        errorMessage: 'Whoah Dude, Slow Down!',
        // Use Redis storage to track hits across instances
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get('REDIS_HOST'),
            port: config.get('REDIS_PORT'),
          })
        ),
        getTracker: (req) => {
            if (req.user?.id) return `user_${req.user.id}`;
            if (req.headers['x-device-id']) return `device_${req.headers['x-device-id']}`;
            return `ip_${req.ip}`; 
        },
        generateKey: (context, trackerString, throttlerName) => {
          return `throttler:${trackerString}`;
        }
      }),
    }), 
    UsersModule, 
    AuthModule, 
    MessageModule, RedisModule, RoomsModule, ChatModule, 
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor
    }, 
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
})
export class AppModule {}