import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async makeRoom(@Body('name') name: string, @Req() req){
    const user = req.user
    return await this.roomsService.makeRoom(name, user)
  }

  @Get()
  fetchRooms(){
    return this.roomsService.getRooms()
  }

  @Get('/:id')
  RoomById(@Param('id') id: string){
    return this.roomsService.findById(id)
  }
}
