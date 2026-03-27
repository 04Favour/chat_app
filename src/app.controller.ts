import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController{
    @Get()
    HelloWorld(){
        console.log('Hi terminal')
        return 'Hello world of nestJs'
    }

    @Get('try')
    anotherEndpoint(){
        console.log('Second message to the terminal')
        return 'Another Endpoint'
    }
}
